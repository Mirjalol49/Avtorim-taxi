import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  LayoutDashboardIcon, MapIcon, UsersIcon, BanknoteIcon, PlusIcon, CarIcon, TrashIcon, UserPlusIcon, EditIcon, MenuIcon, XIcon, GlobeIcon, CalendarIcon, TrophyIcon, CheckCircleIcon, LogOutIcon, LockIcon, FilterIcon, DownloadIcon, ChevronDownIcon, TelegramIcon, MedalIcon, TrendingUpIcon, TrendingDownIcon, WalletIcon, SunIcon, MoonIcon, SearchIcon, ListIcon, GridIcon, ChevronLeftIcon, ChevronRightIcon, SparklesIcon, CalculatorIcon, ShieldIcon, NotesIcon
} from './components/Icons';

import FinancialModal from './components/FinancialModal';
import DriverModal from './components/DriverModal';
import CarModal from './components/CarModal';
import CarsPage from './src/features/cars/CarsPage';
import { subscribeToCars, addCar, updateCar, deleteCar, assignCar, unassignCar } from './services/carsService';
import { Car } from './src/core/types';
import AdminModal from './components/AdminModal';
import AuthScreen from './components/AuthScreen';
import ConfirmModal from './components/ConfirmModal';
import NumberTooltip from './components/NumberTooltip';
import DateFilter from './components/DateFilter';
import DatePicker from './components/DatePicker';
import CustomSelect from './components/CustomSelect';
import YearSelector from './components/YearSelector';
import DesktopHeader from './components/DesktopHeader';
import { useAdminProfile } from './src/features/admin/hooks/useAdminProfile';
import NotFound from './components/NotFound';

// Lazy load heavy components for code splitting
const HiddenDashboard = React.lazy(() => import('./components/hidden/HiddenDashboard'));
import { ToastProvider, ToastContainer, useToast } from './components/ToastNotification';
import ErrorBoundary from './components/ErrorBoundary';
import Skeleton from './components/Skeleton';
import DashboardPage from './src/features/dashboard/DashboardPage';
import DriversPage from './src/features/drivers/DriversPage';
import NotesPage from './src/features/notes/NotesPage';
import { TransactionsPage } from './src/features/transactions/TransactionsPage';
import { FinancePage } from './src/features/finance/FinancePage';
import { MonthlyPlanPage } from './src/features/finance/MonthlyPlanPage';
import { MOCK_DRIVERS, MOCK_TRANSACTIONS, CITY_CENTER } from './constants';
import { Driver, Transaction, TransactionType, DriverStatus, Language, TimeFilter, Tab } from './types';
import { TRANSLATIONS } from './translations';
import { formatNumberSmart } from './utils/formatNumber';
import { useDrivers } from './src/features/drivers/hooks/useDrivers';
import { useTransactions } from './src/features/transactions/hooks/useTransactions';
import { useAuth } from './src/features/auth/hooks/useAuth';
import { useNotifications } from './src/features/notifications/hooks/useNotifications';
import { AuthProvider, useAuthContext } from './src/features/auth/context/AuthContext';
import { UIProvider, useUIContext } from './src/features/shared/context/UIContext';
import { DataProvider, useDataContext } from './src/core/context/DataContext';
import * as firestoreService from './services/firestoreService';
import { subscribeToNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, clearAllReadNotifications, cleanupExpiredNotifications, Notification } from './services/notificationService';
import { playLockSound } from './services/soundService';
import logo from './Images/logo_winter.png';

import { useDailyPlanReminder } from './hooks/useDailyPlanReminder';
import SuperAdminPanel from './components/SuperAdminPanel';

const AppContent: React.FC = () => {
  const { addToast } = useToast();
  const {
    userRole,
    isAuthenticated,
    adminUser,
    adminProfile,
    isAuthChecking,
    handleLogin,
    handleLogout,
    setAdminUser,
    setAdminProfile,
    setUserRole
  } = useAuthContext();

  const {
    theme,
    toggleTheme,
    language,
    setLanguage,
    t,
    isMobile,
    isSidebarOpen,
    setIsSidebarOpen
  } = useUIContext();

  const {
    drivers,
    loading: driversLoading,
    transactions,
    txLoading,
    notifications,
    unreadCount,
    readNotificationIds,
    setNotifications,
    setReadNotificationIds,
    setUnreadCount,
    loading: isDataLoading,
    triggerRefresh
  } = useDataContext();

  const location = useLocation();
  const navigate = useNavigate();

  // Disable context menu globally for the app
  useEffect(() => {
    const handler = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', handler);
    return () => document.removeEventListener('contextmenu', handler);
  }, []);

  // Modals
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txInitialDriverId, setTxInitialDriverId] = useState<string | undefined>(undefined);
  const [txInitialType, setTxInitialType] = useState<TransactionType | undefined>(undefined);
  const [txInitialDate, setTxInitialDate] = useState<Date | undefined>(undefined);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isSuperAdminOpen, setIsSuperAdminOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  // Cars state
  const [cars, setCars] = useState<Car[]>([]);
  const [isCarModalOpen, setIsCarModalOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);

  const carsFleetId = userRole === 'viewer'
    ? ((adminProfile as any)?.fleet_id || (adminProfile as any)?.created_by)
    : adminUser?.id;

  useEffect(() => {
    if (!carsFleetId) return;
    const unsub = subscribeToCars(setCars, carsFleetId);
    return unsub;
  }, [carsFleetId]);



  // ── Daily 22:00 plan reminder ──────────────────────────────────────────────
  useDailyPlanReminder({
    drivers,
    cars,
    transactions,
    adminUserId:   adminUser?.id   ?? '',
    adminUserName: adminUser?.username ?? 'Admin',
    enabled: isAuthenticated && userRole === 'admin',
  });

  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);

  const TRANSACTIONS_PER_PAGE = 10;

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


  // --- FIREBASE SYNC (Migration only) ---
  useEffect(() => {
    if (!isAuthenticated) return;
    // Migration logic remains here or can be moved to DataContext?
    // Keeping it simple: leave here or move eventually.
    // DataContext doesn't handle migration explicitly.
    firestoreService.migrateFromLocalStorage().then(() => {
      console.log('Data migration completed');
    }).catch(err => console.error('Migration failed:', err));
  }, [isAuthenticated]);

  // --- FILTER LOGIC ---


  // Reset pagination when filters change


  // --- ACTIONS ---

  // Admin Profile Update Logic extracted to hook
  const { handleUpdateProfile } = useAdminProfile({
    adminUser,
    setAdminUser,
    adminProfile,
    setAdminProfile,
    language
  });

  // --- ACTIONS ---
  const handleAddTransaction = async (data: Omit<Transaction, 'id'>) => {
    try {
      const driver = data.driverId ? drivers.find(d => d.id === data.driverId) : undefined;
      const car = data.carId ? cars.find(c => c.id === data.carId) : undefined;

      const payload: Omit<Transaction, 'id'> = {
        ...data,
      };

      if (driver) (payload as any).driverName = driver.name;
      if (car) payload.carName = `${car.name} — ${car.licensePlate}`;

      await firestoreService.addTransaction(
        payload as any,
        adminUser?.id
      );
      triggerRefresh();
    } catch (error) {
      console.error('Failed to add transaction:', error);
      addToast('error', t.transactionSaveFailed);
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
          await firestoreService.deleteTransaction(id, { adminName: adminUser?.username || 'Admin' });
          setSelectedTransactions(prev => prev.filter(txId => txId !== id));
          triggerRefresh();
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
      const { assignedCarId, previousCarId, ...driverData } = data;

      let driverId: string;

      if (data.id) {
        const { id, ...updateData } = driverData;
        await firestoreService.updateDriver(id, updateData, adminUser?.id);
        driverId = id;
      } else {
        const newDriver = {
          name: data.name,
          licensePlate: data.licensePlate ?? '',
          carModel: data.carModel ?? '',
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
        driverId = await firestoreService.addDriver(newDriver, adminUser?.id);
      }

      // Handle car assignment changes
      if (previousCarId && previousCarId !== assignedCarId) {
        await unassignCar(previousCarId);
      }
      if (assignedCarId && assignedCarId !== previousCarId) {
        await assignCar(assignedCarId, driverId);
      }
      triggerRefresh();
    } catch (error) {
      console.error('Failed to save driver:', error);
      addToast('error', t.driverSaveFailed);
      throw error;
    }
  };

  const handleEditDriverClick = (driver: Driver) => {
    setEditingDriver(driver);
    setIsDriverModalOpen(true);
  };

  const handleUpdateDriverStatus = async (driverId: string, newStatus: DriverStatus) => {
    try {
      await firestoreService.updateDriver(driverId, { status: newStatus }, adminUser?.id);
      triggerRefresh();
    } catch (error) {
      console.error('Failed to update driver status:', error);
      addToast('error', t.statusUpdateFailed);
    }
  };

  const handleDeleteDriver = (id: string) => {
    const driver = drivers.find(d => d.id === id);
    if (!driver) return;

    setConfirmModal({
      isOpen: true,
      title: t.confirmDeleteTitle,
      message: t.deleteConfirmDriver,
      isDanger: true,
      action: async () => {
        closeConfirmModal();

        try {
          const assignedCar = cars.find(c => c.assignedDriverId === id);
          await firestoreService.deleteDriver(id, {
            adminName: adminProfile?.name || t.unknownAdmin,
            reason: 'Manual deletion by admin'
          }, adminUser?.id);
          if (assignedCar) await unassignCar(assignedCar.id);
          triggerRefresh();
        } catch (error) {
          console.error('Failed to delete driver:', error);
          addToast('error', t.driverDeleteFailed);
        }
      }
    });
  };

  // Finance Data Filtering Logic - REMOVED (Moved to useFinanceStats hook)

  const handleSaveCar = async (data: Partial<Car>) => {
    if (!adminUser?.id) return;
    if (data.id) {
      const { id, ...rest } = data;
      await updateCar(id, rest);
    } else {
      await addCar(data as Omit<Car, 'id'>, adminUser.id);
    }
    triggerRefresh();
  };

  const handleDeleteCar = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: t.confirmDeleteTitle,
      message: t.deleteConfirmCar,
      isDanger: true,
      action: async () => {
        closeConfirmModal();
        await deleteCar(id);
        triggerRefresh();
      }
    });
  };

  const nonDeletedDrivers = useMemo(() => {
    return drivers.filter(d => !d.isDeleted);
  }, [drivers]);

  // Monthly Analytics Data


  // Yearly Analytics Totals


  // --- RENDER HELPERS ---
  const renderSidebarItem = (path: string, label: string, Icon: React.FC<any>) => {
    const isActive = location.pathname === path;
    return (
      <button
        onClick={() => { navigate(path); setIsSidebarOpen(false); }}
        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all mb-2 ${isActive
          ? 'bg-[#0f766e] text-white shadow-sm'
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
    if (index === 0) return "text-yellow-500"; // Gold
    if (index === 1) return "text-slate-400";  // Silver
    if (index === 2) return "text-orange-500"; // Bronze
    return "text-slate-600 opacity-20";
  };

  if (!isAuthenticated) return <AuthScreen onAuthenticated={handleLogin} theme={theme} />;

  // Block rendering until strict auth check completes for admins
  if (isAuthChecking) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
        }`}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className={`w-12 h-12 rounded-full border-4 border-t-transparent animate-spin ${theme === 'dark' ? 'border-[#0f766e]' : 'border-[#0f766e]'
              }`} />
            <div className={`absolute inset-0 flex items-center justify-center`}>
              <ShieldIcon className={`w-5 h-5 ${theme === 'dark' ? 'text-[#0f766e]' : 'text-[#0f766e]'
                }`} />
            </div>
          </div>
          <p className={`text-sm font-medium animate-pulse ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>
            {t.verificationRequired}
          </p>
        </div>
      </div>
    );
  }

  // Check if current URL matches any valid route
  const validPaths = ['/dashboard', '/drivers', '/cars', '/transactions', '/finance', '/monthly-plan', '/notes', '/', '/mirjalol49'];
  const is404 = !validPaths.some(path => location.pathname === path || location.pathname.startsWith(path + '/'));

  // Render 404 page fullscreen if path doesn't match
  if (is404) {
    return <NotFound />;
  }

  // Hidden Admin Dashboard - Render outside main layout
  if (location.pathname.startsWith('/mirjalol49')) {
    return (
      <React.Suspense fallback={
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      }>
        <HiddenDashboard />
      </React.Suspense>
    );
  }

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
        <div className="p-5 flex justify-center relative overflow-hidden">
          <img src={logo} alt="Taksapark" className="h-12 w-auto object-contain" />
        </div>
        <nav className="flex-1 px-4 overflow-y-auto">
          <div className={`text-xs font-semibold uppercase tracking-wider mb-4 px-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
            }`}>{t.menu}</div>
          {renderSidebarItem('/dashboard', t.dashboard, LayoutDashboardIcon)}
          {renderSidebarItem('/drivers', t.driversList, UsersIcon)}
          {renderSidebarItem('/cars', t.cars, CarIcon)}
          {renderSidebarItem('/monthly-plan', t.monthlyPlan, CalendarIcon)}
          {renderSidebarItem('/transactions', t.transactions, ListIcon)}
          {renderSidebarItem('/finance', t.financialReports, BanknoteIcon)}
          {renderSidebarItem('/notes', t.notes, NotesIcon)}

          {/* Super Admin — only visible to the super admin account */}
          {(adminUser?.username === 'mirjalol' || adminUser?.role === 'super_admin') && (
            <button
              onClick={() => setIsSuperAdminOpen(true)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all mt-2 border ${
                theme === 'dark'
                  ? 'border-amber-500/20 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/40'
                  : 'border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100'
              }`}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Super Admin
            </button>
          )}
        </nav>

        {/* Sidebar Bottom Section */}
        <div className="px-6 pb-4 space-y-3 md:hidden">
            {/* Theme Toggle - Mobile */}
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${theme === 'dark'
              ? 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-300'
              : 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-600'
              }`}
          >
            <div className="flex items-center gap-3">
              {theme === 'dark'
                ? <SunIcon className="w-5 h-5 text-amber-400" />
                : <MoonIcon className="w-5 h-5 text-gray-500" />
              }
              <span className="font-medium text-sm">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </div>
            <div className={`w-10 h-5 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-gray-600' : 'bg-[#0f766e]'}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${theme === 'dark' ? 'left-0.5' : 'left-5'}`} />
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
              <span className="font-medium text-sm">{t.uiLanguage}</span>
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
              {isDataLoading || (!adminProfile && !adminUser) ? ( // Using driversLoading as a proxy for general data loading
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
                // Actual admin profile - use adminUser if available, otherwise adminProfile
                <div onClick={() => setIsAdminModalOpen(true)} className={`rounded-xl p-3 border flex items-center gap-3 cursor-pointer transition-all group ${theme === 'dark'
                  ? 'bg-[#111827] border-gray-700 hover:bg-gray-800'
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}>
                  {adminUser ? (
                    <>
                      {adminUser.avatar && adminUser.avatar.length > 20 ? (
                        <img
                          src={adminUser.avatar}
                          className={`w-9 h-9 rounded-full border object-cover ${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'}`}
                          alt={adminUser.username}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(adminUser.username)}`;
                          }}
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold border border-gray-600">
                          {adminUser.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>{adminUser.username}</p>
                        <p className={`text-[10px] truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                          }`}>{t[adminUser.role as keyof typeof t] || adminUser.role}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <img src={adminProfile?.avatar}
                        className={`w-9 h-9 rounded-full border object-cover ${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'}`}
                        alt="Admin"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(adminProfile?.name || 'Admin')}`;
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>{adminProfile?.name}</p>
                        <p className={`text-[10px] truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                          }`}>{t[adminProfile?.role as keyof typeof t] || adminProfile?.role}</p>
                      </div>
                    </>
                  )}
                  <EditIcon className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                    }`} />
                </div>
              )}
            </>
          )}
          <button onClick={() => { playLockSound(); handleLogout(); }} className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl border transition-all text-xs font-bold uppercase tracking-wider group ${theme === 'dark'
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
        <DesktopHeader
          theme={theme}
          onThemeToggle={toggleTheme}
          activeTab={location.pathname === '/' ? Tab.DASHBOARD : location.pathname.substring(1).toUpperCase() as Tab}
          isMobile={isMobile}
          onNewTransactionClick={() => setIsTxModalOpen(true)}
          onAddDriverClick={() => {
            setEditingDriver(null);
            setIsDriverModalOpen(true);
          }}
          userRole={userRole}
          notifications={notifications}
          unreadCount={unreadCount}
          readIds={readNotificationIds}
          userId={adminUser?.id || 'global'}
          onMarkAsRead={async (id) => {
            const userId = adminUser?.id || 'global';
            await markNotificationAsRead(id, userId);
            setReadNotificationIds(prev => new Set(prev).add(id));
            setUnreadCount(prev => Math.max(0, prev - 1));
          }}
          onMarkAllAsRead={async () => {
            const userId = adminUser?.id || 'global';
            const unreadIds = notifications
              .filter(n => !readNotificationIds.has(n.id))
              .map(n => n.id);

            if (unreadIds.length > 0) {
              // Update local state IMMEDIATELY for instant UI feedback
              const newSet = new Set(readNotificationIds);
              unreadIds.forEach(id => newSet.add(id));
              setReadNotificationIds(newSet);
              setUnreadCount(0);

              // Then persist to Firebase in background  
              markAllNotificationsAsRead(unreadIds, userId).catch(err => {
                console.error('Failed to mark notifications as read:', err);
              });
            }
          }}
          onDeleteNotification={async (id) => {
            const userId = adminUser?.id || 'global';
            // Optimistic update
            setNotifications(prev => prev.filter(n => n.id !== id));
            if (!readNotificationIds.has(id)) {
              setUnreadCount(prev => Math.max(0, prev - 1));
            }

            await deleteNotification(id, userId);
          }}
          onClearAllRead={async () => {
            const userId = adminUser?.id || 'global';
            // Optimistic update
            setNotifications(prev => prev.filter(n => !readNotificationIds.has(n.id)));

            await clearAllReadNotifications(userId);
          }}
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
                {location.pathname === '/dashboard' && t.overview}
                {location.pathname === '/drivers' && t.driversList}
                {location.pathname === '/cars' && t.cars}
                {location.pathname === '/finance' && t.analytics}
                {location.pathname === '/monthly-plan' && t.monthlyPlan}
                {location.pathname === '/transactions' && t.transactions}
                {location.pathname === '/notes' && t.notes}
              </h2>
              <p className={`text-xs mt-1 hidden sm:block ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                {location.pathname === '/dashboard' && t.descDashboard}
                {location.pathname === '/drivers' && t.descDrivers}
                {location.pathname === '/cars' && t.descCars}
                {location.pathname === '/finance' && t.descFinance}
                {location.pathname === '/monthly-plan' && t.monthlyPlanDesc}
                {location.pathname === '/transactions' && t.descTransactions}
                {location.pathname === '/notes' && t.descNotes}
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
                ? 'bg-[#0f766e] hover:bg-[#0f766e] border-transparent text-white'
                : 'bg-[#0f766e] hover:bg-[#0f766e] border-transparent text-white shadow-sm'
                }`}>
                <PlusIcon className="w-4 h-4" /> <span>{t.add}</span>
              </button>
            </>
          )}

          {userRole === 'admin' && (
            <button onClick={() => setIsTxModalOpen(true)} className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl font-medium text-xs transition-all shadow-lg active:scale-95 w-full sm:w-auto ${theme === 'dark'
              ? 'bg-[#0f766e] hover:bg-[#0f766e] text-white shadow-sm'
              : 'bg-[#0f766e] hover:bg-[#0f766e] text-white shadow-sm'
              }`}>
              <PlusIcon className="w-4 h-4" /> <span>{t.newTransfer}</span>
            </button>
          )}
        </div>

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8 relative z-0 custom-scrollbar">

          {/* DASHBOARD */}
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage
              transactions={transactions}
              drivers={drivers}
              cars={cars}
              isDataLoading={isDataLoading}
              theme={theme}
              isMobile={isMobile}
            />} />

            {/* DRIVERS */}
            <Route path="/drivers" element={
              <DriversPage
                drivers={drivers}
                cars={cars}
                transactions={transactions}
                isDataLoading={isDataLoading}
                userRole={userRole}
                fleetId={userRole === 'viewer'
                  ? ((adminProfile as any)?.fleet_id || (adminProfile as any)?.created_by)
                  : adminUser?.id}
                onUpdateStatus={handleUpdateDriverStatus}
                onEditDriver={handleEditDriverClick}
                onDeleteDriver={handleDeleteDriver}
                onAddDriver={() => {
                  setEditingDriver(null);
                  setIsDriverModalOpen(true);
                }}
                theme={theme}
              />
            } />



            {/* CARS */}
            <Route path="/cars" element={
              <CarsPage
                cars={cars}
                drivers={drivers}
                isDataLoading={isDataLoading}
                userRole={userRole}
                onAddCar={() => { setEditingCar(null); setIsCarModalOpen(true); }}
                onEditCar={(car) => { setEditingCar(car); setIsCarModalOpen(true); }}
                onDeleteCar={handleDeleteCar}
                theme={theme}
              />
            } />

            {/* FINANCE (ANALYTICS) COMPONENT */}
            <Route path="/finance" element={
              <FinancePage
                transactions={transactions}
                drivers={drivers}
                theme={theme}
                isMobile={isMobile}
              />

            } />

            {/* MONTHLY PLAN COMPONENT */}
            <Route path="/monthly-plan" element={
              <MonthlyPlanPage
                transactions={transactions}
                drivers={drivers}
                cars={cars}
                theme={theme}
                isMobile={isMobile}
                onDayClick={(driverId, date) => {
                  setTxInitialDriverId(driverId);
                  setTxInitialDate(date);
                  setIsTxModalOpen(true);
                }}
              />
            } />

            {/* TRANSACTIONS COMPONENT */}
            <Route path="/transactions" element={
              <TransactionsPage
                transactions={transactions}
                drivers={drivers}
                cars={cars}
                userRole={userRole}
                adminUser={adminUser}
                theme={theme}
              />
            } />

            {/* NOTES */}
            <Route path="/notes" element={
              <NotesPage
                theme={theme}
                fleetId={userRole === 'viewer'
                  ? ((adminProfile as any)?.fleet_id || (adminProfile as any)?.created_by)
                  : adminUser?.id}
              />
            } />
          </Routes >
        </main >
      </div >

      {/* MODALS */}
      <FinancialModal
        isOpen={isTxModalOpen}
        onClose={() => {
            setIsTxModalOpen(false);
            setTxInitialDriverId(undefined);
            setTxInitialType(undefined);
            setTxInitialDate(undefined);
        }}
        onSubmit={handleAddTransaction}
        drivers={nonDeletedDrivers}
        cars={cars}
        transactions={transactions}
        theme={theme}
        fleetId={carsFleetId}
        initialDriverId={txInitialDriverId}
        initialType={txInitialType}
        initialDate={txInitialDate}
      />

      <DriverModal
        isOpen={isDriverModalOpen}
        onClose={() => { setIsDriverModalOpen(false); setEditingDriver(null); }}
        onSubmit={handleSaveDriver}
        editingDriver={editingDriver}
        cars={cars}
        theme={theme}
      />

      <CarModal
        isOpen={isCarModalOpen}
        onClose={() => { setIsCarModalOpen(false); setEditingCar(null); }}
        onSubmit={handleSaveCar}
        editingCar={editingCar}
        theme={theme}
      />

      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        adminData={
          adminUser
            ? {
              name: adminUser.username,
              role: adminUser.role,
              avatar: adminUser.avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=' + adminUser.username,
              password: adminUser.password
            }
            : (adminProfile || { name: t.systemAdmin, role: t.manager, avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Admin', password: '' })
        }
        onUpdate={handleUpdateProfile}
        userRole={userRole}
        theme={theme}
        onLogout={() => { playLockSound(); handleLogout(); }}
        onLock={() => { playLockSound(); handleLogout(); }}
      />

      {/* CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.action}
        onCancel={closeConfirmModal}
        isDanger={confirmModal.isDanger}
        theme={theme}
      />

      {/* SUPER ADMIN PANEL */}
      <SuperAdminPanel
        isOpen={isSuperAdminOpen}
        onClose={() => setIsSuperAdminOpen(false)}
        currentUserId={adminUser?.id || ''}
      />

      {/* TOAST NOTIFICATIONS */}
      <ToastContainer theme={theme} />
    </div >
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <UIProvider>
            <DataProvider>
              <AppContent />
            </DataProvider>
          </UIProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;
