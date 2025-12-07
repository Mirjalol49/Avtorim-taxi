import { db } from '../firebase';
import { writeBatch, doc, collection, onSnapshot, query, orderBy, getDocs } from 'firebase/firestore';
import { PaymentReversal, Transaction, DriverSalary, PaymentStatus, TransactionType } from '../types';

const REVERSALS_COLLECTION = 'payment_reversals';
const TRANSACTIONS_COLLECTION = 'transactions';
const SALARIES_COLLECTION = 'driver_salaries';

// Helper to get collection path based on fleetId
const getCollectionPath = (baseCollection: string, fleetId?: string) => {
    if (fleetId) {
        return `fleets/${fleetId}/${baseCollection}`;
    }
    return baseCollection;
};

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
    requiresApproval: boolean = false,
    fleetId?: string
): Promise<string> => {
    try {
        const batch = writeBatch(db);

        // Create reversal record
        const reversalRef = doc(collection(db, getCollectionPath(REVERSALS_COLLECTION, fleetId)));
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
            const salaryRef = doc(db, getCollectionPath(SALARIES_COLLECTION, fleetId), salaryId);
            batch.update(salaryRef, {
                status: PaymentStatus.REVERSED,
                reversedAt: Date.now(),
                reversedBy,
                reversalReason: reason
            });

            // Update original transaction
            const txRef = doc(db, getCollectionPath(TRANSACTIONS_COLLECTION, fleetId), transactionId);
            batch.update(txRef, {
                status: PaymentStatus.REVERSED,
                reversedAt: Date.now(),
                reversedBy,
                reversalReason: reason
            });

            // Create compensating transaction (negative expense to restore balance)
            const compensatingTxRef = doc(collection(db, getCollectionPath(TRANSACTIONS_COLLECTION, fleetId)));
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
export const approveReversal = async (reversalId: string, approvedBy: string, fleetId?: string): Promise<void> => {
    try {
        // Get the reversal details
        const reversalDoc = await getDocs(query(collection(db, getCollectionPath(REVERSALS_COLLECTION, fleetId))));
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
        const reversalRef = doc(db, getCollectionPath(REVERSALS_COLLECTION, fleetId), reversalId);
        batch.update(reversalRef, {
            approvalStatus: 'approved',
            approvedBy
        });

        // Update salary record
        const salaryRef = doc(db, getCollectionPath(SALARIES_COLLECTION, fleetId), reversal.salaryId);
        batch.update(salaryRef, {
            status: PaymentStatus.REVERSED,
            reversedAt: Date.now(),
            reversedBy: reversal.reversedBy,
            reversalReason: reversal.reason
        });

        // Update transaction
        const txRef = doc(db, getCollectionPath(TRANSACTIONS_COLLECTION, fleetId), reversal.transactionId);
        batch.update(txRef, {
            status: PaymentStatus.REVERSED,
            reversedAt: Date.now(),
            reversedBy: reversal.reversedBy,
            reversalReason: reversal.reason
        });

        // Create compensating transaction
        const compensatingTxRef = doc(collection(db, getCollectionPath(TRANSACTIONS_COLLECTION, fleetId)));
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
export const subscribeToReversals = (callback: (reversals: PaymentReversal[]) => void, fleetId?: string) => {
    const q = query(collection(db, getCollectionPath(REVERSALS_COLLECTION, fleetId)), orderBy('reversedAt', 'desc'));
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
    refundedBy: string,
    description?: string, // Optional description for translation
    fleetId?: string
): Promise<void> => {
    try {
        const batch = writeBatch(db);

        // 1. Update salary record status
        const salaryRef = doc(db, getCollectionPath(SALARIES_COLLECTION, fleetId), salaryId);
        batch.update(salaryRef, {
            status: PaymentStatus.REFUNDED,
            reversedAt: Date.now(), // Using reversedAt field for refund time as well
            reversedBy: refundedBy,
            reversalReason: 'Manual Refund'
        });

        // 2. Update original transaction status if it exists
        if (transactionId) {
            const txRef = doc(db, getCollectionPath(TRANSACTIONS_COLLECTION, fleetId), transactionId);
            batch.update(txRef, {
                status: PaymentStatus.REFUNDED,
                reversedAt: Date.now(),
                reversedBy: refundedBy,
                reversalReason: 'Manual Refund'
            });
        }

        // NOTE: No compensating transaction needed!
        // The original EXPENSE is marked as REFUNDED, and balance calculations
        // exclude REFUNDED transactions, effectively restoring the balance.

        // 4. Log the action (Audit Log)
        // Audit logs are global for now, or should they be fleet specific?
        // The user said "Audit trails for all account activities".
        // Let's make audit logs fleet specific too if possible, or keep them global but with fleetId.
        // For now, let's keep audit logs global but maybe add fleetId to them?
        // Or better, use getCollectionPath('audit_logs', fleetId) if we want full isolation.
        // The current instruction is "Enforce strict data segregation".
        // Let's assume audit logs should also be isolated or at least identifiable.
        // I'll use getCollectionPath('audit_logs', fleetId) to be safe and consistent.

        const auditRef = doc(collection(db, getCollectionPath('audit_logs', fleetId)));
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
