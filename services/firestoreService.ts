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
    const fetch = () =>
        supabase.from('admin_users').select('*').then(({ data }) => {
            if (data) callback(data.map(r => ({ ...r, createdAt: toMs(r.created_ms) })));
        });

    fetch();

    const channel = supabase
        .channel('admin_users_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_users' }, fetch)
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') fetch();
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') fetch();
        });

    return () => { supabase.removeChannel(channel); };
};

export const addAdminUser = async (user: any, performedBy: string) => {
    const { data, error } = await supabase
        .from('admin_users')
        .insert({
            username: user.username,
            password: user.password,
            phone: user.phone ?? null,
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
    const fetchLogs = () =>
        supabase
            .from('audit_logs')
            .select('*')
            .order('timestamp_ms', { ascending: false })
            .limit(100)
            .then(({ data }) => { if (data) callback(data); });

    const channel = supabase
        .channel('audit_logs_changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, fetchLogs)
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') fetchLogs();
        });

    return () => { supabase.removeChannel(channel); };
};

// ==================== DRIVERS ====================

export const subscribeToDrivers = (callback: (drivers: Driver[]) => void, fleetId?: string) => {
    if (!fleetId) return { unsubscribe: () => {}, refetch: () => {} };

    const transformDriver = (r: any): Driver => ({
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
        dailyPlan: r.daily_plan ?? 0,
        telegram: r.telegram ?? '',
        notes: r.notes ?? '',
        extraPhone: r.extra_phone ?? '',
        isDeleted: r.is_deleted ?? false,
        location: r.location ?? { lat: 0, lng: 0, heading: 0 },
        documents: r.documents ?? [],
        createdAt: toMs(r.created_ms),
        lastSalaryPaidAt: r.last_salary_paid_at ? toMs(r.last_salary_paid_at) : undefined,
        driverType: r.driver_type ?? 'deposit',
        depositAmount: r.deposit_amount ?? 0,
        depositWarningThreshold: r.deposit_warning_threshold ?? 1_000_000,
    } as Driver);

    let cache: Driver[] = [];

    const fetchDrivers = async () => {
        try {
            const { data } = await supabase
                .from('drivers')
                .select('*')
                .eq('fleet_id', fleetId)
                .eq('is_deleted', false);
            if (data) {
                cache = data.map(transformDriver);
                callback(cache);
            }
        } catch (err: any) {
            console.warn('[PWA] Fetch drivers failed, retrying in 3s...', err.message);
            setTimeout(fetchDrivers, 3000);
        }
    };

    fetchDrivers();

    const channel = supabase
        .channel(`drivers_${fleetId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'drivers', filter: `fleet_id=eq.${fleetId}` }, ({ new: row }) => {
            if (row.is_deleted) return;
            const item = transformDriver(row);
            cache = [...cache, item];
            callback(cache);
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'drivers', filter: `fleet_id=eq.${fleetId}` }, ({ new: row }) => {
            if (row.is_deleted) {
                cache = cache.filter(d => d.id !== row.id);
            } else {
                const item = transformDriver(row);
                const idx = cache.findIndex(d => d.id === row.id);
                cache = idx >= 0
                    ? [...cache.slice(0, idx), item, ...cache.slice(idx + 1)]
                    : [...cache, item];
            }
            callback(cache);
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'drivers', filter: `fleet_id=eq.${fleetId}` }, ({ old: row }) => {
            cache = cache.filter(d => d.id !== row.id);
            callback(cache);
        })
        .subscribe((status) => {
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') fetchDrivers();
        });

    return {
        unsubscribe: () => { supabase.removeChannel(channel); },
        refetch: fetchDrivers,
    };
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
            daily_plan: 0,
            telegram: (driver as any).telegram ?? null,
            notes: (driver as any).notes ?? null,
            extra_phone: (driver as any).extraPhone ?? null,
            is_deleted: false,
            location: driver.location ?? null,
            documents: (driver as any).documents ?? [],
            created_ms: Date.now(),
            driver_type: (driver as any).driverType ?? 'deposit',
            deposit_amount: (driver as any).depositAmount ?? 0,
            deposit_warning_threshold: (driver as any).depositWarningThreshold ?? 1_000_000,
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
    if ((driver as any).notes !== undefined) payload.notes = (driver as any).notes;
    if ((driver as any).extraPhone !== undefined) payload.extra_phone = (driver as any).extraPhone;
    if ((driver as any).isDeleted !== undefined) payload.is_deleted = (driver as any).isDeleted;
    if (driver.location !== undefined) payload.location = driver.location;
    if ((driver as any).documents !== undefined) payload.documents = (driver as any).documents;
    if ((driver as any).lastSalaryPaidAt !== undefined) payload.last_salary_paid_at = (driver as any).lastSalaryPaidAt;
    if ((driver as any).driverType !== undefined) payload.driver_type = (driver as any).driverType;
    if ((driver as any).depositAmount !== undefined) payload.deposit_amount = (driver as any).depositAmount;
    if ((driver as any).depositWarningThreshold !== undefined) payload.deposit_warning_threshold = (driver as any).depositWarningThreshold;
    const { error } = await supabase.from('drivers').update(payload).eq('id', id);
    if (error) throw error;

    if (payload.name !== undefined) {
        await supabase.from('transactions').update({ driver_name: payload.name }).eq('driver_id', id).neq('status', 'DELETED');
        await supabase.from('telegram_sessions').update({ driver_name: payload.name }).eq('driver_id', id);
    }

    if (payload.car !== undefined || payload.car_number !== undefined) {
        const carUpdate: Record<string, unknown> = {};
        if (payload.car !== undefined) carUpdate.name = payload.car;
        if (payload.car_number !== undefined) carUpdate.license_plate = payload.car_number;
        await supabase.from('cars').update(carUpdate).eq('assigned_driver_id', id);
    }
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
    if (!fleetId) return { unsubscribe: () => {}, refetch: () => {} };

    const transformTx = (r: any): Transaction => ({
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
        // Deposit tracking fields — MUST be mapped so debtUtils sees them
        useDeposit: r.use_deposit === true ? true : undefined,
        category: r.category ?? undefined,
    } as Transaction);

    let cache: Transaction[] = [];

    // Full refetch used on reconnect to reconcile exact DB state
    const fetchAll = () =>
        supabase
            .from('transactions')
            .select('*')
            .eq('fleet_id', fleetId)
            .neq('status', 'DELETED')
            .order('timestamp_ms', { ascending: false })
            .then(({ data }) => {
                if (data) { cache = data.map(transformTx); callback(cache); }
            });

    // Fetch older transactions in background, append to cache
    const fetchOlderThan = (beforeMs: number) =>
        supabase
            .from('transactions')
            .select('*')
            .eq('fleet_id', fleetId)
            .neq('status', 'DELETED')
            .lt('timestamp_ms', beforeMs)
            .order('timestamp_ms', { ascending: false })
            .then(({ data }) => {
                if (data && data.length > 0) {
                    cache = [...cache, ...data.map(transformTx)];
                    callback(cache);
                }
            });

    // Initial load: return recent 100 immediately, then fetch the rest silently
    const fetchRecent = async () => {
        try {
            const { data } = await supabase
                .from('transactions')
                .select('*')
                .eq('fleet_id', fleetId)
                .neq('status', 'DELETED')
                .order('timestamp_ms', { ascending: false })
                .limit(100);
            if (data) {
                cache = data.map(transformTx);
                callback(cache);
                if (data.length === 100) {
                    const oldestMs = data[data.length - 1].timestamp_ms;
                    // background — don't block paint
                    setTimeout(() => fetchOlderThan(oldestMs), 0);
                }
            }
        } catch (err: any) {
            console.warn('[PWA] Fetch transactions failed, retrying in 3s...', err.message);
            setTimeout(fetchRecent, 3000);
        }
    };

    fetchRecent();

    const channel = supabase
        .channel(`transactions_${fleetId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions', filter: `fleet_id=eq.${fleetId}` }, ({ new: row }) => {
            if (row.status === 'DELETED') return;
            cache = [transformTx(row), ...cache];
            callback(cache);
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'transactions', filter: `fleet_id=eq.${fleetId}` }, ({ new: row }) => {
            if (row.status === 'DELETED') {
                cache = cache.filter(t => t.id !== row.id);
            } else {
                const item = transformTx(row);
                const idx = cache.findIndex(t => t.id === row.id);
                cache = idx >= 0
                    ? [...cache.slice(0, idx), item, ...cache.slice(idx + 1)]
                    : [item, ...cache];
            }
            callback(cache);
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'transactions', filter: `fleet_id=eq.${fleetId}` }, ({ old: row }) => {
            cache = cache.filter(t => t.id !== row.id);
            callback(cache);
        })
        .subscribe((status) => {
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') fetchAll();
        });

    return {
        unsubscribe: () => { supabase.removeChannel(channel); },
        refetch: fetchAll,
    };
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
            // Deposit tracking — critical for balance deduction
            use_deposit: tx.useDeposit === true ? true : null,
            category: tx.category ?? null,
        })
        .select('id')
        .single();
    if (error) throw error;


    return data.id as string;

};

export const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    const tx = updates as any;
    const payload: any = {};
    if (tx.amount !== undefined) payload.amount = tx.amount;
    if (tx.type !== undefined) payload.type = tx.type;
    if (tx.description !== undefined) payload.description = tx.description;
    if (tx.paymentMethod !== undefined) payload.payment_method = tx.paymentMethod;
    if (tx.chequeImage !== undefined) payload.cheque_image = tx.chequeImage;
    if (tx.timestamp !== undefined) payload.timestamp_ms = tx.timestamp;
    if (tx.useDeposit !== undefined) payload.use_deposit = tx.useDeposit === true ? true : null;
    if (tx.category !== undefined) payload.category = tx.category ?? null;

    const { error } = await supabase
        .from('transactions')
        .update(payload)
        .eq('id', id);
    if (error) throw error;
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
    const fetch = () =>
        supabase.from('admin_profile').select('*').eq('id', 'profile').single()
            .then(({ data }) => { if (data) callback(data); });

    fetch();

    const channel = supabase
        .channel('admin_profile_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_profile' }, fetch)
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') fetch();
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') fetch();
        });

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
    const fetch = () =>
        supabase.from('viewers').select('*').then(({ data }) => {
            if (data) callback(data as Viewer[]);
        });

    fetch();

    const channel = supabase
        .channel('viewers_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'viewers' }, fetch)
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') fetch();
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') fetch();
        });

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

    try {
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

        // Only mark as complete when migration actually succeeded
        localStorage.setItem('avtorim_migrated_to_supabase', 'true');
        void hasData; // suppress unused variable warning
    } catch (err) {
        console.warn('[migration] localStorage migration failed, will retry next boot:', err);
        // Do NOT set the flag so we retry next boot
    }
};

// ==================== LEGACY COMPAT ====================
export const getCollectionPath = (_base: string, _fleetId?: string) => '';
