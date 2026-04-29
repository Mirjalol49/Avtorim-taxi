import { useState, useMemo } from 'react';
import { Transaction, Driver, TransactionType, PaymentStatus, TimeFilter, DriverStatus } from '../../../core/types';
import { Car } from '../../../core/types/car.types';
import { toDateKey } from '../../../../services/daysOffService';
import { calcDriverDebt } from '../../drivers/utils/debtUtils';

export const useDashboardStats = (transactions: Transaction[], drivers: Driver[], cars: Car[]) => {
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

    // All non-deleted drivers (regardless of online/offline status - every driver has a daily plan)
    const nonDeletedDrivers = useMemo(() => {
        return drivers.filter(d => !d.isDeleted);
    }, [drivers]);

    // Chart Data
    const chartData = useMemo(() => {
        return nonDeletedDrivers.map(d => {
            const dIncome = filteredTx.filter(t => t.driverId === d.id && t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
            const dExpense = filteredTx.filter(t => t.driverId === d.id && t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
            return {
                id: d.id,
                name: d.name.split(' ')[0],
                fullName: d.name,
                Income: dIncome,
                Expense: dExpense
            };
        });
    }, [nonDeletedDrivers, filteredTx]);

    // Daily Plan Status
    const todayStats = useMemo(() => {
        const todayKey = toDateKey(new Date());

        // Build a set of driver IDs who have an active DAY_OFF transaction today
        const dayOffDriverIds = new Set<string>(
            transactions
                .filter(tx => {
                    if ((tx.type as string) !== 'DAY_OFF') return false;
                    if (tx.status === PaymentStatus.DELETED || (tx as any).status === 'DELETED') return false;
                    return toDateKey(new Date(tx.timestamp)) === todayKey;
                })
                .map(tx => tx.driverId)
                .filter(Boolean) as string[]
        );

        const completed: any[] = [];
        const pending: any[] = [];
        const dayOff: any[] = [];

        nonDeletedDrivers.forEach(driver => {
            // Exclude drivers who are on day off today
            if (dayOffDriverIds.has(driver.id)) {
                dayOff.push({ ...driver, isDayOff: true, todayIncome: 0, todayDebt: 0, totalDebt: 0 });
                return;
            }

            const driverCars = cars.filter(c => c.assignedDriverId === driver.id && !c.isDeleted);

            // Reusing debt utility logic
            const driverCar = driverCars[0] || null;

            // Skip drivers with no assigned car — they have no daily plan and
            // would always show as "pending" with -0, which is misleading.
            if (!driverCar || !driverCar.dailyPlan || driverCar.dailyPlan <= 0) return;

            const info = calcDriverDebt(driver, driverCar, transactions);

            const adjustedTotalDebt = info.netDebt;

            const stat = {
                ...driver,
                dailyPlan: info.dailyPlan,
                todayIncome: info.todayIncome,
                todayDebt: info.todayDebt,
                totalDebt: adjustedTotalDebt,
                isDayOff: false
            };

            if (info.todayIncome >= (info.dailyPlan > 0 ? info.dailyPlan : 1)) {
                completed.push(stat);
            } else {
                pending.push(stat);
            }
        });

        // Sort completed by income descending
        completed.sort((a, b) => b.todayIncome - a.todayIncome);
        // Sort pending by remaining amount ascending
        pending.sort((a, b) => a.todayDebt - b.todayDebt);

        return { completed, pending, dayOff };
    }, [nonDeletedDrivers, cars, transactions]);

    return {
        timeFilter, setTimeFilter,
        dashboardViewMode, setDashboardViewMode,
        dashboardPage, setDashboardPage, dashboardItemsPerPage,
        totalIncome, totalExpense, netProfit,
        chartData, todayStats
    };
};
