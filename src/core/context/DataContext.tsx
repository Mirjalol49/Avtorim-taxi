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

    const { drivers, setDrivers, loading: driversLoading } = useDrivers(fleetId, refreshTrigger);
    const { transactions, setTransactions, loading: txLoading } = useTransactions(fleetId, refreshTrigger);
    const {
        notifications,
        unreadCount,
        readNotificationIds,
        setNotifications,
        setReadNotificationIds,
        setUnreadCount
    } = useNotifications(adminUser, userRole);

    const loading = driversLoading || txLoading;

    return (
        <DataContext.Provider value={{
            drivers,
            driversLoading,
            setDrivers,
            transactions,
            txLoading,
            setTransactions,
            notifications,
            unreadCount,
            readNotificationIds,
            setNotifications,
            setReadNotificationIds,
            setUnreadCount,
            loading,
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
