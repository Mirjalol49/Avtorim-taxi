import { createClient } from '@supabase/supabase-js';
import {
    buildDailyPlanDebtReminders,
    formatDailyPlanDebtMessage,
} from '../../src/features/telegram/dailyPlanDebtReminder.ts';

const DAY_MS = 24 * 60 * 60 * 1000;
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

const TELEGRAM_API = (token) => `https://api.telegram.org/bot${token}/sendMessage`;
const getEnv = (name) => globalThis.Netlify?.env?.get?.(name) ?? process.env[name];

const dateKeyStartMs = (dateKey) => {
    const [year, month, day] = dateKey.split('-').map(Number);
    return Date.UTC(year, month - 1, day) - TASHKENT_OFFSET_MS;
};

const toDriver = (row) => ({
    id: row.id,
    name: row.name ?? 'Haydovchi',
    phone: row.phone ?? '',
    licensePlate: row.car_number ?? '',
    carModel: row.car ?? '',
    status: row.status ?? 'ACTIVE',
    dailyPlan: row.daily_plan ?? 0,
    monthlySalary: row.monthly_salary ?? 0,
    avatar: row.avatar ?? '',
    telegram: row.telegram ?? '',
    location: row.location ?? { lat: 0, lng: 0, heading: 0 },
    balance: row.balance ?? 0,
    rating: row.rating ?? 5,
    isDeleted: row.is_deleted === true,
    createdAt: row.created_ms ?? undefined,
    startDate: row.start_date ?? undefined,
    quitDate: row.quit_date ?? undefined,
    planHistory: row.plan_history ?? undefined,
    dayOverrides: row.day_overrides ?? undefined,
    fleetId: row.fleet_id ?? null,
});

const toCar = (row) => ({
    id: row.id,
    name: row.name ?? '',
    licensePlate: row.license_plate ?? '',
    assignedDriverId: row.assigned_driver_id ?? undefined,
    dailyPlan: row.daily_plan ?? 0,
    isDeleted: row.is_deleted === true,
    inRepair: row.in_repair === true,
    createdAt: row.created_ms ?? undefined,
    planHistory: row.plan_history ?? undefined,
    dayOverrides: row.day_overrides ?? undefined,
});

const toTransaction = (row) => ({
    id: row.id,
    driverId: row.driver_id ?? undefined,
    driverName: row.driver_name ?? undefined,
    carId: row.car_id ?? undefined,
    carName: row.car_name ?? undefined,
    amount: row.amount ?? 0,
    type: row.type,
    description: row.description ?? '',
    timestamp: row.timestamp_ms ?? row.created_ms ?? Date.now(),
    status: row.status ?? undefined,
    category: row.category ?? undefined,
    useDeposit: row.use_deposit === true,
});

async function fetchFleetData(supabase) {
    const [driversRes, carsRes, txRes] = await Promise.all([
        supabase
            .from('drivers')
            .select('id,fleet_id,name,phone,status,avatar,balance,rating,monthly_salary,daily_plan,telegram,is_deleted,created_ms,start_date,quit_date,plan_history,day_overrides')
            .eq('is_deleted', false),
        supabase
            .from('cars')
            .select('id,fleet_id,name,license_plate,assigned_driver_id,daily_plan,is_deleted,in_repair,created_ms,plan_history,day_overrides')
            .eq('is_deleted', false),
        supabase
            .from('transactions')
            .select('id,fleet_id,driver_id,driver_name,car_id,car_name,amount,type,description,timestamp_ms,status,use_deposit,category'),
    ]);

    if (driversRes.error) throw driversRes.error;
    if (carsRes.error) throw carsRes.error;
    if (txRes.error) throw txRes.error;

    return {
        drivers: (driversRes.data ?? []).map(toDriver),
        cars: (carsRes.data ?? []).map(toCar),
        transactions: (txRes.data ?? []).map(toTransaction),
    };
}

async function fetchExistingReminderKeys(supabase, localDateKey) {
    const { data, error } = await supabase
        .from('notifications')
        .select('delivery_tracking,created_ms')
        .gte('created_ms', dateKeyStartMs(localDateKey));

    if (error) throw error;

    return new Set(
        (data ?? [])
            .map(row => row.delivery_tracking ?? {})
            .filter(dt => dt.reminderType === 'telegram_daily_debt' && dt.localDateKey === localDateKey)
            .map(dt => `${dt.fleetId ?? ''}:${dt.driverId}:${dt.localDateKey}`)
    );
}

async function sendTelegram(fetchImpl, botToken, chatId, text) {
    const res = await fetchImpl(TELEGRAM_API(botToken), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) {
        let detail = '';
        try { detail = JSON.stringify(await res.json()); } catch {}
        throw new Error(`Telegram send failed: ${res.status ?? 'unknown'} ${detail}`);
    }
}

async function insertReminderNotification(supabase, reminder, nowMs) {
    const expiresAt = nowMs + 14 * DAY_MS;
    const { error } = await supabase.from('notifications').insert({
        fleet_id: reminder.fleetId,
        title: `Telegram qarz eslatma: ${reminder.driverName}`,
        message: `Qarz: ${reminder.totalDebt} UZS · ${reminder.unpaidDayCount} kun`,
        type: 'payment_reminder',
        category: 'payment_reminder',
        priority: 'high',
        target_users: 'role:admin',
        created_by: null,
        created_by_name: 'Telegram Bot',
        created_ms: nowMs,
        expires_at: expiresAt,
        min_account_age: null,
        delivery_tracking: {
            sent: nowMs,
            delivered: [],
            read: [],
            reminderType: 'telegram_daily_debt',
            fleetId: reminder.fleetId,
            driverId: reminder.driverId,
            driverName: reminder.driverName,
            telegramId: reminder.telegramId,
            localDateKey: reminder.localDateKey,
            totalDebt: reminder.totalDebt,
            unpaidDayCount: reminder.unpaidDayCount,
            unpaidDays: reminder.unpaidDays,
        },
    });
    if (error) throw error;
}

export async function runDailyPlanDebtReminder({
    supabase,
    fetchImpl = fetch,
    botToken,
    now = new Date(),
}) {
    if (!botToken) throw new Error('TELEGRAM_BOT_TOKEN is required');

    const nowMs = now.getTime();
    const { drivers, cars, transactions } = await fetchFleetData(supabase);
    const reminders = buildDailyPlanDebtReminders(drivers, cars, transactions, now);
    if (reminders.length === 0) return { sent: 0, skipped: 0, failed: 0 };

    const sentKeys = await fetchExistingReminderKeys(supabase, reminders[0].localDateKey);
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const reminder of reminders) {
        const key = `${reminder.fleetId ?? ''}:${reminder.driverId}:${reminder.localDateKey}`;
        if (sentKeys.has(key)) {
            skipped += 1;
            continue;
        }

        try {
            await sendTelegram(fetchImpl, botToken, reminder.telegramId, formatDailyPlanDebtMessage(reminder));
            await insertReminderNotification(supabase, reminder, nowMs);
            sentKeys.add(key);
            sent += 1;
        } catch (error) {
            failed += 1;
            console.error('[daily-plan-debt-reminder] send failed:', error);
        }
    }

    return { sent, skipped, failed };
}

export const config = {
    schedule: '0 17 * * *',
};

export const handler = async () => {
    const supabaseUrl = getEnv('SUPABASE_URL');
    const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
    const botToken = getEnv('TELEGRAM_BOT_TOKEN');

    if (!supabaseUrl || !serviceRoleKey || !botToken) {
        const missing = [
            !supabaseUrl && 'SUPABASE_URL',
            !serviceRoleKey && 'SUPABASE_SERVICE_ROLE_KEY',
            !botToken && 'TELEGRAM_BOT_TOKEN',
        ].filter(Boolean);
        console.error('[daily-plan-debt-reminder] missing env:', missing.join(', '));
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Missing env: ${missing.join(', ')}` }),
        };
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const result = await runDailyPlanDebtReminder({
        supabase,
        botToken,
    });
    return { statusCode: 200, body: JSON.stringify(result) };
};

export default handler;
