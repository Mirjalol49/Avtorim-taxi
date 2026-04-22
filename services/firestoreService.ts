import { supabase } from '../supabase';
import { Driver, Transaction, Viewer } from '../types';

// ==================== HELPERS ====================

const toMs = (val: string | number | null | undefined): number => {
    if (!val) return Date.now();
    if (typeof val === 'number') return val;
    return new Date(val).getTime();
};

// ==================== ADMIN USERS ====================

export const subscribeToAdminUsers = (callback: (users: any[]) => void) => {
    supabase
        .from('admin_users')
        .select('*')
        .then(({ data }) => {
            if (data) callback(data.map(r => ({ ...r, createdAt: toMs(r.created_ms) })));
        });

    const channel = supabase
        .channel('admin_users_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_users' }, () => {
            supabase.from('admin_users').select('*').then(({ data }) => {
                if (data) callback(data.map(r => ({ ...r, createdAt: toMs(r.created_ms) })));
            });
        })
        .subscribe();

    return () => { supabase.removeChannel(channel); };
};

export const addAdminUser = async (user: any, performedBy: string) => {
    const { data, error } = await supabase
        .from('admin_users')
        .insert({
            username: user.username,
            password: user.password,
            role: user.role || 'admin',
            active: user.active ?? true,
            avatar: user.avatar ?? null,
            created_ms: Date.now(),
            created_by: performedBy || null
        })
        .select('id')
        .single();

    if (error) throw error;

    const userId = data.id;

    await supabase.from('fleet_metadata').insert({
        fleet_id: userId,
        username: user.username,
        initialized: true,
        created_ms: Date.now(),
        created_by: performedBy || null
    });

    await supabase.from('audit_logs').insert({
        action: 'CREATE_ADMIN_USER',
        target_id: userId,
        target_name: user.username,
        performed_by: performedBy || null,
        timestamp_ms: Date.now()
    });

    const { clearNotificationsForNewAccount } = await import('./notificationService');
    await clearNotificationsForNewAccount(userId);
};

export const updateAdminUser = async (id: string, updates: any, performedBy: string) => {
    const dbUpdates: any = {};
    if ('username' in updates) dbUpdates.username = updates.username;
    if ('password' in updates) dbUpdates.password = updates.password;
    if ('role' in updates) dbUpdates.role = updates.role;
    if ('active' in updates) dbUpdates.active = updates.active;
    if ('avatar' in updates) dbUpdates.avatar = updates.avatar;

    const { error } = await supabase.from('admin_users').update(dbUpdates).eq('id', id);
    if (error) throw error;

    if (updates.active === false) {
        await invalidateUserSessions(id);
    }

    await supabase.from('audit_logs').insert({
        action: 'UPDATE_ADMIN_USER',
        target_id: id,
        performed_by: performedBy || null,
        details: { updates: JSON.stringify(updates) },
        timestamp_ms: Date.now()
    });
};

export const deleteAdminUser = async (id: string, username: string, performedBy: string) => {
    const { error } = await supabase.from('admin_users').delete().eq('id', id);
    if (error) throw error;

    await supabase.from('audit_logs').insert({
        action: 'DELETE_ADMIN_USER',
        target_id: id,
        target_name: username,
        performed_by: performedBy || null,
        timestamp_ms: Date.now()
    });
};

// ==================== AUDIT LOGS ====================

export const subscribeToAuditLogs = (callback: (logs: any[]) => void) => {
    supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp_ms', { ascending: false })
        .limit(100)
        .then(({ data }) => { if (data) callback(data); });

    const channel = supabase
        .channel('audit_logs_changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, () => {
            supabase
                .from('audit_logs')
                .select('*')
                .order('timestamp_ms', { ascending: false })
                .limit(100)
                .then(({ data }) => { if (data) callback(data); });
        })
        .subscribe();

    return () => { supabase.removeChannel(channel); };
};

// ==================== DRIVERS ====================

export const subscribeToDrivers = (callback: (drivers: Driver[]) => void, fleetId?: string) => {
    if (!fleetId) return () => {};

    const fetchDrivers = () =>
        supabase
            .from('drivers')
            .select('*')
            .eq('fleet_id', fleetId)
            .eq('is_deleted', false)
            .then(({ data }) => {
                if (data) callback(data.map(r => ({
                    id: r.id,
                    fleetId: r.fleet_id,
                    name: r.name ?? '',
                    phone: r.phone ?? '',
                    carModel: r.car ?? '',
                    licensePlate: r.car_number ?? '',
                    status: r.status ?? 'OFFLINE',
                    avatar: r.avatar ?? '',
                    balance: r.balance ?? 0,
                    rating: r.rating ?? 5.0,
                    monthlySalary: r.monthly_salary ?? 0,
                    dailyPlan: r.daily_plan ?? 750000,
                    telegram: r.telegram ?? '',
                    isDeleted: r.is_deleted ?? false,
                    location: r.location ?? { lat: 0, lng: 0, heading: 0 },
                    documents: r.documents ?? [],
                    createdAt: toMs(r.created_ms),
                } as Driver)));
            });

    fetchDrivers();

    const channel = supabase
        .channel(`drivers_${fleetId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers', filter: `fleet_id=eq.${fleetId}` }, fetchDrivers)
        .subscribe();

    return () => { supabase.removeChannel(channel); };
};

export const addDriver = async (driver: Omit<Driver, 'id'>, fleetId?: string) => {
    const { data, error } = await supabase
        .from('drivers')
        .insert({
            fleet_id: fleetId ?? null,
            name: driver.name,
            phone: driver.phone ?? '',
            car: driver.carModel ?? '',
            car_number: driver.licensePlate ?? '',
            status: driver.status ?? 'OFFLINE',
            avatar: driver.avatar ?? '',
            balance: driver.balance ?? 0,
            rating: driver.rating ?? 5.0,
            monthly_salary: (driver as any).monthlySalary ?? 0,
            daily_plan: (driver as any).dailyPlan ?? 750000,
            telegram: (driver as any).telegram ?? null,
            is_deleted: false,
            location: driver.location ?? null,
            documents: (driver as any).documents ?? [],
            created_ms: Date.now(),
        })
        .select('id')
        .single();
    if (error) throw error;
    return data.id as string;
};

export const updateDriver = async (id: string, driver: Partial<Driver>, _fleetId?: string) => {
    const payload: any = {};
    if (driver.name !== undefined) payload.name = driver.name;
    if (driver.phone !== undefined) payload.phone = driver.phone;
    if ((driver as any).carModel !== undefined) payload.car = (driver as any).carModel;
    if ((driver as any).licensePlate !== undefined) payload.car_number = (driver as any).licensePlate;
    if (driver.status !== undefined) payload.status = driver.status;
    if (driver.avatar !== undefined) payload.avatar = driver.avatar;
    if (driver.balance !== undefined) payload.balance = driver.balance;
    if (driver.rating !== undefined) payload.rating = driver.rating;
    if ((driver as any).monthlySalary !== undefined) payload.monthly_salary = (driver as any).monthlySalary;
    if ((driver as any).dailyPlan !== undefined) payload.daily_plan = (driver as any).dailyPlan;
    if ((driver as any).telegram !== undefined) payload.telegram = (driver as any).telegram;
    if ((driver as any).isDeleted !== undefined) payload.is_deleted = (driver as any).isDeleted;
    if (driver.location !== undefined) payload.location = driver.location;
    if ((driver as any).documents !== undefined) payload.documents = (driver as any).documents;
    const { error } = await supabase.from('drivers').update(payload).eq('id', id);
    if (error) throw error;
};

export const deleteDriver = async (id: string, auditInfo?: { adminName: string; reason?: string }, fleetId?: string) => {
    const { error } = await supabase.from('drivers').update({ is_deleted: true }).eq('id', id);
    if (error) throw error;

    if (auditInfo) {
        await supabase.from('audit_logs').insert({
            action: 'DELETE_DRIVER',
            target_id: id,
            performed_by_name: auditInfo.adminName,
            details: { reason: auditInfo.reason || 'No reason provided', fleet_id: fleetId ?? 'global' },
            timestamp_ms: Date.now()
        });
    }
};

// ==================== TRANSACTIONS ====================

export const subscribeToTransactions = (callback: (transactions: Transaction[]) => void, fleetId?: string) => {
    if (!fleetId) return () => {};

    const fetchTx = () =>
        supabase
            .from('transactions')
            .select('*')
            .eq('fleet_id', fleetId)
            .neq('status', 'DELETED')
            .order('timestamp_ms', { ascending: false })
            .then(({ data }) => {
                if (data) callback(data.map(r => ({
                    id: r.id,
                    driverId: r.driver_id ?? undefined,
                    driverName: r.driver_name ?? undefined,
                    carId: r.car_id ?? undefined,
                    carName: r.car_name ?? undefined,
                    amount: r.amount ?? 0,
                    type: r.type,
                    description: r.description ?? '',
                    note: r.note ?? '',
                    timestamp: toMs(r.timestamp_ms),
                    status: r.status,
                    paymentMethod: r.payment_method ?? undefined,
                    chequeImage: r.cheque_image ?? undefined,
                    reversedAt: r.reversed_at ?? undefined,
                    reversedBy: r.reversed_by ?? undefined,
                    reversalReason: r.reversal_reason ?? undefined,
                    originalTransactionId: r.original_transaction_id ?? undefined,
                } as Transaction)));
            });

    fetchTx();

    const channel = supabase
        .channel(`transactions_${fleetId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `fleet_id=eq.${fleetId}` }, fetchTx)
        .subscribe();

    return () => { supabase.removeChannel(channel); };
};

export const addTransaction = async (transaction: Omit<Transaction, 'id'>, fleetId?: string) => {
    const tx = transaction as any;
    const { data, error } = await supabase
        .from('transactions')
        .insert({
            fleet_id: fleetId ?? null,
            driver_id: tx.driverId ?? null,
            driver_name: tx.driverName ?? null,
            car_id: tx.carId ?? null,
            car_name: tx.carName ?? null,
            amount: tx.amount,
            type: tx.type,
            status: tx.status ?? 'ACTIVE',
            description: tx.description ?? '',
            note: tx.note ?? null,
            payment_method: tx.paymentMethod ?? null,
            cheque_image: tx.chequeImage ?? null,
            timestamp_ms: tx.timestamp ?? Date.now(),
            created_ms: Date.now(),
        })
        .select('id')
        .single();
    if (error) throw error;
    return data.id as string;
};

export const deleteTransaction = async (id: string, auditInfo?: { adminName: string; reason?: string; transactionDetails?: any }, fleetId?: string) => {
    const { error } = await supabase.from('transactions').update({ status: 'DELETED' }).eq('id', id);
    if (error) throw error;

    if (auditInfo) {
        await supabase.from('audit_logs').insert({
            action: 'DELETE_TRANSACTION',
            target_id: id,
            performed_by_name: auditInfo.adminName,
            details: {
                reason: auditInfo.reason || 'No reason provided',
                transaction_details: auditInfo.transactionDetails ? JSON.stringify(auditInfo.transactionDetails) : null,
                fleet_id: fleetId ?? 'global',
                type: 'SOFT_DELETE'
            },
            timestamp_ms: Date.now()
        });
    }
};

export const deleteTransactionsBatch = async (ids: string[], auditInfo: { adminName: string; count: number; totalAmount: number }, fleetId?: string) => {
    const { error } = await supabase.from('transactions').update({ status: 'DELETED' }).in('id', ids);
    if (error) throw error;

    await supabase.from('audit_logs').insert({
        action: 'BULK_DELETE_TRANSACTIONS',
        performed_by_name: auditInfo.adminName,
        details: {
            count: auditInfo.count,
            total_amount: auditInfo.totalAmount,
            transaction_ids: ids,
            fleet_id: fleetId ?? 'global',
            type: 'SOFT_DELETE'
        },
        timestamp_ms: Date.now()
    });
};

// ==================== ADMIN PROFILE ====================

export const subscribeToAdminProfile = (callback: (admin: any) => void) => {
    supabase
        .from('admin_profile')
        .select('*')
        .eq('id', 'profile')
        .single()
        .then(({ data }) => { if (data) callback(data); });

    const channel = supabase
        .channel('admin_profile_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_profile' }, () => {
            supabase.from('admin_profile').select('*').eq('id', 'profile').single()
                .then(({ data }) => { if (data) callback(data); });
        })
        .subscribe();

    return () => { supabase.removeChannel(channel); };
};

export const updateAdminProfile = async (admin: any) => {
    const { error: upsertError } = await supabase
        .from('admin_profile')
        .upsert({ id: 'profile', ...admin, updated_ms: Date.now() });
    if (upsertError) throw upsertError;

    if (admin.password || admin.avatar || admin.name) {
        const updates: any = {};
        if (admin.password) updates.password = admin.password;
        if (admin.avatar) updates.avatar = admin.avatar;
        if (admin.name) updates.username = admin.name;

        await supabase.from('admin_users').update(updates).eq('role', 'super_admin');
    }

    await supabase.from('audit_logs').insert({
        action: 'UPDATE_ADMIN_PROFILE',
        performed_by_name: admin.name || 'Admin',
        details: {
            avatar_type: admin.avatar && typeof admin.avatar === 'string' && admin.avatar.startsWith('data:image/') ? 'dataUrl' : 'url'
        },
        timestamp_ms: Date.now()
    });
};

// ==================== VIEWERS ====================

export const subscribeToViewers = (callback: (viewers: Viewer[]) => void) => {
    supabase
        .from('viewers')
        .select('*')
        .then(({ data }) => { if (data) callback(data as Viewer[]); });

    const channel = supabase
        .channel('viewers_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'viewers' }, () => {
            supabase.from('viewers').select('*').then(({ data }) => { if (data) callback(data as Viewer[]); });
        })
        .subscribe();

    return () => { supabase.removeChannel(channel); };
};

export const addViewer = async (viewer: Omit<Viewer, 'id'>) => {
    const { data, error } = await supabase
        .from('viewers')
        .insert({ ...viewer, created_ms: Date.now() })
        .select('id')
        .single();
    if (error) throw error;
    return data.id as string;
};

export const updateViewer = async (id: string, viewer: Partial<Viewer>) => {
    const { error } = await supabase.from('viewers').update(viewer as any).eq('id', id);
    if (error) throw error;
};

export const deleteViewer = async (id: string) => {
    const { error } = await supabase.from('viewers').delete().eq('id', id);
    if (error) throw error;
};

// ==================== GEOLOCATION ====================

export interface LocationUpdate {
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: number;
    heading: number;
    speed: number;
}

export const updateDriverLocation = async (driverId: string, location: LocationUpdate, _fleetId?: string) => {
    const { error } = await supabase.from('drivers').update({
        location: { lat: location.lat, lng: location.lng, heading: location.heading },
        last_location_update: location.timestamp,
        location_accuracy: location.accuracy
    }).eq('id', driverId);
    if (error) throw error;
};

// ==================== AUTHENTICATION HELPERS ====================

export const authenticateAdminUser = async (password: string): Promise<any | null> => {
    const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('password', password)
        .eq('active', true)
        .limit(1)
        .single();

    if (error || !data) return null;
    return data;
};

export const invalidateUserSessions = async (userId: string): Promise<void> => {
    await supabase.from('sessions').update({
        active: false,
        invalidated_at: Date.now(),
        invalidation_reason: 'Account disabled'
    }).eq('user_id', userId).eq('active', true);

    await supabase.from('audit_logs').insert({
        action: 'INVALIDATE_USER_SESSIONS',
        target_id: userId,
        details: { reason: 'Account disabled' },
        timestamp_ms: Date.now()
    });
};

// ==================== MIGRATION (localStorage → Supabase) ====================

export const migrateFromLocalStorage = async () => {
    const migrated = localStorage.getItem('avtorim_migrated_to_supabase');
    if (migrated) return;

    let hasData = false;

    const driversData = localStorage.getItem('avtorim_drivers');
    if (driversData) {
        const drivers = JSON.parse(driversData);
        if (drivers.length > 0) {
            await supabase.from('drivers').upsert(drivers.map(({ id, ...d }: any) => ({ id, ...d })));
            hasData = true;
        }
    }

    const txRaw = localStorage.getItem('avtorim_transactions');
    if (txRaw) {
        const transactions = JSON.parse(txRaw);
        if (transactions.length > 0) {
            await supabase.from('transactions').upsert(transactions.map(({ id, ...t }: any) => ({ id, ...t })));
            hasData = true;
        }
    }

    const adminData = localStorage.getItem('avtorim_admin');
    if (adminData) {
        const admin = JSON.parse(adminData);
        if (admin.name && admin.name !== 'Admin') {
            await supabase.from('admin_profile').upsert({ id: 'profile', ...admin, updated_ms: Date.now() });
            hasData = true;
        }
    }

    localStorage.setItem('avtorim_migrated_to_supabase', 'true');
    console.log(hasData ? 'Migration completed!' : 'No data to migrate — starting fresh!');
};

// ==================== LEGACY COMPAT ====================
export const getCollectionPath = (_base: string, _fleetId?: string) => '';
