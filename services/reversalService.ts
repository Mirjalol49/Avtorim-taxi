import { db } from '../firebase';
import { writeBatch, doc, collection, onSnapshot, query, orderBy, getDocs } from 'firebase/firestore';
import { PaymentReversal, Transaction, DriverSalary, PaymentStatus, TransactionType } from '../types';

const REVERSALS_COLLECTION = 'payment_reversals';
const TRANSACTIONS_COLLECTION = 'transactions';
const SALARIES_COLLECTION = 'driver_salaries';

/**
 * Reverses a salary payment by creating compensating transactions
 * and updating the status of original records
 */
export const reverseSalaryPayment = async (
    salaryId: string,
    transactionId: string,
    originalAmount: number,
    driverId: string,
    reason: string,
    reversedBy: string,
    requiresApproval: boolean = false
): Promise<string> => {
    try {
        const batch = writeBatch(db);

        // Create reversal record
        const reversalRef = doc(collection(db, REVERSALS_COLLECTION));
        const reversalData: Omit<PaymentReversal, 'id'> = {
            salaryId,
            transactionId,
            originalAmount,
            driverId,
            reversedBy,
            reversedAt: Date.now(),
            reason,
            approvalStatus: requiresApproval ? 'pending' : 'approved',
        };

        batch.set(reversalRef, reversalData);

        if (!requiresApproval) {
            // Update original salary record
            const salaryRef = doc(db, SALARIES_COLLECTION, salaryId);
            batch.update(salaryRef, {
                status: PaymentStatus.REVERSED,
                reversedAt: Date.now(),
                reversedBy,
                reversalReason: reason
            });

            // Update original transaction
            const txRef = doc(db, TRANSACTIONS_COLLECTION, transactionId);
            batch.update(txRef, {
                status: PaymentStatus.REVERSED,
                reversedAt: Date.now(),
                reversedBy,
                reversalReason: reason
            });

            // Create compensating transaction (negative expense to restore balance)
            const compensatingTxRef = doc(collection(db, TRANSACTIONS_COLLECTION));
            const compensatingTx: Omit<Transaction, 'id'> = {
                driverId,
                amount: originalAmount, // Positive amount (reverses the expense)
                type: TransactionType.INCOME, // Income to offset the expense
                description: `Salary reversal: ${reason}`,
                timestamp: Date.now(),
                status: PaymentStatus.COMPLETED,
                originalTransactionId: transactionId
            };
            batch.set(compensatingTxRef, compensatingTx);
        }

        await batch.commit();
        return reversalRef.id;
    } catch (error) {
        console.error('Error reversing salary payment:', error);
        throw error;
    }
};

/**
 * Approves a pending reversal
 */
export const approveReversal = async (reversalId: string, approvedBy: string): Promise<void> => {
    try {
        // Get the reversal details
        const reversalDoc = await getDocs(query(collection(db, REVERSALS_COLLECTION)));
        const reversal = reversalDoc.docs.find(d => d.id === reversalId)?.data() as PaymentReversal;

        if (!reversal) {
            throw new Error('Reversal not found');
        }

        if (reversal.approvalStatus !== 'pending') {
            throw new Error('Reversal is not pending approval');
        }

        // Execute the reversal
        const batch = writeBatch(db);

        // Update reversal status
        const reversalRef = doc(db, REVERSALS_COLLECTION, reversalId);
        batch.update(reversalRef, {
            approvalStatus: 'approved',
            approvedBy
        });

        // Update salary record
        const salaryRef = doc(db, SALARIES_COLLECTION, reversal.salaryId);
        batch.update(salaryRef, {
            status: PaymentStatus.REVERSED,
            reversedAt: Date.now(),
            reversedBy: reversal.reversedBy,
            reversalReason: reversal.reason
        });

        // Update transaction
        const txRef = doc(db, TRANSACTIONS_COLLECTION, reversal.transactionId);
        batch.update(txRef, {
            status: PaymentStatus.REVERSED,
            reversedAt: Date.now(),
            reversedBy: reversal.reversedBy,
            reversalReason: reversal.reason
        });

        // Create compensating transaction
        const compensatingTxRef = doc(collection(db, TRANSACTIONS_COLLECTION));
        const compensatingTx: Omit<Transaction, 'id'> = {
            driverId: reversal.driverId,
            amount: reversal.originalAmount,
            type: TransactionType.INCOME,
            description: `Salary reversal (approved): ${reversal.reason}`,
            timestamp: Date.now(),
            status: PaymentStatus.COMPLETED,
            originalTransactionId: reversal.transactionId
        };
        batch.set(compensatingTxRef, compensatingTx);

        await batch.commit();
    } catch (error) {
        console.error('Error approving reversal:', error);
        throw error;
    }
};

/**
 * Real-time subscription to reversals
 */
export const subscribeToReversals = (callback: (reversals: PaymentReversal[]) => void) => {
    const q = query(collection(db, REVERSALS_COLLECTION), orderBy('reversedAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const reversals: PaymentReversal[] = [];
        snapshot.forEach((doc) => {
            reversals.push({ id: doc.id, ...doc.data() } as PaymentReversal);
        });
        callback(reversals);
    }, (error) => {
        console.error('Error subscribing to reversals:', error);
    });
};

/**
 * Refunds a salary payment by updating status to REFUNDED
 * and creating a compensating income transaction to restore company balance.
 */
export const refundSalaryPayment = async (
    salaryId: string,
    transactionId: string | null,
    amount: number,
    driverId: string,
    refundedBy: string
): Promise<void> => {
    try {
        const batch = writeBatch(db);

        // 1. Update salary record status
        const salaryRef = doc(db, SALARIES_COLLECTION, salaryId);
        batch.update(salaryRef, {
            status: PaymentStatus.REFUNDED,
            reversedAt: Date.now(), // Using reversedAt field for refund time as well
            reversedBy: refundedBy,
            reversalReason: 'Manual Refund'
        });

        // 2. Update original transaction status if it exists
        if (transactionId) {
            const txRef = doc(db, TRANSACTIONS_COLLECTION, transactionId);
            batch.update(txRef, {
                status: PaymentStatus.REFUNDED,
                reversedAt: Date.now(),
                reversedBy: refundedBy,
                reversalReason: 'Manual Refund'
            });
        }

        // 3. Create compensating transaction (Income) to restore balance
        const compensatingTxRef = doc(collection(db, TRANSACTIONS_COLLECTION));
        const compensatingTx: Omit<Transaction, 'id'> = {
            driverId,
            amount: amount, // Positive amount (income)
            type: TransactionType.INCOME,
            description: `Salary Refund: Manual Action`,
            timestamp: Date.now(),
            status: PaymentStatus.COMPLETED,
            originalTransactionId: transactionId || undefined
        };
        batch.set(compensatingTxRef, compensatingTx);

        // 4. Log the action (Audit Log)
        const auditRef = doc(collection(db, 'audit_logs'));
        batch.set(auditRef, {
            action: 'REFUND_SALARY_PAYMENT',
            targetId: salaryId,
            relatedTransactionId: transactionId || 'NONE',
            driverId,
            performedBy: refundedBy,
            amount,
            timestamp: Date.now()
        });

        await batch.commit();
    } catch (error) {
        console.error('Error refunding salary payment:', error);
        throw error;
    }
};
