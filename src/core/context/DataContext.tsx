import React, { createContext, useContext, ReactNode } from 'react';
import { useDrivers } from '../../features/drivers/hooks/useDrivers';
import { useTransactions } from '../../features/transactions/hooks/useTransactions';
import { useSalaries } from '../../features/salaries/hooks/useSalaries';
import { useNotifications } from '../../features/notifications/hooks/useNotifications';
import { useAuthContext } from '../../features/auth/context/AuthContext';
import { Driver, Transaction, DriverSalary, Notification } from '../../core/types';

interface DataContextType {
    drivers: Driver[];
    driversLoading: boolean;
    transactions: Transaction[];
    txLoading: boolean;
    salaryHistory: DriverSalary[];
    salariesLoading: boolean;
    notifications: Notification[];
    unreadCount: number;
    readNotificationIds: Set<string>;
    setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
    setReadNotificationIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
    loading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { adminUser, userRole, isAuthenticated } = useAuthContext();

    // Conditionally fetch data only if authenticated? 
    // Hooks internall check? No, hooks take fleetId. If undefined, they might not fetch or fetch global.
    // In App.tsx: useDrivers(adminUser?.id)

    const fleetId = adminUser?.id;

    const { drivers, loading: driversLoading } = useDrivers(fleetId);
    const { transactions, loading: txLoading } = useTransactions(fleetId);
    const { salaryHistory, loading: salariesLoading } = useSalaries(fleetId);
    const {
        notifications,
        unreadCount,
        readNotificationIds,
        setNotifications,
        setReadNotificationIds,
        setUnreadCount
    } = useNotifications(adminUser, userRole);

    const loading = driversLoading || txLoading || salariesLoading;

    return (
        <DataContext.Provider value={{
            drivers,
            driversLoading,
            transactions,
            txLoading,
            salaryHistory,
            salariesLoading,
            notifications,
            unreadCount,
            readNotificationIds,
            setNotifications,
            setReadNotificationIds,
            setUnreadCount,
            loading
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
