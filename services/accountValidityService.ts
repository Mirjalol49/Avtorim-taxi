import { supabase } from '../supabase';

export interface AccountValidityResult {
    isValid: boolean;
    reason?: string;
    userData?: any;
}

export const checkAccountValidity = async (accountId: string): Promise<AccountValidityResult> => {
    try {
        const { data, error } = await supabase
            .from('admin_users')
            .select('*')
            .eq('id', accountId)
            .single();

        if (error || !data) {
            return { isValid: false, reason: 'Account has been deleted' };
        }

        if (data.active === false) {
            return { isValid: false, reason: 'Account has been disabled' };
        }

        return { isValid: true, userData: data };
    } catch {
        return { isValid: true };
    }
};

export const subscribeToAccountValidity = (
    accountId: string,
    onInvalid: (reason: string) => void,
    onUpdate?: (data: any) => void
): (() => void) => {
    const channel = supabase
        .channel(`account_validity_${accountId}`)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'admin_users', filter: `id=eq.${accountId}` },
            (payload) => {
                if (payload.eventType === 'DELETE') {
                    onInvalid('Your account has been deleted by an administrator');
                    return;
                }

                const data = payload.new as any;
                if (data?.active === false) {
                    onInvalid('Your account has been disabled by an administrator');
                    return;
                }

                if (onUpdate && data) {
                    onUpdate(data);
                }
            }
        )
        .subscribe();

    return () => { supabase.removeChannel(channel); };
};

export const validateAccountOnInit = async (adminUser: any): Promise<AccountValidityResult> => {
    if (!adminUser || !adminUser.id) {
        return { isValid: false, reason: 'No admin user found' };
    }
    return checkAccountValidity(adminUser.id);
};
