import { supabase } from '../supabase';

export interface AccountRecord {
    id: string;
    username: string;
    phone: string | null;
    role: string;
    active: boolean;
    avatar: string | null;
    created_ms: number;
    driverCount: number;
    transactionCount: number;
}

/** Normalize any phone input to +998XXXXXXXXX */
export const normalizePhone = (raw: string): string => {
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('998') && digits.length === 12) return `+${digits}`;
    if (digits.length === 9) return `+998${digits}`;
    return `+${digits}`;
};

/** Format for display: +998 93 748 91 41 */
export const formatPhone = (phone: string): string => {
    const d = phone.replace(/\D/g, '');
    if (d.length === 12 && d.startsWith('998')) {
        return `+998 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10, 12)}`;
    }
    return phone;
};

/** 6-char alphanumeric password: 3 letters + 3 digits, shuffled */
export const generatePassword = (): string => {
    const letters = 'abcdefghjkmnpqrstuvwxyz';
    const digits  = '23456789';
    const chars = [
        letters[Math.floor(Math.random() * letters.length)],
        letters[Math.floor(Math.random() * letters.length)],
        letters[Math.floor(Math.random() * letters.length)],
        digits[Math.floor(Math.random() * digits.length)],
        digits[Math.floor(Math.random() * digits.length)],
        digits[Math.floor(Math.random() * digits.length)],
    ];
    for (let i = chars.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join('');
};

export const getAllAccounts = async (): Promise<AccountRecord[]> => {
    const [usersRes, driversRes, txRes] = await Promise.all([
        supabase.from('admin_users').select('id,username,phone,role,active,avatar,created_ms').order('created_ms', { ascending: false }),
        supabase.from('drivers').select('fleet_id').eq('is_deleted', false),
        supabase.from('transactions').select('fleet_id'),
    ]);

    const users = usersRes.data ?? [];
    const driverMap: Record<string, number> = {};
    const txMap: Record<string, number> = {};

    (driversRes.data ?? []).forEach(d => { if (d.fleet_id) driverMap[d.fleet_id] = (driverMap[d.fleet_id] || 0) + 1; });
    (txRes.data ?? []).forEach(t => { if (t.fleet_id) txMap[t.fleet_id] = (txMap[t.fleet_id] || 0) + 1; });

    return users.map(u => ({
        ...u,
        driverCount: driverMap[u.id] || 0,
        transactionCount: txMap[u.id] || 0,
    }));
};

export const createAccount = async (
    phone: string,
    username: string,
    password: string,
    createdBy: string,
): Promise<{ id: string }> => {
    const normalizedPhone = normalizePhone(phone);

    const { data, error } = await supabase
        .from('admin_users')
        .insert({
            username,
            password,
            phone: normalizedPhone,
            role: 'admin',
            active: true,
            created_ms: Date.now(),
            created_by: createdBy,
        })
        .select('id')
        .single();

    if (error) throw new Error(error.message);

    await supabase.from('fleet_metadata').insert({
        fleet_id: data.id,
        username,
        initialized: true,
        created_ms: Date.now(),
        created_by: createdBy,
    });

    return { id: data.id };
};

export const toggleAccountStatus = async (id: string, active: boolean): Promise<void> => {
    const { error } = await supabase.from('admin_users').update({ active }).eq('id', id);
    if (error) throw new Error(error.message);
};

export const resetAccountPassword = async (id: string, newPassword: string): Promise<void> => {
    const { error } = await supabase.from('admin_users').update({ password: newPassword }).eq('id', id);
    if (error) throw new Error(error.message);
};

export const deleteAccount = async (id: string): Promise<void> => {
    const { error } = await supabase.from('admin_users').delete().eq('id', id);
    if (error) throw new Error(error.message);
};
