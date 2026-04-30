import { supabase } from '../supabase';
import { DriverDailyRecord, PaymentAllocationResult } from '../src/core/types/payment.types';

export const allocatePayment = async (
    driverId: string,
    amount: number,
    receivedAt: string,
    createdBy: string
): Promise<PaymentAllocationResult> => {
    const { data, error } = await supabase.rpc('allocate_payment', {
        p_driver_id: driverId,
        p_amount: amount,
        p_received_at: receivedAt,
        p_created_by: createdBy
    });

    if (error) throw error;

    return data as PaymentAllocationResult;
};

export const getDriverCalendar = async (
    driverId: string,
    monthKey: string // YYYY-MM
): Promise<DriverDailyRecord[]> => {
    // monthKey is e.g. "2026-04"
    const startDate = `${monthKey}-01`;
    // We can use postgres native interval or just query by prefix
    // For simplicity, we query where date starts with YYYY-MM
    
    const { data, error } = await supabase
        .from('driver_daily_records')
        .select('*')
        .eq('driver_id', driverId)
        .gte('date', startDate)
        .lte('date', `${monthKey}-31`) // Simple trick to get the whole month
        .order('date', { ascending: true });

    if (error) throw error;

    return (data || []).map(record => {
        let status: 'unpaid' | 'partial' | 'paid' = 'unpaid';
        if (record.paid_amount >= record.plan_amount) {
            status = 'paid';
        } else if (record.paid_amount > 0) {
            status = 'partial';
        }

        return {
            ...record,
            status
        };
    });
};

export const getDriverDebt = async (
    driverId: string
): Promise<{ total_debt: number; debt_days: DriverDailyRecord[] }> => {
    // Debt days are days where paid_amount < plan_amount and date < today
    const today = new Date().toISOString().split('T')[0];

    // Fetch all past days, then filter in-memory for paid_amount < plan_amount
    // (PostgREST doesn't support column-to-column comparisons directly)
    const { data: allPastDays, error: pastError } = await supabase
        .from('driver_daily_records')
        .select('*')
        .eq('driver_id', driverId)
        .lt('date', today)
        .order('date', { ascending: true });

    if (pastError) throw pastError;

    const debtDays = (allPastDays || []).filter(day => day.paid_amount < day.plan_amount).map(record => {
        let status: 'unpaid' | 'partial' | 'paid' = 'unpaid';
        if (record.paid_amount >= record.plan_amount) {
            status = 'paid';
        } else if (record.paid_amount > 0) {
            status = 'partial';
        }

        return {
            ...record,
            status
        };
    });

    const totalDebt = debtDays.reduce((sum, day) => sum + (day.plan_amount - day.paid_amount), 0);

    return {
        total_debt: totalDebt,
        debt_days: debtDays
    };
};
