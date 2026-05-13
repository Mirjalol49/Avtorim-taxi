import React, { createContext, useContext, ReactNode } from 'react';
import { useDrivers } from '../../features/drivers/hooks/useDrivers';
import { useTransactions } from '../../features/transactions/hooks/useTransactions';
import { useNotifications } from '../../features/notifications/hooks/useNotifications';
import { useAuthContext } from '../../features/auth/context/AuthContext';
import { Driver, Transaction, Notification } from '../../core/types';

interface DataContextType {
    drivers: Driver[];
    driversLoading: boolean;
    setDrivers: React.Dispatch<React.SetStateAction<Driver[]>>;
    transactions: Transaction[];
    txLoading: boolean;
    setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
    notifications: Notification[];
    unreadCount: number;
    readNotificationIds: Set<string>;
    setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
    setReadNotificationIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
    dismissNotification: (id: string) => void;
    dismissReadNotifications: (readIds: Set<string>) => void;
    loading: boolean;
    triggerRefresh: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { adminUser, userRole, adminProfile } = useAuthContext();

    // Conditionally fetch data only if authenticated? 
    // Hooks internall check? No, hooks take fleetId. If undefined, they might not fetch or fetch global.
    // In App.tsx: useDrivers(adminUser?.id)

    // Cast to any to access specific viewer properties not on AdminProfile interface
    // In viewer mode, adminProfile is actually a Viewer object
    // Viewer raw Supabase data uses snake_case: fleet_id or created_by
    const fleetId = userRole === 'viewer'
        ? ((adminProfile as any)?.fleet_id || (adminProfile as any)?.created_by)
        : adminUser?.id;

    const [refreshTrigger, setRefreshTrigger] = React.useState(0);
    const triggerRefresh = React.useCallback(() => {
        setRefreshTrigger(prev => prev + 1);
    }, []);

    const { drivers, setDrivers, loading: driversLoadingRaw } = useDrivers(fleetId, refreshTrigger);
    const { transactions, setTransactions, loading: txLoadingRaw } = useTransactions(fleetId, refreshTrigger);
    const {
        notifications,
        unreadCount,
        readNotificationIds,
        setNotifications,
        setReadNotificationIds,
        setUnreadCount,
        dismissNotification,
        dismissReadNotifications,
    } = useNotifications(adminUser, userRole);

    // Safety valve: if any loading state hasn't resolved, unblock the UI.
    // Timeout is 11s — just beyond useTransactions' own 10s abort+retry window.
    // Previously 6s caused transactions to appear empty while still fetching
    // (the dual-fetch fetchAll can take up to 9s on a cold Supabase instance).
    const [timedOut, setTimedOut] = React.useState(false);
    const combinedLoading = driversLoadingRaw || txLoadingRaw;
    React.useEffect(() => {
        if (!combinedLoading) { setTimedOut(false); return; }
        const t = setTimeout(() => setTimedOut(true), 11000);
        return () => clearTimeout(t);
    }, [combinedLoading]);

    // Each resource reports its own real loading state, not the combined one.
    // This means pages that only need drivers won't wait for transactions and vice versa.
    const effectiveDriversLoading = driversLoadingRaw && !timedOut;
    const effectiveTxLoading = txLoadingRaw && !timedOut;

    return (
        <DataContext.Provider value={{
            drivers,
            driversLoading: effectiveDriversLoading,
            setDrivers,
            transactions,
            txLoading: effectiveTxLoading,
            setTransactions,
            notifications,
            unreadCount,
            readNotificationIds,
            setNotifications,
            setReadNotificationIds,
            setUnreadCount,
            dismissNotification,
            dismissReadNotifications,
            loading: effectiveDriversLoading || effectiveTxLoading,
            triggerRefresh
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useDataContext = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useDataContext must be used within a DataProvider');
    }
    return context;
};
