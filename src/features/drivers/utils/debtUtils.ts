import { Driver, DriverPaymentType } from '../../../core/types/driver.types';
import { Car } from '../../../core/types/car.types';
import { Transaction, TransactionType, PaymentStatus } from '../../../core/types/transaction.types';
import { getEffectivePlanForDriverDay } from './driverPlanHistory';

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
    transactions: Transaction[],
    targetDate: Date = new Date()
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
        .filter(tx => tx.type === TransactionType.DAY_OFF || tx.type === TransactionType.NOT_WORKING)
        .forEach(tx => {
            const mk = toMonthKey(tx.timestamp);
            dayOffsByMonth[mk] = (dayOffsByMonth[mk] || 0) + 1;
        });

    const todayKey = dateKey(targetDate);
    const todayIsDayOff = validTxs.some(tx => (tx.type === TransactionType.DAY_OFF || tx.type === TransactionType.NOT_WORKING) && dateKey(tx.timestamp) === todayKey);
    const todayIncome = incomeByDate[todayKey] ?? 0;
    const todayDebt = (dailyPlan > 0 && !todayIsDayOff)
        ? Math.max(0, dailyPlan - todayIncome)
        : 0;

    // Sum explicit debts
    const explicitTxs = validTxs.filter(tx => tx.type === TransactionType.DEBT);
    let totalExplicitDebt = 0;
    explicitTxs.forEach(tx => {
        totalExplicitDebt += Math.abs(tx.amount);
    });

    // Calculate total Auto Debt since createdAt (only past days, never future)
    let totalAutoDebt = 0;
    let workingDays = 0;

    let earliestTx = Date.now();
    validTxs.forEach(tx => { if (tx.timestamp < earliestTx) earliestTx = tx.timestamp; });

    const fallbackStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).getTime();
    const trackingStartMs = driver.createdAt ? driver.createdAt : Math.min(earliestTx, fallbackStart);

    let currentMs = trackingStartMs;
    const todayMs = Date.now();
    
    // Group loop execution by month to accurately apply daysOffPerMonth
    const monthlyStats: Record<string, { autoDebt: number, explicitOffCount: number, dailyPlanAmount: number }> = {};
    
    while (currentMs <= todayMs) {
        const d = new Date(currentMs);
        const loopDateKey = dateKey(currentMs);
        const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyStats[mk]) monthlyStats[mk] = { autoDebt: 0, explicitOffCount: 0, dailyPlanAmount: car?.dailyPlan ?? 0 };
        
        const isDayOffTx = validTxs.some(tx => 
            (tx.type === TransactionType.DAY_OFF || tx.type === TransactionType.NOT_WORKING) && 
            dateKey(tx.timestamp) === loopDateKey
        );
        
        const overrideType = driver.dayOverrides?.[loopDateKey]?.type;
        const isOverrideOff = overrideType === 'OFF' || overrideType === 'NOT_WORKING';

        // Only count explicit off days if they are after the driver's start date
        const startMs = driver.startDate || driver.createdAt;
        let isBeforeStart = false;
        if (startMs) {
            const startDay = new Date(startMs);
            startDay.setHours(0,0,0,0);
            if (d.getTime() < startDay.getTime()) {
                isBeforeStart = true;
            }
        }

        if (!isBeforeStart && (isDayOffTx || isOverrideOff)) {
            monthlyStats[mk].explicitOffCount++;
        }

        let planForDay = 0;
        if (!isDayOffTx) {
            planForDay = getEffectivePlanForDriverDay(driver, d, car);
        }
        
        if (planForDay > 0) {
            workingDays++;
        }
        monthlyStats[mk].autoDebt += planForDay;

        currentMs += 86400000;
    }

    // Apply allowed off days logic
    const allowedOffDays = driver.daysOffPerMonth || 0;
    if (allowedOffDays > 0) {
        Object.values(monthlyStats).forEach(stat => {
            const unmarkedOffDays = Math.max(0, allowedOffDays - stat.explicitOffCount);
            if (unmarkedOffDays > 0) {
                stat.autoDebt = Math.max(0, stat.autoDebt - (unmarkedOffDays * stat.dailyPlanAmount));
            }
        });
    }

    totalAutoDebt = Object.values(monthlyStats).reduce((sum, stat) => sum + stat.autoDebt, 0);

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
    /** Lease-to-own: total initial contract amount */
    totalContractAmount?: number;
    /** Lease-to-own: total amount paid towards contract */
    contractPaid?:    number;
    /** Lease-to-own: remaining balance of contract */
    contractRemaining?: number;
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
        } else if (tx.type === TransactionType.DAY_OFF || tx.type === TransactionType.NOT_WORKING) {
            e.daysOff    += 1;
        }
        // Track explicit deposit usage regardless of transaction type (for all non-salary drivers, including lease_to_own)
        if (tx.useDeposit === true && driverType !== 'salary') {
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
        
        // Sum the actual effective plan for each day of the month up to effectiveDays
        let monthlyTarget = 0;
        let workingDaysCount = 0;
        
        for (let d = 1; d <= effectiveDays; d++) {
            const dayDate = new Date(y, m - 1, d);
            const isDayOffTx = validTxs.some(tx => 
                (tx.type === TransactionType.DAY_OFF || tx.type === TransactionType.NOT_WORKING) && 
                dateKey(tx.timestamp) === dateKey(dayDate.getTime())
            );
            
            if (!isDayOffTx) {
                const planForDay = getEffectivePlanForDriverDay(driver, dayDate, car);
                monthlyTarget += planForDay;
                if (planForDay > 0) workingDaysCount++;
            }
        }
        
        // Future months: no working days
        const workingDays = isFutureMonth ? 0 : workingDaysCount;
        if (isFutureMonth) {
            monthlyTarget = 0;
        }

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

    let contractPaid = 0;
    let contractRemaining = driver.totalContractAmount ?? 0;

    if (driverType === 'lease_to_own') {
        const totalIncome = validTxs.filter(tx => tx.type === TransactionType.INCOME).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
        const totalDebts = validTxs.filter(tx => tx.type === TransactionType.DEBT).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
        const totalExpenses = validTxs.filter(tx => tx.type === TransactionType.EXPENSE).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
        const contractTotal = driver.totalContractAmount ?? 0;

        contractPaid = Math.min(totalIncome, contractTotal > 0 ? contractTotal : Infinity);
        contractRemaining = Math.max(0, contractTotal + totalDebts + totalExpenses - totalIncome);
    }

    return { 
        driverType, 
        depositAmount, 
        remainingDeposit: runningDeposit, 
        salaryAmount, 
        totalContractAmount: driver.totalContractAmount,
        contractPaid: driverType === 'lease_to_own' ? contractPaid : undefined,
        contractRemaining: driverType === 'lease_to_own' ? contractRemaining : undefined,
        months 
    };
}

