import { supabase } from '../supabase';

export interface DeletionResult {
    success: boolean;
    message: string;
    deletedItems: {
        adminUser?: boolean;
        fleetMetadata?: boolean;
        auditLogs?: number;
        transactions?: number;
        drivers?: number;
        salaries?: number;
        viewers?: number;
    };
}

export const permanentlyDeleteAdminAccount = async (
    username: string,
    password: string,
    performedBy: string
): Promise<DeletionResult> => {
    const result: DeletionResult = { success: false, message: '', deletedItems: {} };

    const { data: accountRow, error: findErr } = await supabase
        .from('admin_users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();

    if (findErr || !accountRow) {
        return { success: false, message: `Account "${username}" not found or password incorrect`, deletedItems: {} };
    }

    const accountId = accountRow.id;

    // Delete drivers (cascade via FK, but count first)
    const { count: driverCount } = await supabase.from('drivers').select('*', { count: 'exact', head: true }).eq('fleet_id', accountId);
    if ((driverCount ?? 0) > 0) result.deletedItems.drivers = driverCount!;

    const { count: txCount } = await supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('fleet_id', accountId);
    if ((txCount ?? 0) > 0) result.deletedItems.transactions = txCount!;

    const { count: salaryCount } = await supabase.from('driver_salaries').select('*', { count: 'exact', head: true }).eq('fleet_id', accountId);
    if ((salaryCount ?? 0) > 0) result.deletedItems.salaries = salaryCount!;

    // Delete audit logs referencing this account
    const { data: logs1 } = await supabase.from('audit_logs').select('id').eq('performed_by', accountId);
    const { data: logs2 } = await supabase.from('audit_logs').select('id').eq('target_id', accountId);
    const logIds = [...new Set([...(logs1 ?? []).map(l => l.id), ...(logs2 ?? []).map(l => l.id)])];
    if (logIds.length > 0) {
        await supabase.from('audit_logs').delete().in('id', logIds);
        result.deletedItems.auditLogs = logIds.length;
    }

    // Delete admin user (FK cascade removes drivers, transactions, salaries, sessions, mfa, etc.)
    const { error: deleteErr } = await supabase.from('admin_users').delete().eq('id', accountId);
    if (deleteErr) throw deleteErr;
    result.deletedItems.adminUser = true;

    await supabase.from('audit_logs').insert({
        action: 'PERMANENT_ACCOUNT_DELETION',
        target_id: accountId,
        target_name: username,
        performed_by_name: performedBy,
        details: {
            deleted_items: result.deletedItems,
            account_role: accountRow.role,
            account_created_at: accountRow.created_at
        },
        timestamp: Date.now()
    });

    result.success = true;
    result.message = `Account "${username}" permanently deleted with all associated data`;
    return result;
};

export const verifyAccountForDeletion = async (
    username: string,
    password: string
): Promise<{
    found: boolean;
    accountData?: any;
    estimatedDeletions?: { drivers: number; transactions: number; salaries: number; auditLogs: number };
}> => {
    const { data: accountRow, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();

    if (error || !accountRow) return { found: false };

    const accountId = accountRow.id;
    const { count: driverCount } = await supabase.from('drivers').select('*', { count: 'exact', head: true }).eq('fleet_id', accountId);
    const { count: txCount } = await supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('fleet_id', accountId);
    const { count: salaryCount } = await supabase.from('driver_salaries').select('*', { count: 'exact', head: true }).eq('fleet_id', accountId);
    const { count: logCount } = await supabase.from('audit_logs').select('*', { count: 'exact', head: true }).eq('target_id', accountId);

    return {
        found: true,
        accountData: {
            id: accountId,
            username: accountRow.username,
            role: accountRow.role,
            active: accountRow.active,
            createdAt: accountRow.created_at
        },
        estimatedDeletions: {
            drivers: driverCount ?? 0,
            transactions: txCount ?? 0,
            salaries: salaryCount ?? 0,
            auditLogs: logCount ?? 0
        }
    };
};
