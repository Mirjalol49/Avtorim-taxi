import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboardIcon, UsersIcon, BanknoteIcon, PlusIcon, CarIcon, EditIcon, MenuIcon, XIcon, GlobeIcon, CalendarIcon, LogOutIcon, WalletIcon, SunIcon, MoonIcon, ListIcon, ShieldIcon, NotesIcon, FolderOpenIcon, AlertTriangleIcon
} from './components/Icons';

import NotificationBell from './components/NotificationBell';
import { subscribeToCars, addCar, updateCar, deleteCar, assignCar, unassignCar } from './services/carsService';
import { Car } from './src/core/types';
import AuthScreen from './components/AuthScreen';
import LockScreen from './components/LockScreen';
import DesktopHeader from './components/DesktopHeader';
import { useAdminProfile } from './src/features/admin/hooks/useAdminProfile';
import NotFound from './components/NotFound';

import { ToastProvider, ToastContainer, useToast } from './components/ToastNotification';
import { ConfirmProvider } from './components/ConfirmContext';
import ErrorBoundary from './components/ErrorBoundary';
import NoteReminderAlert from './components/NoteReminderAlert';
import { useNotes } from './src/features/notes/hooks/useNotes';
import { useNoteReminders } from './hooks/useNoteReminders';
import Skeleton from './components/Skeleton';
import PageSkeleton from './components/PageSkeleton';
import { CITY_CENTER } from './constants';
import { Driver, Transaction, TransactionType, DriverStatus, Language, Tab } from './types';
import { AuthProvider, useAuthContext } from './src/features/auth/context/AuthContext';
import { UIProvider, useUIContext } from './src/features/shared/context/UIContext';
import { DataProvider, useDataContext } from './src/core/context/DataContext';
import * as firestoreService from './services/firestoreService';
import { markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, clearAllReadNotifications, sendNotification } from './services/notificationService';

import { calcDriverFinance } from './src/features/drivers/utils/debtUtils';
import { playLockSound } from './services/soundService';
import { useDailyPlanReminder } from './hooks/useDailyPlanReminder';
import { clearChunkRecoveryState, isChunkLoadError, recoverFromChunkLoadError } from './src/utils/chunkRecovery';

const lazyWithReload = <T extends { default: React.ComponentType<any> }>(
  importer: () => Promise<T>,
) => React.lazy(async () => {
  try {
    const module = await importer();
    clearChunkRecoveryState();
    return module;
  } catch (error) {
    if (isChunkLoadError(error) && await recoverFromChunkLoadError()) {
      return new Promise<T>(() => {});
    }
    throw error;
  }
});

// Lazy load route screens so the first app shell stays light. If a deploy replaces
// hashed chunks while a browser is still on the old shell, clear stale caches and
// reload into the current build instead of crashing in ErrorBoundary.
const HiddenDashboard = lazyWithReload(() => import('./components/hidden/HiddenDashboard'));
const DashboardPage = lazyWithReload(() => import('./src/features/dashboard/DashboardPage'));
const DriversPage = lazyWithReload(() => import('./src/features/drivers/DriversPage'));
const DriverProfilePage = lazyWithReload(() => import('./src/features/drivers/DriverProfilePage').then(module => ({ default: module.DriverProfilePage })));
const CarsPage = lazyWithReload(() => import('./src/features/cars/CarsPage'));
const CarProfilePage = lazyWithReload(() => import('./src/features/cars/CarProfilePage').then(module => ({ default: module.CarProfilePage })));
const NotesPage = lazyWithReload(() => import('./src/features/notes/NotesPage'));
const DocumentsPage = lazyWithReload(() => import('./src/features/documents/DocumentsPage').then(module => ({ default: module.DocumentsPage })));
const PdfViewerPage = lazyWithReload(() => import('./src/features/documents/PdfViewerPage'));
const TransactionsPage = lazyWithReload(() => import('./src/features/transactions/TransactionsPage').then(module => ({ default: module.TransactionsPage })));
const FinancePage = lazyWithReload(() => import('./src/features/finance/FinancePage').then(module => ({ default: module.FinancePage })));
const MonthlyPlanPage = lazyWithReload(() => import('./src/features/finance/MonthlyPlanPage').then(module => ({ default: module.MonthlyPlanPage })));
const PayrollPage = lazyWithReload(() => import('./src/features/finance/PayrollPage').then(module => ({ default: module.PayrollPage })));
const FinesPage = lazyWithReload(() => import('./src/features/fines/FinesPage'));
const FinancialModal = lazyWithReload(() => import('./components/FinancialModal'));
const DriverModal = lazyWithReload(() => import('./components/DriverModal'));
const CarModal = lazyWithReload(() => import('./components/CarModal'));
const AdminModal = lazyWithReload(() => import('./components/AdminModal'));
const ConfirmModal = lazyWithReload(() => import('./components/ConfirmModal'));
const SuperAdminPanel = lazyWithReload(() => import('./components/SuperAdminPanel'));

const TaksaparkLogo = ({ theme }: { theme: 'light' | 'dark' }) => (
    <img
        src="/images/taksapark-logo.png"
        alt="Taksapark"
        className="h-9 w-auto object-contain select-none"
        draggable={false}
        style={theme === 'dark' ? { filter: 'brightness(0) invert(1)' } : {}}
    />
);

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

  const isDark = theme === 'dark';

  const {
    drivers,
    setDrivers,
    transactions,
    setTransactions,
    driversLoading,
    txLoading,
    notifications,
    unreadCount,
    readNotificationIds,
    setNotifications,
    setReadNotificationIds,
    setUnreadCount,
    dismissNotification,
    dismissReadNotifications,
    loading: contextDataLoading,
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
  const [txInitialDepositTopup, setTxInitialDepositTopup] = useState(false);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isSuperAdminOpen, setIsSuperAdminOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  // Cars state
  const [cars, setCars] = useState<Car[]>([]);
  const [carsLoading, setCarsLoading] = useState(true);
  const [isCarModalOpen, setIsCarModalOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);

  const carsFleetId = userRole === 'viewer'
    ? ((adminProfile as any)?.fleet_id || (adminProfile as any)?.created_by)
    : adminUser?.id;

  useEffect(() => {
    if (!carsFleetId) {
      // No fleet ID yet — don't block the UI indefinitely
      const t = setTimeout(() => setCarsLoading(false), 6000);
      return () => clearTimeout(t);
    }

    setCarsLoading(true);
    const timeout = setTimeout(() => setCarsLoading(false), 5000);

    const { unsubscribe } = subscribeToCars((data) => {
        clearTimeout(timeout);
        setCars(data);
        setCarsLoading(false);
    }, carsFleetId);
    
    return () => {
        clearTimeout(timeout);
        unsubscribe();
    };
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

  // ── Note reminders (fires on ANY page, not just NotesPage) ────────────────
  const notesFleetId = userRole === 'viewer'
    ? ((adminProfile as any)?.fleet_id || (adminProfile as any)?.created_by)
    : adminUser?.id;
  const { notes: allNotes, loading: notesLoading, tableError: notesTableError } = useNotes(notesFleetId);

  useNoteReminders({
    notes: allNotes,
    adminUserId: adminUser?.id ?? '',
    adminUserName: adminUser?.username ?? 'Admin',
    enabled: isAuthenticated && !!adminUser?.id,
  });

  const [isLocked, setIsLocked] = useState(false);

  const handleUnlock = async (password: string): Promise<boolean> => {
    if (!adminUser?.phone) return false;
    const { authService } = await import('./services/authService');
    const result = await authService.authenticateAdminByPhone(adminUser.phone, password);
    if (result.success) setIsLocked(false);
    return result.success;
  };

  // ── Per-account language ──────────────────────────────────────────────────
  // Load this user's saved language preference when admin logs in.
  useEffect(() => {
    if (!adminUser?.id) return;
    const saved = localStorage.getItem(`avtorim_lang_${adminUser.id}`);
    if (saved && (['uz', 'ru', 'en'] as string[]).includes(saved)) {
      setLanguage(saved as Language);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminUser?.id]);

  // Load language for viewer accounts (keyed by their profile name as unique id)
  useEffect(() => {
    if (!adminProfile?.name) return;
    const profileKey = `avtorim_lang_viewer_${adminProfile.name}`;
    const saved = localStorage.getItem(profileKey);
    if (saved && (['uz', 'ru', 'en'] as string[]).includes(saved)) {
      setLanguage(saved as Language);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminProfile?.name]);

  /** Save language per-user AND globally, then update i18n / UIContext state. */
  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    // Always persist globally so the choice survives across sessions
    localStorage.setItem('avtorim_lang', lang);
    // Also persist per-account for when multiple accounts share a device
    if (adminUser?.id) {
      localStorage.setItem(`avtorim_lang_${adminUser.id}`, lang);
    } else if (adminProfile?.name) {
      localStorage.setItem(`avtorim_lang_viewer_${adminProfile.name}`, lang);
    }
  };

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
    firestoreService.migrateFromLocalStorage().catch(() => {});
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
  // Threshold is now per-driver (stored in driver.depositWarningThreshold), fallback 1M

  const handleAddTransaction = async (data: Omit<Transaction, 'id'>) => {
    try {
      const driver = data.driverId ? drivers.find(d => d.id === data.driverId) : undefined;
      const car = driver
        ? (cars.find(c => c.assignedDriverId === driver.id) ?? null)
        : undefined;

      const payload: Omit<Transaction, 'id'> = { ...data };
      if (driver) (payload as any).driverName = driver.name;
      // Don't attach car info for deposit top-ups — the HAYDOVCHI column should show the driver, not the car
      if (car && (data as any).category !== 'deposit_topup') {
        payload.carName = `${car.name} — ${car.licensePlate}`;
        if (!(payload as any).carId) (payload as any).carId = car.id;
      }

      // Snapshot deposit balance BEFORE saving (deposit drivers only)
      const isDepositDriver = driver && (driver as any).driverType === 'deposit';
      const balanceBefore = isDepositDriver && driver
        ? calcDriverFinance(driver, car ?? null, transactions).remainingDeposit
        : null;

      const newTxId = await firestoreService.addTransaction(payload as any, carsFleetId);

      // Optimistically update the UI so the transaction shows up instantly
      if (newTxId) {
        setTransactions(prev => [...prev, { ...payload, id: newTxId, timestamp: (payload as any).timestamp ?? Date.now() } as Transaction]);
      }

      // Check threshold crossing for deposit drivers
      if (isDepositDriver && driver && balanceBefore !== null && newTxId) {
        // Simulate the new transaction to get balance after
        const fakeTx = {
          ...data,
          id: newTxId,
          timestamp: (data as any).timestamp ?? Date.now(),
        } as any;
        const balanceAfter = calcDriverFinance(driver, car ?? null, [...transactions, fakeTx]).remainingDeposit;

        const warnThreshold = (driver as any).depositWarningThreshold ?? 1_000_000;
        if (balanceBefore > warnThreshold && balanceAfter <= warnThreshold) {
          const fmtNum = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(Math.abs(n)));
          sendNotification(
            {
              title: `⚠️ Depozit ogohlantirishi`,
              message: `${driver.name} ning depoziti ${fmtNum(warnThreshold)} UZS dan tushdi. Joriy qoldiq: ${fmtNum(balanceAfter)} UZS`,
              type: 'payment_reminder',
              category: 'FINANCE' as any,
              priority: 'HIGH' as any,
              targetUsers: 'all',
              expiresIn: 7 * 24 * 60 * 60 * 1000, // 7 days
              driverId: driver.id,
              driverAvatar: driver.avatar || undefined,
              extraTracking: {
                depositWarning: true,
                driverName: driver.name,
                carName: car?.name,
                carPlate: car?.licensePlate,
                remainingDeposit: balanceAfter,
              },
            },
            adminUser?.id ?? '',
            adminUser?.username ?? 'Tizim'
          ).catch(() => {});
        }
      }
    } catch {
      addToast('error', t.transactionSaveFailed);
    }
  };

  const handleClearDayMarkers = async (driverId: string, date: Date) => {
    const toKey = (value: number | Date) => {
      const d = value instanceof Date ? value : new Date(value);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const dayKey = toKey(date);
    const markerIds = transactions
      .filter(tx =>
        tx.driverId === driverId &&
        tx.status !== 'DELETED' &&
        (tx.type === TransactionType.DAY_OFF || tx.type === TransactionType.NOT_WORKING) &&
        toKey(tx.timestamp) === dayKey
      )
      .map(tx => tx.id);

    if (markerIds.length === 0) return;

    await firestoreService.deleteTransactionsBatch(
      markerIds,
      { adminName: adminUser?.username || 'Admin', count: markerIds.length, totalAmount: 0 },
      carsFleetId
    );

    setTransactions(prev => prev.map(tx =>
      markerIds.includes(tx.id) ? { ...tx, status: 'DELETED' as any } : tx
    ));
  };

  const closeConfirmModal = () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleSaveDriver = async (data: any) => {
    try {
      const { assignedCarId, previousCarId, ...driverData } = data;

      let driverId: string;

      if (data.id) {
        const { id, ...updateData } = driverData;
        // Explicitly null-clear contract fields when switching away from lease_to_own
        if (updateData.driverType !== 'lease_to_own') {
          updateData.totalContractAmount = null;
          updateData.contractDurationMonths = null;
          updateData.contractStartDate = null;
        }
        if (updateData.quitDate === null || updateData.quitDate === undefined) {
          updateData.quitDate = null;
        }
        await firestoreService.updateDriver(id, updateData, carsFleetId);
        driverId = id;
      } else {
        const newDriver = {
          name: data.name,
          licensePlate: data.licensePlate ?? '',
          carModel: data.carModel ?? '',
          phone: data.phone,
          extraPhone: data.extraPhone ?? '',       // ← was silently dropped before
          status: data.status || DriverStatus.OFFLINE,
          avatar: data.avatar || '',
          notes: data.notes ?? '',
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
          dailyPlan: data.dailyPlan || 0,
          // Payment type fields
          driverType: data.driverType ?? 'deposit',
          depositAmount: data.depositAmount ?? 0,
          depositWarningThreshold: data.depositWarningThreshold ?? 1_000_000,
          // Lease-to-own contract fields — always pass explicit null when not used so old values are cleared on updates
          totalContractAmount: data.driverType === 'lease_to_own' ? (data.totalContractAmount ?? null) : null,
          contractDurationMonths: data.driverType === 'lease_to_own' ? (data.contractDurationMonths ?? null) : null,
          contractStartDate: data.driverType === 'lease_to_own' ? (data.contractStartDate ?? null) : null,
          startDate: data.startDate ?? Date.now(),
          quitDate: data.quitDate ?? null,
          documents: data.documents ?? [],
        };
        driverId = await firestoreService.addDriver(newDriver, carsFleetId);
      }

      // Handle car assignment changes
      if (previousCarId && previousCarId !== assignedCarId) {
        await unassignCar(previousCarId);
      }
      if (assignedCarId && assignedCarId !== previousCarId) {
        await assignCar(assignedCarId, driverId);
      }

      // Automatically sync the car's daily plan if this is a lease-to-own driver
      if (data.driverType === 'lease_to_own' && assignedCarId) {
        const total = data.totalContractAmount || 0;
        const duration = data.contractDurationMonths || 1;
        if (total > 0 && duration > 0) {
          const suggestedPlan = Math.ceil(total / (duration * 30) / 1000) * 1000;
          await updateCar(assignedCarId, { dailyPlan: suggestedPlan });
        }
      }
    } catch (error: any) {
      const msg = error?.message || error?.details || 'Xatolik yuz berdi';
      console.error('[handleSaveDriver] Failed:', msg, error);
      addToast('error', msg);
      throw error;
    }
  };

  const handlePaySalary = async (driver: Driver, period: { year: number; month: number }) => {
    const now = Date.now();
    const periodKey = `${period.year}-${String(period.month + 1).padStart(2, '0')}`;

    // Optimistic update
    setDrivers(prev => prev.map(d => d.id === driver.id ? { ...d, lastSalaryPaidAt: now } : d));

    try {
      await firestoreService.addTransaction({
        driverId: driver.id,
        driverName: driver.name,
        amount: driver.monthlySalary,
        type: TransactionType.EXPENSE,
        description: `Ish haqi: ${driver.name}`,
        note: `SALARY|${periodKey}`,
        timestamp: now,
        status: undefined,
        category: 'SALARY',
      } as any, carsFleetId);

      await firestoreService.updateDriver(driver.id, { lastSalaryPaidAt: now } as any, adminUser?.id);
      addToast('success', t.salaryPaid || "Ish haqi to'landi");
    } catch (err) {
      // Roll back optimistic update so UI stays consistent
      setDrivers(prev => prev.map(d => d.id === driver.id ? { ...d, lastSalaryPaidAt: driver.lastSalaryPaidAt } : d));
      console.error('[handlePaySalary] Failed:', err);
      addToast('error', t.paySalaryError || "Xatolik yuz berdi");
    }
  };

  const handleEditDriverClick = (driver: Driver) => {
    setEditingDriver(driver);
    setIsDriverModalOpen(true);
  };

  const handleUpdateDriverStatus = async (driverId: string, newStatus: DriverStatus) => {
    const prev = drivers.find(d => d.id === driverId)?.status;
    setDrivers(ds => ds.map(d => d.id === driverId ? { ...d, status: newStatus } : d));
    try {
      await firestoreService.updateDriver(driverId, { status: newStatus }, adminUser?.id);
    } catch {
      if (prev) setDrivers(ds => ds.map(d => d.id === driverId ? { ...d, status: prev } : d));
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

        // Optimistic: remove driver immediately
        setDrivers(ds => ds.filter(d => d.id !== id));
        try {
          const assignedCar = cars.find(c => c.assignedDriverId === id);
          await firestoreService.deleteDriver(id, {
            adminName: adminProfile?.name || t.unknownAdmin,
            reason: 'Manual deletion by admin'
          }, adminUser?.id);
          if (assignedCar) await unassignCar(assignedCar.id);
        } catch {
          if (driver) setDrivers(ds => [...ds, driver]);
          addToast('error', t.driverDeleteFailed);
        }
      }
    });
  };

  // Finance Data Filtering Logic - REMOVED (Moved to useFinanceStats hook)

  // Repair prompt state — shows a beautiful in-app modal instead of window.confirm
  const [repairPrompt, setRepairPrompt] = useState<{
    isOpen: boolean;
    pendingCarData: Partial<Car> | null;
    driverName: string;
    driverId: string;
  }>({ isOpen: false, pendingCarData: null, driverName: '', driverId: '' });

  const _doSaveCar = async (data: Partial<Car>) => {
    if (!adminUser?.id) return;
    if (data.id) {
      const { id, ...rest } = data;
      await updateCar(id, rest);
    } else {
      await addCar(data as Omit<Car, 'id'>, adminUser.id);
    }
  };

  const handleSaveCar = async (data: Partial<Car>) => {
    if (!adminUser?.id) return;

    // Smart Prompt: If "inRepair" was toggled ON for an assigned car
    if (data.id) {
      const oldCar = cars.find(c => c.id === data.id);
      if (oldCar && !oldCar.inRepair && data.inRepair && oldCar.assignedDriverId) {
        const targetDriver = drivers.find(d => d.id === oldCar.assignedDriverId);
        if (targetDriver) {
          setRepairPrompt({
            isOpen: true,
            pendingCarData: data,
            driverName: targetDriver.name,
            driverId: targetDriver.id,
          });
          return; // Wait for the user's choice in the modal
        }
      }
    }

    await _doSaveCar(data);
  };

  const handleRepairPromptPause = async () => {
    const { pendingCarData, driverId } = repairPrompt;
    setRepairPrompt({ isOpen: false, pendingCarData: null, driverName: '', driverId: '' });
    if (!pendingCarData) return;

    // Add today as a Day Off override for the driver
    const targetDriver = drivers.find(d => d.id === driverId);
    if (targetDriver) {
      const d = new Date();
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const overrides = targetDriver.dayOverrides ? { ...targetDriver.dayOverrides } : {};
      overrides[dateStr] = { type: 'REPAIR' };
      await firestoreService.updateDriver(targetDriver.id, { dayOverrides: overrides } as any, carsFleetId);
      addToast('success', t.repairPlanPaused.replace('{{name}}', targetDriver.name));
    }

    await _doSaveCar(pendingCarData);
  };

  const handleRepairPromptContinue = async () => {
    const { pendingCarData } = repairPrompt;
    setRepairPrompt({ isOpen: false, pendingCarData: null, driverName: '', driverId: '' });
    if (pendingCarData) await _doSaveCar(pendingCarData);
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
      }
    });
  };

  const nonDeletedDrivers = useMemo(() => {
    return drivers.filter(d => !d.isDeleted);
  }, [drivers]);

  // Monthly Analytics Data


  // Yearly Analytics Totals


  // --- RENDER HELPERS ---
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
      const timer = setInterval(() => setCurrentTime(Date.now()), 30000);
      return () => clearInterval(timer);
  }, []);

  const dueNotesCount = allNotes.filter(n => n.reminderAt && n.reminderAt <= currentTime).length;

  const expiringCarsCount = useMemo(() => {
    let count = 0;
    const MS_IN_DAY = 1000 * 60 * 60 * 24;
    const now = Date.now();
    cars.forEach(car => {
      if (car.isDeleted) return;
      const days1 = car.insuranceExpiryMs ? Math.ceil((car.insuranceExpiryMs - now) / MS_IN_DAY) : Infinity;
      const days2 = car.techInspectionExpiryMs ? Math.ceil((car.techInspectionExpiryMs - now) / MS_IN_DAY) : Infinity;
      const days3 = car.tintingExpiryMs ? Math.ceil((car.tintingExpiryMs - now) / MS_IN_DAY) : Infinity;
      
      if (days1 <= 3 || days2 <= 3 || days3 <= 3) {
        count++;
      }
    });
    return count;
  }, [cars, currentTime]); // added currentTime to refresh dynamically if needed

  const renderSidebarItem = (path: string, label: string, Icon: React.FC<any>, badgeCount?: number) => {
    const isActive = location.pathname === path;
    return (
      <button
        onClick={() => { navigate(path); setIsSidebarOpen(false); }}
        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-200 cursor-pointer mb-1 group ${isActive
          ? theme === 'dark'
            ? 'bg-emerald-500/10 text-emerald-400'
            : 'bg-emerald-50/70 text-emerald-700'
          : theme === 'dark'
            ? 'text-white/60 hover:text-white hover:bg-white/5'
            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
      >
        <Icon className={`w-5 h-5 flex-shrink-0 stroke-[1.5] transition-colors ${isActive
          ? theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
          : theme === 'dark' ? 'text-white/40 group-hover:text-white/70' : 'text-slate-400 group-hover:text-slate-600'
        }`} />
        <span className="font-medium flex-1 text-left">{label}</span>
        {!!badgeCount && badgeCount > 0 && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto bg-red-500 text-white">
            {badgeCount}
          </span>
        )}
      </button>
    );
  };

  if (!isAuthenticated) return <AuthScreen onAuthenticated={handleLogin} theme={theme} />;

  if (isAuthenticated && isLocked) return (
    <LockScreen
      adminName={adminUser?.username ?? 'Admin'}
      adminPhone={adminUser?.phone ?? ''}
      onUnlock={handleUnlock}
    />
  );

  // Block rendering until strict auth check completes for admins
  if (isAuthChecking) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${theme === 'dark' ? 'bg-[#080808]' : 'bg-[#ebf4f4]'
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
  const validPaths = ['/dashboard', '/drivers', '/cars', '/transactions', '/finance', '/monthly-plan', '/payroll', '/fines', '/notes', '/documents', '/pdf-viewer', '/', '/mirjalol49'];
  const is404 = !validPaths.some(path => location.pathname === path || location.pathname.startsWith(path + '/'));

  // Render 404 page fullscreen if path doesn't match
  if (is404) {
    return <NotFound />;
  }

  // Hidden Admin Dashboard - Render outside main layout
  if (location.pathname.startsWith('/mirjalol49')) {
    return (
      <React.Suspense fallback={
        <div className="min-h-screen bg-[#080808] flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      }>
        <HiddenDashboard />
      </React.Suspense>
    );
  }

  return (
    <ConfirmProvider theme={theme}>
    <div className={`flex h-screen overflow-hidden font-sans transition-colors duration-200 ${theme === 'dark'
      ? 'text-white'
      : 'bg-surface-2 text-black'
      }`}
      style={{ background: theme === 'dark' ? 'var(--color-bg)' : undefined }}
    >
      {/* SIDEBAR */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col transform transition-all duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${theme === 'dark' ? 'bg-[#0b1326] border-r border-white/[0.08]' : 'bg-white border-r border-slate-100 shadow-[2px_0_8px_-4px_rgba(0,0,0,0.02)]'}`}
      >
        <div className="absolute top-4 right-4 md:hidden">
          <button onClick={() => setIsSidebarOpen(false)} className={`${theme === 'dark' ? 'text-white/50 hover:text-white' : 'text-slate-400 hover:text-slate-800'}`}><XIcon className="w-6 h-6" /></button>
        </div>
        <div className="p-5 flex justify-center relative overflow-hidden">
          <TaksaparkLogo theme={theme} />
        </div>
        <nav className="flex-1 px-4 overflow-y-auto">
          <div className={`text-[11px] font-semibold uppercase tracking-wider mb-3 px-3 ${theme === 'dark' ? 'text-white/40' : 'text-slate-400'}`}>{t.menu}</div>
          {renderSidebarItem('/dashboard', t.dashboard, LayoutDashboardIcon)}
          {renderSidebarItem('/drivers', t.driversList, UsersIcon)}
          {renderSidebarItem('/cars', t.cars, CarIcon, expiringCarsCount)}
          {renderSidebarItem('/monthly-plan', t.monthlyPlan, CalendarIcon)}
          {renderSidebarItem('/transactions', t.transactions, ListIcon)}
          {renderSidebarItem('/finance', t.financialReports, BanknoteIcon)}
          {renderSidebarItem('/payroll', t.salaryManagement || 'Ish Haqi', WalletIcon)}
          {renderSidebarItem('/fines', t.fines || 'Jarimalar', AlertTriangleIcon)}
          {renderSidebarItem('/notes', t.notes, NotesIcon, dueNotesCount)}
          {renderSidebarItem('/documents', t.documents || 'Hujjatlar', FolderOpenIcon)}

          {/* Super Admin — only visible to the super admin account */}
          {(adminUser?.username === 'mirjalol' || adminUser?.role === 'super_admin') && (
            <button
              onClick={() => setIsSuperAdminOpen(true)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-200 cursor-pointer mt-1 group ${
                theme === 'dark'
                  ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
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
        <div className="px-4 pb-4 space-y-2 md:hidden">
          {/* Theme Toggle - Mobile */}
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all ${theme === 'dark'
              ? 'bg-white/5 hover:bg-white/10 text-white/70'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
              }`}
          >
            <div className="flex items-center gap-3">
              {theme === 'dark'
                ? <SunIcon className="w-4 h-4 text-[#FF9F0A]" />
                : <MoonIcon className="w-4 h-4 text-slate-500" />
              }
              <span className="font-medium text-[14px]">{theme === 'dark' ? t.lightMode : t.darkMode}</span>
            </div>
            <div className={`w-10 h-6 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-white/20' : 'bg-slate-200'}`}>
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${theme === 'dark' ? 'left-0.5' : 'translate-x-[18px]'}`} />
            </div>
          </button>

          {/* Language Selector - Mobile Only */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all ${theme === 'dark'
              ? 'bg-white/5 hover:bg-white/10 text-white/70'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
              }`}
          >
            <div className="flex items-center gap-3">
              <GlobeIcon className="w-4 h-4" />
              <span className="font-medium text-[14px]">{t.uiLanguage}</span>
            </div>
            <span className="text-xs font-bold uppercase tracking-wide">{language}</span>
          </button>
          <div className={`rounded-xl overflow-hidden ${theme === 'dark' ? 'bg-black/20' : 'bg-slate-50'}`}>
            <button onClick={() => { handleSetLanguage('uz'); setIsSidebarOpen(false); }} className={`w-full text-left px-4 py-2.5 text-[14px] font-medium transition-colors ${theme === 'dark' ? 'hover:bg-white/10 text-white/80' : 'hover:bg-slate-100 text-slate-600'}`}>O'zbek</button>
            <button onClick={() => { handleSetLanguage('ru'); setIsSidebarOpen(false); }} className={`w-full text-left px-4 py-2.5 text-[14px] font-medium transition-colors ${theme === 'dark' ? 'hover:bg-white/10 text-white/80' : 'hover:bg-slate-100 text-slate-600'}`}>Русский</button>
            <button onClick={() => { handleSetLanguage('en'); setIsSidebarOpen(false); }} className={`w-full text-left px-4 py-2.5 text-[14px] font-medium transition-colors ${theme === 'dark' ? 'hover:bg-white/10 text-white/80' : 'hover:bg-slate-100 text-slate-600'}`}>English</button>
          </div>
        </div>
        <div className={`p-4 border-t space-y-1 ${theme === 'dark' ? 'border-white/[0.08]' : 'border-slate-100'}`}>
          {userRole === 'admin' && (
            <>
              {(!adminProfile && !adminUser) ? (
                // Skeleton loading state
                <div className={`rounded-xl p-3 flex items-center gap-3 ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-50 border border-slate-100'}`}>
                  <Skeleton variant="circular" width={36} height={36} theme="dark" />
                  <div className="flex-1 space-y-2">
                    <Skeleton variant="text" width="60%" height={14} theme="dark" />
                    <Skeleton variant="text" width="40%" height={10} theme="dark" />
                  </div>
                </div>
              ) : (
                // Actual admin profile
                <div onClick={() => setIsAdminModalOpen(true)} className={`rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-all group ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-50 border border-slate-100 hover:border-slate-200'}`}>
                  <div className={`w-9 h-9 rounded-full overflow-hidden flex items-center justify-center font-bold flex-shrink-0 ${theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                    {(adminUser?.avatar || adminProfile?.avatar) ? (
                      <img src={adminUser?.avatar || adminProfile?.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      (adminUser?.username || adminProfile?.name || "A")[0].toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[14px] font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                      {adminUser?.username || adminProfile?.name || "Admin"}
                    </p>
                  </div>
                  <EditIcon className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity ${theme === 'dark' ? 'text-white' : 'text-slate-400'}`} />
                </div>
              )}
            </>
          )}
          <button onClick={() => { playLockSound(); setIsLocked(true); }} className={`w-full flex items-center gap-2 p-2 rounded-lg text-sm font-medium transition-colors mt-2 ${theme === 'dark' ? 'text-white/40 hover:text-rose-400 hover:bg-rose-500/10' : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50'}`}>
            <LogOutIcon className="w-4 h-4" />
            <span>{t.lockSystem}</span>
          </button>
        </div>
      </div>

      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Desktop Header - Hidden on Mobile */}
        <DesktopHeader
          theme={theme}
          onThemeToggle={toggleTheme}
          onLanguageChange={handleSetLanguage}
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
              markAllNotificationsAsRead(unreadIds, userId).catch(() => {});
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
        <header
          className={`h-16 flex items-center justify-between px-5 z-10 border-b flex-shrink-0 md:hidden ${theme === 'dark' ? 'border-white/[0.08]' : 'bg-white border-black/[0.08]'}`}
          style={{ background: theme === 'dark' ? 'var(--color-sidebar)' : undefined }}
        >
          {/* Left: Hamburger + Page Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setIsSidebarOpen(true)} className={`flex-shrink-0 ${theme === 'dark' ? 'text-[rgba(235,235,245,0.6)] hover:text-white' : 'text-[rgba(60,60,67,0.6)] hover:text-black'
              }`}><MenuIcon className="w-6 h-6" /></button>
            <div className="min-w-0">
              <h2 className={`text-[17px] font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-black'
                }`}>
                {location.pathname === '/dashboard' && t.overview}
                {location.pathname === '/drivers' && t.driversList}
                {location.pathname === '/cars' && t.cars}
                {location.pathname === '/finance' && t.analytics}
                {location.pathname === '/monthly-plan' && t.monthlyPlan}
                {location.pathname === '/transactions' && t.transactions}
                {location.pathname === '/notes' && t.notes}
                {location.pathname === '/documents' && (t.documents || 'Hujjatlar')}
                {location.pathname === '/payroll' && (t.salaryManagement || 'Ish Haqi Boshqaruvi')}
              </h2>
              <p className={`text-[13px] mt-0.5 hidden sm:block ${theme === 'dark' ? 'text-[rgba(235,235,245,0.45)]' : 'text-[rgba(60,60,67,0.5)]'
                }`}>
                {location.pathname === '/dashboard' && t.descDashboard}
                {location.pathname === '/drivers' && t.descDrivers}
                {location.pathname === '/cars' && t.descCars}
                {location.pathname === '/finance' && t.descFinance}
                {location.pathname === '/monthly-plan' && t.monthlyPlanDesc}
                {location.pathname === '/transactions' && t.descTransactions}
                {location.pathname === '/notes' && t.descNotes}
                {location.pathname === '/documents' && t.documentsDesc}
              </p>
            </div>
          </div>

          {/* Right: Notification Bell */}
          <div className="flex-shrink-0 ml-2">
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
              readIds={readNotificationIds}
              userId={adminUser?.id || 'global'}
              theme={theme}
              cars={cars}
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
                  const newSet = new Set(readNotificationIds);
                  unreadIds.forEach(id => newSet.add(id));
                  setReadNotificationIds(newSet);
                  setUnreadCount(0);
                  markAllNotificationsAsRead(unreadIds, userId).catch(() => {});
                }
              }}
              onDeleteNotification={async (id) => {
                const userId = adminUser?.id || 'global';
                dismissNotification(id);
                await deleteNotification(id, userId);
              }}
              onClearAllRead={async () => {
                const userId = adminUser?.id || 'global';
                dismissReadNotifications(readNotificationIds);
                await clearAllReadNotifications(userId);
              }}
            />
          </div>
        </header>

        {/* ACTION BUTTONS ROW - Mobile Only */}
        <div
          className={`flex items-center justify-between px-5 py-3 border-b sticky top-16 z-10 md:hidden ${theme === 'dark' ? 'border-white/[0.08]' : 'bg-surface-2 border-black/[0.06]'}`}
          style={{ background: theme === 'dark' ? 'var(--color-bg)' : undefined }}
        >
          {location.pathname === '/drivers' && userRole === 'admin' && (
            <>
              <button onClick={() => { setEditingDriver(null); setIsDriverModalOpen(true); }} className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all w-full sm:w-auto bg-[#0f766e] hover:bg-[#0a5c56] text-white active:scale-95">
                <PlusIcon className="w-4 h-4" /> <span>{t.add}</span>
              </button>
            </>
          )}

          {userRole === 'admin' && location.pathname !== '/drivers' && (
            <button onClick={() => setIsTxModalOpen(true)} className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all w-full sm:w-auto bg-[#0f766e] hover:bg-[#0a5c56] text-white active:scale-95">
              <PlusIcon className="w-4 h-4" /> <span>{t.newTransfer}</span>
            </button>
          )}
        </div>

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8 relative z-0 custom-scrollbar">

          {/* DASHBOARD */}
          <React.Suspense fallback={<PageSkeleton theme={theme} variant="generic" />}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage
              transactions={transactions}
              drivers={drivers}
              cars={cars}
              isDataLoading={contextDataLoading}
              theme={theme}
              isMobile={isMobile}
            />} />

            {/* DRIVERS */}
            <Route path="/drivers" element={
              <DriversPage
                drivers={drivers}
                cars={cars}
                transactions={transactions}
                isDataLoading={driversLoading}
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
                onAddTransaction={handleAddTransaction}
                theme={theme}
              />
            } />

            <Route path="/drivers/:id" element={
              <DriverProfilePage
                drivers={drivers}
                cars={cars}
                transactions={transactions}
                theme={theme}
                userRole={userRole}
                onEditDriver={handleEditDriverClick}
                onDeleteDriver={handleDeleteDriver}
                onAddTransaction={handleAddTransaction}
                onOpenDepositTopup={(driverId) => {
                  setTxInitialDriverId(driverId);
                  setTxInitialType(TransactionType.INCOME);
                  setTxInitialDepositTopup(true);
                  setIsTxModalOpen(true);
                }}
              />
            } />

            {/* CARS */}
            <Route path="/cars" element={
              <CarsPage
                cars={cars}
                drivers={drivers}
                isDataLoading={carsLoading}
                userRole={userRole}
                adminName={adminUser?.username ?? adminProfile?.name ?? 'Admin'}
                onAddCar={() => { setEditingCar(null); setIsCarModalOpen(true); }}
                onEditCar={(car) => { setEditingCar(car); setIsCarModalOpen(true); }}
                onSaveCar={handleSaveCar}
                onDeleteCar={handleDeleteCar}
                theme={theme}
              />
            } />
            <Route path="/cars/:id" element={
              <CarProfilePage
                cars={cars}
                drivers={drivers}
                theme={theme}
                userRole={userRole}
                adminName={adminUser?.username ?? adminProfile?.name ?? 'Admin'}
                onEditCar={(car) => { setEditingCar(car); setIsCarModalOpen(true); }}
                onDeleteCar={handleDeleteCar}
                onSaveCar={handleSaveCar}
              />
            } />

            {/* FINANCE (ANALYTICS) COMPONENT */}
            <Route path="/finance" element={
              txLoading
                ? <PageSkeleton theme={theme} variant="generic" />
                : <FinancePage
                    transactions={transactions}
                    drivers={drivers}
                    cars={cars}
                    theme={theme}
                    isMobile={isMobile}
                  />
            } />


            {/* MONTHLY PLAN COMPONENT */}
            <Route path="/monthly-plan" element={
              (driversLoading || txLoading)
                ? <PageSkeleton theme={theme} variant="generic" />
                : <MonthlyPlanPage
                    transactions={transactions}
                    drivers={drivers}
                    cars={cars}
                    theme={theme}
                    isMobile={isMobile}
                    onClearDayMarkers={handleClearDayMarkers}
                  />
            } />

            {/* PAYROLL */}
            <Route path="/payroll" element={
              driversLoading
                ? <PageSkeleton theme={theme} variant="generic" />
                : <PayrollPage
                    drivers={drivers}
                    cars={cars}
                    transactions={transactions}
                    theme={theme}
                    userRole={userRole}
                    onPaySalary={handlePaySalary}
                  />
            } />

            {/* TRANSACTIONS — self-fetching with cursor pagination + skeleton */}
            <Route path="/transactions" element={
              <TransactionsPage
                drivers={drivers}
                cars={cars}
                userRole={userRole}
                adminUser={adminUser}
                theme={theme}
              />
            } />

            {/* FINES */}
            <Route path="/fines" element={<FinesPage drivers={nonDeletedDrivers} cars={cars} />} />

            {/* NOTES */}
            <Route path="/notes" element={
              <NotesPage
                theme={theme}
                fleetId={userRole === 'viewer'
                  ? ((adminProfile as any)?.fleet_id || (adminProfile as any)?.created_by)
                  : adminUser?.id}
                initialNotes={allNotes}
                initialLoading={notesLoading}
                initialTableError={notesTableError}
              />
            } />

            {/* DOCUMENTS */}
            <Route path="/documents" element={
              <DocumentsPage
                theme={theme}
                fleetId={userRole === 'viewer'
                  ? ((adminProfile as any)?.fleet_id || (adminProfile as any)?.created_by)
                  : (adminUser?.id ?? '')}
                userName={adminUser?.username ?? 'Admin'}
              />
            } />

            {/* PDF viewer — fixed overlay, no sidebar visible */}
            <Route path="/pdf-viewer" element={<PdfViewerPage />} />
          </Routes >
          </React.Suspense>
        </main >
      </div >

      {/* MODALS */}
      <React.Suspense fallback={null}>
        {isTxModalOpen && (
          <FinancialModal
            isOpen={isTxModalOpen}
            onClose={() => {
                setIsTxModalOpen(false);
                setTxInitialDriverId(undefined);
                setTxInitialType(undefined);
                setTxInitialDate(undefined);
                setTxInitialDepositTopup(false);
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
            initialIsDepositTopup={txInitialDepositTopup}
          />
        )}

        {isDriverModalOpen && (
          <DriverModal
            isOpen={isDriverModalOpen}
            onClose={() => { setIsDriverModalOpen(false); setEditingDriver(null); }}
            onSubmit={handleSaveDriver}
            editingDriver={editingDriver}
            cars={cars}
            theme={theme}
          />
        )}

        {isCarModalOpen && (
          <CarModal
            isOpen={isCarModalOpen}
            onClose={() => { setIsCarModalOpen(false); setEditingCar(null); }}
            onSubmit={handleSaveCar}
            editingCar={editingCar}
            adminName={adminUser?.username ?? adminProfile?.name ?? 'Admin'}
            theme={theme}
            isLockedByVikup={editingCar ? drivers.some(d => d.id === editingCar.assignedDriverId && d.driverType === 'lease_to_own') : false}
          />
        )}
      </React.Suspense>

      {/* ── Repair Prompt Modal (Apple iOS Native Style) ── */}
      {repairPrompt.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-[2px]" 
            style={{ animation: 'fadeIn 0.25s ease-out forwards' }}
            onClick={handleRepairPromptContinue} 
          />

          {/* iOS Alert Card */}
          <div 
            className={`relative w-[320px] flex flex-col items-center rounded-[18px] overflow-hidden shadow-[0_20px_60px_rgb(0,0,0,0.25)] ${
              isDark ? 'bg-[#1e1e1e]/85 backdrop-blur-2xl border border-white/10' : 'bg-[#f2f2f2]/90 backdrop-blur-2xl border border-black/5'
            }`}
            style={{ animation: 'modalPop 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards' }}
          >
            {/* Content Area */}
            <div className="pt-6 px-5 pb-5 text-center">
              {/* Title */}
              <h3 className={`text-[19px] leading-[24px] font-bold tracking-tight mb-[6px] ${isDark ? 'text-white' : 'text-black'}`}>
                Ta'mirga yuborildi
              </h3>

              {/* Message */}
              <p className={`text-[15px] leading-[20px] tracking-tight ${isDark ? 'text-white/80' : 'text-black/80'}`}>
                Bu avtomobil <span className={`font-semibold ${isDark ? 'text-white' : 'text-black'}`}>{repairPrompt.driverName}</span> ga biriktirilgan. Mashina ta'mirdaligi sababli, uning bugungi kunlik rejasini to'xtatib qo'yishni xohlaysizmi?
              </p>
            </div>

            {/* Buttons Area */}
            <div className="w-full flex flex-col">
              <div className={`w-full h-[0.5px] ${isDark ? 'bg-white/15' : 'bg-black/10'}`} />
              <button
                onClick={handleRepairPromptPause}
                className={`w-full h-[50px] text-[17px] tracking-tight font-semibold transition-colors active:bg-black/10 ${
                  isDark ? 'text-[#0a84ff]' : 'text-[#007aff]'
                }`}
              >
                Ha, to'xtatish
              </button>
              
              <div className={`w-full h-[0.5px] ${isDark ? 'bg-white/15' : 'bg-black/10'}`} />
              <button
                onClick={handleRepairPromptContinue}
                className={`w-full h-[50px] text-[17px] tracking-tight transition-colors active:bg-black/10 ${
                  isDark ? 'text-[#0a84ff]' : 'text-[#007aff]'
                }`}
              >
                Yo'q, davom etsin
              </button>
            </div>
          </div>
        </div>
      )}

      <React.Suspense fallback={null}>
        {isAdminModalOpen && (
          <AdminModal
            isOpen={isAdminModalOpen}
            onClose={() => setIsAdminModalOpen(false)}
            adminData={
              adminUser
                ? {
                  name: adminUser.username,
                  role: adminUser.role,
                  // Pass the raw saved avatar URL (or undefined). Do NOT fall back to a DiceBear URL here —
                  // AdminModal internally renders initials when avatar is falsy, and hasChanges() compares
                  // the initial value. If we substitute a DiceBear URL, the upload comparison breaks.
                  avatar: adminUser.avatar || undefined,
                  phone: adminUser.phone
                }
                : (adminProfile || { name: t.systemAdmin, role: t.manager, avatar: undefined })
            }
            onUpdate={handleUpdateProfile}
            userRole={userRole}
            theme={theme}
            onLogout={() => { playLockSound(); handleLogout(); }}
            onLock={() => { playLockSound(); setIsLocked(true); }}
          />
        )}
      </React.Suspense>

      {/* CONFIRMATION MODAL */}
      <React.Suspense fallback={null}>
        {confirmModal.isOpen && (
          <ConfirmModal
            isOpen={confirmModal.isOpen}
            title={confirmModal.title}
            message={confirmModal.message}
            onConfirm={confirmModal.action}
            onCancel={closeConfirmModal}
            isDanger={confirmModal.isDanger}
            theme={theme}
          />
        )}
      </React.Suspense>

      {/* SUPER ADMIN PANEL */}
      <React.Suspense fallback={null}>
        {isSuperAdminOpen && (
          <SuperAdminPanel
            isOpen={isSuperAdminOpen}
            onClose={() => setIsSuperAdminOpen(false)}
            currentUserId={adminUser?.id || ''}
          />
        )}
      </React.Suspense>

      {/* TOAST NOTIFICATIONS */}
      <ToastContainer theme={theme} />

      {/* NOTE REMINDER ALERT — fires as a floating banner on any page when reminder is due */}
      <NoteReminderAlert theme={theme} onNoteClick={() => navigate('/notes')} />
    </div >
    </ConfirmProvider>
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
