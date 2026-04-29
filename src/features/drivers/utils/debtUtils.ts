import { Driver, DriverPaymentType } from '../../../core/types/driver.types';
import { Car } from '../../../core/types/car.types';
import { Transaction, TransactionType, PaymentStatus } from '../../../core/types/transaction.types';

export interface ExplicitDebtInfo {
    totalExplicitDebt: number; // Sum of all DEBT transactions
}

export function calcExplicitDebt(driver: Driver, transactions: Transaction[]): ExplicitDebtInfo {
    const driverTxs = transactions.filter(tx =>
        tx.driverId === driver.id &&
        tx.status !== PaymentStatus.DELETED &&
        (tx as any).status !== 'DELETED'
    );

    const totalExplicitDebt = driverTxs
        .filter(tx => tx.type === TransactionType.DEBT)
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    return { totalExplicitDebt };
}

export interface DriverDebtInfo {
    dailyPlan: number;
    todayIncome: number;
    todayDebt: number; // Shortfall strictly based on today's income vs plan
    totalAutoDebt: number; // Lifetime total missing daily plans
    totalExplicitDebt: number; // Lifetime total custom penalties/debts
    totalIncome: number; // Lifetime income
    netDebt: number; // (Auto + Explicit) - Income (Positive = owes money, Negative = overpaid credit)
    workingDays: number; // valid tracked days since creation
    todayIsDayOff: boolean;
}

const dateKey = (ts: number | Date) => {
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

export function calcDriverDebt(
    driver: Driver,
    car: Car | null | undefined,
    transactions: Transaction[]
): DriverDebtInfo {
    const dailyPlan = car?.dailyPlan ?? 0;

    const validTxs = transactions.filter(tx =>
        tx.driverId === driver.id &&
        tx.status !== PaymentStatus.DELETED &&
        (tx as any).status !== 'DELETED'
    );

    // Sum all incomes
    const incomeTxs = validTxs.filter(tx => tx.type === TransactionType.INCOME);
    const totalIncome = incomeTxs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    // Group income strictly by date to check today's sub-stats
    const incomeByDate: Record<string, number> = {};
    incomeTxs.forEach(tx => {
        const key = dateKey(tx.timestamp);
        incomeByDate[key] = (incomeByDate[key] || 0) + Math.abs(tx.amount);
    });

    const todayKey = dateKey(Date.now());
    // Since daysOffSet is computed below, we can either compute it beforehand or calculate todayIsDayOff dynamically.
    // For simplicity, we just check if today has a DAY_OFF transaction.
    const todayIsDayOff = validTxs.some(tx => tx.type === 'DAY_OFF' && dateKey(tx.timestamp) === todayKey);
    const todayIncome = incomeByDate[todayKey] ?? 0;
    const todayDebt = (dailyPlan > 0 && !todayIsDayOff)
        ? Math.max(0, dailyPlan - todayIncome)
        : 0;

    // Sum explicit debts
    const explicitTxs = validTxs.filter(tx => tx.type === TransactionType.DEBT);
    let totalExplicitDebt = 0;
    explicitTxs.forEach(tx => {
        // Debts can technically be negative to provide balance resets/subtractions manually
        totalExplicitDebt += tx.amount;
    });

    // Calculate total Auto Debt since `createdAt`
    let totalAutoDebt = 0;
    let workingDays = 0;

    // Use driver creation date OR fallback to 30 days ago to prevent catastrophic load if missing
    // or fallback to the earliest transaction date they possess!
    let earliestTx = Date.now();
    validTxs.forEach(tx => {
        if (tx.timestamp < earliestTx) earliestTx = tx.timestamp;
    });
    
    // Bounds tracking safely
    const fallbackStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).getTime(); // max 1 month lookback if no data
    const trackingStartMs = driver.createdAt ? driver.createdAt : Math.min(earliestTx, fallbackStart);
    // Group days by month to apply 2 days off per month dynamically
    const daysPerMonth: Record<string, number> = {};
    let currentMs = trackingStartMs;
    const todayMs = Date.now();

    while (currentMs <= todayMs) {
        const d = new Date(currentMs);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        
        daysPerMonth[monthKey] = (daysPerMonth[monthKey] || 0) + 1;
        currentMs += 86400000; // Increment 1 day safely
    }

    // Apply rule: max 2 days off per month automatically
    Object.values(daysPerMonth).forEach(daysInMonth => {
        const activeDays = Math.max(0, daysInMonth - 2);
        workingDays += activeDays;
        totalAutoDebt += (activeDays * dailyPlan);
    });

    // Final Net calculation: How much they strictly owe
    // Net Debt = Auto Required Plans + Explicit Penalities - What they paid
    const netDebt = (totalAutoDebt + totalExplicitDebt) - totalIncome;

    return { 
        dailyPlan, 
        todayIncome, 
        todayDebt, 
        totalAutoDebt, 
        totalExplicitDebt, 
        totalIncome, 
        netDebt, 
        workingDays,
        todayIsDayOff
    };
}

// ─── Deposit / Salary breakdown ───────────────────────────────────────────────

export interface MonthlyBreakdown {
    monthKey:      string;   // 'YYYY-MM'
    income:        number;   // INCOME transactions
    expenses:      number;   // EXPENSE transactions (money given/charged to driver)
    debts:         number;   // DEBT transactions
    monthlyTarget: number;   // dailyPlan * workingDays
    shortfall:     number;   // max(0, target - income)
    /** For salary drivers: salaryAmount - shortfall - expenses - debts */
    netSalary:     number;
    /** Running deposit balance AFTER this month (deposit type only) */
    depositAfter:  number;
}

export interface DriverFinanceSummary {
    driverType:       DriverPaymentType;
    /** Deposit drivers: initial deposit */
    depositAmount:    number;
    /** Deposit drivers: current remaining balance */
    remainingDeposit: number;
    /** Salary drivers: monthly pay */
    salaryAmount:     number;
    months:           MonthlyBreakdown[];
}

const toMonthKey = (ts: number): string => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export function calcDriverFinance(
    driver: Driver,
    car: Car | null | undefined,
    transactions: Transaction[]
): DriverFinanceSummary {
    const driverType    = driver.driverType ?? 'deposit';
    const depositAmount = driver.depositAmount ?? 0;
    const salaryAmount  = driver.monthlySalary ?? 0;
    const dailyPlan     = car?.dailyPlan ?? 0;

    const validTxs = transactions.filter(tx =>
        tx.driverId === driver.id &&
        tx.status !== PaymentStatus.DELETED &&
        (tx as any).status !== 'DELETED'
    );

    // Group by month
    const byMonth = new Map<string, { income: number; expenses: number; debts: number }>();
    for (const tx of validTxs) {
        const mk = toMonthKey(tx.timestamp);
        const e  = byMonth.get(mk) ?? { income: 0, expenses: 0, debts: 0 };
        if      (tx.type === TransactionType.INCOME)  e.income   += Math.abs(tx.amount);
        else if (tx.type === TransactionType.EXPENSE)  e.expenses += Math.abs(tx.amount);
        else if (tx.type === TransactionType.DEBT)     e.debts    += Math.abs(tx.amount);
        byMonth.set(mk, e);
    }

    const sortedKeys = Array.from(byMonth.keys()).sort();

    let runningDeposit = depositAmount;
    const months: MonthlyBreakdown[] = sortedKeys.map(mk => {
        const [y, m]  = mk.split('-').map(Number);
        const totalDays   = new Date(y, m, 0).getDate();
        const workingDays = Math.max(0, totalDays - 2);
        const monthlyTarget = dailyPlan * workingDays;

        const { income, expenses, debts } = byMonth.get(mk)!;
        const shortfall  = Math.max(0, monthlyTarget - income);
        const deductions = shortfall + expenses + debts;

        // For deposit: subtract deductions, credit any over-payment
        const credit = Math.max(0, income - monthlyTarget);
        runningDeposit = runningDeposit - deductions + credit;

        const netSalary = Math.max(0, salaryAmount - deductions);

        return { monthKey: mk, income, expenses, debts, monthlyTarget, shortfall, netSalary, depositAfter: runningDeposit };
    });

    return { driverType, depositAmount, remainingDeposit: runningDeposit, salaryAmount, months };
}

