import { PaymentStatus } from './transaction.types';

export interface SalaryPayment {
    id: string;
    driverId: string;
    amount: number;
    period: string; // e.g., "2024-11" for November 2024
    paidAt: number;
    note?: string;
}

export interface DriverSalary {
    id: string;
    driverId: string;
    amount: number;
    effectiveDate: number;
    createdBy: string;
    createdAt: number;
    notes?: string;
    status?: PaymentStatus;
    reversedAt?: number;
    reversedBy?: string;
    reversalReason?: string;
}

export interface PaymentReversal {
    id: string;
    salaryId: string;
    transactionId: string;
    originalAmount: number;
    driverId: string;
    reversedBy: string;
    reversedAt: number;
    reason: string;
    approvedBy?: string;
    approvalStatus: 'pending' | 'approved' | 'rejected';
}
