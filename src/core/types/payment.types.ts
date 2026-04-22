export type PaymentStatus = 'unpaid' | 'partial' | 'paid';

export type AllocationType = 'debt' | 'current' | 'credit';

export interface DriverDailyRecord {
    id: string;
    driver_id: string;
    date: string; // YYYY-MM-DD
    plan_amount: number;
    paid_amount: number;
    status?: PaymentStatus; // Derived
    created_at?: string;
}

export interface PaymentTransaction {
    id: string;
    driver_id: string;
    received_at: string;
    total_amount: number;
    allocated_amount: number;
    created_by: string;
    created_at?: string;
}

export interface PaymentAllocation {
    id: string;
    transaction_id: string;
    daily_record_id: string | null; // Null if it's pure credit
    amount: number;
    allocation_type: AllocationType;
    created_at?: string;
}

export interface DriverCredit {
    id: string;
    driver_id: string;
    balance: number;
    updated_at?: string;
}

export interface PaymentAllocationResult {
    transaction_id: string;
    allocations: {
        daily_record_id: string | null;
        amount: number;
        type: AllocationType;
    }[];
    driver_credit_balance: number;
}
