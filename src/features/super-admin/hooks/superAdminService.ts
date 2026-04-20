import { supabase } from '../../../../supabase';
import { SuperAdminAccount, CreateAccountDTO } from '../types';

export const generateStrongPassword = (): string => {
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
};

export const SuperAdminService = {
    getAccounts: async (): Promise<SuperAdminAccount[]> => {
        const { data, error } = await supabase
            .from('admin_users')
            .select('*')
            .order('created_ms', { ascending: false });
        if (error) throw error;
        return (data ?? []).map(r => ({
            id: r.id,
            username: r.username,
            accountName: r.display_name || r.username,
            ownerEmail: r.email || '',
            role: r.role as 'admin' | 'super_admin',
            status: r.active ? 'active' : 'disabled',
            createdAt: r.created_ms,
        }));
    },

    createAccount: async (
        dto: CreateAccountDTO & { performedBy?: string }
    ): Promise<{ success: boolean; accountId: string; password: string }> => {
        const password = dto.password || generateStrongPassword();
        const username = (dto.username || dto.accountName || '').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || 'user_' + Date.now();

        const { data: existing } = await supabase
            .from('admin_users')
            .select('id')
            .eq('username', username)
            .single();

        if (existing) throw new Error(`Username "${username}" already exists`);

        const { data: newUser, error } = await supabase
            .from('admin_users')
            .insert({
                username,
                password,
                role: 'admin',
                active: true,
                email: dto.email || null,
                display_name: dto.accountName || dto.initialAdminName || username,
                created_ms: Date.now(),
            })
            .select('id')
            .single();
        if (error) throw error;

        await supabase.from('fleet_metadata').insert({
            fleet_id: newUser.id,
            username,
            initialized: true,
            created_ms: Date.now(),
            created_by: dto.performedBy || null,
        });

        await supabase.from('audit_logs').insert({
            action: 'CREATE_ADMIN_USER',
            target_id: newUser.id,
            target_name: username,
            performed_by: dto.performedBy || null,
            timestamp_ms: Date.now(),
        });

        return { success: true, accountId: newUser.id, password };
    },

    toggleStatus: async (uid: string, disabled: boolean): Promise<{ success: boolean }> => {
        const { error } = await supabase
            .from('admin_users')
            .update({ active: !disabled })
            .eq('id', uid);
        if (error) throw error;
        return { success: true };
    },

    deleteAccount: async (uid: string): Promise<void> => {
        const { error } = await supabase.from('admin_users').delete().eq('id', uid);
        if (error) throw error;
    },
};
