import { Car, Driver, PaymentStatus, Transaction, TransactionType } from '../../core/types';
import { isDriverWorkingOnDate } from '../drivers/utils/driverLifecycle';
import { getCarIdForDriverDate, getEffectivePlanForDriverDay } from '../drivers/utils/driverPlanHistory';

const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface DailyPlanDebtDay {
    dateKey: string;
    expected: number;
    paid: number;
    remaining: number;
}

export interface DailyPlanDebtReminder {
    driverId: string;
    driverName: string;
    telegramId: string;
    fleetId: string | null;
    localDateKey: string;
    totalDebt: number;
    unpaidDayCount: number;
    unpaidDays: DailyPlanDebtDay[];
}

const fmt = (value: number) => new Intl.NumberFormat('uz-UZ')
    .format(Math.round(value))
    .replace(/[\s\u00A0]+/g, ' ')
    .replace(/,/g, ' ');

export function toTashkentDateKey(value: Date | number): string {
    const ms = value instanceof Date ? value.getTime() : value;
    const local = new Date(ms + TASHKENT_OFFSET_MS);
    return [
        local.getUTCFullYear(),
        String(local.getUTCMonth() + 1).padStart(2, '0'),
        String(local.getUTCDate()).padStart(2, '0'),
    ].join('-');
}

function getTashkentHour(value: Date): number {
    return new Date(value.getTime() + TASHKENT_OFFSET_MS).getUTCHours();
}

function dateFromKeyAtNoon(dateKey: string): Date {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12));
}

function addDays(dateKey: string, days: number): string {
    const date = dateFromKeyAtNoon(dateKey);
    date.setUTCDate(date.getUTCDate() + days);
    return toTashkentDateKey(date);
}

function previousDay(dateKey: string): string {
    return addDays(dateKey, -1);
}

function isInactive(tx: Transaction): boolean {
    return tx.status === PaymentStatus.DELETED ||
        tx.status === PaymentStatus.REVERSED ||
        tx.status === PaymentStatus.REFUNDED ||
        (tx as any).status === 'DELETED' ||
        (tx as any).status === 'REVERSED' ||
        (tx as any).status === 'REFUNDED';
}

function isRegularPlanIncome(tx: Transaction): boolean {
    return tx.type === TransactionType.INCOME &&
        !isInactive(tx) &&
        tx.category !== 'deposit_topup' &&
        (tx as any).category !== 'DEPOSIT';
}

function isDayOffTx(tx: Transaction): boolean {
    return (tx.type === TransactionType.DAY_OFF || tx.type === TransactionType.NOT_WORKING) &&
        tx.status !== PaymentStatus.DELETED &&
        (tx as any).status !== 'DELETED';
}

function resolveDriverCar(driver: Driver, date: Date, cars: Car[]): Car | null {
    const currentCar = cars.find(car => car.assignedDriverId === driver.id && !car.isDeleted) ?? null;
    const historicalCarId = getCarIdForDriverDate(driver, date, currentCar);
    return cars.find(car => car.id === historicalCarId && !car.isDeleted) ?? currentCar;
}

function getDriverStartKey(driver: Driver, transactions: Transaction[], now: Date): string {
    const driverStart = driver.startDate ?? driver.createdAt;
    if (driverStart) return toTashkentDateKey(driverStart);

    const earliestTx = transactions
        .filter(tx => tx.driverId === driver.id)
        .reduce<number | null>((earliest, tx) => earliest === null ? tx.timestamp : Math.min(earliest, tx.timestamp), null);

    return toTashkentDateKey(earliestTx ?? now.getTime());
}

export function buildDailyPlanDebtReminders(
    drivers: Driver[],
    cars: Car[],
    transactions: Transaction[],
    now: Date = new Date(),
): DailyPlanDebtReminder[] {
    const localTodayKey = toTashkentDateKey(now);
    const cutoffKey = getTashkentHour(now) >= 22 ? localTodayKey : previousDay(localTodayKey);
    const cutoffEndMs = now.getTime();

    return drivers
        .filter(driver => isDriverWorkingOnDate(driver, now))
        .map(driver => {
            const telegramId = (driver as any).telegram ? String((driver as any).telegram) : '';
            if (!telegramId) return null;

            const driverTxs = transactions.filter(tx => tx.driverId === driver.id);
            const startKey = getDriverStartKey(driver, driverTxs, now);
            if (startKey > cutoffKey) return null;

            const dayOffKeys = new Set(
                driverTxs
                    .filter(isDayOffTx)
                    .map(tx => toTashkentDateKey(tx.timestamp))
            );

            const expectedDays: Array<{ dateKey: string; expected: number }> = [];
            for (let key = startKey; key <= cutoffKey; key = addDays(key, 1)) {
                if (dayOffKeys.has(key)) continue;
                const date = dateFromKeyAtNoon(key);
                const car = resolveDriverCar(driver, date, cars);
                const expected = getEffectivePlanForDriverDay(driver, date, car);
                if (expected > 0) expectedDays.push({ dateKey: key, expected });
            }

            if (expectedDays.length === 0) return null;

            let availablePaid = driverTxs
                .filter(tx => tx.timestamp <= cutoffEndMs)
                .filter(isRegularPlanIncome)
                .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

            const unpaidDays: DailyPlanDebtDay[] = [];
            for (const day of expectedDays) {
                const paid = Math.min(day.expected, availablePaid);
                availablePaid = Math.max(0, availablePaid - paid);
                const remaining = Math.max(0, day.expected - paid);
                if (remaining > 0) {
                    unpaidDays.push({ ...day, paid, remaining });
                }
            }

            const totalDebt = unpaidDays.reduce((sum, day) => sum + day.remaining, 0);
            if (totalDebt <= 0) return null;

            return {
                driverId: driver.id,
                driverName: driver.name,
                telegramId,
                fleetId: (driver as any).fleetId ?? (driver as any).fleet_id ?? null,
                localDateKey: localTodayKey,
                totalDebt,
                unpaidDayCount: unpaidDays.length,
                unpaidDays,
            };
        })
        .filter(Boolean) as DailyPlanDebtReminder[];
}

function formatDisplayDate(dateKey: string): string {
    const [year, month, day] = dateKey.split('-');
    return `${day}.${month}.${year}`;
}

export function formatDailyPlanDebtMessage(reminder: DailyPlanDebtReminder): string {
    const visibleDays = reminder.unpaidDays.slice(0, 5);
    const dayLines = visibleDays.map(day => `${formatDisplayDate(day.dateKey)} — ${fmt(day.remaining)} UZS`);
    const hiddenCount = reminder.unpaidDays.length - visibleDays.length;
    if (hiddenCount > 0) dayLines.push(`Yana ${hiddenCount} kun...`);

    return [
        `Assalomu alaykum, ${reminder.driverName} 👋`,
        '',
        'Bugungi reja muddati tugadi.',
        `💰 Qarz: ${fmt(reminder.totalDebt)} UZS`,
        `📅 To'lanmagan kunlar: ${reminder.unpaidDayCount}`,
        '',
        ...dayLines,
        '',
        "Iltimos, qarzni imkon qadar tezroq yoping. Rahmat 🙏",
    ].join('\n');
}
