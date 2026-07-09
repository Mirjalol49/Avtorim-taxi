import { describe, expect, it } from 'vitest';
import { buildDailyPlanDebtReminders, formatDailyPlanDebtMessage } from '../src/features/telegram/dailyPlanDebtReminder';
import { DriverStatus, TransactionType } from '../src/core/types';

const baseDriver = {
    id: 'driver-1',
    name: 'Ali Valiyev',
    phone: '+998 90 000 00 00',
    licensePlate: '',
    carModel: '',
    status: DriverStatus.ACTIVE,
    dailyPlan: 0,
    monthlySalary: 0,
    avatar: '',
    telegram: '12345',
    location: { lat: 0, lng: 0, heading: 0 },
    balance: 0,
    rating: 5,
    isDeleted: false,
    startDate: Date.UTC(2026, 5, 16, 6),
    fleetId: 'fleet-1',
};

const baseCar = {
    id: 'car-1',
    name: 'Hongqi EQM5',
    licensePlate: '01 A 001 AA',
    assignedDriverId: 'driver-1',
    dailyPlan: 500_000,
    isDeleted: false,
};

describe('buildDailyPlanDebtReminders', () => {
    it('does not count today as debt before the 22:00 Tashkent deadline', () => {
        const reminders = buildDailyPlanDebtReminders(
            [baseDriver as any],
            [baseCar as any],
            [],
            new Date('2026-06-16T16:59:00.000Z'),
        );

        expect(reminders).toHaveLength(0);
    });

    it('counts today as debt at the 22:00 Tashkent deadline', () => {
        const reminders = buildDailyPlanDebtReminders(
            [baseDriver as any],
            [baseCar as any],
            [],
            new Date('2026-06-16T17:00:00.000Z'),
        );

        expect(reminders).toHaveLength(1);
        expect(reminders[0]).toMatchObject({
            driverId: 'driver-1',
            telegramId: '12345',
            totalDebt: 500_000,
            unpaidDayCount: 1,
        });
        expect(reminders[0].unpaidDays[0]).toMatchObject({
            dateKey: '2026-06-16',
            expected: 500_000,
            paid: 0,
            remaining: 500_000,
        });
    });

    it('allocates later payments oldest-first across unpaid days', () => {
        const driver = {
            ...baseDriver,
            startDate: Date.UTC(2026, 5, 14, 6),
        };

        const reminders = buildDailyPlanDebtReminders(
            [driver as any],
            [baseCar as any],
            [
                {
                    id: 'tx-1',
                    driverId: 'driver-1',
                    amount: 700_000,
                    type: TransactionType.INCOME,
                    timestamp: Date.UTC(2026, 5, 16, 8),
                    description: 'later payment',
                },
            ] as any,
            new Date('2026-06-16T17:00:00.000Z'),
        );

        expect(reminders[0].totalDebt).toBe(800_000);
        expect(reminders[0].unpaidDays.map(day => ({
            dateKey: day.dateKey,
            paid: day.paid,
            remaining: day.remaining,
        }))).toEqual([
            { dateKey: '2026-06-15', paid: 200_000, remaining: 300_000 },
            { dateKey: '2026-06-16', paid: 0, remaining: 500_000 },
        ]);
    });

    it('skips day-off/not-working days and ignores deposit movements as plan payments', () => {
        const driver = {
            ...baseDriver,
            startDate: Date.UTC(2026, 5, 15, 6),
        };

        const reminders = buildDailyPlanDebtReminders(
            [driver as any],
            [baseCar as any],
            [
                {
                    id: 'day-off',
                    driverId: 'driver-1',
                    amount: 0,
                    type: TransactionType.DAY_OFF,
                    timestamp: Date.UTC(2026, 5, 15, 8),
                    description: 'off',
                },
                {
                    id: 'deposit-topup',
                    driverId: 'driver-1',
                    amount: 500_000,
                    type: TransactionType.INCOME,
                    category: 'deposit_topup',
                    timestamp: Date.UTC(2026, 5, 16, 8),
                    description: 'deposit topup',
                },
                {
                    id: 'initial-deposit',
                    driverId: 'driver-1',
                    amount: 500_000,
                    type: TransactionType.INCOME,
                    category: 'DEPOSIT',
                    timestamp: Date.UTC(2026, 5, 16, 8),
                    description: 'initial deposit',
                },
            ] as any,
            new Date('2026-06-16T17:00:00.000Z'),
        );

        expect(reminders[0].totalDebt).toBe(500_000);
        expect(reminders[0].unpaidDays).toHaveLength(1);
        expect(reminders[0].unpaidDays[0].dateKey).toBe('2026-06-16');
    });

    it('skips drivers who quit before the reminder day', () => {
        const driver = {
            ...baseDriver,
            startDate: Date.UTC(2026, 5, 14, 6),
            quitDate: Date.UTC(2026, 5, 15, 6),
        };

        const reminders = buildDailyPlanDebtReminders(
            [driver as any],
            [baseCar as any],
            [],
            new Date('2026-06-16T17:00:00.000Z'),
        );

        expect(reminders).toHaveLength(0);
    });
});

describe('formatDailyPlanDebtMessage', () => {
    it('formats a clean Telegram reminder with total debt and unpaid days', () => {
        const message = formatDailyPlanDebtMessage({
            driverId: 'driver-1',
            driverName: 'Ali Valiyev',
            telegramId: '12345',
            fleetId: 'fleet-1',
            localDateKey: '2026-06-16',
            totalDebt: 800_000,
            unpaidDayCount: 2,
            unpaidDays: [
                { dateKey: '2026-06-15', expected: 500_000, paid: 200_000, remaining: 300_000 },
                { dateKey: '2026-06-16', expected: 500_000, paid: 0, remaining: 500_000 },
            ],
        });

        expect(message).toContain('Assalomu alaykum, Ali Valiyev 👋');
        expect(message).toContain("💰 Qarz: 800 000 UZS");
        expect(message).toContain("📅 To'lanmagan kunlar: 2");
        expect(message).toContain('15.06.2026 — 300 000 UZS');
    });
});
