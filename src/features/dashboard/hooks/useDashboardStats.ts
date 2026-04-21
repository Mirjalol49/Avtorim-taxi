import { useState, useMemo } from 'react';
import { Transaction, Driver, TransactionType, PaymentStatus, TimeFilter, DriverStatus } from '../../../core/types';
import { Car } from '../../../core/types/car.types';
import { DayOff, toDateKey } from '../../../../services/daysOffService';
import { calcDriverDebt } from '../../drivers/utils/debtUtils';

export const useDashboardStats = (transactions: Transaction[], drivers: Driver[], cars: Car[], daysOff: DayOff[]) => {
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
        return drivers.filter(d => !d.isDeleted && d.status === DriverStatus.ACTIVE);
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
        const todayDateKey = toDateKey(new Date());
        
        const completed: any[] = [];
        const pending: any[] = [];

        nonDeletedDrivers.forEach(driver => {
            const driverCars = cars.filter(c => c.driverId === driver.id && c.status === 'active');
            let dailyPlan = (driver as any).dailyPlan ?? 0;
            if (driverCars.length > 0 && (driverCars[0].dailyPlan ?? 0) > 0) {
                dailyPlan = driverCars[0].dailyPlan;
            }

            const isDayOff = daysOff.some(d => d.driverId === driver.id && d.dateKey === todayDateKey);
            
            // Reusing debt utility logic
            const driverCar = driverCars[0] || null;
            const daysOffSet = new Set(daysOff.filter(d => d.driverId === driver.id).map(d => d.dateKey));
            const info = calcDriverDebt(driver, driverCar, transactions, daysOffSet);

            const stat = {
                ...driver,
                dailyPlan: info.dailyPlan,
                todayIncome: info.todayIncome,
                todayDebt: info.todayDebt,
                isDayOff
            };

            if (isDayOff) {
                // Ignore DayOff drivers from this specific "who paid today" widget maybe, or mark them as completed
                // Let's add them to completed as "Dam olish kuni"
                completed.push(stat);
            } else if (info.dailyPlan === 0) {
                // Ignore if no daily plan
            } else if (info.todayDebt <= 0 && info.todayIncome >= info.dailyPlan) {
                completed.push(stat);
            } else {
                pending.push(stat);
            }
        });

        // Sort completed by income descending
        completed.sort((a, b) => b.todayIncome - a.todayIncome);
        // Sort pending by remaining amount ascending
        pending.sort((a, b) => a.todayDebt - b.todayDebt);

        return { completed, pending };
    }, [nonDeletedDrivers, cars, transactions, daysOff]);

    return {
        timeFilter, setTimeFilter,
        dashboardViewMode, setDashboardViewMode,
        dashboardPage, setDashboardPage, dashboardItemsPerPage,
        totalIncome, totalExpense, netProfit,
        chartData, todayStats
    };
};
