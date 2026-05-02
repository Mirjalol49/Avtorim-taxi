import { Driver, DriverPaymentType } from '../../../core/types/driver.types';
import { Car } from '../../../core/types/car.types';
import { Transaction, TransactionType, PaymentStatus } from '../../../core/types/transaction.types';

export interface ExplicitDebtInfo {
    totalExplicitDebt: number; // Sum of all DEBT transactions
}

export function calcExplicitDebt(driver: Driver, transactions: Transaction[]): ExplicitDebtInfo {
    const driverTxs = transactions.filter(tx =>
        tx.driverId === driver.id &&
        tx.status !== PaymentStatus.DELETED
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
        tx.status !== PaymentStatus.DELETED
    );

    // Sum all incomes EXCLUDING deposit top-ups (those don't fulfil the daily plan)
    const incomeTxs = validTxs.filter(
        tx => tx.type === TransactionType.INCOME && tx.category !== 'deposit_topup'
    );
    const totalIncome = incomeTxs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    // Group income strictly by date to check today's sub-stats
    const incomeByDate: Record<string, number> = {};
    incomeTxs.forEach(tx => {
        const key = dateKey(tx.timestamp);
        incomeByDate[key] = (incomeByDate[key] || 0) + Math.abs(tx.amount);
    });

    // Count DAY_OFF transactions per month (used for dynamic days-off)
    const dayOffsByMonth: Record<string, number> = {};
    validTxs
        .filter(tx => tx.type === TransactionType.DAY_OFF)
        .forEach(tx => {
            const mk = toMonthKey(tx.timestamp);
            dayOffsByMonth[mk] = (dayOffsByMonth[mk] || 0) + 1;
        });

    const todayKey = dateKey(Date.now());
    const todayIsDayOff = validTxs.some(tx => tx.type === TransactionType.DAY_OFF && dateKey(tx.timestamp) === todayKey);
    const todayIncome = incomeByDate[todayKey] ?? 0;
    const todayDebt = (dailyPlan > 0 && !todayIsDayOff)
        ? Math.max(0, dailyPlan - todayIncome)
        : 0;

    // Sum explicit debts
    const explicitTxs = validTxs.filter(tx => tx.type === TransactionType.DEBT);
    let totalExplicitDebt = 0;
    explicitTxs.forEach(tx => {
        totalExplicitDebt += tx.amount;
    });

    // Calculate total Auto Debt since createdAt (only past days, never future)
    let totalAutoDebt = 0;
    let workingDays = 0;

    let earliestTx = Date.now();
    validTxs.forEach(tx => { if (tx.timestamp < earliestTx) earliestTx = tx.timestamp; });

    const fallbackStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).getTime();
    const trackingStartMs = driver.createdAt ? driver.createdAt : Math.min(earliestTx, fallbackStart);

    // Group elapsed days per month (never exceeds today)
    const daysPerMonth: Record<string, number> = {};
    let currentMs = trackingStartMs;
    const todayMs = Date.now();
    while (currentMs <= todayMs) {
        const d = new Date(currentMs);
        const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        daysPerMonth[mk] = (daysPerMonth[mk] || 0) + 1;
        currentMs += 86400000;
    }

    // Use actual DAY_OFF transaction count per month instead of a hardcoded 2
    Object.entries(daysPerMonth).forEach(([mk, daysInMonth]) => {
        const offs = dayOffsByMonth[mk] ?? 0;
        const activeDays = Math.max(0, daysInMonth - offs);
        workingDays += activeDays;
        totalAutoDebt += activeDays * dailyPlan;
    });

    const netDebt = (totalAutoDebt + totalExplicitDebt) - totalIncome;

    return { dailyPlan, todayIncome, todayDebt, totalAutoDebt, totalExplicitDebt, totalIncome, netDebt, workingDays, todayIsDayOff };
}

// ─── Deposit / Salary breakdown ───────────────────────────────────────────────

export interface MonthlyBreakdown {
    monthKey:       string;   // 'YYYY-MM'
    planIncome:     number;   // Regular daily-plan payments (INCOME, not topup)
    topUps:         number;   // Deposit top-up credits (INCOME with category='deposit_topup')
    overpayment:    number;   // max(0, planIncome - monthlyTarget) — excess rolls to deposit
    expenses:       number;   // EXPENSE transactions
    debts:          number;   // DEBT transactions
    monthlyTarget:  number;   // dailyPlan * workingDays
    shortfall:      number;   // max(0, target - planIncome)
    /** For salary drivers: income explicitly funded from the driver's salary (useDeposit=true INCOME txs) */
    salaryAdvance:  number;
    /** For salary drivers: salaryAmount - shortfall - expenses - debts - salaryAdvance */
    netSalary:      number;
    /** Running deposit balance AFTER this month (deposit type only) */
    depositAfter:   number;
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
        tx.status !== PaymentStatus.DELETED
    );

    // Group by month — separate plan payments, top-ups, expenses, debts, and day-offs
    // depositUsed:    sum of all transactions explicitly drawn from deposit (useDeposit=true)
    // salaryAdvance:  income funded from driver's salary (useDeposit=true, type=INCOME, salary driver)
    const byMonth = new Map<string, { planIncome: number; topUps: number; expenses: number; debts: number; daysOff: number; depositUsed: number; salaryAdvance: number }>();
    for (const tx of validTxs) {
        const mk = toMonthKey(tx.timestamp);
        const e  = byMonth.get(mk) ?? { planIncome: 0, topUps: 0, expenses: 0, debts: 0, daysOff: 0, depositUsed: 0, salaryAdvance: 0 };
        if (tx.type === TransactionType.INCOME && tx.category === 'deposit_topup') {
            e.topUps     += Math.abs(tx.amount);
        } else if (tx.type === TransactionType.INCOME) {
            e.planIncome += Math.abs(tx.amount);
            // Track salary-funded advances separately (salary drivers only)
            if (tx.useDeposit === true && driverType === 'salary') {
                e.salaryAdvance += Math.abs(tx.amount);
            }
        } else if (tx.type === TransactionType.EXPENSE) {
            e.expenses   += Math.abs(tx.amount);
        } else if (tx.type === TransactionType.DEBT) {
            e.debts      += Math.abs(tx.amount);
        } else if (tx.type === TransactionType.DAY_OFF) {
            e.daysOff    += 1;
        }
        // Track explicit deposit usage regardless of transaction type (deposit drivers)
        if (tx.useDeposit === true && driverType === 'deposit') {
            e.depositUsed += Math.abs(tx.amount);
        }
        byMonth.set(mk, e);
    }

    const sortedKeys = Array.from(byMonth.keys()).sort();
    const today = new Date();
    const todayMk = toMonthKey(today.getTime());

    let runningDeposit = depositAmount;
    const months: MonthlyBreakdown[] = sortedKeys.map(mk => {
        const [y, m]  = mk.split('-').map(Number);
        const totalDays = new Date(y, m, 0).getDate();
        // Cap current month to today so future days don't inflate the target
        const effectiveDays = mk === todayMk ? today.getDate() : totalDays;

        const { planIncome, topUps, expenses, debts, daysOff, depositUsed, salaryAdvance } = byMonth.get(mk)!;
        // Future months: no working days, no debt (only record actual income/topups)
        const isFutureMonth = mk > todayMk;
        const workingDays   = isFutureMonth ? 0 : Math.max(0, effectiveDays - daysOff);
        const monthlyTarget = dailyPlan * workingDays;

        const shortfall    = Math.max(0, monthlyTarget - planIncome);
        const overpayment  = Math.max(0, planIncome - monthlyTarget);

        // Deposit is ONLY affected by:
        //   + explicit top-ups (category='deposit_topup')
        //   - explicit deposit-funded transactions (useDeposit=true, deposit drivers)
        // NOT automatically by daily-plan shortfall/overpayment
        runningDeposit = runningDeposit + topUps - depositUsed;

        // Salary driver net calculation:
        // salaryAdvance already covers shortfall (planIncome is up, so shortfall is 0 or reduced),
        // but we ALSO deduct it explicitly so the end-of-month payout reflects what was already given.
        const salaryDeductions = shortfall + expenses + debts + salaryAdvance;
        const netSalary = Math.max(0, salaryAmount - salaryDeductions);

        return { monthKey: mk, planIncome, topUps, overpayment, expenses, debts, monthlyTarget, shortfall, salaryAdvance, netSalary, depositAfter: runningDeposit };
    });

    return { driverType, depositAmount, remainingDeposit: runningDeposit, salaryAmount, months };
}

