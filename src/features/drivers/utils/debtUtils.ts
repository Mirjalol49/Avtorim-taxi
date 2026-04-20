import { Driver } from '../../../core/types/driver.types';
import { Car } from '../../../core/types/car.types';
import { Transaction, TransactionType, PaymentStatus } from '../../../core/types/transaction.types';

export interface ExplicitDebtInfo {
    totalDebt: number;
    totalPaid: number;
    remaining: number;
}

export function calcExplicitDebt(driver: Driver, transactions: Transaction[]): ExplicitDebtInfo {
    const driverTxs = transactions.filter(tx =>
        tx.driverId === driver.id &&
        tx.status !== PaymentStatus.DELETED &&
        (tx as any).status !== 'DELETED'
    );

    const totalDebt = driverTxs
        .filter(tx => tx.type === TransactionType.DEBT)
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    if (totalDebt === 0) return { totalDebt: 0, totalPaid: 0, remaining: 0 };

    const totalIncome = driverTxs
        .filter(tx => tx.type === TransactionType.INCOME)
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    const totalPaid = Math.min(totalIncome, totalDebt);
    const remaining = Math.max(0, totalDebt - totalIncome);

    return { totalDebt, totalPaid, remaining };
}

export interface DriverDebtInfo {
    dailyPlan: number;
    todayIncome: number;
    todayDebt: number;
    totalDebt: number;
    totalIncome: number;
    workingDays: number;
    todayIsDayOff: boolean;
}

const dateKey = (ts: number) => {
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

export function calcDriverDebt(
    driver: Driver,
    car: Car | null | undefined,
    transactions: Transaction[],
    daysOffSet: Set<string> = new Set()  // set of 'YYYY-MM-DD' strings
): DriverDebtInfo {
    // Car's daily plan takes priority; fall back to driver's own setting
    const carPlan = (car?.dailyPlan ?? 0);
    const driverPlan = (driver as any).dailyPlan ?? 0;
    const dailyPlan = carPlan > 0 ? carPlan : driverPlan;

    // Filter active income transactions for this driver
    const income = transactions.filter(tx =>
        tx.driverId === driver.id &&
        tx.type === TransactionType.INCOME &&
        tx.status !== PaymentStatus.DELETED &&
        (tx as any).status !== 'DELETED'
    );

    // Group income by date (YYYY-MM-DD)
    const byDate: Record<string, number> = {};
    income.forEach(tx => {
        const key = dateKey(tx.timestamp);
        byDate[key] = (byDate[key] || 0) + Math.abs(tx.amount);
    });

    const todayKey = dateKey(Date.now());
    const todayIsDayOff = daysOffSet.has(todayKey);
    const todayIncome = byDate[todayKey] ?? 0;
    // No daily plan required on a day off
    const todayDebt = (dailyPlan > 0 && !todayIsDayOff)
        ? Math.max(0, dailyPlan - todayIncome)
        : 0;

    let totalDebt = 0;
    let totalIncome = 0;
    const workingDays = Object.keys(byDate).length;

    Object.entries(byDate).forEach(([day, dayAmount]) => {
        totalIncome += dayAmount;
        // Skip debt calculation for days off
        if (daysOffSet.has(day)) return;
        if (dailyPlan > 0 && dayAmount < dailyPlan) {
            totalDebt += dailyPlan - dayAmount;
        }
    });

    // Also check days with zero income that are NOT days off (they still owe)
    // Note: days with zero income don't appear in byDate, so we only count
    // income shortfall for days that actually have a transaction record.
    // Days with no transactions at all are not tracked (consistent with prior behavior).

    return { dailyPlan, todayIncome, todayDebt, totalDebt, totalIncome, workingDays, todayIsDayOff };
}

