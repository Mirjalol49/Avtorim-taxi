import { supabase } from '../supabase';
import { DriverSalary, Transaction, TransactionType, PaymentStatus } from '../types';

export interface ReconciliationDiscrepancy {
    type: 'MISSING_TRANSACTION' | 'MISSING_SALARY' | 'AMOUNT_MISMATCH';
    salaryId?: string;
    transactionId?: string;
    driverId: string;
    driverName?: string;
    expectedAmount?: number;
    actualAmount?: number;
    timestamp: number;
}

export interface ReconciliationResult {
    passed: boolean;
    totalSalaries: number;
    totalTransactions: number;
    matchedCount: number;
    discrepancies: ReconciliationDiscrepancy[];
    timestamp: number;
}

export const reconcileSalaryTransactions = async (
    month: number,
    year: number,
    drivers: any[] = []
): Promise<ReconciliationResult> => {
    const startDate = new Date(year, month, 1).getTime();
    const endDate = new Date(year, month + 1, 0, 23, 59, 59).getTime();

    const { data: salaryRows } = await supabase
        .from('driver_salaries')
        .select('*')
        .gte('period_start', startDate)
        .lte('period_start', endDate);
    const salaries = (salaryRows ?? []) as DriverSalary[];

    const { data: txRows } = await supabase
        .from('transactions')
        .select('*')
        .gte('timestamp', startDate)
        .lte('timestamp', endDate)
        .eq('type', TransactionType.EXPENSE);
    const transactions = (txRows ?? []) as Transaction[];

    const discrepancies: ReconciliationDiscrepancy[] = [];
    let matchedCount = 0;

    for (const salary of salaries) {
        if (salary.status === PaymentStatus.REVERSED) continue;

        const matchingTx = transactions.find(t =>
            t.driverId === salary.driverId &&
            Math.abs(t.timestamp - salary.createdAt) < 10000 &&
            t.amount === salary.amount &&
            t.status !== PaymentStatus.REVERSED
        );

        if (matchingTx) {
            matchedCount++;
        } else {
            const driver = drivers.find(d => d.id === salary.driverId);
            discrepancies.push({
                type: 'MISSING_TRANSACTION',
                salaryId: salary.id,
                driverId: salary.driverId,
                driverName: driver?.name || 'Unknown Driver',
                expectedAmount: salary.amount,
                timestamp: salary.createdAt
            });
        }
    }

    const salaryTransactions = transactions.filter(t =>
        t.description?.toLowerCase().includes('salary') ||
        t.description?.toLowerCase().includes('oylik')
    );

    for (const tx of salaryTransactions) {
        if (tx.status === PaymentStatus.REVERSED) continue;

        const matchingSalary = salaries.find(s =>
            s.driverId === tx.driverId &&
            Math.abs(s.createdAt - tx.timestamp) < 10000 &&
            s.amount === tx.amount &&
            s.status !== PaymentStatus.REVERSED
        );

        if (!matchingSalary) {
            const driver = drivers.find(d => d.id === tx.driverId);
            discrepancies.push({
                type: 'MISSING_SALARY',
                transactionId: tx.id,
                driverId: tx.driverId,
                driverName: driver?.name || 'Unknown Driver',
                actualAmount: tx.amount,
                timestamp: tx.timestamp
            });
        }
    }

    return {
        passed: discrepancies.length === 0,
        totalSalaries: salaries.filter(s => s.status !== PaymentStatus.REVERSED).length,
        totalTransactions: salaryTransactions.filter(t => t.status !== PaymentStatus.REVERSED).length,
        matchedCount,
        discrepancies,
        timestamp_ms: Date.now()
    };
};

export const getReconciliationSummary = (result: ReconciliationResult): string => {
    if (result.passed) {
        return `All ${result.totalSalaries} salary payments are properly synced`;
    }

    const missingTx = result.discrepancies.filter(d => d.type === 'MISSING_TRANSACTION').length;
    const missingSalary = result.discrepancies.filter(d => d.type === 'MISSING_SALARY').length;
    const issues: string[] = [];
    if (missingTx > 0) issues.push(`${missingTx} missing transaction(s)`);
    if (missingSalary > 0) issues.push(`${missingSalary} missing salary record(s)`);
    return `Found ${result.discrepancies.length} discrepancy(ies): ${issues.join(', ')}`;
};
