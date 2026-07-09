import { useState, useMemo } from 'react';
import { Transaction, Driver, TransactionType, PaymentStatus, TimeFilter, DriverStatus } from '../../../core/types';
import { Car } from '../../../core/types/car.types';
import { toDateKey } from '../../../../services/daysOffService';
import { calcDriverDebt } from '../../drivers/utils/debtUtils';
import { isDriverWorkingOnDate } from '../../drivers/utils/driverLifecycle';
import { getEffectivePlanForDriverDay, getCarIdForDriverDate } from '../../drivers/utils/driverPlanHistory';

export const useDashboardStats = (transactions: Transaction[], drivers: Driver[], cars: Car[]) => {
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');
    const [targetDate, setTargetDate] = useState<Date>(new Date());

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
    const totalIncome = useMemo(() => filteredTx.filter(t => t.type === TransactionType.INCOME && !(t as any).useDeposit).reduce((sum, t) => sum + t.amount, 0), [filteredTx]);
    const totalExpense = useMemo(() => filteredTx.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0), [filteredTx]);
    const netProfit = totalIncome - totalExpense;

    // All non-deleted drivers (regardless of online/offline status - every driver has a daily plan)
    const nonDeletedDrivers = useMemo(() => {
        return drivers.filter(d => !d.isDeleted);
    }, [drivers]);

    // Chart Data
    const chartData = useMemo(() => {
        return nonDeletedDrivers.map(d => {
            const dIncome = filteredTx.filter(t => t.driverId === d.id && t.type === TransactionType.INCOME && !(t as any).useDeposit).reduce((sum, t) => sum + t.amount, 0);
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
        const todayKey = toDateKey(targetDate);

        // Build a set of driver IDs who have an active DAY_OFF transaction today
        const dayOffDriverIds = new Set<string>(
            transactions
                .filter(tx => {
                    if ((tx.type as string) !== 'DAY_OFF' && (tx.type as string) !== 'NOT_WORKING') return false;
                    if (tx.status === PaymentStatus.DELETED || (tx as any).status === 'DELETED') return false;
                    return toDateKey(new Date(tx.timestamp)) === todayKey;
                })
                .map(tx => tx.driverId)
                .filter(Boolean) as string[]
        );

        // Also add drivers who have a day override indicating they took a day off
        drivers.forEach(d => {
            if (d.dayOverrides && d.dayOverrides[todayKey]) {
                const override = d.dayOverrides[todayKey];
                if (override.type === 'OFF' || override.type === 'NOT_WORKING' || override.type === 'REPAIR') {
                    dayOffDriverIds.add(d.id);
                }
            }
        });

        const completed: any[] = [];
        const pending: any[] = [];
        const dayOff: any[] = [];

        let expectedTotal = 0;
        let paidTotal = 0;
        let debtTotal = 0;

        // Drivers active specifically on the targetDate
        const activeDriversForDate = drivers.filter(d => {
            return isDriverWorkingOnDate(d, targetDate);
        });

        activeDriversForDate.forEach(driver => {
            const driverCars = cars.filter(c => c.assignedDriverId === driver.id && !c.isDeleted);
            const driverCar = driverCars[0] || null;
            const historicalCarId = getCarIdForDriverDate(driver, targetDate, driverCar);

            // Attempt to find car name from transactions if we have no historical car id or current car
            let fallbackCarName = undefined;
            if (!historicalCarId && !driverCar) {
                const txToday = transactions.find(tx => tx.driverId === driver.id && tx.carName && toDateKey(new Date(tx.timestamp)) === todayKey);
                if (txToday) {
                    fallbackCarName = txToday.carName;
                }
            }

            // Exclude drivers who are on day off today
            if (dayOffDriverIds.has(driver.id)) {
                dayOff.push({ ...driver, isDayOff: true, todayIncome: 0, todayDebt: 0, totalDebt: 0, historicalCarId, fallbackCarName });
                return;
            }

            // Get the actual plan for this specific day
            const historicalPlan = getEffectivePlanForDriverDay(driver, targetDate, driverCar);

            const info = calcDriverDebt(driver, driverCar, transactions, targetDate);

            // Skip drivers who had no plan on this day AND made no payments today
            if (historicalPlan <= 0 && info.todayIncome <= 0) return;

            const adjustedTotalDebt = info.netDebt;

            const stat = {
                ...driver,
                dailyPlan: historicalPlan,
                todayIncome: info.todayIncome,
                todayDebt: Math.max(0, historicalPlan - info.todayIncome),
                totalDebt: adjustedTotalDebt,
                isDayOff: false,
                historicalCarId,
                fallbackCarName
            };

            if (info.todayIncome >= historicalPlan) {
                completed.push(stat);
            } else {
                pending.push(stat);
            }

            expectedTotal += stat.dailyPlan;
            paidTotal += stat.todayIncome;
            debtTotal += stat.todayDebt;
        });

        // Sort completed by income descending
        completed.sort((a, b) => b.todayIncome - a.todayIncome);
        // Sort pending by remaining amount ascending
        pending.sort((a, b) => a.todayDebt - b.todayDebt);

        return { 
            completed, 
            pending, 
            dayOff,
            totals: { expectedTotal, paidTotal, debtTotal }
        };
    }, [drivers, cars, transactions, targetDate]);

    return {
        timeFilter, setTimeFilter,
        targetDate, setTargetDate,
        dashboardViewMode, setDashboardViewMode,
        dashboardPage, setDashboardPage, dashboardItemsPerPage,
        totalIncome, totalExpense, netProfit,
        chartData, todayStats
    };
};
