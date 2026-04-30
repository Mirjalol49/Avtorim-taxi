export enum PaymentStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    REVERSED = 'REVERSED',
    REFUNDED = 'REFUNDED',
    DELETED = 'DELETED'
}

export enum TransactionType {
    INCOME = 'INCOME',
    EXPENSE = 'EXPENSE',
    DEBT = 'DEBT',
    DAY_OFF = 'DAY_OFF'
}

export enum FineStatus {
    PAID = 'PAID',
    UNPAID = 'UNPAID',
    DISPUTED = 'DISPUTED'
}

export interface Transaction {
    id: string;
    driverId?: string;
    driverName?: string;
    carId?: string;
    carName?: string;
    amount: number;
    type: TransactionType;
    description: string;
    timestamp: number;
    paymentMethod?: 'cash' | 'card' | 'transfer';
    chequeImage?: string;
    status?: PaymentStatus;
    reversedAt?: number;
    reversedBy?: string;
    reversalReason?: string;
    originalTransactionId?: string;
    category?: string;
    /** When true: this transaction was funded from the driver's deposit balance */
    useDeposit?: boolean;
}
