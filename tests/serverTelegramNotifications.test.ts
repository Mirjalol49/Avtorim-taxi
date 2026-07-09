import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);

function loadTelegramService() {
    const filename = path.resolve(process.cwd(), 'server/telegramService.js');
    const source = fs.readFileSync(filename, 'utf8');
    const module = { exports: {} as any };
    const mocks: Record<string, unknown> = {
        'node-cron': { schedule: vi.fn() },
        telegraf: {
            Telegraf: vi.fn(function () {
                return {
                    telegram: { sendMessage: vi.fn() },
                    use: vi.fn(),
                    start: vi.fn(),
                    action: vi.fn(),
                    on: vi.fn(),
                    launch: vi.fn(),
                    stop: vi.fn(),
                };
            }),
            Markup: {
                keyboard: vi.fn(() => ({})),
                button: { callback: vi.fn((label, value) => ({ label, value })) },
                inlineKeyboard: vi.fn(() => ({})),
            },
        },
    };
    const localRequire = (id: string) => (id in mocks ? mocks[id] : require(id));
    const run = new Function('require', 'module', 'exports', '__dirname', '__filename', source);
    run(localRequire, module, module.exports, path.dirname(filename), filename);
    return module.exports;
}

const TelegramService = loadTelegramService();

function makeInsertBuilder(table: string, payload: unknown, inserts: Array<{ table: string; payload: any }>) {
    inserts.push({ table, payload });
    return {
        select: () => ({
            single: async () => ({ data: { id: 'tx-1' }, error: null }),
        }),
        then: (resolve: (value: { data: null; error: null }) => unknown) =>
            Promise.resolve({ data: null, error: null }).then(resolve),
    };
}

describe('server Telegram transaction notifications', () => {
    it('creates a bell notification when a bot transaction is saved', async () => {
        const inserts: Array<{ table: string; payload: any }> = [];
        const service = Object.create(TelegramService.prototype);
        service.db = {
            from: (table: string) => ({
                insert: (payload: unknown) => makeInsertBuilder(table, payload, inserts),
            }),
        };
        service.updateSession = vi.fn().mockResolvedValue(undefined);
        service.getMainMenu = vi.fn().mockResolvedValue({});
        service.notifyAdminOfBotTransaction = vi.fn().mockResolvedValue(undefined);

        const ctx = { safeReply: vi.fn().mockResolvedValue(undefined) };
        const driver = {
            path: 'drivers/driver-1',
            data: {
                id: 'driver-1',
                name: 'Ali Valiyev',
                fleet_id: 'fleet-1',
            },
        };

        await service.saveTransaction(
            ctx,
            12345,
            driver,
            250000,
            'INCOME',
            'Telegram chek',
            'uz',
            { saved_income: 'ok {amount}', saved_expense: 'no', error_generic: 'err' },
        );

        const notificationInsert = inserts.find(insert => insert.table === 'notifications');
        expect(notificationInsert).toBeTruthy();
        expect(notificationInsert?.payload).toMatchObject({
            fleet_id: 'fleet-1',
            type: 'payment_reminder',
            category: 'payment_reminder',
            priority: 'high',
            target_users: 'role:admin',
            created_by_name: 'Telegram Bot',
            delivery_tracking: {
                driverId: 'driver-1',
                driverName: 'Ali Valiyev',
                amount: 250000,
                notificationKind: 'transaction',
                txType: 'income',
                source: 'telegram_bot',
            },
        });
    });
});
