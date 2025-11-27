import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  LayoutDashboardIcon, MapIcon, UsersIcon, BanknoteIcon, PlusIcon, CarIcon, TrashIcon, UserPlusIcon, EditIcon, MenuIcon, XIcon, GlobeIcon, CalendarIcon, TrophyIcon, CheckCircleIcon, LogOutIcon, LockIcon, FilterIcon, DownloadIcon, ChevronDownIcon, TelegramIcon, MedalIcon, TrendingUpIcon, TrendingDownIcon, WalletIcon, SunIcon, MoonIcon
} from './components/Icons';
import MapView from './components/MapView';
import FinancialModal from './components/FinancialModal';
import DriverModal from './components/DriverModal';
import AdminModal from './components/AdminModal';
import AuthScreen from './components/AuthScreen';
import ConfirmModal from './components/ConfirmModal';
import NumberTooltip from './components/NumberTooltip';
import DateFilter from './components/DateFilter';
import DatePicker from './components/DatePicker';
import CustomSelect from './components/CustomSelect';
import DesktopHeader from './components/DesktopHeader';
import { MOCK_DRIVERS, MOCK_TRANSACTIONS, CITY_CENTER } from './constants';
import { Driver, Transaction, TransactionType, DriverStatus, Language, TimeFilter, Tab } from './types';
import { TRANSLATIONS } from './translations';
import { formatNumberSmart } from './utils/formatNumber';
import * as firestoreService from './services/firestoreService';
import { fetchDriverLocations } from './services/ownTracksService';

const App: React.FC = () => {
  const [userRole, setUserRole] = useState<'admin' | 'viewer'>(() => {
    return (localStorage.getItem('avtorim_role') as 'admin' | 'viewer') || 'viewer';
  });

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('avtorim_auth') === 'true';
  });

  // State variables
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');
  const [financeDriverFilter, setFinanceDriverFilter] = useState('all');
  const [financeStartDate, setFinanceStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [financeEndDate, setFinanceEndDate] = useState(new Date());

  // Firebase state - starts empty, will sync from cloud
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [adminProfile, setAdminProfile] = useState({
    name: 'Admin',
    role: 'Dispetcher',
    avatar: '' // Will be set by user
  });
  const [isFirebaseLoaded, setIsFirebaseLoaded] = useState(false);

  // Language State
  const [language, setLanguage] = useState<Language>('uz');
  const t = TRANSLATIONS[language];

  // Modals
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

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


  // Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('avtorim_theme') as 'dark' | 'light') || 'dark';
  });

  // Mobile detection hook
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
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

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
    });

    // Cleanup subscriptions on logout
    return () => {
      unsubDrivers();
      unsubTx();
      unsubAdmin();
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

  // --- MOCK REAL-TIME UPDATES ---
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      setDrivers(prevDrivers => prevDrivers.map(d => {
        if (d.status === DriverStatus.OFFLINE) return d;
        const moveLat = (Math.random() - 0.5) * 0.0015;
        const moveLng = (Math.random() - 0.5) * 0.0015;
        return {
          ...d,
          location: {
            lat: d.location.lat + moveLat,
            lng: d.location.lng + moveLng,
            heading: d.location.heading
          }
        };
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // --- OWNTRACKS REAL-TIME UPDATES ---
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchLocations = async () => {
      const locations = await fetchDriverLocations();
      if (locations.length > 0) {
        setDrivers(prevDrivers => {
          return prevDrivers.map(driver => {
            const loc = locations.find(l => l.driver_id === driver.id);
            if (loc) {
              return {
                ...driver,
                location: {
                  lat: loc.latitude,
                  lng: loc.longitude,
                  heading: driver.location.heading // Keep existing heading or calculate new one
                },
                lastUpdate: loc.last_update_ts * 1000 // Convert to ms
              };
            }
            return driver;
          });
        });
      }
    };

    // Poll every 5 seconds
    const interval = setInterval(fetchLocations, 5000);
    fetchLocations(); // Initial fetch

    return () => clearInterval(interval);
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
      return dateMatch && driverMatch;
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions, financeStartDate, financeEndDate, financeDriverFilter]);

  // --- ACTIONS ---

  const handleLogin = (role: 'admin' | 'viewer' = 'admin') => {
    setIsAuthenticated(true);
    setUserRole(role);
    localStorage.setItem('avtorim_role', role);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole('viewer'); // Default back to viewer
    localStorage.removeItem('avtorim_role');
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
          closeConfirmModal();
        } catch (error) {
          console.error('Failed to delete transaction:', error);
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
        await firestoreService.updateDriver(id, updateData);
      } else {
        // Add new driver
        const newDriver = {
          name: data.name,
          licensePlate: data.licensePlate,
          carModel: data.carModel,
          phone: data.phone,
          status: data.status || DriverStatus.OFFLINE,
          avatar: data.avatar || '', // User should provide their own avatar
          telegram: data.telegram,
          location: {
            lat: CITY_CENTER.lat + (Math.random() - 0.5) * 0.05,
            lng: CITY_CENTER.lng + (Math.random() - 0.5) * 0.05,
            heading: 0
          },
          balance: 0,
          rating: 5.0
        };
        await firestoreService.addDriver(newDriver);
      }
    } catch (error) {
      console.error('Failed to save driver:', error);
    }
  };

  const handleEditDriverClick = (driver: Driver) => {
    setEditingDriver(driver);
    setIsDriverModalOpen(true);
  };

  const handleDeleteDriver = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: t.confirmDeleteTitle,
      message: t.deleteConfirmDriver,
      isDanger: true,
      action: async () => {
        try {
          await firestoreService.deleteDriver(id);
          closeConfirmModal();
        } catch (error) {
          console.error('Failed to delete driver:', error);
          closeConfirmModal();
        }
      }
    });
  };

  // --- STATS CALC ---
  const filteredTx = getDashboardFilteredTransactions;
  const totalIncome = filteredTx.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = filteredTx.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
  const netProfit = totalIncome - totalExpense;

  const chartData = useMemo(() => {
    return drivers.map(d => {
      const dIncome = filteredTx.filter(t => t.driverId === d.id && t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
      const dExpense = filteredTx.filter(t => t.driverId === d.id && t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
      return { name: d.name.split(' ')[0], Income: dIncome, Expense: dExpense };
    });
  }, [drivers, filteredTx]);

  // Leaderboard Data Calculation
  const topDrivers = useMemo(() => {
    const stats = drivers.map(d => {
      const income = filteredTx.filter(t => t.driverId === d.id && t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
      return { ...d, income };
    });
    return stats.sort((a, b) => b.income - a.income).slice(0, 5); // Top 5
  }, [drivers, filteredTx]);

  const activeDriversList = useMemo(() => {
    return drivers.filter(d => d.status === DriverStatus.ACTIVE);
  }, [drivers]);

  // Finance Tab Stats
  const financeFilteredData = getFinanceFilteredTransactions;
  const financeIncome = financeFilteredData.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
  const financeExpense = financeFilteredData.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
  const financeCashflow = financeIncome - financeExpense;

  // --- RENDER HELPERS ---
  const renderSidebarItem = (tab: Tab, label: string, Icon: React.FC<any>) => (
    <button
      onClick={() => { setActiveTab(tab); setIsSidebarOpen(false); }}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all mb-2 ${activeTab === tab
        ? 'bg-[#2D6A76] text-white shadow-lg shadow-teal-900/20'
        : theme === 'dark'
          ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
        }`}
    >
      <Icon className={`w-5 h-5 ${activeTab === tab
        ? 'text-white'
        : theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
        }`} />
      <span className="font-medium text-sm">{label}</span>
    </button>
  );

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


  return (
    <div className={`flex h-screen overflow-hidden font-sans transition-colors duration-200 ${theme === 'dark'
      ? 'bg-[#111827] text-gray-50'
      : 'bg-[#F3F4F6] text-gray-900'
      }`}>

      {/* SIDEBAR */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 border-r flex flex-col transform transition-all duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${theme === 'dark'
          ? 'bg-[#1F2937] border-gray-800'
          : 'bg-white border-gray-200'
        }`}>
        <div className="absolute top-4 right-4 md:hidden">
          <button onClick={() => setIsSidebarOpen(false)} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}><XIcon className="w-6 h-6" /></button>
        </div>
        <div className="p-8">
          <div className="flex items-center gap-3 mb-1">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme === 'dark' ? 'bg-[#2D6A76] text-white' : 'bg-[#2D6A76] text-white'
              }`}>
              <CarIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className={`text-xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>Avtorim<span className="text-[#2D6A76]"> Taxi</span></h1>
              <p className={`text-[10px] uppercase tracking-widest font-semibold ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                }`}>Toshkent</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-4 overflow-y-auto">
          <div className={`text-xs font-semibold uppercase tracking-wider mb-4 px-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
            }`}>{t.menu}</div>
          {renderSidebarItem(Tab.DASHBOARD, t.dashboard, LayoutDashboardIcon)}
          {renderSidebarItem(Tab.MAP, t.liveMap, MapIcon)}
          {renderSidebarItem(Tab.DRIVERS, t.driversList, UsersIcon)}
          {renderSidebarItem(Tab.FINANCE, t.financialReports, BanknoteIcon)}
        </nav>

        {/* Sidebar Bottom Section */}
        <div className="px-6 pb-4 space-y-3 md:hidden">
          {/* Theme Toggle - Mobile Only */}
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${theme === 'dark'
              ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            <div className="flex items-center gap-3">
              {theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
              <span className="font-medium text-sm">
                {theme === 'dark' ? 'Light' : 'Dark'}
              </span>
            </div>
          </button>

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
          <button onClick={handleLogout} className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl border transition-all text-xs font-bold uppercase tracking-wider group ${theme === 'dark'
            ? 'bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 border-red-500/20'
            : 'bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border-red-200'
            }`}>
            <LogOutIcon className="w-4 h-4" />
            <span className="group-hover:translate-x-0.5 transition-transform">Lock System</span>
          </button>
        </div>
      </div>

      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Desktop Header - Hidden on Mobile */}
        <DesktopHeader
          theme={theme}
          onThemeToggle={toggleTheme}
          language={language}
          onLanguageChange={setLanguage}
          activeTab={activeTab}
          isMobile={isMobile}
          onNewTransactionClick={() => setIsTxModalOpen(true)}
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
                {activeTab === Tab.DASHBOARD && t.overview}
                {activeTab === Tab.MAP && t.globalTracking}
                {activeTab === Tab.DRIVERS && t.driversList}
                {activeTab === Tab.FINANCE && t.financialReports}
              </h2>
              <p className={`text-xs mt-1 hidden sm:block ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                {activeTab === Tab.DASHBOARD && t.descDashboard}
                {activeTab === Tab.MAP && t.descMap}
                {activeTab === Tab.DRIVERS && t.descDrivers}
                {activeTab === Tab.FINANCE && t.descFinance}
              </p>
            </div>
          </div>
        </header>

        {/* ACTION BUTTONS ROW - Mobile Only */}
        <div className={`flex items-center justify-between px-6 md:px-8 py-3 md:py-4 border-b sticky top-20 z-10 md:hidden ${theme === 'dark' ? 'bg-[#111827] border-gray-800' : 'bg-[#F3F4F6] border-gray-200'
          }`}>
          {activeTab === Tab.DRIVERS && userRole === 'admin' && (
            <>
              <button onClick={() => { setEditingDriver(null); setIsDriverModalOpen(true); }} className={`flex items-center justify-center gap-2 border px-3 py-2 rounded-xl font-medium text-xs transition-all w-full sm:w-auto ${theme === 'dark'
                ? 'bg-[#2D6A76] hover:bg-[#235560] border-transparent text-white'
                : 'bg-[#2D6A76] hover:bg-[#235560] border-transparent text-white shadow-sm'
                }`}>
                <PlusIcon className="w-4 h-4" /> <span>{t.add}</span>
              </button>
            </>
          )}

          {(activeTab === Tab.FINANCE || activeTab === Tab.DASHBOARD) && userRole === 'admin' && (
            <button onClick={() => setIsTxModalOpen(true)} className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl font-medium text-xs transition-all shadow-lg active:scale-95 w-full sm:w-auto ${theme === 'dark'
              ? 'bg-[#2D6A76] hover:bg-[#235560] text-white shadow-blue-900/20'
              : 'bg-[#2D6A76] hover:bg-[#235560] text-white shadow-blue-500/30'
              }`}>
              <PlusIcon className="w-4 h-4" /> <span>{t.newTransfer}</span>
            </button>
          )}
        </div>

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8 relative z-0 custom-scrollbar">

          {/* DASHBOARD */}
          {activeTab === Tab.DASHBOARD && (
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
                {/* Income - Primary Card (Teal) */}
                <div className="bg-[#2D6A76] p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl shadow-lg relative overflow-hidden group transition-all hover:shadow-xl">
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
                          {formatNumberSmart(totalIncome, isMobile)}
                        </h3>
                      </NumberTooltip>
                      <p className="text-[10px] sm:text-[11px] md:text-xs text-teal-100/60 font-medium mt-1.5">UZS</p>
                    </div>
                  </div>
                </div>

                {/* Expense - Secondary Card (White/Dark) */}
                <div className={`p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border shadow-lg relative overflow-hidden group transition-all ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-100'
                  }`}>
                  <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
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
                          {formatNumberSmart(totalExpense, isMobile)}
                        </h3>
                      </NumberTooltip>
                      <p className={`text-[10px] sm:text-[11px] md:text-xs font-medium mt-1.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                        }`}>UZS</p>
                    </div>
                  </div>
                </div>

                {/* Net Profit - Secondary Card (White/Dark) */}
                <div className={`p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border shadow-lg relative overflow-hidden group transition-all sm:col-span-2 lg:col-span-1 ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-100'
                  }`}>
                  <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                    <WalletIcon className={`w-12 sm:w-16 md:w-20 h-12 sm:h-16 md:h-20 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`} />
                  </div>
                  <div className="flex flex-col justify-between relative z-10 gap-2 sm:gap-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg border flex-shrink-0 ${theme === 'dark' ? 'bg-gray-800 text-blue-400 border-gray-700' : 'bg-blue-50 text-blue-500 border-blue-100'
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
                          {netProfit > 0 ? '+' : ''}{formatNumberSmart(netProfit, isMobile)}
                        </h3>
                      </NumberTooltip>
                      <p className={`text-[10px] sm:text-[11px] md:text-xs font-medium mt-1.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                        }`}>UZS</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* MIDDLE ROW: Chart - Full Width */}
              <div className={`w-full h-[300px] sm:h-[400px] md:h-[500px] p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border flex flex-col shadow-xl ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'
                }`}>
                <h3 className={`text-sm sm:text-base md:text-lg font-bold mb-4 sm:mb-6 flex items-center gap-2 opacity-80 ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                  <LayoutDashboardIcon className={`w-4 sm:w-5 h-4 sm:h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                  {t.incomeVsExpense}
                </h3>
                <div className="flex-1 -mx-2 sm:mx-0">
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
                        tickFormatter={(value) => `${value / 1000}k`}
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
                      <Bar dataKey="Income" name={t.income} fill="#2D6A76" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="Expense" name={t.expense} fill="#EF4444" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
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
                        <p className="text-lg font-bold text-[#2D6A76]">{driver.income.toLocaleString()}</p>
                        <p className={`text-[10px] uppercase font-semibold ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>UZS</p>
                      </div>
                    </div>
                  )) : (
                    <div className={`text-center py-10 text-sm col-span-full ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Ma'lumotlar yo'q</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* MAP */}
          {activeTab === Tab.MAP && (
            <div className={`h-[calc(100vh-10rem)] w-full rounded-2xl overflow-hidden shadow-2xl border relative ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'
              }`}>
              <MapView drivers={drivers} lang={language} />
            </div>
          )}

          {/* DRIVERS */}
          {activeTab === Tab.DRIVERS && (
            <>
              {drivers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {drivers.map(driver => (
                    <div key={driver.id} className={`rounded-2xl p-6 flex flex-col gap-4 transition-all group relative border ${theme === 'dark'
                      ? 'bg-[#1F2937] border-gray-700 hover:border-gray-600'
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-lg'
                      }`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full border-2 transition-colors shadow-lg overflow-hidden flex-shrink-0 ${theme === 'dark' ? 'border-gray-600 group-hover:border-[#2D6A76]' : 'border-gray-200 group-hover:border-[#2D6A76]'
                          }`}>
                          <img src={driver.avatar} className="w-full h-full object-cover" alt={driver.name} />
                        </div>
                        <div className="min-w-0">
                          <h3 className={`font-bold text-lg truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{driver.name}</h3>
                          <p className={`text-sm truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{driver.carModel}</p>
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mt-2 ${driver.status === DriverStatus.ACTIVE
                            ? theme === 'dark' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-green-50 text-green-700 border border-green-200'
                            : theme === 'dark' ? 'bg-gray-700 text-gray-400 border border-gray-600' : 'bg-gray-100 text-gray-500 border border-gray-200'
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${driver.status === DriverStatus.ACTIVE ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                            {driver.status === DriverStatus.ACTIVE ? t.active : t.inactive}
                          </div>
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
                              ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20'
                              : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
                              }`}
                          >
                            <EditIcon className="w-4 h-4" />
                            <span>Edit</span>
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
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`flex flex-col items-center justify-center h-64 rounded-2xl border ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-gray-800 text-gray-600' : 'bg-gray-50 text-gray-400'}`}>
                    <UsersIcon className="w-8 h-8" />
                  </div>
                  <p className={`text-lg font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Hozircha haydovchilar yo'q</p>
                  {userRole === 'admin' && (
                    <button
                      onClick={() => { setEditingDriver(null); setIsDriverModalOpen(true); }}
                      className="mt-4 px-4 py-2 bg-[#2D6A76] hover:bg-[#235560] text-white rounded-xl text-sm font-medium transition-colors"
                    >
                      {t.addDriver}
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* FINANCE & FILTER COMPONENT */}
          {/* FINANCE & FILTER COMPONENT */}
          {(activeTab === Tab.FINANCE) && (
            <div className="space-y-6">
              {/* Filters */}
              <div className={`p-4 rounded-3xl border shadow-xl flex flex-col lg:flex-row gap-4 items-center justify-between ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'
                }`}>
                <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto">
                  {/* Start Date */}
                  <div className="w-full md:w-64">
                    <DatePicker
                      label={t.fromDate}
                      value={financeStartDate}
                      onChange={setFinanceStartDate}
                      theme={theme}
                    />
                  </div>
                  {/* End Date */}
                  <div className="w-full md:w-64">
                    <DatePicker
                      label={t.toDate}
                      value={financeEndDate}
                      onChange={setFinanceEndDate}
                      theme={theme}
                    />
                  </div>
                  {/* Driver Select */}
                  <div className="w-full md:w-64">
                    <CustomSelect
                      label={t.driver}
                      value={financeDriverFilter}
                      onChange={setFinanceDriverFilter}
                      options={[
                        { id: 'all', name: t.allDrivers },
                        ...drivers.map(d => ({ id: d.id, name: d.name }))
                      ]}
                      theme={theme}
                      icon={UsersIcon}
                    />
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {/* Total Income - Primary Card */}
                <div className="bg-[#2D6A76] p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-lg text-white relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <TrendingUpIcon className="w-12 sm:w-16 h-12 sm:h-16" />
                  </div>
                  <div className="relative z-10">
                    <p className="text-blue-100 text-[8px] sm:text-[9px] font-bold uppercase tracking-wide mb-1">{t.totalIncome}</p>
                    <NumberTooltip value={financeIncome} label={t.totalIncome} theme={theme}>
                      <h3 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-tight font-mono cursor-help">
                        {formatNumberSmart(financeIncome, isMobile)}
                      </h3>
                    </NumberTooltip>
                    <span className="text-blue-100 text-[9px] sm:text-[10px] font-medium mt-0.5 inline-block">UZS</span>
                  </div>
                </div>

                {/* Total Expense */}
                <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border shadow-lg relative ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                    <div className="p-1 sm:p-1.5 rounded-md bg-red-100 text-red-600 flex-shrink-0">
                      <TrendingDownIcon className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                    </div>
                    <p className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-wide ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t.totalExpense}</p>
                  </div>
                  <NumberTooltip value={financeExpense} label={t.totalExpense} theme={theme}>
                    <h3 className={`text-xl sm:text-2xl md:text-3xl font-black leading-tight font-mono cursor-help ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {formatNumberSmart(financeExpense, isMobile)}
                    </h3>
                  </NumberTooltip>
                  <span className={`text-[9px] sm:text-[10px] font-medium mt-0.5 inline-block ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>UZS</span>
                </div>

                {/* Net Profit */}
                <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border shadow-lg relative sm:col-span-2 lg:col-span-1 ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                    <div className="p-1 sm:p-1.5 rounded-md bg-emerald-100 text-emerald-600 flex-shrink-0">
                      <WalletIcon className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                    </div>
                    <p className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-wide ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t.cashFlow}</p>
                  </div>
                  <NumberTooltip value={financeCashflow} label={t.cashFlow} theme={theme}>
                    <h3 className={`text-xl sm:text-2xl md:text-3xl font-black leading-tight font-mono cursor-help ${financeCashflow >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {financeCashflow > 0 ? '+' : ''}{formatNumberSmart(financeCashflow, isMobile)}
                    </h3>
                  </NumberTooltip>
                  <span className={`text-[9px] sm:text-[10px] font-medium mt-0.5 inline-block ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>UZS</span>
                </div>
              </div>
              {/* Transactions Table */}
              <div className={`rounded-3xl border overflow-hidden shadow-xl ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'
                }`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[800px]">
                    <thead className={`border-b ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'
                      }`}>
                      <tr>
                        <th className={`px-6 py-4 font-bold text-xs uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t.time}</th>
                        <th className={`px-6 py-4 font-bold text-xs uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t.driver}</th>
                        <th className={`px-6 py-4 font-bold text-xs uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t.comment}</th>
                        <th className={`px-6 py-4 font-bold text-xs uppercase tracking-wider text-right ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t.amount}</th>
                        <th className={`px-6 py-4 font-bold text-xs uppercase tracking-wider text-right ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t.actions}</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-100'}`}>
                      {financeFilteredData.map(tx => {
                        const driver = drivers.find(d => d.id === tx.driverId);
                        return (
                          <tr key={tx.id} className={`transition-colors group ${theme === 'dark' ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'
                            }`}>
                            <td className="px-6 py-4">
                              <div className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                              <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>{new Date(tx.timestamp).toLocaleDateString()}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full overflow-hidden border ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}>
                                  {driver ? <img src={driver.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-300" />}
                                </div>
                                <span className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{driver?.name || 'Deleted'}</span>
                              </div>
                            </td>
                            <td className={`px-6 py-4 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{tx.description}</td>
                            <td className={`px-6 py-4 text-sm font-bold text-right font-mono ${tx.type === TransactionType.INCOME ? 'text-[#2D6A76]' : 'text-red-500'
                              }`}>
                              {tx.type === TransactionType.INCOME ? '+' : '-'}{tx.amount.toLocaleString()} UZS
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
                      })}
                      {financeFilteredData.length === 0 && (
                        <tr>
                          <td colSpan={5} className={`px-6 py-12 text-center text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                            {t.noTransactions}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )
          }

        </main >
      </div >

      {/* MODALS */}
      < FinancialModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        onSubmit={handleAddTransaction}
        drivers={drivers}
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
        adminData={adminProfile}
        onUpdate={(profile) => {
          firestoreService.updateAdminProfile(profile);
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

    </div >
  );
};

export default App;