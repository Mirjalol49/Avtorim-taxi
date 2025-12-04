import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';

// Disable context menu globally
document.addEventListener('contextmenu', (e) => e.preventDefault());
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  LayoutDashboardIcon, MapIcon, UsersIcon, BanknoteIcon, PlusIcon, CarIcon, TrashIcon, UserPlusIcon, EditIcon, MenuIcon, XIcon, GlobeIcon, CalendarIcon, TrophyIcon, CheckCircleIcon, LogOutIcon, LockIcon, FilterIcon, DownloadIcon, ChevronDownIcon, TelegramIcon, MedalIcon, TrendingUpIcon, TrendingDownIcon, WalletIcon, SunIcon, MoonIcon, SearchIcon, ListIcon, GridIcon, ChevronLeftIcon, ChevronRightIcon, SparklesIcon, CalculatorIcon, ShieldIcon
} from './components/Icons';

import FinancialModal from './components/FinancialModal';
import DriverModal from './components/DriverModal';
import AdminModal from './components/AdminModal';
import AuthScreen from './components/AuthScreen';
import ConfirmModal from './components/ConfirmModal';
import NumberTooltip from './components/NumberTooltip';
import DateFilter from './components/DateFilter';
import DatePicker from './components/DatePicker';
import CustomSelect from './components/CustomSelect';
import YearSelector from './components/YearSelector';
import DesktopHeader from './components/DesktopHeader';
import SalaryManagement from './components/SalaryManagement';
import RolesManagement from './components/RolesManagement';
import SnowEffect from './components/SnowEffect';
import LogoSnowEffect from './components/LogoSnowEffect';
import NotFound from './components/NotFound';
import { ToastProvider, ToastContainer, useToast } from './components/ToastNotification';
import Skeleton from './components/Skeleton';
import { MOCK_DRIVERS, MOCK_TRANSACTIONS, CITY_CENTER } from './constants';
import { Driver, Transaction, TransactionType, DriverStatus, Language, TimeFilter, Tab, DriverSalary, PaymentStatus } from './types';
import { TRANSLATIONS } from './translations';
import { formatNumberSmart } from './utils/formatNumber';
import * as firestoreService from './services/firestoreService';

import { addSalary, subscribeToSalaries } from './services/salaryService';
import { db } from './firebase';
import { writeBatch, doc, collection } from 'firebase/firestore';
import logo from './Images/logo_winter.png';

const AppContent: React.FC = () => {
  const { addToast } = useToast();
  const [userRole, setUserRole] = useState<'admin' | 'viewer'>(() => {
    return (localStorage.getItem('avtorim_role') as 'admin' | 'viewer') || 'viewer';
  });

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Check for persistent viewer session
    const role = localStorage.getItem('avtorim_role');
    const viewerAuth = localStorage.getItem('avtorim_viewer_auth');
    return role === 'viewer' && viewerAuth === 'true';
  });

  const location = useLocation();
  const navigate = useNavigate();

  // State variables
  // const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD); // Replaced by Router
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');
  const [financeDriverFilter, setFinanceDriverFilter] = useState('all');
  const [financeTypeFilter, setFinanceTypeFilter] = useState<'all' | TransactionType>('all');
  const [financeStartDate, setFinanceStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [financeEndDate, setFinanceEndDate] = useState(new Date());
  const [financePageNumber, setFinancePageNumber] = useState(1);
  const [analyticsYear, setAnalyticsYear] = useState(new Date().getFullYear());
  const TRANSACTIONS_PER_PAGE = 10;

  // Firebase state - starts empty, will sync from cloud
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [adminProfile, setAdminProfile] = useState<any>(() => {
    // Restore viewer profile from local storage if available
    const savedProfile = localStorage.getItem('avtorim_viewer_profile');
    return savedProfile ? JSON.parse(savedProfile) : null;
  });
  const [isFirebaseLoaded, setIsFirebaseLoaded] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [salaryHistory, setSalaryHistory] = useState<DriverSalary[]>([]);

  // Language State
  const [language, setLanguage] = useState<Language>('uz');
  const t = TRANSLATIONS[language];

  // Modals
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [driverSearchQuery, setDriverSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [dashboardViewMode, setDashboardViewMode] = useState<'chart' | 'grid'>('chart');
  const [dashboardPage, setDashboardPage] = useState(1);
  const [dashboardItemsPerPage] = useState(12);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
    isDanger?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: () => { },
    isDanger: false
  });

  // Mobile sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);


  // Theme State - Enforced Dark Mode
  const [theme] = useState<'dark' | 'light'>('dark');

  //
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768); // Match md: breakpoint
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('avtorim_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    // Theme toggle disabled - Dark mode enforced
  };

  // AUTO-LOCK: 20-minute inactivity timer
  useEffect(() => {
    if (!isAuthenticated) return; // Only run when logged in
    if (userRole === 'viewer') return; // Disable auto-lock for viewers

    const INACTIVITY_TIMEOUT = 20 * 60 * 1000; // 20 minutes in milliseconds
    let inactivityTimer: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        // Auto logout after 20 minutes of inactivity
        setIsAuthenticated(false);
        localStorage.removeItem('avtorim_auth');
        addToast('warning', 'Session expired due to inactivity', 5000);
      }, INACTIVITY_TIMEOUT);
    };

    // Events that reset the inactivity timer
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    // Start the timer initially
    resetTimer();

    // Cleanup
    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [isAuthenticated, addToast]);


  // --- FIREBASE SYNC ---
  useEffect(() => {
    if (!isAuthenticated) return;

    // Run migration from localStorage to Firebase
    firestoreService.migrateFromLocalStorage().then(() => {
      console.log('Data migration completed');
      setIsFirebaseLoaded(true);
    }).catch(err => {
      console.error('Migration failed:', err);
      setIsFirebaseLoaded(true); // Continue anyway
    });

    // Subscribe to Drivers
    const unsubDrivers = firestoreService.subscribeToDrivers((newDrivers) => {
      setDrivers(newDrivers); // Always update, even if empty
      setIsDataLoading(false); // Data loaded
    });

    // Subscribe to Transactions
    const unsubTx = firestoreService.subscribeToTransactions((newTransactions) => {
      setTransactions(newTransactions); // Always update, even if empty
    });

    // Subscribe to Admin Profile
    const unsubAdmin = firestoreService.subscribeToAdminProfile((newAdmin) => {
      if (newAdmin) {
        setAdminProfile(newAdmin);
      }
      setIsAdminLoading(false); // Loading complete whether we got data or not
    });

    // Cleanup subscriptions on logout
    const unsubscribeSalaries = subscribeToSalaries((data) => {
      setSalaryHistory(data);
    });

    return () => {
      unsubDrivers();
      unsubTx();
      unsubAdmin();
      unsubscribeSalaries();
    };
  }, [isAuthenticated]);

  // Auth persistence
  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem('avtorim_auth', 'true');
    } else {
      localStorage.removeItem('avtorim_auth');
    }
  }, [isAuthenticated]);

  // --- FILTER LOGIC ---
  const getDashboardFilteredTransactions = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

    return transactions.filter(tx => {
      if (timeFilter === 'today') return tx.timestamp >= startOfDay;
      if (timeFilter === 'week') return tx.timestamp >= startOfWeek;
      if (timeFilter === 'month') return tx.timestamp >= startOfMonth;
      if (timeFilter === 'year') return tx.timestamp >= startOfYear;
      return true;
    });
  }, [transactions, timeFilter]);

  const getFinanceFilteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const txDate = new Date(tx.timestamp);
      let dateMatch = true;
      if (financeStartDate) {
        const start = new Date(financeStartDate);
        dateMatch = dateMatch && txDate >= start;
      }
      if (financeEndDate) {
        const end = new Date(financeEndDate);
        end.setHours(23, 59, 59, 999);
        dateMatch = dateMatch && txDate <= end;
      }
      let driverMatch = true;
      if (financeDriverFilter !== 'all') {
        driverMatch = tx.driverId === financeDriverFilter;
      }
      let typeMatch = true;
      if (financeTypeFilter !== 'all') {
        typeMatch = tx.type === financeTypeFilter;
      }
      return dateMatch && driverMatch && typeMatch;
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions, financeStartDate, financeEndDate, financeDriverFilter, financeTypeFilter]);

  // Reset pagination when filters change
  useEffect(() => {
    setFinancePageNumber(1);
  }, [financeStartDate, financeEndDate, financeDriverFilter, financeTypeFilter])

  // --- ACTIONS ---

  const handleLogin = (role: 'admin' | 'viewer' = 'admin', viewerData?: any) => {
    setIsAuthenticated(true);
    setUserRole(role);
    localStorage.setItem('avtorim_role', role);

    if (role === 'viewer') {
      localStorage.setItem('avtorim_viewer_auth', 'true');
      if (viewerData) {
        setAdminProfile(viewerData);
        localStorage.setItem('avtorim_viewer_profile', JSON.stringify(viewerData));
      }
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole('viewer'); // Default back to viewer
    localStorage.removeItem('avtorim_role');
    localStorage.removeItem('avtorim_viewer_auth');
    localStorage.removeItem('avtorim_viewer_profile');
    setAdminProfile(null);
  };
  const handleAddTransaction = async (data: Omit<Transaction, 'id'>) => {
    try {
      await firestoreService.addTransaction(data);
      // Firebase listener will automatically update the state
    } catch (error) {
      console.error('Failed to add transaction:', error);
    }
  };

  const closeConfirmModal = () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleDeleteTransaction = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: t.confirmDeleteTitle,
      message: t.deleteConfirmTx,
      isDanger: true,
      action: async () => {
        try {
          await firestoreService.deleteTransaction(id);
          // Remove from selected transactions if it was selected
          setSelectedTransactions(prev => prev.filter(txId => txId !== id));
          closeConfirmModal();
        } catch (error) {
          console.error('Failed to delete transaction:', error);
          closeConfirmModal();
        }
      }
    });
  };

  const handlePaySalary = (driver: Driver, effectiveDate?: Date) => {
    const monthlySalary = driver.monthlySalary || 0;
    const dateStr = effectiveDate ? effectiveDate.toLocaleDateString(language === 'uz' ? 'uz-UZ' : language === 'ru' ? 'ru-RU' : 'en-US', { month: 'long', year: 'numeric' }) : '';

    setConfirmModal({
      isOpen: true,
      title: t.paySalary,
      message: `${t.paySalary} ${driver.name}: ${formatNumberSmart(monthlySalary, false, language)} UZS${dateStr ? ` (${dateStr})` : ''}?`,
      isDanger: false,
      action: async () => {
        try {
          // Create an expense transaction for the salary payment
          const salaryTransaction = {
            driverId: driver.id,
            amount: monthlySalary,
            type: TransactionType.EXPENSE,
            description: `${t.monthlySalary} - ${driver.name}${dateStr ? ` (${dateStr})` : ''}`,
            timestamp: effectiveDate ? effectiveDate.getTime() : Date.now(),
            status: PaymentStatus.COMPLETED // Default status for new payments
          };

          // Note: If your Transaction type doesn't have effectiveDate, timestamp is usually enough for sorting.
          // But for salary history, we might want to ensure it's recorded correctly.
          // The addTransaction service likely handles it.

          await firestoreService.addTransaction(salaryTransaction);

          // Add to Salary History
          await addSalary({
            driverId: driver.id,
            amount: monthlySalary,
            effectiveDate: effectiveDate ? effectiveDate.getTime() : Date.now(),
            createdBy: adminProfile?.name || 'Admin',
            createdAt: Date.now(),
            notes: `Salary payment${dateStr ? ` (${dateStr})` : ''}`,
            status: PaymentStatus.COMPLETED // Default status for new payments
          });

          closeConfirmModal();
        } catch (error) {
          console.error('Failed to pay salary:', error);
          closeConfirmModal();
        }
      }
    });
  };


  const handleSaveDriver = async (data: any) => {
    try {
      if (data.id) {
        // Update existing driver
        const { id, ...updateData } = data;

        // Check if salary changed
        const existingDriver = drivers.find(d => d.id === id);

        // OPTIMISTIC UPDATE: Update local state immediately
        setDrivers(prev => prev.map(d => d.id === id ? { ...d, ...updateData, monthlySalary: data.monthlySalary } : d));

        // Use batch write if updating both driver and salary (faster than sequential writes)
        if (existingDriver && existingDriver.monthlySalary !== data.monthlySalary) {
          // Import writeBatch at the top if not already imported
          const batch = writeBatch(db);

          // Update driver
          const driverRef = doc(db, 'drivers', id);
          batch.update(driverRef, updateData);

          // Add salary record
          const salaryRef = doc(collection(db, 'driver_salaries'));
          batch.set(salaryRef, {
            driverId: id,
            amount: data.monthlySalary || 0,
            effectiveDate: Date.now(),
            createdBy: userRole === 'admin' ? 'Admin' : 'User',
            createdAt: Date.now(),
            notes: 'Salary updated via Edit Driver'
          });

          // Execute both operations atomically in a single round trip
          await batch.commit();
        } else {
          // No salary change, just update driver
          await firestoreService.updateDriver(id, updateData);
        }
      } else {
        // Add new driver - use batch for driver + salary in one atomic operation
        const newDriver = {
          name: data.name,
          licensePlate: data.licensePlate,
          carModel: data.carModel,
          phone: data.phone,
          status: data.status || DriverStatus.OFFLINE,
          avatar: data.avatar || '',
          location: {
            lat: CITY_CENTER.lat + (Math.random() - 0.5) * 0.05,
            lng: CITY_CENTER.lng + (Math.random() - 0.5) * 0.05,
            heading: 0
          },
          monthlySalary: data.monthlySalary || 0,
          createdAt: Date.now(),
          isDeleted: false,
          balance: 0,
          rating: 5.0,
          dailyPlan: data.dailyPlan || 750000
        };

        // OPTIMISTIC UPDATE: Add to local state immediately with temp ID
        const tempId = 'temp_' + Date.now();
        setDrivers(prev => [...prev, { ...newDriver, id: tempId } as Driver]);

        // Background save
        try {
          const batch = writeBatch(db);
          const driverRef = doc(collection(db, 'drivers'));
          const driverId = driverRef.id;

          batch.set(driverRef, newDriver);

          if (data.monthlySalary) {
            const salaryRef = doc(collection(db, 'driver_salaries'));
            batch.set(salaryRef, {
              driverId: driverId,
              amount: data.monthlySalary,
              effectiveDate: Date.now(),
              createdBy: userRole === 'admin' ? 'Admin' : 'User',
              createdAt: Date.now(),
              notes: 'Initial salary setup'
            });
          }

          await batch.commit();

          // Remove temp driver and let real-time listener handle the rest (or update ID)
          setDrivers(prev => prev.filter(d => d.id !== tempId));
        } catch (error) {
          console.error("Error saving new driver:", error);
          // Revert optimistic update on error
          setDrivers(prev => prev.filter(d => d.id !== tempId));
          addToast('error', 'Failed to save driver', 3000);
        }
      }
    } catch (error) {
      console.error('Failed to save driver:', error);
      throw error; // Rethrow to let the modal handle the error
    }
  };

  const handleEditDriverClick = (driver: Driver) => {
    setEditingDriver(driver);
    setIsDriverModalOpen(true);
  };

  const handleUpdateDriverStatus = async (driverId: string, newStatus: DriverStatus) => {
    try {
      // Update local state immediately for responsive UI
      setDrivers(drivers.map(d => d.id === driverId ? { ...d, status: newStatus } : d));
      // Persist to Firestore
      await firestoreService.updateDriver(driverId, { status: newStatus });
    } catch (error) {
      console.error('Failed to update driver status:', error);
      // Revert on error
      setDrivers(drivers.map(d => d.id === driverId ? { ...d, status: d.status === DriverStatus.ACTIVE ? DriverStatus.OFFLINE : DriverStatus.ACTIVE } : d));
    }
  };

  const handleDeleteDriver = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: t.confirmDeleteTitle,
      message: t.deleteConfirmDriver,
      isDanger: true,
      action: async () => {
        // Close modal immediately
        closeConfirmModal();

        // Optimistic update - remove from UI instantly
        const previousDrivers = drivers;
        setDrivers(drivers.filter(d => d.id !== id));

        try {
          // Delete from Firestore in background
          await firestoreService.deleteDriver(id, {
            adminName: adminProfile?.name || 'Unknown Admin',
            reason: 'Manual deletion by admin'
          });
        } catch (error) {
          console.error('Failed to delete driver:', error);
          // Revert on error
          setDrivers(previousDrivers);
        }
      }
    });
  };

  // --- STATS CALC ---
  const filteredTx = getDashboardFilteredTransactions;
  const totalIncome = filteredTx.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = filteredTx.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
  const netProfit = totalIncome - totalExpense;

  const nonDeletedDrivers = useMemo(() => {
    return drivers.filter(d => !d.isDeleted);
  }, [drivers]);

  const chartData = useMemo(() => {
    return nonDeletedDrivers.map(d => {
      const dIncome = filteredTx.filter(t => t.driverId === d.id && t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
      const dExpense = filteredTx.filter(t => t.driverId === d.id && t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
      return { name: d.name.split(' ')[0], Income: dIncome, Expense: dExpense };
    });
  }, [drivers, filteredTx]);

  // Leaderboard Data Calculation
  const topDrivers = useMemo(() => {
    const stats = nonDeletedDrivers.map(d => {
      const income = filteredTx.filter(t => t.driverId === d.id && t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
      return { ...d, income };
    });
    return stats.sort((a, b) => b.income - a.income).slice(0, 5); // Top 5
  }, [drivers, filteredTx]);

  const activeDriversList = useMemo(() => {
    return nonDeletedDrivers.filter(d => d.status === DriverStatus.ACTIVE);
  }, [nonDeletedDrivers]);

  // Finance Tab Stats
  const financeFilteredData = getFinanceFilteredTransactions;
  const financeIncome = financeFilteredData.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
  const financeExpense = financeFilteredData.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
  const financeCashflow = financeIncome - financeExpense;

  // Monthly Analytics Data
  const monthlyAnalyticsData = useMemo(() => {
    const monthlyData: Record<string, { name: string; Income: number; Expense: number }> = {};

    // Initialize all 12 months for the selected year
    for (let i = 0; i < 12; i++) {
      const d = new Date(analyticsYear, i, 1);
      const key = `${analyticsYear}-${i}`;
      const monthName = d.toLocaleString(language === 'uz' ? 'uz-UZ' : language === 'ru' ? 'ru-RU' : 'en-US', { month: 'short' });
      monthlyData[key] = { name: monthName, Income: 0, Expense: 0 };
    }

    const source = getFinanceFilteredTransactions.length > 0 ? getFinanceFilteredTransactions : transactions;
    source.forEach(tx => {
      const d = new Date(tx.timestamp);
      if (d.getFullYear() === analyticsYear) {
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (monthlyData[key]) {
          if (tx.status === PaymentStatus.REVERSED || tx.status === PaymentStatus.REFUNDED) return;
          if (tx.type === TransactionType.INCOME) {
            monthlyData[key].Income += tx.amount;
          } else {
            monthlyData[key].Expense += tx.amount;
          }
        }
      }
    });

    return Object.values(monthlyData);
  }, [transactions, getFinanceFilteredTransactions, language, analyticsYear]);

  // Yearly Analytics Totals
  const yearlyAnalyticsTotals = useMemo(() => {
    let yearlyIncome = 0;
    let yearlyExpense = 0;

    const source = getFinanceFilteredTransactions.length > 0 ? getFinanceFilteredTransactions : transactions;
    source.forEach(tx => {
      if (tx.status === PaymentStatus.REVERSED || tx.status === PaymentStatus.REFUNDED) return;

      const d = new Date(tx.timestamp);
      if (d.getFullYear() === analyticsYear) {
        if (tx.type === TransactionType.INCOME) {
          yearlyIncome += tx.amount;
        } else {
          yearlyExpense += tx.amount;
        }
      }
    }
    );

    return {
      income: yearlyIncome,
      expense: yearlyExpense,
      netProfit: yearlyIncome - yearlyExpense
    };
  }, [transactions, getFinanceFilteredTransactions, analyticsYear]);


  const filteredDrivers = useMemo(() => {
    // Filter out deleted drivers for the main list
    const activeDrivers = nonDeletedDrivers;

    if (!driverSearchQuery.trim()) return activeDrivers;
    const query = driverSearchQuery.toLowerCase();
    return activeDrivers.filter(d =>
      d.name.toLowerCase().includes(query) ||
      d.licensePlate.toLowerCase().includes(query) ||
      d.carModel.toLowerCase().includes(query)
    );
  }, [drivers, driverSearchQuery]);

  // Pagination Logic
  const paginatedDrivers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredDrivers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredDrivers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredDrivers.length / itemsPerPage);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [driverSearchQuery]);

  // --- RENDER HELPERS ---
  const renderSidebarItem = (path: string, label: string, Icon: React.FC<any>) => {
    const isActive = location.pathname === path;
    return (
      <button
        onClick={() => { navigate(path); setIsSidebarOpen(false); }}
        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all mb-2 ${isActive
          ? 'bg-[#0d9488] text-white shadow-lg shadow-teal-900/20'
          : theme === 'dark'
            ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
          }`}
      >
        <Icon className={`w-5 h-5 ${isActive
          ? 'text-white'
          : theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
          }`} />
        <span className="font-medium text-sm">{label}</span>
      </button>
    );
  };

  // --- COMPONENTS FOR FILTERS ---
  const FilterControl = ({ icon: Icon, label, children }: any) => (
    <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'
      }`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
        <span className={`text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`}>{label}</span>
      </div>
      {children}
    </div>
  );

  const getBadgeColor = (index: number) => {
    if (index === 0) return "text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.6)]"; // Gold
    if (index === 1) return "text-slate-300 drop-shadow-[0_0_12px_rgba(203,213,225,0.6)]"; // Silver
    if (index === 2) return "text-orange-400 drop-shadow-[0_0_12px_rgba(251,146,60,0.6)]"; // Bronze
    return "text-slate-700 opacity-20";
  };

  if (!isAuthenticated) return <AuthScreen onAuthenticated={handleLogin} lang={language} setLang={setLanguage} theme={theme} />;

  // Check if current URL matches any valid route
  const validPaths = ['/dashboard', '/drivers', '/transactions', '/finance', '/salary', '/roles', '/'];
  const is404 = !validPaths.some(path => location.pathname === path || location.pathname.startsWith(path + '/'));

  // Render 404 page fullscreen if path doesn't match
  if (is404) {
    return <NotFound language={language} />;
  }

  return (
    <div className={`flex h-screen overflow-hidden font-sans transition-colors duration-200 ${theme === 'dark'
      ? 'bg-[#111827] text-gray-50'
      : 'bg-[#F3F4F6] text-gray-900'
      }`}>
      <SnowEffect />

      {/* SIDEBAR */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 border-r flex flex-col transform transition-all duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${theme === 'dark'
          ? 'bg-[#1F2937] border-gray-800'
          : 'bg-white border-gray-200'
        }`}>
        <div className="absolute top-4 right-4 md:hidden">
          <button onClick={() => setIsSidebarOpen(false)} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}><XIcon className="w-6 h-6" /></button>
        </div>
        <div className="p-5 flex justify-center relative overflow-hidden">
          <LogoSnowEffect />
          <img src={logo} alt="Taksapark" className="h-12 w-auto object-contain relative z-10" />
        </div>
        <nav className="flex-1 px-4 overflow-y-auto">
          <div className={`text-xs font-semibold uppercase tracking-wider mb-4 px-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
            }`}>{t.menu}</div>
          {renderSidebarItem('/dashboard', t.dashboard, LayoutDashboardIcon)}
          {renderSidebarItem('/drivers', t.driversList, UsersIcon)}
          {renderSidebarItem('/transactions', t.transactions, ListIcon)}
          {renderSidebarItem('/finance', t.financialReports, BanknoteIcon)}
          {renderSidebarItem('/salary', t.salaryManagement, WalletIcon)}
          {userRole === 'admin' && renderSidebarItem('/roles', t.roleManagement, ShieldIcon)}
        </nav>

        {/* Sidebar Bottom Section */}
        <div className="px-6 pb-4 space-y-3 md:hidden">
          {/* Theme Toggle Removed - Dark Mode Enforced */}

          {/* Language Selector - Mobile Only */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${theme === 'dark'
              ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
          >
            <div className="flex items-center gap-3">
              <GlobeIcon className="w-5 h-5" />
              <span className="font-medium text-sm">Language</span>
            </div>
            <span className="text-xs font-bold uppercase">{language}</span>
          </button>
          <div className={`rounded-xl overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <button onClick={() => { setLanguage('uz'); setIsSidebarOpen(false); }} className={`w-full text-left px-4 py-2 text-sm ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-200 text-gray-700'}`}>O'zbek</button>
            <button onClick={() => { setLanguage('ru'); setIsSidebarOpen(false); }} className={`w-full text-left px-4 py-2 text-sm ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-200 text-gray-700'}`}>Русский</button>
            <button onClick={() => { setLanguage('en'); setIsSidebarOpen(false); }} className={`w-full text-left px-4 py-2 text-sm ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-200 text-gray-700'}`}>English</button>
          </div>
        </div>
        <div className={`p-6 border-t space-y-3 ${theme === 'dark' ? 'border-gray-800' : 'border-gray-100'
          }`}>
          {userRole === 'admin' && (
            <>
              {isAdminLoading || !adminProfile ? (
                // Skeleton loading state
                <div className={`rounded-xl p-3 border flex items-center gap-3 ${theme === 'dark'
                  ? 'bg-[#111827] border-gray-700'
                  : 'bg-gray-50 border-gray-200'
                  }`}>
                  <Skeleton variant="circular" width={36} height={36} theme="dark" />
                  <div className="flex-1 space-y-2">
                    <Skeleton variant="text" width="60%" height={14} theme="dark" />
                    <Skeleton variant="text" width="40%" height={10} theme="dark" />
                  </div>
                </div>
              ) : (
                // Actual admin profile
                <div onClick={() => setIsAdminModalOpen(true)} className={`rounded-xl p-3 border flex items-center gap-3 cursor-pointer transition-all group ${theme === 'dark'
                  ? 'bg-[#111827] border-gray-700 hover:bg-gray-800'
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}>
                  <img src={adminProfile.avatar} className={`w-9 h-9 rounded-full border object-cover ${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'
                    }`} alt="Admin" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>{adminProfile.name}</p>
                    <p className={`text-[10px] truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>{adminProfile.role}</p>
                  </div>
                  <EditIcon className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                    }`} />
                </div>
              )}
            </>
          )}
          <button onClick={handleLogout} className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl border transition-all text-xs font-bold uppercase tracking-wider group ${theme === 'dark'
            ? 'bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 border-red-500/20'
            : 'bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border-red-200'
            }`}>
            <LogOutIcon className="w-4 h-4" />
            <span className="group-hover:translate-x-0.5 transition-transform">{t.lockSystem}</span>
          </button>
        </div>
      </div>

      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Desktop Header - Hidden on Mobile */}
        {/* Desktop Header - Hidden on Mobile */}
        <DesktopHeader
          theme={theme}
          onThemeToggle={toggleTheme}
          language={language}
          onLanguageChange={setLanguage}
          activeTab={location.pathname === '/' ? Tab.DASHBOARD : location.pathname.substring(1).toUpperCase() as Tab}
          isMobile={isMobile}
          onNewTransactionClick={() => setIsTxModalOpen(true)}
          onAddDriverClick={() => {
            setEditingDriver(null);
            setIsDriverModalOpen(true);
          }}
          userRole={userRole}
        />

        {/* Mobile Header - Hidden on Desktop */}
        <header className={`h-20 flex items-center justify-between px-6 md:px-8 z-10 border-b flex-shrink-0 md:hidden ${theme === 'dark' ? 'bg-[#1F2937] border-gray-800' : 'bg-white border-gray-200'
          }`}>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className={`${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}><MenuIcon className="w-6 h-6" /></button>
            <div>
              <h2 className={`text-xl font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                {location.pathname.includes('dashboard') && t.overview}
                {location.pathname.includes('drivers') && t.driversList}
                {location.pathname.includes('finance') && t.analytics}
                {location.pathname.includes('transactions') && t.transactions}
                {location.pathname.includes('salary') && t.salaryManagement}
              </h2>
              <p className={`text-xs mt-1 hidden sm:block ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                {location.pathname.includes('dashboard') && t.descDashboard}
                {location.pathname.includes('drivers') && t.descDrivers}
                {location.pathname.includes('finance') && t.descFinance}
                {location.pathname.includes('transactions') && t.descTransactions}
              </p>
            </div>
          </div>
        </header>

        {/* ACTION BUTTONS ROW - Mobile Only */}
        <div className={`flex items-center justify-between px-6 md:px-8 py-3 md:py-4 border-b sticky top-20 z-10 md:hidden ${theme === 'dark' ? 'bg-[#111827] border-gray-800' : 'bg-[#F3F4F6] border-gray-200'
          }`}>
          {location.pathname === '/drivers' && userRole === 'admin' && (
            <>
              <button onClick={() => { setEditingDriver(null); setIsDriverModalOpen(true); }} className={`flex items-center justify-center gap-2 border px-3 py-2 rounded-xl font-medium text-xs transition-all w-full sm:w-auto ${theme === 'dark'
                ? 'bg-[#0d9488] hover:bg-[#0f766e] border-transparent text-white'
                : 'bg-[#0d9488] hover:bg-[#0f766e] border-transparent text-white shadow-sm'
                }`}>
                <PlusIcon className="w-4 h-4" /> <span>{t.add}</span>
              </button>
            </>
          )}

          {(location.pathname === '/finance' || location.pathname === '/dashboard' || location.pathname === '/transactions') && userRole === 'admin' && (
            <button onClick={() => setIsTxModalOpen(true)} className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl font-medium text-xs transition-all shadow-lg active:scale-95 w-full sm:w-auto ${theme === 'dark'
              ? 'bg-[#0d9488] hover:bg-[#0f766e] text-white shadow-blue-900/20'
              : 'bg-[#0d9488] hover:bg-[#0f766e] text-white shadow-blue-500/30'
              }`}>
              <PlusIcon className="w-4 h-4" /> <span>{t.newTransfer}</span>
            </button>
          )}
        </div>

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8 relative z-0 custom-scrollbar">

          {/* DASHBOARD */}
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<>
              <div className="space-y-6">
                {/* Time Filters */}
                <DateFilter
                  currentFilter={timeFilter}
                  onFilterChange={setTimeFilter}
                  language={language}
                  theme={theme}
                  labels={{
                    today: t.today,
                    week: t.week,
                    month: t.month,
                    year: t.year
                  }}
                />

                {/* MAIN STATS ROW - FULL WIDTH */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {isDataLoading ? (
                    <>
                      {/* Skeleton Loading for Income Card */}
                      <div className="bg-[#0d9488] p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl shadow-lg">
                        <div className="flex flex-col gap-3">
                          <Skeleton variant="rectangular" width="40%" height={12} theme="dark" />
                          <Skeleton variant="rectangular" width="70%" height={32} theme="dark" />
                          <Skeleton variant="rectangular" width="30%" height={10} theme="dark" />
                        </div>
                      </div>

                      {/* Skeleton Loading for Expense Card */}
                      <div className={`p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border shadow-lg ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-100'}`}>
                        <div className="flex flex-col gap-3">
                          <Skeleton variant="rectangular" width="40%" height={12} theme={theme} />
                          <Skeleton variant="rectangular" width="70%" height={32} theme={theme} />
                          <Skeleton variant="rectangular" width="30%" height={10} theme={theme} />
                        </div>
                      </div>

                      {/* Skeleton Loading for Net Profit Card */}
                      <div className={`p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border shadow-lg sm:col-span-2 lg:col-span-1 ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-100'}`}>
                        <div className="flex flex-col gap-3">
                          <Skeleton variant="rectangular" width="40%" height={12} theme={theme} />
                          <Skeleton variant="rectangular" width="70%" height={32} theme={theme} />
                          <Skeleton variant="rectangular" width="30%" height={10} theme={theme} />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Income - Primary Card (Teal) */}
                      <div className="bg-[#0d9488] p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl shadow-lg relative overflow-hidden group transition-all hover:shadow-xl">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                          <TrendingUpIcon className="w-12 sm:w-16 md:w-20 h-12 sm:h-16 md:h-20 text-white" />
                        </div>
                        <div className="flex flex-col justify-between relative z-10 gap-2 sm:gap-3">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-white/10 rounded-lg text-white border border-white/10 flex-shrink-0">
                              <TrendingUpIcon className="w-4 sm:w-4 md:w-5 h-4 sm:h-4 md:h-5" />
                            </div>
                            <p className="text-[10px] sm:text-[10px] md:text-[11px] text-teal-100/80 font-bold uppercase tracking-wide">{t.totalIncome}</p>
                          </div>
                          <div>
                            <NumberTooltip value={totalIncome} label={t.totalIncome} theme={theme}>
                              <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-4xl font-black text-white tracking-tight leading-none font-mono cursor-help whitespace-nowrap">
                                {formatNumberSmart(totalIncome, isMobile, language)}
                              </h3>
                            </NumberTooltip>
                            <p className="text-[10px] sm:text-[11px] md:text-xs text-teal-100/60 font-medium mt-1.5 ml-0.5">UZS</p>
                          </div>
                        </div>
                      </div>

                      {/* Expense - Secondary Card (White/Dark) */}
                      <div className={`p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border shadow-lg relative overflow-hidden group transition-all ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-100'
                        }`}>
                        <div className={`absolute top-0 right-0 p-3 transition-opacity ${theme === 'dark' ? 'opacity-5 group-hover:opacity-10' : 'opacity-[0.08] group-hover:opacity-[0.12]'}`}>
                          <TrendingDownIcon className={`w-12 sm:w-16 md:w-20 h-12 sm:h-16 md:h-20 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`} />
                        </div>
                        <div className="flex flex-col justify-between relative z-10 gap-2 sm:gap-3">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg border flex-shrink-0 ${theme === 'dark' ? 'bg-gray-800 text-red-400 border-gray-700' : 'bg-red-50 text-red-500 border-red-100'
                              }`}>
                              <TrendingDownIcon className="w-4 sm:w-4 md:w-5 h-4 sm:h-4 md:h-5" />
                            </div>
                            <p className={`text-[10px] sm:text-[10px] md:text-[11px] font-bold uppercase tracking-wide ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'
                              }`}>{t.totalExpense}</p>
                          </div>
                          <div>
                            <NumberTooltip value={totalExpense} label={t.totalExpense} theme={theme}>
                              <h3 className={`text-2xl sm:text-3xl md:text-4xl lg:text-4xl font-black tracking-tight leading-none font-mono cursor-help whitespace-nowrap ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                                }`}>
                                {formatNumberSmart(totalExpense, isMobile, language)}
                              </h3>
                            </NumberTooltip>
                            <p className={`text-[10px] sm:text-[11px] md:text-xs font-medium mt-1.5 ml-0.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                              }`}>UZS</p>
                          </div>
                        </div>
                      </div>

                      {/* Net Profit - Secondary Card (White/Dark) */}
                      <div className={`p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border shadow-lg relative overflow-hidden group transition-all sm:col-span-2 lg:col-span-1 ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-100'
                        }`}>
                        <div className={`absolute top-0 right-0 p-3 transition-opacity ${theme === 'dark' ? 'opacity-5 group-hover:opacity-10' : 'opacity-[0.08] group-hover:opacity-[0.12]'}`}>
                          <WalletIcon className={`w-12 sm:w-16 md:w-20 h-12 sm:h-16 md:h-20 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`} />
                        </div>
                        <div className="flex flex-col justify-between relative z-10 gap-2 sm:gap-3">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg border flex-shrink-0 ${theme === 'dark' ? 'bg-gray-800 text-[#0d9488] border-gray-700' : 'bg-[#0d9488]/10 text-[#0d9488] border-[#0d9488]/20'
                              }`}>
                              <WalletIcon className="w-4 sm:w-4 md:w-5 h-4 sm:h-4 md:h-5" />
                            </div>
                            <p className={`text-[10px] sm:text-[10px] md:text-[11px] font-bold uppercase tracking-wide ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'
                              }`}>{t.netProfit}</p>
                          </div>
                          <div>
                            <NumberTooltip value={netProfit} label={t.netProfit} theme={theme}>
                              <h3 className={`text-2xl sm:text-3xl md:text-4xl lg:text-4xl font-black tracking-tight leading-none font-mono cursor-help whitespace-nowrap ${netProfit >= 0
                                ? theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                                : theme === 'dark' ? 'text-red-400' : 'text-red-600'
                                }`}>
                                {netProfit > 0 ? '+' : ''}{formatNumberSmart(netProfit, isMobile, language)}
                              </h3>
                            </NumberTooltip>
                            <p className={`text-[10px] sm:text-[11px] md:text-xs font-medium mt-1.5 ml-0.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                              }`}>UZS</p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* MIDDLE ROW: Chart - Full Width */}
                <div className={`w-full h-[300px] sm:h-[400px] md:h-[500px] p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border flex flex-col shadow-xl ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <h3 className={`text-sm sm:text-base md:text-lg font-bold flex items-center gap-2 opacity-80 ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                      <LayoutDashboardIcon className={`w-4 sm:w-5 h-4 sm:h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                      {t.incomeVsExpense}
                    </h3>

                    {/* View Toggle */}
                    <div className={`flex items-center p-1.5 rounded-xl border shadow-sm ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'}`}>
                      <button
                        onClick={() => setDashboardViewMode('chart')}
                        className={`p-2 rounded-lg transition-all ${dashboardViewMode === 'chart'
                          ? 'bg-[#0d9488] text-white shadow-md'
                          : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                          }`}
                      >
                        <LayoutDashboardIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDashboardViewMode('grid')}
                        className={`p-2 rounded-lg transition-all ${dashboardViewMode === 'grid'
                          ? 'bg-[#0d9488] text-white shadow-md'
                          : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                          }`}
                      >
                        <GridIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    {dashboardViewMode === 'chart' ? (
                      <div className="-mx-2 sm:mx-0 h-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} barSize={20} margin={{ left: 0, right: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#E5E7EB'} vertical={false} />
                            <XAxis
                              dataKey="name"
                              stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'}
                              axisLine={false}
                              tickLine={false}
                              dy={10}
                              fontSize={11}
                              interval={0}
                              angle={-45}
                              textAnchor="end"
                              height={60}
                            />
                            <YAxis
                              stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'}
                              axisLine={false}
                              tickLine={false}
                              dx={-10}
                              fontSize={10}
                              tickFormatter={(value) => {
                                if (value >= 1000000000) {
                                  return `${(value / 1000000000).toFixed(1)}${language === 'en' ? 'B' : 'mlrd'}`;
                                }
                                if (value >= 1000000) {
                                  return `${(value / 1000000).toFixed(1)}${language === 'en' ? 'M' : 'mln'}`;
                                }
                                if (value >= 1000) {
                                  return `${(value / 1000).toFixed(0)}k`;
                                }
                                return value;
                              }}
                            />
                            <Tooltip
                              cursor={{ fill: theme === 'dark' ? 'rgba(55, 65, 81, 0.3)' : 'rgba(229, 231, 235, 0.3)' }}
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className={`p-3 rounded-xl border shadow-lg ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'}`}>
                                      <p className={`text-sm font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{label}</p>
                                      {payload.map((entry: any, index: number) => (
                                        <div key={index} className="flex items-center gap-2 mb-1 last:mb-0">
                                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.fill }} />
                                          <span className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                                            {entry.dataKey === 'Income' ? t.income : t.expense}:
                                          </span>
                                          <span className={`text-sm font-bold ${entry.dataKey === 'Income' ? 'text-[#0d9488]' : 'text-red-500'}`}>
                                            {entry.value.toLocaleString()}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar dataKey="Income" fill="#0d9488" radius={[8, 8, 0, 0]} />
                            <Bar dataKey="Expense" fill="#EF4444" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col">
                        {(() => {
                          const startIndex = (dashboardPage - 1) * dashboardItemsPerPage;
                          const paginatedData = chartData.slice(startIndex, startIndex + dashboardItemsPerPage);
                          const totalPages = Math.ceil(chartData.length / dashboardItemsPerPage);

                          return (
                            <>
                              <div className="flex-1 overflow-y-auto overflow-x-hidden pr-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
                                  {paginatedData.map((data, idx) => {
                                    const driver = drivers.find(d => d.name.split(' ')[0] === data.name);
                                    const profit = data.Income - data.Expense;

                                    return (
                                      <div key={idx} className={`p-5 rounded-xl border-2 transition-all hover:shadow-lg ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700/50 hover:border-[#0d9488]' : 'bg-white border-gray-200 hover:border-[#0d9488]'}`}>
                                        <div className="flex items-center gap-3 mb-4">
                                          {driver && (
                                            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#0d9488] flex-shrink-0">
                                              <img src={driver.avatar} alt={driver.name} className="w-full h-full object-cover" />
                                            </div>
                                          )}
                                          <div className="min-w-0">
                                            <h4 className={`font-bold text-sm truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{data.name}</h4>
                                            {driver && <p className={`text-xs truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{driver.carModel}</p>}
                                          </div>
                                        </div>

                                        <div className="space-y-2">
                                          <div className="flex items-center justify-between">
                                            <span className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t.income}</span>
                                            <span className="text-sm font-bold text-[#0d9488]">+{data.Income.toLocaleString()}</span>
                                          </div>
                                          <div className="flex items-center justify-between">
                                            <span className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t.expense}</span>
                                            <span className="text-sm font-bold text-red-500">-{data.Expense.toLocaleString()}</span>
                                          </div>
                                          <div className={`pt-2 mt-2 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                                            <div className="flex items-center justify-between">
                                              <span className={`text-xs font-bold uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t.netProfit}</span>
                                              <span className={`text-base font-black ${profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {profit > 0 ? '+' : ''}{profit.toLocaleString()}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Pagination - Fixed at bottom */}
                              {totalPages > 1 && (
                                <div className="flex justify-center items-center gap-2 pt-4 border-t border-gray-700">
                                  <button
                                    onClick={() => setDashboardPage(p => Math.max(1, p - 1))}
                                    disabled={dashboardPage === 1}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${dashboardPage === 1
                                      ? 'opacity-50 cursor-not-allowed'
                                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                                      } ${theme === 'dark' ? 'text-white' : 'text-gray-600'}`}
                                  >
                                    {t.previous}
                                    <ChevronLeftIcon className="w-4 h-4" />
                                  </button>

                                  <div className="flex items-center gap-2">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                                      <button
                                        key={pageNum}
                                        onClick={() => setDashboardPage(pageNum)}
                                        className={`w-10 h-10 rounded-xl font-semibold transition-all ${dashboardPage === pageNum
                                          ? 'bg-[#0d9488] text-white shadow-md'
                                          : theme === 'dark'
                                            ? 'text-gray-300 hover:bg-gray-800'
                                            : 'text-gray-600 hover:bg-gray-100'
                                          }`}
                                      >
                                        {pageNum}
                                      </button>
                                    ))}
                                  </div>

                                  <button
                                    onClick={() => setDashboardPage(p => Math.min(totalPages, p + 1))}
                                    disabled={dashboardPage === totalPages}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${dashboardPage === totalPages
                                      ? 'opacity-50 cursor-not-allowed'
                                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                                      } ${theme === 'dark' ? 'text-white' : 'text-gray-600'}`}
                                  >
                                    {t.next}
                                    <ChevronRightIcon className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Active Drivers List */}
                <div className={`p-8 rounded-3xl border shadow-xl ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                  <h3 className={`text-lg font-bold mb-6 flex items-center gap-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    {t.activeDrivers} ({activeDriversList.length})
                  </h3>
                  {activeDriversList.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {activeDriversList.map(driver => (
                        <div key={driver.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-colors ${theme === 'dark'
                          ? 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                          : 'bg-gray-50 border-gray-100 hover:border-gray-300'
                          }`}>
                          <div className="relative w-12 h-12 flex-shrink-0">
                            <div className="w-12 h-12 rounded-full border border-green-500/50 overflow-hidden">
                              <img src={driver.avatar} className="w-full h-full object-cover" />
                            </div>
                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                          </div>
                          <div className="min-w-0">
                            <div className={`text-sm font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{driver.name}</div>
                            <div className={`text-xs truncate mt-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{driver.carModel} • {driver.licensePlate}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={`text-sm italic py-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Hozirda faol haydovchilar yo'q.</div>
                  )}
                </div>

                {/* BOTTOM ROW: Top Earners Leaderboard */}
                <div className={`p-6 rounded-3xl border shadow-xl ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                  <div className={`flex items-center justify-between mb-6 pb-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'
                    }`}>
                    <h3 className={`text-lg font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                      <TrophyIcon className="text-yellow-500 w-5 h-5" />
                      {t.topPerformers}
                    </h3>
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md border ${theme === 'dark'
                      ? 'text-gray-400 bg-gray-800 border-gray-700'
                      : 'text-gray-500 bg-gray-50 border-gray-200'
                      }`}>{t[timeFilter]}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {topDrivers.length > 0 ? topDrivers.map((driver, index) => (
                      <div key={driver.id} className={`flex flex-col items-center gap-4 p-6 rounded-2xl border transition-all hover:scale-[1.02] hover:shadow-lg ${theme === 'dark'
                        ? 'bg-gray-800/40 border-gray-700 hover:bg-gray-800'
                        : 'bg-gray-50 border-gray-100 hover:bg-white'
                        }`}>
                        <div className={`flex-shrink-0 w-12 h-12 flex items-center justify-center font-bold text-2xl font-mono ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
                          }`}>
                          {index < 3 ? <MedalIcon className={`w-10 h-10 ${getBadgeColor(index)}`} /> : `#${index + 1}`}
                        </div>
                        <div className={`w-16 h-16 rounded-full border-2 overflow-hidden shadow-md flex-shrink-0 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                          }`}>
                          <img src={driver.avatar} className="w-full h-full object-cover" />
                        </div>
                        <div className="text-center w-full">
                          <p className={`text-base font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{driver.name}</p>
                          <p className={`text-xs truncate mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{driver.carModel}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-[#0d9488]">{driver.income.toLocaleString()}</p>
                          <p className={`text-[10px] uppercase font-semibold ml-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>UZS</p>
                        </div>
                      </div>
                    )) : (
                      <div className={`text-center py-10 text-sm col-span-full ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Ma'lumotlar yo'q</div>
                    )}
                  </div>
                </div>
              </div>
            </>} />

            {/* DRIVERS */}
            <Route path="/drivers" element={<>
              <>
                {/* Search Bar & View Toggle */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className={`flex-1 p-1.5 rounded-2xl border shadow-sm ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                      </div>
                      <input
                        type="text"
                        className={`block w-full pl-10 pr-3 py-2.5 border rounded-xl leading-5 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488] sm:text-sm transition-colors ${theme === 'dark'
                          ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                          : 'bg-gray-50 border-gray-200 text-gray-900'
                          }`}
                        placeholder={t.searchDriverPlaceholder}
                        value={driverSearchQuery}
                        onChange={(e) => setDriverSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Add Driver Button */}
                  {userRole === 'admin' && (
                    <div className={`flex items-center p-1.5 rounded-2xl border shadow-sm ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'}`}>
                      <button
                        onClick={() => {
                          setEditingDriver(null);
                          setIsDriverModalOpen(true);
                        }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 shadow-lg ${theme === 'dark'
                          ? 'bg-gradient-to-r from-[#0d9488] to-[#0f766e] hover:from-[#0f766e] hover:to-[#1a4048] text-white shadow-sm'
                          : 'bg-gradient-to-r from-[#0d9488] to-[#0f766e] hover:from-[#0f766e] hover:to-[#1a4048] text-white shadow-sm'
                          }`}
                      >
                        <PlusIcon className="w-5 h-5" />
                        <span>{t.add}</span>
                      </button>
                    </div>
                  )}

                  {/* View Toggle */}
                  <div className={`flex items-center p-1.5 rounded-2xl border shadow-sm ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'}`}>
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid'
                        ? 'bg-[#0d9488] text-white shadow-md'
                        : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                      <GridIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2.5 rounded-xl transition-all ${viewMode === 'list'
                        ? 'bg-[#0d9488] text-white shadow-md'
                        : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                      <ListIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {filteredDrivers.length > 0 ? (
                  <>
                    {viewMode === 'grid' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {paginatedDrivers.map(driver => (
                          <div key={driver.id} className={`rounded-2xl p-6 flex flex-col gap-4 transition-all group relative border ${theme === 'dark'
                            ? 'bg-[#1F2937] border-gray-700 hover:border-gray-600'
                            : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-lg'
                            }`}>
                            <div className="flex items-center gap-4">
                              <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full border-2 transition-colors shadow-lg overflow-hidden flex-shrink-0 ${theme === 'dark' ? 'border-gray-600 group-hover:border-[#0d9488]' : 'border-gray-200 group-hover:border-[#0d9488]'
                                }`}>
                                <img src={driver.avatar} className="w-full h-full object-cover" alt={driver.name} />
                              </div>
                              <div className="min-w-0">
                                <h3 className={`font-bold text-lg truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{driver.name}</h3>
                                <p className={`text-sm truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{driver.carModel}</p>
                                {userRole === 'admin' ? (
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpdateDriverStatus(driver.id, driver.status === DriverStatus.ACTIVE ? DriverStatus.OFFLINE : DriverStatus.ACTIVE);
                                      }}
                                      className={`relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 mt-3 ${driver.status === DriverStatus.ACTIVE
                                        ? 'bg-green-500'
                                        : theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
                                        }`}
                                      role="switch"
                                      aria-checked={driver.status === DriverStatus.ACTIVE}
                                    >
                                      <span
                                        className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform duration-300 ease-in-out ${driver.status === DriverStatus.ACTIVE ? 'translate-x-7' : 'translate-x-0'
                                          }`}
                                      />
                                    </button>
                                    <p className={`text-xs font-semibold tracking-wider mt-1.5 ${driver.status === DriverStatus.ACTIVE ? 'text-green-600 dark:text-green-400' : theme === 'dark' ? 'text-gray-500' : 'text-gray-600'
                                      }`}>
                                      {driver.status === DriverStatus.ACTIVE ? t.active : t.offline}
                                    </p>
                                  </>
                                ) : (
                                  <div className="mt-3">
                                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${driver.status === DriverStatus.ACTIVE
                                      ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
                                      : theme === 'dark'
                                        ? 'bg-gray-700 text-gray-400 border border-gray-600'
                                        : 'bg-gray-100 text-gray-600 border border-gray-200'
                                      }`}>
                                      {driver.status === DriverStatus.ACTIVE ? t.active : t.offline}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className={`grid grid-cols-2 gap-4 pt-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                              <div>
                                <p className={`text-xs uppercase font-bold tracking-wider mb-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>License Plate</p>
                                <p className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{driver.licensePlate}</p>
                              </div>
                              <div>
                                <p className={`text-xs uppercase font-bold tracking-wider mb-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Phone</p>
                                <p className={`font-bold text-sm truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{driver.phone}</p>
                              </div>
                            </div>

                            {/* Action Buttons - Bottom Section */}
                            {userRole === 'admin' && (
                              <div className={`flex gap-2 pt-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditDriverClick(driver);
                                  }}
                                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg transition-all duration-150 active:scale-95 font-medium text-sm ${theme === 'dark'
                                    ? 'bg-[#0d9488]/10 text-[#0d9488] hover:bg-[#0d9488]/20 border border-[#0d9488]/20'
                                    : 'bg-[#0d9488]/10 text-[#0d9488] hover:bg-[#0d9488]/20 border border-[#0d9488]/20'
                                    }`}
                                >
                                  <EditIcon className="w-4 h-4" />
                                  <span>{t.edit}</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteDriver(driver.id);
                                  }}
                                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg transition-all duration-150 active:scale-95 font-medium text-sm ${theme === 'dark'
                                    ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                                    : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                                    }`}
                                >
                                  <TrashIcon className="w-4 h-4" />
                                  <span>{t.delete}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={`rounded-2xl border overflow-hidden shadow-lg ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'}`}>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className={`${theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-500'} text-xs uppercase tracking-wider`}>
                                <th className="p-4 font-bold border-b border-gray-200 dark:border-gray-700">{t.driver}</th>
                                <th className="p-4 font-bold border-b border-gray-200 dark:border-gray-700">{t.car}</th>
                                <th className="p-4 font-bold border-b border-gray-200 dark:border-gray-700">{t.status}</th>
                                {userRole === 'admin' && <th className="p-4 font-bold border-b border-gray-200 dark:border-gray-700 text-center">{t.actions}</th>}
                              </tr>
                            </thead>
                            <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-100'}`}>
                              {paginatedDrivers.map(driver => (
                                <tr key={driver.id} className={`group transition-colors ${theme === 'dark' ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'}`}>
                                  <td className="p-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 dark:border-gray-600">
                                        <img src={driver.avatar} alt={driver.name} className="w-full h-full object-cover" />
                                      </div>
                                      <div>
                                        <p className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{driver.name}</p>
                                        <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>{driver.phone}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    <p className={`font-medium text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{driver.carModel}</p>
                                    <p className={`text-xs font-mono ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>{driver.licensePlate}</p>
                                  </td>
                                  <td className="p-4">
                                    {userRole === 'admin' ? (
                                      <div className="flex flex-col items-start gap-2">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleUpdateDriverStatus(driver.id, driver.status === DriverStatus.ACTIVE ? DriverStatus.OFFLINE : DriverStatus.ACTIVE);
                                          }}
                                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${driver.status === DriverStatus.ACTIVE
                                            ? 'bg-green-500'
                                            : theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
                                            }`}
                                          role="switch"
                                          aria-checked={driver.status === DriverStatus.ACTIVE}
                                        >
                                          <span
                                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-300 ease-in-out ${driver.status === DriverStatus.ACTIVE ? 'translate-x-5' : 'translate-x-0'
                                              }`}
                                          />
                                        </button>
                                        <span className={`text-xs font-semibold tracking-wider ${driver.status === DriverStatus.ACTIVE ? 'text-green-600 dark:text-green-400' : theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                                          {driver.status === DriverStatus.ACTIVE ? t.active : t.offline}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${driver.status === DriverStatus.ACTIVE
                                        ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
                                        : theme === 'dark'
                                          ? 'bg-gray-700 text-gray-400 border border-gray-600'
                                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                                        }`}>
                                        {driver.status === DriverStatus.ACTIVE ? t.active : t.offline}
                                      </span>
                                    )}
                                  </td>
                                  {userRole === 'admin' && (
                                    <td className="p-4">
                                      <div className="flex items-center justify-center gap-2">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleEditDriverClick(driver); }}
                                          className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-[#0d9488] hover:bg-[#0d9488]/10' : 'text-[#0d9488] hover:bg-[#0d9488]/10'}`}
                                        >
                                          <EditIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleDeleteDriver(driver.id); }}
                                          className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50'}`}
                                        >
                                          <TrashIcon className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex justify-center items-center gap-2 mt-8">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${currentPage === 1
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                            } ${theme === 'dark' ? 'text-white' : 'text-gray-600'}`}
                        >
                          <ChevronLeftIcon className="w-4 h-4" />
                          {t.previous}
                        </button>

                        {/* Page Numbers */}
                        <div className="flex items-center gap-2">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`w-10 h-10 rounded-xl font-semibold transition-all ${currentPage === pageNum
                                ? 'bg-[#0d9488] text-white shadow-md'
                                : theme === 'dark'
                                  ? 'text-gray-300 hover:bg-gray-800'
                                  : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                              {pageNum}
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${currentPage === totalPages
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                            } ${theme === 'dark' ? 'text-white' : 'text-gray-600'}`}
                        >
                          {t.next}
                          <ChevronRightIcon className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className={`flex flex-col items-center justify-center h-64 rounded-2xl border ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-gray-800 text-gray-600' : 'bg-gray-50 text-gray-400'}`}>
                      {drivers.length > 0 ? <SearchIcon className="w-8 h-8" /> : <UsersIcon className="w-8 h-8" />}
                    </div>
                    <p className={`text-lg font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {drivers.length > 0 ? t.noDriversFound : "Hozircha haydovchilar yo'q"}
                    </p>
                    {userRole === 'admin' && drivers.length === 0 && (
                      <button
                        onClick={() => { setEditingDriver(null); setIsDriverModalOpen(true); }}
                        className="mt-4 px-4 py-2 bg-[#0d9488] hover:bg-[#0f766e] text-white rounded-xl text-sm font-medium transition-colors"
                      >
                        {t.addDriver}
                      </button>
                    )}
                  </div>
                )}
              </>
            </>} />

            {/* FINANCE & FILTER COMPONENT */}
            {/* FINANCE & FILTER COMPONENT */}
            {/* FINANCE (ANALYTICS) COMPONENT */}
            <Route path="/finance" element={<>
              <div className="space-y-6">
                {/* Analytics Header Filters */}
                <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 p-5 rounded-2xl border ${theme === 'dark' ? 'bg-[#1E293B]/80 border-[#334155]' : 'bg-[#1F2937]/95 border-gray-700'}`}>
                  <DatePicker label={t.fromDate || 'Boshlanish sanasi'} value={financeStartDate} onChange={setFinanceStartDate} theme={theme} labelClassName="text-white" />
                  <DatePicker label={t.toDate || 'Tugash sanasi'} value={financeEndDate} onChange={setFinanceEndDate} theme={theme} labelClassName="text-white" />
                  <CustomSelect label={t.driver || 'Haydovchi'} value={financeDriverFilter} onChange={setFinanceDriverFilter} options={[{ id: 'all', name: t.allDrivers || 'Barcha Haydovchilar' }, ...nonDeletedDrivers.map(d => ({ id: d.id, name: d.name }))]} theme={theme} showSearch={true} icon={UsersIcon} labelClassName="text-white" />
                </div>

                {/* Yearly Stats Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {/* Yearly Income */}
                  <div className="bg-[#0d9488] p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl shadow-lg relative overflow-hidden group transition-all hover:shadow-xl">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                      <TrendingUpIcon className="w-12 sm:w-16 md:w-20 h-12 sm:h-16 md:h-20 text-white" />
                    </div>
                    <div className="flex flex-col justify-between relative z-10 gap-2 sm:gap-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-white/10 rounded-lg text-white border border-white/10 flex-shrink-0">
                          <TrendingUpIcon className="w-4 sm:w-4 md:w-5 h-4 sm:h-4 md:h-5" />
                        </div>
                        <p className="text-[10px] sm:text-[10px] md:text-[11px] text-teal-100/80 font-bold uppercase tracking-wide">{analyticsYear} {t.totalIncome}</p>
                      </div>
                      <div>
                        <NumberTooltip value={yearlyAnalyticsTotals.income} label={`${analyticsYear} ${t.totalIncome}`} theme={theme}>
                          <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-4xl font-black text-white tracking-tight leading-none font-mono cursor-help whitespace-nowrap">
                            {formatNumberSmart(yearlyAnalyticsTotals.income, isMobile, language)}
                          </h3>
                        </NumberTooltip>
                        <p className="text-[10px] sm:text-[11px] md:text-xs text-teal-100/60 font-medium mt-1.5 ml-0.5">UZS</p>
                      </div>
                    </div>
                  </div>

                  {/* Yearly Expense */}
                  <div className={`p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border shadow-lg relative overflow-hidden group transition-all ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-100'
                    }`}>
                    <div className={`absolute top-0 right-0 p-3 transition-opacity ${theme === 'dark' ? 'opacity-5 group-hover:opacity-10' : 'opacity-[0.08] group-hover:opacity-[0.12]'}`}>
                      <TrendingDownIcon className={`w-12 sm:w-16 md:w-20 h-12 sm:h-16 md:h-20 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`} />
                    </div>
                    <div className="flex flex-col justify-between relative z-10 gap-2 sm:gap-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg border flex-shrink-0 ${theme === 'dark' ? 'bg-gray-800 text-red-400 border-gray-700' : 'bg-red-50 text-red-500 border-red-100'
                          }`}>
                          <TrendingDownIcon className="w-4 sm:w-4 md:w-5 h-4 sm:h-4 md:h-5" />
                        </div>
                        <p className={`text-[10px] sm:text-[10px] md:text-[11px] font-bold uppercase tracking-wide ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'
                          }`}>{analyticsYear} {t.totalExpense}</p>
                      </div>
                      <div>
                        <NumberTooltip value={yearlyAnalyticsTotals.expense} label={`${analyticsYear} ${t.totalExpense}`} theme={theme}>
                          <h3 className={`text-2xl sm:text-3xl md:text-4xl lg:text-4xl font-black tracking-tight leading-none font-mono cursor-help whitespace-nowrap ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>
                            {formatNumberSmart(yearlyAnalyticsTotals.expense, isMobile, language)}
                          </h3>
                        </NumberTooltip>
                        <p className={`text-[10px] sm:text-[11px] md:text-xs font-medium mt-1.5 ml-0.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                          }`}>UZS</p>
                      </div>
                    </div>
                  </div>

                  {/* Yearly Net Profit */}
                  <div className={`p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border shadow-lg relative overflow-hidden group transition-all sm:col-span-2 lg:col-span-1 ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-100'
                    }`}>
                    <div className={`absolute top-0 right-0 p-3 transition-opacity ${theme === 'dark' ? 'opacity-5 group-hover:opacity-10' : 'opacity-[0.08] group-hover:opacity-[0.12]'}`}>
                      <WalletIcon className={`w-12 sm:w-16 md:w-20 h-12 sm:h-16 md:h-20 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`} />
                    </div>
                    <div className="flex flex-col justify-between relative z-10 gap-2 sm:gap-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg border flex-shrink-0 ${theme === 'dark' ? 'bg-gray-800 text-[#0d9488] border-gray-700' : 'bg-[#0d9488]/10 text-[#0d9488] border-[#0d9488]/20'
                          }`}>
                          <WalletIcon className="w-4 sm:w-4 md:w-5 h-4 sm:h-4 md:h-5" />
                        </div>
                        <p className={`text-[10px] sm:text-[10px] md:text-[11px] font-bold uppercase tracking-wide ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'
                          }`}>{analyticsYear} {t.netProfit}</p>
                      </div>
                      <div>
                        <NumberTooltip value={yearlyAnalyticsTotals.netProfit} label={`${analyticsYear} ${t.netProfit}`} theme={theme}>
                          <h3 className={`text-2xl sm:text-3xl md:text-4xl lg:text-4xl font-black tracking-tight leading-none font-mono cursor-help whitespace-nowrap ${yearlyAnalyticsTotals.netProfit > 0
                            ? theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                            : yearlyAnalyticsTotals.netProfit < 0
                              ? theme === 'dark' ? 'text-red-400' : 'text-red-600'
                              : theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                            }`}>
                            {yearlyAnalyticsTotals.netProfit > 0 ? '+' : ''}{formatNumberSmart(yearlyAnalyticsTotals.netProfit, isMobile, language)}
                          </h3>
                        </NumberTooltip>
                        <p className={`text-[10px] sm:text-[11px] md:text-xs font-medium mt-1.5 ml-0.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                          }`}>UZS</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Monthly Analytics Chart */}
                <div className={`w-full h-[300px] sm:h-[400px] p-4 sm:p-6 rounded-2xl sm:rounded-3xl border flex flex-col shadow-xl ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <h3 className={`text-sm sm:text-base md:text-lg font-bold flex items-center gap-2 opacity-80 ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                      <BanknoteIcon className={`w-4 sm:w-5 h-4 sm:h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                      {t.monthlyAnalytics}
                    </h3>

                    {/* Year Selector */}
                    <YearSelector
                      selectedYear={analyticsYear}
                      onYearChange={setAnalyticsYear}
                      theme={theme}
                      startYear={new Date().getFullYear()}
                      endYear={new Date().getFullYear() + 10}
                    />
                  </div>
                  <div className="flex-1 -mx-2 sm:mx-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyAnalyticsData} barSize={30} margin={{ left: 0, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#E5E7EB'} vertical={false} />
                        <XAxis
                          dataKey="name"
                          stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'}
                          axisLine={false}
                          tickLine={false}
                          dy={10}
                          fontSize={12}
                          interval={0}
                        />
                        <YAxis
                          stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'}
                          axisLine={false}
                          tickLine={false}
                          dx={-10}
                          fontSize={10}
                          tickFormatter={(value) => {
                            if (value >= 1000000000) {
                              return `${(value / 1000000000).toFixed(1)}${language === 'en' ? 'B' : 'mlrd'}`;
                            }
                            if (value >= 1000000) {
                              return `${(value / 1000000).toFixed(1)}${language === 'en' ? 'M' : 'mln'}`;
                            }
                            if (value >= 1000) {
                              return `${(value / 1000).toFixed(0)}k`;
                            }
                            return value;
                          }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
                            border: `1px solid ${theme === 'dark' ? '#374151' : '#E5E7EB'}`,
                            borderRadius: '12px',
                            color: theme === 'dark' ? '#FFFFFF' : '#111827',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            fontSize: '12px'
                          }}
                          cursor={{ fill: theme === 'dark' ? '#374151' : '#F3F4F6', opacity: 0.5 }}
                          itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                          formatter={(value: number) => value.toLocaleString()}
                        />
                        <Bar dataKey="Income" name={t.income} fill="#0d9488" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="Expense" name={t.expense} fill="#EF4444" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>} />

            {/* TRANSACTIONS COMPONENT */}
            <Route path="/transactions" element={<>
              <div className="space-y-6">
                {/* Filters */}
                <div className={`p-4 rounded-2xl border shadow-lg ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                    {/* Start Date */}
                    <div className="w-full">
                      <DatePicker
                        label={t.fromDate}
                        value={financeStartDate}
                        onChange={setFinanceStartDate}
                        theme={theme}
                      />
                    </div>
                    {/* End Date */}
                    <div className="w-full">
                      <DatePicker
                        label={t.toDate}
                        value={financeEndDate}
                        onChange={setFinanceEndDate}
                        theme={theme}
                      />
                    </div>
                    {/* Driver Select */}
                    <div className="w-full">
                      <CustomSelect
                        label={t.driver}
                        value={financeDriverFilter}
                        onChange={setFinanceDriverFilter}
                        options={[
                          { id: 'all', name: t.allDrivers },
                          ...nonDeletedDrivers.map(d => ({ id: d.id, name: d.name }))
                        ]}
                        theme={theme}
                        icon={UsersIcon}
                      />
                    </div>
                    {/* Type Select */}
                    <div className="w-full">
                      <CustomSelect
                        label={t.filters}
                        value={financeTypeFilter}
                        onChange={(val) => setFinanceTypeFilter(val as 'all' | TransactionType)}
                        options={[
                          { id: 'all', name: t.transactions },
                          { id: TransactionType.INCOME, name: t.income },
                          { id: TransactionType.EXPENSE, name: t.expense }
                        ]}
                        theme={theme}
                        icon={FilterIcon}
                        showSearch={false}
                      />
                    </div>
                  </div>
                </div>

                {/* Bulk Delete Button - Only show if transactions are selected */}
                {userRole === 'admin' && selectedTransactions.length > 0 && (
                  <div>
                    <button
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: t.confirmDeleteTitle,
                          message: `Are you sure you want to delete ${selectedTransactions.length} transaction(s)?`,
                          isDanger: true,
                          action: async () => {
                            closeConfirmModal();
                            const previousTransactions = transactions;
                            setTransactions(transactions.filter(t => !selectedTransactions.includes(t.id)));
                            setSelectedTransactions([]);

                            try {
                              await Promise.all(selectedTransactions.map(id => firestoreService.deleteTransaction(id)));
                            } catch (error) {
                              console.error('Failed to delete transactions:', error);
                              setTransactions(previousTransactions);
                            }
                          }
                        });
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-all shadow-md"
                    >
                      <TrashIcon className="w-5 h-5" />
                      Delete {selectedTransactions.length} selected
                    </button>
                  </div>
                )}

                {/* Transactions Table */}
                <div className={`rounded-3xl border overflow-hidden shadow-xl ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[800px]">
                      <thead className={`border-b ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                        <tr className={`${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                          {userRole === 'admin' && (
                            <th className={`px-6 py-4 font-bold text-xs uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                              <input
                                type="checkbox"
                                checked={selectedTransactions.length === financeFilteredData.length && financeFilteredData.length > 0}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedTransactions(financeFilteredData.map(t => t.id));
                                  } else {
                                    setSelectedTransactions([]);
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className={`w-5 h-5 rounded-md transition-all duration-200 cursor-pointer ${theme === 'dark'
                                  ? 'bg-gray-700 border-gray-600 checked:bg-[#0d9488] checked:border-[#0d9488] hover:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488] focus:ring-offset-0 focus:ring-offset-gray-800'
                                  : 'bg-white border-gray-300 checked:bg-[#0d9488] checked:border-[#0d9488] hover:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488] focus:ring-offset-0'
                                  }`}
                              />
                            </th>
                          )}
                          <th className={`px-6 py-4 font-bold text-xs uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t.time}</th>
                          <th className={`px-6 py-4 font-bold text-xs uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t.driver}</th>
                          <th className={`px-6 py-4 font-bold text-xs uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t.comment}</th>
                          <th className={`px-6 py-4 font-bold text-xs uppercase tracking-wider text-right ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t.amount}</th>
                          <th className={`px-6 py-4 font-bold text-xs uppercase tracking-wider text-right ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t.actions}</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-100'}`}>
                        {(() => {
                          const startIndex = (financePageNumber - 1) * TRANSACTIONS_PER_PAGE;
                          const endIndex = startIndex + TRANSACTIONS_PER_PAGE;
                          const paginatedData = financeFilteredData.slice(startIndex, endIndex);

                          if (paginatedData.length === 0 && financeFilteredData.length === 0) {
                            return (
                              <tr>
                                <td colSpan={6} className={`px-6 py-12 text-center text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                  {t.noTransactions}
                                </td>
                              </tr>
                            );
                          }

                          return paginatedData.map(tx => {
                            const driver = drivers.find(d => d.id === tx.driverId);
                            return (
                              <tr key={tx.id} className={`transition-colors group ${theme === 'dark' ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'
                                }`}>
                                {userRole === 'admin' && (
                                  <td className="px-6 py-4">
                                    <input
                                      type="checkbox"
                                      checked={selectedTransactions.includes(tx.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedTransactions([...selectedTransactions, tx.id]);
                                        } else {
                                          setSelectedTransactions(selectedTransactions.filter(id => id !== tx.id));
                                        }
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className={`w-5 h-5 rounded-md transition-all duration-200 cursor-pointer ${theme === 'dark'
                                        ? 'bg-gray-700 border-gray-600 checked:bg-[#0d9488] checked:border-[#0d9488] hover:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488] focus:ring-offset-0 focus:ring-offset-gray-800'
                                        : 'bg-white border-gray-300 checked:bg-[#0d9488] checked:border-[#0d9488] hover:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488] focus:ring-offset-0'
                                        }`}
                                    />
                                  </td>
                                )}
                                <td className="px-6 py-4">
                                  <div className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                  <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>{new Date(tx.timestamp).toLocaleDateString()}</div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full overflow-hidden border flex-shrink-0 ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'} ${driver?.isDeleted ? 'opacity-50 grayscale' : ''}`}>
                                      {driver ? <img src={driver.avatar} className="w-full h-full object-cover" alt={driver.name} /> : <div className="w-full h-full bg-gray-300" />}
                                    </div>
                                    <div className="flex flex-col">
                                      <div className="flex items-center gap-2">
                                        <span className={`text-sm font-bold ${driver?.isDeleted ? (theme === 'dark' ? 'text-red-400' : 'text-red-600') : (theme === 'dark' ? 'text-white' : 'text-gray-900')}`}>
                                          {driver?.name || 'Deleted'}
                                        </span>
                                        {driver?.isDeleted && (
                                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${theme === 'dark' ? 'border-red-900/50 bg-red-900/20 text-red-400' : 'border-red-200 bg-red-50 text-red-600'}`}>
                                            {t.deleted}
                                          </span>
                                        )}
                                      </div>
                                      {driver?.isDeleted && (
                                        <div className={`text-xs flex gap-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                                          <span>{driver.licensePlate}</span>
                                          <span>•</span>
                                          <span>{driver.phone}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className={`px-6 py-4 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                                  {/* Translate known English descriptions */}
                                  {tx.description === 'Salary Refund: Manual Action'
                                    ? t.salaryRefundDescription
                                    : tx.description}
                                </td>
                                <td className={`px-6 py-4 text-sm font-bold text-right font-mono ${tx.type === TransactionType.INCOME ? 'text-[#0d9488]' : 'text-red-500'
                                  }`}>
                                  {tx.type === TransactionType.INCOME ? '+' : '-'}{tx.amount.toLocaleString()} <span className="ml-1">UZS</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  {userRole === 'admin' && (
                                    <button onClick={() => handleDeleteTransaction(tx.id)} className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-red-400 hover:bg-red-400/10' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                      }`}>
                                      <TrashIcon className="w-4 h-4" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {financeFilteredData.length > TRANSACTIONS_PER_PAGE && (
                    <div className={`flex items-center justify-center gap-2 p-4 border-t ${theme === 'dark' ? 'border-gray-700 bg-gray-800/30' : 'border-gray-100 bg-gray-50/50'}`}>
                      <button
                        onClick={() => setFinancePageNumber(Math.max(1, financePageNumber - 1))}
                        disabled={financePageNumber === 1}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${financePageNumber === 1
                          ? theme === 'dark'
                            ? 'text-gray-600 cursor-not-allowed'
                            : 'text-gray-300 cursor-not-allowed'
                          : theme === 'dark'
                            ? 'text-white hover:bg-gray-700 active:scale-95'
                            : 'text-gray-900 hover:bg-gray-100 active:scale-95'
                          }`}
                      >
                        ← {t.previous}
                      </button>

                      <div className="flex items-center gap-1">
                        {(() => {
                          const totalPages = Math.ceil(financeFilteredData.length / TRANSACTIONS_PER_PAGE);
                          const pages = [];
                          const maxPagesToShow = 5;
                          let startPage = Math.max(1, financePageNumber - Math.floor(maxPagesToShow / 2));
                          let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

                          if (endPage - startPage + 1 < maxPagesToShow) {
                            startPage = Math.max(1, endPage - maxPagesToShow + 1);
                          }

                          if (startPage > 1) {
                            pages.push(
                              <button
                                key={1}
                                onClick={() => setFinancePageNumber(1)}
                                className={`px-3 py-2 rounded-lg font-medium transition-all ${financePageNumber === 1 ? 'bg-[#0d9488] text-white' : theme === 'dark' ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                              >
                                1
                              </button>
                            );
                            if (startPage > 2) {
                              pages.push(
                                <span key="dots1" className={`px-2 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>...</span>
                              );
                            }
                          }

                          for (let i = startPage; i <= endPage; i++) {
                            pages.push(
                              <button
                                key={i}
                                onClick={() => setFinancePageNumber(i)}
                                className={`px-3 py-2 rounded-lg font-medium transition-all ${financePageNumber === i
                                  ? 'bg-[#0d9488] text-white shadow-md'
                                  : theme === 'dark'
                                    ? 'text-gray-400 hover:bg-gray-700'
                                    : 'text-gray-600 hover:bg-gray-100'
                                  }`}
                              >
                                {i}
                              </button>
                            );
                          }

                          if (endPage < totalPages) {
                            if (endPage < totalPages - 1) {
                              pages.push(
                                <span key="dots2" className={`px-2 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>...</span>
                              );
                            }
                            pages.push(
                              <button
                                key={totalPages}
                                onClick={() => setFinancePageNumber(totalPages)}
                                className={`px-3 py-2 rounded-lg font-medium transition-all ${financePageNumber === totalPages ? 'bg-[#0d9488] text-white' : theme === 'dark' ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                              >
                                {totalPages}
                              </button>
                            );
                          }

                          return pages;
                        })()}
                      </div>

                      <button
                        onClick={() => setFinancePageNumber(Math.min(Math.ceil(financeFilteredData.length / TRANSACTIONS_PER_PAGE), financePageNumber + 1))}
                        disabled={financePageNumber === Math.ceil(financeFilteredData.length / TRANSACTIONS_PER_PAGE)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${financePageNumber === Math.ceil(financeFilteredData.length / TRANSACTIONS_PER_PAGE)
                          ? theme === 'dark'
                            ? 'text-gray-600 cursor-not-allowed'
                            : 'text-gray-300 cursor-not-allowed'
                          : theme === 'dark'
                            ? 'text-white hover:bg-gray-700 active:scale-95'
                            : 'text-gray-900 hover:bg-gray-100 active:scale-95'
                          }`}
                      >
                        {t.next} →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>} />

            {/* SALARY MANAGEMENT COMPONENT */}
            <Route path="/salary" element={<SalaryManagement language={language} theme={theme} drivers={drivers} salaryHistory={salaryHistory} onPaySalary={handlePaySalary} userRole={userRole} transactions={transactions} />} />

            <Route path="/roles" element={userRole === 'admin' ? (
              <RolesManagement
                theme={theme}
                language={language}
                adminName={adminProfile?.name || 'Admin'}
              />
            ) : <Navigate to="/dashboard" replace />} />
          </Routes>
        </main >
      </div >

      {/* MODALS */}
      < FinancialModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        onSubmit={handleAddTransaction}
        drivers={nonDeletedDrivers}
        lang={language}
        theme={theme}
      />

      <DriverModal
        isOpen={isDriverModalOpen}
        onClose={() => { setIsDriverModalOpen(false); setEditingDriver(null); }}
        onSubmit={handleSaveDriver}
        editingDriver={editingDriver}
        lang={language}
        theme={theme}
      />

      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        adminData={adminProfile || { name: 'Admin', role: 'Manager', avatar: '' }}
        onUpdate={(profile) => {
          // Update admin profile
          firestoreService.updateAdminProfile(profile);
          // If password is being updated, save it to localStorage and show toast
          if (profile.password) {
            localStorage.setItem('avtorim_admin_password', profile.password);
            addToast('success', TRANSLATIONS[language].passwordUpdated, 4000);
          }
          setIsAdminModalOpen(false);
        }}
        lang={language}
        userRole={userRole}
        theme={theme}
      />

      {/* CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.action}
        onCancel={closeConfirmModal}
        lang={language}
        isDanger={confirmModal.isDanger}
        theme={theme}
      />

      {/* TOAST NOTIFICATIONS */}
      <ToastContainer theme={theme} />
    </div >
  );
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
};

export default App;
