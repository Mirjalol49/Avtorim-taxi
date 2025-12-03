// Reconciliation service to verify salary-transaction consistency
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
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

/**
 * Reconciles salary records with transaction records for a given period
 */
export const reconcileSalaryTransactions = async (
    month: number,
    year: number,
    drivers: any[] = []
): Promise<ReconciliationResult> => {
    try {
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0, 23, 59, 59);

        // Get all salaries for the period
        const salariesQuery = query(
            collection(db, 'driver_salaries'),
            where('effectiveDate', '>=', startDate.getTime()),
            where('effectiveDate', '<=', endDate.getTime())
        );
        const salariesSnapshot = await getDocs(salariesQuery);
        const salaries: DriverSalary[] = [];
        salariesSnapshot.forEach(doc => {
            salaries.push({ id: doc.id, ...doc.data() } as DriverSalary);
        });

        // Get all salary expense transactions for the period
        const transactionsQuery = query(
            collection(db, 'transactions'),
            where('timestamp', '>=', startDate.getTime()),
            where('timestamp', '<=', endDate.getTime()),
            where('type', '==', TransactionType.EXPENSE)
        );
        const transactionsSnapshot = await getDocs(transactionsQuery);
        const transactions: Transaction[] = [];
        transactionsSnapshot.forEach(doc => {
            transactions.push({ id: doc.id, ...doc.data() } as Transaction);
        });

        const discrepancies: ReconciliationDiscrepancy[] = [];
        let matchedCount = 0;

        // Check each salary has a matching transaction
        for (const salary of salaries) {
            // Skip reversed salaries
            if (salary.status === PaymentStatus.REVERSED) continue;

            const matchingTx = transactions.find(t =>
                t.driverId === salary.driverId &&
                Math.abs(t.timestamp - salary.createdAt) < 10000 && // Within 10 seconds
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

        // Check for orphaned transactions (transactions without salary records)
        const salaryTransactions = transactions.filter(t =>
            t.description.toLowerCase().includes('salary') ||
            t.description.toLowerCase().includes('oylik')
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
            timestamp: Date.now()
        };
    } catch (error) {
        console.error('Reconciliation failed:', error);
        throw error;
    }
};

/**
 * Get reconciliation status summary
 */
export const getReconciliationSummary = (result: ReconciliationResult): string => {
    if (result.passed) {
        return `✅ All ${result.totalSalaries} salary payments are properly synced`;
    }

    const missingTx = result.discrepancies.filter(d => d.type === 'MISSING_TRANSACTION').length;
    const missingSalary = result.discrepancies.filter(d => d.type === 'MISSING_SALARY').length;

    const issues: string[] = [];
    if (missingTx > 0) issues.push(`${missingTx} missing transaction(s)`);
    if (missingSalary > 0) issues.push(`${missingSalary} missing salary record(s)`);

    return `⚠️ Found ${result.discrepancies.length} discrepancy(ies): ${issues.join(', ')}`;
};
