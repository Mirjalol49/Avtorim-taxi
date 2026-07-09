export type DailyRecordStatus = 'unpaid' | 'partial' | 'paid';

/** Legacy salary record — stored in driver_salaries table */
export interface DriverSalary {
    id: string;
    driverId: string;
    driverName?: string;
    amount: number;
    status: string; // 'COMPLETED' | 'REVERSED' | 'REFUNDED' | 'PENDING'
    effectiveDate: number; // timestamp ms
    createdAt: number;     // timestamp ms
    period_start?: number;
    fleetId?: string;
    transactionId?: string;
}

/** Reversal request record — stored in payment_reversals table */
export interface PaymentReversal {
    id: string;
    salary_id: string;
    transaction_id: string;
    amount: number;
    driver_id: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    requested_by: string;
    approved_by?: string;
    fleet_id?: string;
    requested_at: number;
    resolved_at?: number;
}

export type AllocationType = 'debt' | 'current' | 'credit';

export interface DriverDailyRecord {
    id: string;
    driver_id: string;
    date: string; // YYYY-MM-DD
    plan_amount: number;
    paid_amount: number;
    status?: DailyRecordStatus; // Derived
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
