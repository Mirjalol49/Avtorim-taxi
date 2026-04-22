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

    if (error) {
        console.error('Failed to allocate payment:', error);
        throw error;
    }

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

    if (error) {
        console.error('Failed to fetch calendar:', error);
        throw error;
    }

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
    // To strictly match "past days", we query where date < CURRENT_DATE
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('driver_daily_records')
        .select('*')
        .eq('driver_id', driverId)
        .lt('date', today)
        .lt('paid_amount', supabase.raw('plan_amount')) // or manual filter
        .order('date', { ascending: true });

    // Since Supabase js client doesn't natively support column-to-column comparison in eq easily, 
    // it's safer to fetch and filter, or use an RPC. Wait, we can fetch all past days and filter in memory if the dataset isn't huge,
    // or just write a quick query. 
    
    // For robust column comparison in PostgREST, we can use filter string or just fetch all past days and filter in JS
    const { data: allPastDays, error: pastError } = await supabase
        .from('driver_daily_records')
        .select('*')
        .eq('driver_id', driverId)
        .lt('date', today)
        .order('date', { ascending: true });

    if (pastError) {
        console.error('Failed to fetch debts:', pastError);
        throw pastError;
    }

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
