export enum PaymentStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    REVERSED = 'REVERSED',
    REFUNDED = 'REFUNDED',
    DELETED = 'DELETED'
}

export enum TransactionType {
    INCOME = 'INCOME',
    EXPENSE = 'EXPENSE'
}

export enum FineStatus {
    PAID = 'PAID',
    UNPAID = 'UNPAID',
    DISPUTED = 'DISPUTED'
}

export interface Transaction {
    id: string;
    driverId: string;
    amount: number;
    type: TransactionType;
    description: string;
    timestamp: number;
    status?: PaymentStatus;
    reversedAt?: number;
    reversedBy?: string;
    reversalReason?: string;
    originalTransactionId?: string;
}
