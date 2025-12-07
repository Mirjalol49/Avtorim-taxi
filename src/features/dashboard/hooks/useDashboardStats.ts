import { useState, useMemo } from 'react';
import { Transaction, Driver, TransactionType, PaymentStatus, TimeFilter, DriverStatus } from '../../../core/types';

export const useDashboardStats = (transactions: Transaction[], drivers: Driver[]) => {
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');

    // Dashboard view mode state (chart/grid)
    const [dashboardViewMode, setDashboardViewMode] = useState<'chart' | 'grid'>('chart');
    const [dashboardPage, setDashboardPage] = useState(1);
    const dashboardItemsPerPage = 12;

    // Filter Transactions logic
    const getDashboardFilteredTransactions = useMemo(() => {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

        // Logic for Start of Week (assuming locally current day minus day of week)
        const currentWeekDay = new Date(now);
        const startOfWeek = new Date(currentWeekDay.setDate(currentWeekDay.getDate() - currentWeekDay.getDay())).getTime();

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

        return transactions.filter(tx => {
            // Exclude refunded/reversed/deleted transactions
            if (tx.status === PaymentStatus.REFUNDED || tx.status === PaymentStatus.REVERSED || tx.status === PaymentStatus.DELETED) return false;

            if (timeFilter === 'all') return true;
            if (timeFilter === 'today') return tx.timestamp >= startOfDay;
            if (timeFilter === 'week') return tx.timestamp >= startOfWeek;
            if (timeFilter === 'month') return tx.timestamp >= startOfMonth;
            if (timeFilter === 'year') return tx.timestamp >= startOfYear;
            return true;
        });
    }, [transactions, timeFilter]);

    // Main Stats
    const filteredTx = getDashboardFilteredTransactions;
    const totalIncome = useMemo(() => filteredTx.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0), [filteredTx]);
    const totalExpense = useMemo(() => filteredTx.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0), [filteredTx]);
    const netProfit = totalIncome - totalExpense;

    const nonDeletedDrivers = useMemo(() => {
        return drivers.filter(d => !d.isDeleted);
    }, [drivers]);

    // Chart Data
    const chartData = useMemo(() => {
        return nonDeletedDrivers.map(d => {
            const dIncome = filteredTx.filter(t => t.driverId === d.id && t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
            const dExpense = filteredTx.filter(t => t.driverId === d.id && t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
            return { name: d.name.split(' ')[0], Income: dIncome, Expense: dExpense };
        });
    }, [nonDeletedDrivers, filteredTx]);

    // Leaderboard
    const topDrivers = useMemo(() => {
        const stats = nonDeletedDrivers.map(d => {
            const income = filteredTx.filter(t => t.driverId === d.id && t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
            return { ...d, income };
        });
        return stats.sort((a, b) => b.income - a.income).slice(0, 5); // Top 5
    }, [nonDeletedDrivers, filteredTx]);

    const activeDriversList = useMemo(() => {
        return nonDeletedDrivers.filter(d => d.status === DriverStatus.ACTIVE);
    }, [nonDeletedDrivers]);

    // Badge Color Helper
    const getBadgeColor = (index: number) => {
        if (index === 0) return "text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.6)]"; // Gold
        if (index === 1) return "text-slate-300 drop-shadow-[0_0_12px_rgba(203,213,225,0.6)]"; // Silver
        if (index === 2) return "text-orange-400 drop-shadow-[0_0_12px_rgba(251,146,60,0.6)]"; // Bronze
        return "text-slate-700 opacity-20";
    };

    return {
        timeFilter, setTimeFilter,
        dashboardViewMode, setDashboardViewMode,
        dashboardPage, setDashboardPage, dashboardItemsPerPage,
        totalIncome, totalExpense, netProfit,
        chartData, topDrivers, activeDriversList,
        getBadgeColor
    };
};
