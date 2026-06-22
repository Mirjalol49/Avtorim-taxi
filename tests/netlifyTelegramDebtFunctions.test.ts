import { describe, expect, it, vi } from 'vitest';
import {
    config as dailyPlanDebtReminderConfig,
    handler as dailyPlanDebtReminderHandler,
    runDailyPlanDebtReminder,
} from '../netlify/functions/daily-plan-debt-reminder.mjs';
import { sendDriverTelegramMessage } from '../netlify/functions/send-driver-telegram-message.mjs';

type InsertRecord = { table: string; payload: any };

function createSupabaseMock(rows: Record<string, any[]>, inserts: InsertRecord[] = []) {
    const applyFilters = (tableRows: any[], filters: Array<{ op: string; column: string; value: any }>) => {
        return filters.reduce((current, filter) => {
            if (filter.op === 'eq') return current.filter(row => row[filter.column] === filter.value);
            if (filter.op === 'gte') return current.filter(row => row[filter.column] >= filter.value);
            return current;
        }, tableRows);
    };

    const makeQuery = (table: string) => {
        const filters: Array<{ op: string; column: string; value: any }> = [];
        const query: any = {
            select: () => query,
            eq: (column: string, value: any) => {
                filters.push({ op: 'eq', column, value });
                return query;
            },
            gte: (column: string, value: any) => {
                filters.push({ op: 'gte', column, value });
                return query;
            },
            maybeSingle: async () => ({
                data: applyFilters(rows[table] ?? [], filters)[0] ?? null,
                error: null,
            }),
            single: async () => ({
                data: applyFilters(rows[table] ?? [], filters)[0] ?? null,
                error: null,
            }),
            insert: (payload: any) => {
                inserts.push({ table, payload });
                return {
                    select: () => ({
                        single: async () => ({ data: { id: `${table}-inserted` }, error: null }),
                    }),
                    then: (resolve: (value: { data: null; error: null }) => unknown) =>
                        Promise.resolve({ data: null, error: null }).then(resolve),
                };
            },
            then: (resolve: (value: { data: any[]; error: null }) => unknown) =>
                Promise.resolve({ data: applyFilters(rows[table] ?? [], filters), error: null }).then(resolve),
        };
        return query;
    };

    return {
        from: (table: string) => makeQuery(table),
    };
}

const driverRow = {
    id: 'driver-1',
    fleet_id: 'fleet-1',
    name: 'Ali Valiyev',
    phone: '+998 90 000 00 00',
    telegram: '12345',
    is_deleted: false,
    created_ms: Date.UTC(2026, 5, 16, 6),
    start_date: Date.UTC(2026, 5, 16, 6),
    quit_date: null,
    daily_plan: 0,
    plan_history: null,
    day_overrides: null,
};

const carRow = {
    id: 'car-1',
    fleet_id: 'fleet-1',
    name: 'Hongqi EQM5',
    license_plate: '01 A 001 AA',
    assigned_driver_id: 'driver-1',
    daily_plan: 500_000,
    is_deleted: false,
    in_repair: false,
    plan_history: null,
    day_overrides: null,
};

describe('daily-plan-debt-reminder Netlify function', () => {
    it('exposes the 22:00 Tashkent schedule to Netlify', () => {
        expect(dailyPlanDebtReminderConfig).toMatchObject({ schedule: '0 17 * * *' });
    });

    it('returns a clear error when required server env vars are missing', async () => {
        const previousEnv = {
            SUPABASE_URL: process.env.SUPABASE_URL,
            SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
            TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
        };
        delete process.env.SUPABASE_URL;
        delete process.env.SUPABASE_SERVICE_ROLE_KEY;
        delete process.env.TELEGRAM_BOT_TOKEN;

        const result = await dailyPlanDebtReminderHandler();

        expect(result.statusCode).toBe(500);
        expect(result.body).toContain('SUPABASE_URL');
        expect(result.body).toContain('SUPABASE_SERVICE_ROLE_KEY');
        expect(result.body).toContain('TELEGRAM_BOT_TOKEN');

        for (const [key, value] of Object.entries(previousEnv)) {
            if (value === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = value;
            }
        }
    });

    it('sends a Telegram reminder and logs notification for a linked driver with debt', async () => {
        const inserts: InsertRecord[] = [];
        const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
        const supabase = createSupabaseMock({
            drivers: [driverRow],
            cars: [carRow],
            transactions: [],
            notifications: [],
        }, inserts);

        const result = await runDailyPlanDebtReminder({
            supabase,
            fetchImpl,
            botToken: 'bot-token',
            now: new Date('2026-06-16T17:00:00.000Z'),
        });

        expect(result).toMatchObject({ sent: 1, skipped: 0 });
        expect(fetchImpl).toHaveBeenCalledWith(
            'https://api.telegram.org/botbot-token/sendMessage',
            expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('"chat_id":"12345"'),
            }),
        );
        expect(fetchImpl.mock.calls[0][1].body).toContain('Qarz');
        expect(inserts.find(row => row.table === 'notifications')?.payload).toMatchObject({
            fleet_id: 'fleet-1',
            type: 'payment_reminder',
            category: 'payment_reminder',
            priority: 'high',
            target_users: 'role:admin',
            delivery_tracking: {
                reminderType: 'telegram_daily_debt',
                driverId: 'driver-1',
                localDateKey: '2026-06-16',
                totalDebt: 500_000,
                unpaidDayCount: 1,
            },
        });
    });

    it('skips drivers with zero debt or no Telegram link', async () => {
        const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
        const supabase = createSupabaseMock({
            drivers: [
                driverRow,
                { ...driverRow, id: 'driver-2', telegram: null },
            ],
            cars: [carRow, { ...carRow, id: 'car-2', assigned_driver_id: 'driver-2' }],
            transactions: [{
                id: 'tx-1',
                driver_id: 'driver-1',
                amount: 500_000,
                type: 'INCOME',
                status: 'ACTIVE',
                timestamp_ms: Date.UTC(2026, 5, 16, 8),
                category: null,
            }],
            notifications: [],
        });

        const result = await runDailyPlanDebtReminder({
            supabase,
            fetchImpl,
            botToken: 'bot-token',
            now: new Date('2026-06-16T17:00:00.000Z'),
        });

        expect(result.sent).toBe(0);
        expect(fetchImpl).not.toHaveBeenCalled();
    });

    it('does not double-send when a same-day notification log already exists', async () => {
        const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
        const supabase = createSupabaseMock({
            drivers: [driverRow],
            cars: [carRow],
            transactions: [],
            notifications: [{
                id: 'notif-1',
                created_ms: Date.UTC(2026, 5, 16, 17),
                delivery_tracking: {
                    reminderType: 'telegram_daily_debt',
                    driverId: 'driver-1',
                    fleetId: 'fleet-1',
                    localDateKey: '2026-06-16',
                },
            }],
        });

        const result = await runDailyPlanDebtReminder({
            supabase,
            fetchImpl,
            botToken: 'bot-token',
            now: new Date('2026-06-16T17:00:00.000Z'),
        });

        expect(result).toMatchObject({ sent: 0, skipped: 1 });
        expect(fetchImpl).not.toHaveBeenCalled();
    });

    it('skips drivers who quit before the reminder day', async () => {
        const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
        const supabase = createSupabaseMock({
            drivers: [{ ...driverRow, quit_date: Date.UTC(2026, 5, 15, 6) }],
            cars: [carRow],
            transactions: [],
            notifications: [],
        });

        const result = await runDailyPlanDebtReminder({
            supabase,
            fetchImpl,
            botToken: 'bot-token',
            now: new Date('2026-06-16T17:00:00.000Z'),
        });

        expect(result.sent).toBe(0);
        expect(fetchImpl).not.toHaveBeenCalled();
    });
});

describe('send-driver-telegram-message Netlify function', () => {
    it('sends a custom dashboard message to the selected driver', async () => {
        const inserts: InsertRecord[] = [];
        const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
        const supabase = createSupabaseMock({ drivers: [driverRow], notifications: [] }, inserts);

        const result = await sendDriverTelegramMessage({
            supabase,
            fetchImpl,
            botToken: 'bot-token',
            fleetId: 'fleet-1',
            driverId: 'driver-1',
            message: 'Bugun avvalroq tolov qiling.',
            now: new Date('2026-06-16T12:00:00.000Z'),
        });

        expect(result).toMatchObject({ ok: true });
        expect(fetchImpl.mock.calls[0][1].body).toContain('Taksapark xabari');
        expect(fetchImpl.mock.calls[0][1].body).toContain('Bugun avvalroq tolov qiling.');
        expect(inserts.find(row => row.table === 'notifications')?.payload.delivery_tracking).toMatchObject({
            reminderType: 'telegram_custom_driver_message',
            driverId: 'driver-1',
            telegramId: '12345',
        });
    });

    it('rejects custom messages for drivers without Telegram', async () => {
        const fetchImpl = vi.fn();
        const supabase = createSupabaseMock({
            drivers: [{ ...driverRow, telegram: null }],
            notifications: [],
        });

        const result = await sendDriverTelegramMessage({
            supabase,
            fetchImpl,
            botToken: 'bot-token',
            fleetId: 'fleet-1',
            driverId: 'driver-1',
            message: 'Test',
        });

        expect(result).toMatchObject({ ok: false, status: 400 });
        expect(fetchImpl).not.toHaveBeenCalled();
    });
});
