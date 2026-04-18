import { supabase } from '../supabase';
import { PaymentReversal, Transaction, DriverSalary, PaymentStatus, TransactionType } from '../types';

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
    const reversalData = {
        salary_id: salaryId,
        transaction_id: transactionId,
        amount: originalAmount,
        driver_id: driverId,
        reason,
        status: requiresApproval ? 'pending' : 'approved',
        requested_by: reversedBy || null,
        fleet_id: fleetId ?? null,
        requested_at: Date.now()
    };

    const { data, error } = await supabase
        .from('payment_reversals')
        .insert(reversalData)
        .select('id')
        .single();
    if (error) throw error;

    if (!requiresApproval) {
        await supabase.from('driver_salaries').update({
            status: PaymentStatus.REVERSED,
            reversed_at: Date.now(),
            reversed_by: reversedBy,
            reversal_reason: reason
        }).eq('id', salaryId);

        await supabase.from('transactions').update({
            status: PaymentStatus.REVERSED,
            reversed_at: Date.now(),
            reversed_by: reversedBy,
            reversal_reason: reason
        }).eq('id', transactionId);

        await supabase.from('transactions').insert({
            driver_id: driverId,
            amount: originalAmount,
            type: TransactionType.INCOME,
            description: `Salary reversal: ${reason}`,
            timestamp_ms: Date.now(),
            status: PaymentStatus.COMPLETED,
            original_transaction_id: transactionId,
            fleet_id: fleetId ?? null
        });
    }

    return data.id as string;
};

export const approveReversal = async (reversalId: string, approvedBy: string, _fleetId?: string): Promise<void> => {
    const { data: reversal, error: fetchErr } = await supabase
        .from('payment_reversals')
        .select('*')
        .eq('id', reversalId)
        .single();

    if (fetchErr || !reversal) throw new Error('Reversal not found');
    if (reversal.status !== 'pending') throw new Error('Reversal is not pending approval');

    await supabase.from('payment_reversals').update({
        status: 'approved',
        approved_by: approvedBy || null,
        resolved_at: Date.now()
    }).eq('id', reversalId);

    await supabase.from('driver_salaries').update({
        status: PaymentStatus.REVERSED,
        reversed_at: Date.now(),
        reversed_by: reversal.requested_by,
        reversal_reason: reversal.reason
    }).eq('id', reversal.salary_id);

    await supabase.from('transactions').update({
        status: PaymentStatus.REVERSED,
        reversed_at: Date.now(),
        reversed_by: reversal.requested_by,
        reversal_reason: reversal.reason
    }).eq('id', reversal.transaction_id);

    await supabase.from('transactions').insert({
        driver_id: reversal.driver_id,
        amount: reversal.amount,
        type: TransactionType.INCOME,
        description: `Salary reversal (approved): ${reversal.reason}`,
        timestamp_ms: Date.now(),
        status: PaymentStatus.COMPLETED,
        original_transaction_id: reversal.transaction_id,
        fleet_id: reversal.fleet_id ?? null
    });
};

export const subscribeToReversals = (callback: (reversals: PaymentReversal[]) => void, fleetId?: string) => {
    const fetch = () =>
        supabase
            .from('payment_reversals')
            .select('*')
            .eq('fleet_id', fleetId ?? null)
            .order('requested_at', { ascending: false })
            .then(({ data }) => { if (data) callback(data as PaymentReversal[]); });

    fetch();

    const channel = supabase
        .channel(`reversals_${fleetId ?? 'global'}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_reversals', filter: fleetId ? `fleet_id=eq.${fleetId}` : undefined }, fetch)
        .subscribe();

    return () => { supabase.removeChannel(channel); };
};

export const refundSalaryPayment = async (
    salaryId: string,
    transactionId: string | null,
    amount: number,
    driverId: string,
    refundedBy: string,
    description?: string,
    fleetId?: string
): Promise<void> => {
    const { data: salaryDoc, error: salaryErr } = await supabase
        .from('driver_salaries')
        .select('id')
        .eq('id', salaryId)
        .single();

    if (salaryErr || !salaryDoc) {
        throw new Error('Salary document not found! Please refresh the page.');
    }

    await supabase.from('driver_salaries').update({
        status: PaymentStatus.REFUNDED,
        reversed_at: Date.now(),
        reversed_by: refundedBy,
        reversal_reason: 'Manual Refund'
    }).eq('id', salaryId);

    if (transactionId) {
        const { data: txDoc } = await supabase.from('transactions').select('id').eq('id', transactionId).single();
        if (txDoc) {
            await supabase.from('transactions').update({
                status: PaymentStatus.REFUNDED,
                reversed_at: Date.now(),
                reversed_by: refundedBy,
                reversal_reason: 'Manual Refund'
            }).eq('id', transactionId);
        } else {
            await supabase.from('transactions').insert({
                driver_id: driverId,
                amount,
                type: TransactionType.INCOME,
                description: `Salary Refund: ${description || 'Manual Correction'}`,
                timestamp_ms: Date.now(),
                status: PaymentStatus.COMPLETED,
                fleet_id: fleetId ?? null
            });
        }
    } else {
        await supabase.from('transactions').insert({
            driver_id: driverId,
            amount,
            type: TransactionType.INCOME,
            description: `Salary Refund: ${description || 'Manual Correction'}`,
            timestamp_ms: Date.now(),
            status: PaymentStatus.COMPLETED,
            fleet_id: fleetId ?? null
        });
    }

    await supabase.from('audit_logs').insert({
        action: 'REFUND_SALARY_PAYMENT',
        target_id: salaryId,
        details: {
            related_transaction_id: transactionId || 'NONE',
            driver_id: driverId,
            amount
        },
        performed_by_name: refundedBy,
        fleet_id: fleetId ?? null,
        timestamp_ms: Date.now()
    });
};
