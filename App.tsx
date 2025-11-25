import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  LayoutDashboardIcon, MapIcon, UsersIcon, BanknoteIcon, PlusIcon, CarIcon, TrashIcon, UserPlusIcon, EditIcon, MenuIcon, XIcon, GlobeIcon, CalendarIcon, TrophyIcon, CheckCircleIcon, LogOutIcon, LockIcon, FilterIcon, DownloadIcon, ChevronDownIcon, TelegramIcon, MedalIcon, TrendingUpIcon, TrendingDownIcon, WalletIcon
} from './components/Icons';
import MapView from './components/MapView';
import FinancialModal from './components/FinancialModal';
import DriverModal from './components/DriverModal';
import AdminModal from './components/AdminModal';
import AuthScreen from './components/AuthScreen';
import ConfirmModal from './components/ConfirmModal';
import { MOCK_DRIVERS, MOCK_TRANSACTIONS, CITY_CENTER } from './constants';
import { Driver, Transaction, TransactionType, DriverStatus, Language, TimeFilter, Tab } from './types';
import { TRANSLATIONS } from './translations';
import * as firestoreService from './services/firestoreService';

const App: React.FC = () => {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('avtorim_auth') === 'true';
  });

  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');

  // Finance Section States
  const [financeStartDate, setFinanceStartDate] = useState('');
  const [financeEndDate, setFinanceEndDate] = useState('');
  const [financeDriverFilter, setFinanceDriverFilter] = useState<string>('all');

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
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

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
      if (newDrivers.length > 0) {
        setDrivers(newDrivers);
      }
    });

    // Subscribe to Transactions
    const unsubTx = firestoreService.subscribeToTransactions((newTransactions) => {
      if (newTransactions.length > 0) {
        setTransactions(newTransactions);
      }
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

  const handleLogin = () => setIsAuthenticated(true);
  const handleLock = () => setIsAuthenticated(false);

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
          status: data.status || DriverStatus.IDLE,
          avatar: data.avatar || '', // User should provide their own avatar
          telegram: data.telegram,
          location: {
            lat: CITY_CENTER.lat + (Math.random() - 0.5) * 0.05,
            lng: CITY_CENTER.lng + (Math.random() - 0.5) * 0.05,
            heading: 0
          }
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

  // Active Drivers List
  const activeDriversList = useMemo(() => {
    return drivers.filter(d => d.status === DriverStatus.ACTIVE || d.status === DriverStatus.BUSY);
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
        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
        }`}
    >
      <Icon className={`w-5 h-5 ${activeTab === tab ? 'text-blue-400' : 'text-slate-500'}`} />
      <span className="font-medium text-sm">{label}</span>
    </button>
  );

  // --- COMPONENTS FOR FILTERS ---
  const FilterControl = ({ icon: Icon, label, children }: any) => (
    <div className="flex flex-col gap-1.5 w-full md:w-auto">
      <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider ml-1 flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </label>
      <div className="relative group">
        {children}
      </div>
    </div>
  );

  const getBadgeColor = (index: number) => {
    if (index === 0) return "text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.6)]"; // Gold
    if (index === 1) return "text-slate-300 drop-shadow-[0_0_12px_rgba(203,213,225,0.6)]"; // Silver
    if (index === 2) return "text-orange-400 drop-shadow-[0_0_12px_rgba(251,146,60,0.6)]"; // Bronze
    return "text-slate-700 opacity-20";
  };

  if (!isAuthenticated) return <AuthScreen onAuthenticated={handleLogin} lang={language} setLang={setLanguage} />;

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">

      {/* SIDEBAR */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="absolute top-4 right-4 md:hidden">
          <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400"><XIcon className="w-6 h-6" /></button>
        </div>
        <div className="p-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <CarIcon className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Avtorim<span className="text-blue-500"> Taxi</span></h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Toshkent</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-4 overflow-y-auto">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-4">{t.menu}</div>
          {renderSidebarItem(Tab.DASHBOARD, t.dashboard, LayoutDashboardIcon)}
          {renderSidebarItem(Tab.MAP, t.liveMap, MapIcon)}
          {renderSidebarItem(Tab.DRIVERS, t.drivers, UsersIcon)}
          {renderSidebarItem(Tab.FINANCE, t.finance, BanknoteIcon)}
        </nav>
        <div className="p-6 border-t border-slate-800 space-y-3">
          <div onClick={() => setIsAdminModalOpen(true)} className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 flex items-center gap-3 cursor-pointer hover:bg-slate-800 transition-colors group">
            <img src={adminProfile.avatar} className="w-9 h-9 rounded-full border border-slate-600 object-cover" alt="Admin" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{adminProfile.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{adminProfile.role}</p>
            </div>
            <EditIcon className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <button onClick={handleLock} className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 p-3 rounded-xl border border-red-500/20 transition-all text-xs font-bold uppercase tracking-wider group">
            <LogOutIcon className="w-4 h-4" />
            <span className="group-hover:translate-x-0.5 transition-transform">Lock System</span>
          </button>
        </div>
      </div>

      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-96 bg-blue-900/10 blur-[100px] pointer-events-none" />

        <header className="h-20 flex items-center justify-between px-6 md:px-8 z-10 border-b border-slate-800/30 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-slate-300 hover:text-white"><MenuIcon className="w-6 h-6" /></button>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white truncate">
                {activeTab === Tab.DASHBOARD && t.overview}
                {activeTab === Tab.MAP && t.globalTracking}
                {activeTab === Tab.DRIVERS && t.driversList}
                {activeTab === Tab.FINANCE && t.financialReports}
              </h2>
              <p className="text-slate-400 text-xs md:text-sm mt-1 hidden sm:block">
                {activeTab === Tab.DASHBOARD && t.descDashboard}
                {activeTab === Tab.MAP && t.descMap}
                {activeTab === Tab.DRIVERS && t.descDrivers}
                {activeTab === Tab.FINANCE && t.descFinance}
              </p>
            </div>
          </div>

          <div className="flex gap-2 md:gap-3">
            <div className="relative">
              <button onClick={() => setIsLangMenuOpen(!isLangMenuOpen)} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 px-3 py-2.5 rounded-xl transition-all">
                <GlobeIcon className="w-4 h-4" />
                <span className="text-xs font-bold uppercase">{language}</span>
              </button>
              {isLangMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-32 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50">
                  <button onClick={() => { setLanguage('uz'); setIsLangMenuOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-700 text-sm">O'zbek</button>
                  <button onClick={() => { setLanguage('ru'); setIsLangMenuOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-700 text-sm">Русский</button>
                  <button onClick={() => { setLanguage('en'); setIsLangMenuOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-700 text-sm">English</button>
                </div>
              )}
            </div>

            {activeTab === Tab.DRIVERS && (
              <button onClick={() => { setEditingDriver(null); setIsDriverModalOpen(true); }} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white px-3 py-2 md:px-5 md:py-2.5 rounded-xl font-medium text-xs md:text-sm transition-all whitespace-nowrap">
                <UserPlusIcon className="w-4 h-4" /> <span className="hidden sm:inline">{t.add}</span>
              </button>
            )}

            {(activeTab === Tab.FINANCE || activeTab === Tab.DASHBOARD) && (
              <button onClick={() => setIsTxModalOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 md:px-5 md:py-2.5 rounded-xl font-medium text-xs md:text-sm transition-all shadow-lg shadow-blue-600/20 active:scale-95 whitespace-nowrap">
                <PlusIcon className="w-4 h-4" /> <span className="hidden sm:inline">{t.newTransfer}</span>
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative z-0 custom-scrollbar">

          {/* DASHBOARD */}
          {activeTab === Tab.DASHBOARD && (
            <div className="space-y-6">
              {/* Time Filters */}
              <div className="flex items-center gap-2 bg-slate-800/40 p-1 rounded-xl w-fit border border-slate-700/50 backdrop-blur-sm">
                {(['today', 'week', 'month', 'year'] as TimeFilter[]).map((f) => (
                  <button key={f} onClick={() => setTimeFilter(f)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${timeFilter === f ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}>{t[f]}</button>
                ))}
              </div>

              {/* MAIN STATS ROW - FULL WIDTH */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Income */}
                <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-emerald-500/20 shadow-xl relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <TrendingUpIcon className="w-24 h-24 text-emerald-500" />
                  </div>
                  <div className="flex flex-col h-full justify-between relative z-10 gap-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/10 shadow-lg shadow-emerald-900/20">
                        <TrendingUpIcon className="w-6 h-6" />
                      </div>
                      <p className="text-sm text-emerald-100/70 font-bold uppercase tracking-widest">{t.totalIncome}</p>
                    </div>
                    <div>
                      <h3 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none drop-shadow-lg">
                        {totalIncome.toLocaleString()}
                      </h3>
                      <p className="text-sm text-emerald-400/60 font-medium mt-2 ml-1">UZS</p>
                    </div>
                  </div>
                </div>

                {/* Expense */}
                <div className="bg-gradient-to-br from-rose-900/40 to-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-rose-500/20 shadow-xl relative overflow-hidden group hover:border-rose-500/40 transition-colors">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <TrendingDownIcon className="w-24 h-24 text-rose-500" />
                  </div>
                  <div className="flex flex-col h-full justify-between relative z-10 gap-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-rose-500/10 rounded-xl text-rose-400 border border-rose-500/10 shadow-lg shadow-rose-900/20">
                        <TrendingDownIcon className="w-6 h-6" />
                      </div>
                      <p className="text-sm text-rose-100/70 font-bold uppercase tracking-widest">{t.totalExpense}</p>
                    </div>
                    <div>
                      <h3 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none drop-shadow-lg">
                        {totalExpense.toLocaleString()}
                      </h3>
                      <p className="text-sm text-rose-400/60 font-medium mt-2 ml-1">UZS</p>
                    </div>
                  </div>
                </div>

                {/* Net Profit */}
                <div className="bg-gradient-to-br from-blue-900/40 to-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-blue-500/20 shadow-xl relative overflow-hidden group hover:border-blue-500/40 transition-colors">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <WalletIcon className="w-24 h-24 text-blue-500" />
                  </div>
                  <div className="flex flex-col h-full justify-between relative z-10 gap-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/10 shadow-lg shadow-blue-900/20">
                        <WalletIcon className="w-6 h-6" />
                      </div>
                      <p className="text-sm text-blue-100/70 font-bold uppercase tracking-widest">{t.netProfit}</p>
                    </div>
                    <div>
                      <h3 className={`text-4xl md:text-5xl font-black tracking-tight leading-none drop-shadow-lg ${netProfit >= 0 ? 'text-blue-50' : 'text-red-50'}`}>
                        {netProfit > 0 ? '+' : ''}{netProfit.toLocaleString()}
                      </h3>
                      <p className="text-sm text-blue-400/60 font-medium mt-2 ml-1">UZS</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* MIDDLE ROW: Chart - Full Width */}
              <div className="w-full h-[500px] bg-slate-800/40 backdrop-blur-sm p-6 md:p-8 rounded-3xl border border-slate-700/50 flex flex-col shadow-xl">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 opacity-80">
                  <LayoutDashboardIcon className="w-5 h-5 text-slate-400" />
                  {t.incomeVsExpense}
                </h3>
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} barSize={24}><CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} /><XAxis dataKey="name" stroke="#94a3b8" axisLine={false} tickLine={false} dy={15} fontSize={13} /><YAxis stroke="#94a3b8" axisLine={false} tickLine={false} dx={-15} fontSize={13} tickFormatter={(value) => `${value / 1000}k`} /><Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }} cursor={{ fill: '#334155', opacity: 0.2 }} itemStyle={{ fontSize: '13px', fontWeight: 600 }} /><Bar dataKey="Income" fill="#3b82f6" radius={[6, 6, 0, 0]} /><Bar dataKey="Expense" fill="#ef4444" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
                </div>
              </div>

              {/* Active Drivers List */}
              <div className="bg-slate-800/40 backdrop-blur-sm p-8 rounded-3xl border border-slate-700/50 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                  {t.activeDrivers} ({activeDriversList.length})
                </h3>
                {activeDriversList.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {activeDriversList.map(driver => (
                      <div key={driver.id} className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50 hover:border-blue-500/30 transition-colors">
                        <div className="relative w-12 h-12 flex-shrink-0">
                          <div className="w-12 h-12 rounded-full border border-green-500/50 overflow-hidden">
                            <img src={driver.avatar} className="w-full h-full object-cover" />
                          </div>
                          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-slate-900 rounded-full"></div>
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-white truncate">{driver.name}</div>
                          <div className="text-xs text-slate-400 truncate mt-0.5">{driver.carModel} • {driver.licensePlate}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-500 text-sm italic py-4">Hozirda faol haydovchilar yo'q.</div>
                )}
              </div>

              {/* BOTTOM ROW: Top Earners Leaderboard */}
              <div className="bg-slate-800/40 backdrop-blur-sm p-6 rounded-3xl border border-slate-700/50 shadow-xl">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700/50">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <TrophyIcon className="text-yellow-500 w-5 h-5" />
                    {t.topPerformers}
                  </h3>
                  <span className="text-[10px] font-bold uppercase text-slate-400 bg-slate-800 border border-slate-700 px-2 py-1 rounded-md">{t[timeFilter]}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {topDrivers.length > 0 ? topDrivers.map((driver, index) => (
                    <div key={driver.id} className="flex flex-col items-center gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/50 hover:bg-slate-800/50 transition-all hover:scale-[1.02] hover:shadow-lg">
                      <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center font-bold text-2xl text-slate-600 font-mono">
                        {index < 3 ? <MedalIcon className={`w-10 h-10 ${getBadgeColor(index)}`} /> : `#${index + 1}`}
                      </div>
                      <div className="w-16 h-16 rounded-full border-2 border-slate-700 overflow-hidden shadow-md flex-shrink-0">
                        <img src={driver.avatar} className="w-full h-full object-cover" />
                      </div>
                      <div className="text-center w-full">
                        <p className="text-base font-bold text-white truncate">{driver.name}</p>
                        <p className="text-xs text-slate-400 truncate mt-1">{driver.carModel}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-emerald-400">{driver.income.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-semibold">UZS</p>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center text-slate-500 py-10 text-sm col-span-full">Ma'lumotlar yo'q</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* MAP */}
          {activeTab === Tab.MAP && (
            <div className="h-[calc(100vh-10rem)] w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-700 bg-slate-900 relative">
              <MapView drivers={drivers} lang={language} />
            </div>
          )}

          {/* DRIVERS */}
          {activeTab === Tab.DRIVERS && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {drivers.map(driver => (
                <div key={driver.id} className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 flex flex-col gap-4 hover:bg-slate-800/60 transition-all group relative">
                  <div className="absolute top-4 right-4 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10">
                    <button onClick={(e) => { e.stopPropagation(); handleEditDriverClick(driver); }} className="text-slate-400 hover:text-blue-400 transition-colors p-2 bg-slate-800 rounded-lg border border-slate-700"><EditIcon className="w-4 h-4" /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteDriver(driver.id); }} className="text-slate-400 hover:text-red-500 transition-colors p-2 bg-slate-800 rounded-lg border border-slate-700"><TrashIcon className="w-4 h-4" /></button>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-slate-600 group-hover:border-blue-500 transition-colors shadow-lg overflow-hidden flex-shrink-0">
                      <img src={driver.avatar} className="w-full h-full object-cover" alt={driver.name} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-lg md:text-xl font-bold text-white truncate">{driver.name}</h4>
                      <div className="flex items-center gap-1 text-slate-400 text-xs md:text-sm mt-1">
                        <TelegramIcon className="w-3 h-3 text-blue-400" />
                        <span className="truncate">{driver.telegram || '-'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-slate-700/50 pt-4 grid grid-cols-2 gap-4">
                    <div><p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">{t.car}</p><p className="text-slate-200 font-medium text-sm md:text-base">{driver.carModel}</p></div>
                    <div><p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">{t.plate}</p><p className="text-slate-200 font-mono text-sm md:text-base">{driver.licensePlate}</p></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* FINANCE & FILTER COMPONENT */}
          {(activeTab === Tab.FINANCE) && (
            <div className="space-y-6">
              <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-2 md:p-3 rounded-2xl flex flex-col lg:flex-row gap-4 items-center justify-between shadow-xl">
                <div className="flex flex-col md:flex-row gap-2 w-full lg:w-auto p-2">
                  {/* Start Date */}
                  <FilterControl icon={CalendarIcon} label={t.fromDate}>
                    <div className="relative bg-slate-900 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-500 transition-colors w-full md:w-40 flex items-center h-10">
                      <input type="date" value={financeStartDate} onChange={(e) => setFinanceStartDate(e.target.value)} className="w-full h-full bg-transparent px-3 text-sm text-slate-200 outline-none" style={{ colorScheme: 'dark' }} />
                    </div>
                  </FilterControl>
                  {/* End Date */}
                  <FilterControl icon={CalendarIcon} label={t.toDate}>
                    <div className="relative bg-slate-900 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-500 transition-colors w-full md:w-40 flex items-center h-10">
                      <input type="date" value={financeEndDate} onChange={(e) => setFinanceEndDate(e.target.value)} className="w-full h-full bg-transparent px-3 text-sm text-slate-200 outline-none" style={{ colorScheme: 'dark' }} />
                    </div>
                  </FilterControl>
                  {/* Driver Select */}
                  <FilterControl icon={UsersIcon} label={t.driver}>
                    <div className="relative bg-slate-900 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-500 transition-colors w-full md:w-56 h-10 flex items-center">
                      <select value={financeDriverFilter} onChange={(e) => setFinanceDriverFilter(e.target.value)} className="w-full h-full bg-transparent pl-3 pr-8 text-sm text-slate-200 outline-none appearance-none cursor-pointer">
                        <option value="all">{t.allDrivers}</option>
                        {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                      <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    </div>
                  </FilterControl>
                </div>
                <div className="pr-4 hidden lg:block"><button className="bg-slate-700/50 hover:bg-slate-700 p-2 rounded-xl text-slate-300 transition-colors"><DownloadIcon className="w-5 h-5" /></button></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-800/60 p-5 rounded-2xl border-l-4 border-emerald-500 shadow-lg"><p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{t.totalIncome}</p><h3 className="text-2xl font-bold text-white">{financeIncome.toLocaleString()} UZS</h3></div>
                <div className="bg-slate-800/60 p-5 rounded-2xl border-l-4 border-rose-500 shadow-lg"><p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{t.totalExpense}</p><h3 className="text-2xl font-bold text-white">{financeExpense.toLocaleString()} UZS</h3></div>
                <div className="bg-slate-800/60 p-5 rounded-2xl border-l-4 border-blue-500 shadow-lg"><p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{t.cashFlow}</p><h3 className={`text-2xl font-bold ${financeCashflow >= 0 ? 'text-blue-400' : 'text-red-400'}`}>{financeCashflow > 0 ? '+' : ''}{financeCashflow.toLocaleString()} UZS</h3></div>
              </div>
              <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden overflow-x-auto shadow-2xl">
                <table className="w-full text-left min-w-[600px]">
                  <thead className="bg-slate-900/50 border-b border-slate-700"><tr><th className="px-6 py-4 font-semibold text-slate-400 text-xs uppercase tracking-wider">{t.time}</th><th className="px-6 py-4 font-semibold text-slate-400 text-xs uppercase tracking-wider">{t.driver}</th><th className="px-6 py-4 font-semibold text-slate-400 text-xs uppercase tracking-wider">{t.comment}</th><th className="px-6 py-4 font-semibold text-slate-400 text-xs uppercase tracking-wider text-right">{t.amount}</th><th className="px-6 py-4 font-semibold text-slate-400 text-xs uppercase tracking-wider text-right">{t.actions}</th></tr></thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {financeFilteredData.map(tx => {
                      const driver = drivers.find(d => d.id === tx.driverId);
                      return (<tr key={tx.id} className="hover:bg-slate-700/30 transition-colors group"><td className="px-6 py-4 text-sm text-slate-400 font-mono">{new Date(tx.timestamp).toLocaleTimeString()} <span className="text-slate-600 text-xs">{new Date(tx.timestamp).toLocaleDateString()}</span></td><td className="px-6 py-4"><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-slate-700 overflow-hidden">{driver ? <img src={driver.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-600" />}</div><span className="text-sm font-medium text-slate-200">{driver?.name || 'Deleted'}</span></div></td><td className="px-6 py-4 text-sm text-slate-300">{tx.description}</td><td className={`px-6 py-4 text-sm font-bold text-right font-mono ${tx.type === TransactionType.INCOME ? 'text-emerald-400' : 'text-rose-400'}`}>{tx.type === TransactionType.INCOME ? '+' : '-'}{tx.amount.toLocaleString()} UZS</td><td className="px-6 py-4 text-right"><button onClick={() => handleDeleteTransaction(tx.id)} className="text-slate-600 hover:text-red-400 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 p-2"><TrashIcon className="w-4 h-4 pointer-events-none" /></button></td></tr>);
                    })}
                    {financeFilteredData.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500 text-sm">{t.noTransactions}</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* MODALS */}
      <FinancialModal isOpen={isTxModalOpen} onClose={() => setIsTxModalOpen(false)} onSubmit={handleAddTransaction} drivers={drivers} lang={language} />
      <DriverModal isOpen={isDriverModalOpen} onClose={() => setIsDriverModalOpen(false)} onSubmit={handleSaveDriver} editingDriver={editingDriver} lang={language} />
      <AdminModal isOpen={isAdminModalOpen} onClose={() => setIsAdminModalOpen(false)} adminData={adminProfile} onUpdate={async (newAdmin) => await firestoreService.updateAdminProfile(newAdmin)} lang={language} />

      {/* CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.action}
        onCancel={closeConfirmModal}
        lang={language}
        isDanger={confirmModal.isDanger}
      />
    </div>
  );
};

export default App;