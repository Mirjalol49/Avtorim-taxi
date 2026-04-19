import { Driver } from '../../../core/types/driver.types';
import { Car } from '../../../core/types/car.types';
import { Transaction, TransactionType, PaymentStatus } from '../../../core/types/transaction.types';

export interface DriverDebtInfo {
    dailyPlan: number;
    todayIncome: number;
    todayDebt: number;
    totalDebt: number;
    totalIncome: number;
    workingDays: number;
}

const dateKey = (ts: number) => new Date(ts).toDateString();

export function calcDriverDebt(
    driver: Driver,
    car: Car | null | undefined,
    transactions: Transaction[]
): DriverDebtInfo {
    // Daily plan: driver's own setting takes priority, else car's plan
    const dailyPlan = (driver as any).dailyPlan || car?.dailyPlan || 0;

    // Filter active income transactions for this driver
    const income = transactions.filter(tx =>
        tx.driverId === driver.id &&
        tx.type === TransactionType.INCOME &&
        tx.status !== PaymentStatus.DELETED &&
        (tx as any).status !== 'DELETED'
    );

    // Group income by date
    const byDate: Record<string, number> = {};
    income.forEach(tx => {
        const key = dateKey(tx.timestamp);
        byDate[key] = (byDate[key] || 0) + Math.abs(tx.amount);
    });

    const todayKey = dateKey(Date.now());
    const todayIncome = byDate[todayKey] ?? 0;
    const todayDebt = dailyPlan > 0 ? Math.max(0, dailyPlan - todayIncome) : 0;

    let totalDebt = 0;
    let totalIncome = 0;
    const workingDays = Object.keys(byDate).length;

    Object.values(byDate).forEach(dayAmount => {
        totalIncome += dayAmount;
        if (dailyPlan > 0 && dayAmount < dailyPlan) {
            totalDebt += dailyPlan - dayAmount;
        }
    });

    return { dailyPlan, todayIncome, todayDebt, totalDebt, totalIncome, workingDays };
}
