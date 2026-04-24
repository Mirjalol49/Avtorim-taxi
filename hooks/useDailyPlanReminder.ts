/**
 * useDailyPlanReminder
 *
 * Checks every minute. Fires reminders at 18:00 (early warning) and 22:00
 * (final warning) for drivers who haven't met their daily plan.
 *
 * Rules:
 *  - Driver has a day-off transaction today → skipped
 *  - Driver paid ≥ dailyPlan → skipped
 *  - Driver paid 0 → shows full plan remaining
 *  - Driver paid partial → shows exact remaining amount
 *
 * Dedup: localStorage `daily_plan_reminder_YYYY-MM-DD_HH` per driver per hour-slot.
 */

import { useEffect, useRef } from 'react';
import { useInterval } from './useInterval';
import { Driver } from '../src/core/types/driver.types';
import { Car } from '../src/core/types/car.types';
import { Transaction, TransactionType, PaymentStatus } from '../src/core/types/transaction.types';
import { NotificationCategory, NotificationPriority } from '../src/core/types/notification.types';
import { sendNotification } from '../services/notificationService';

const STORAGE_KEY_PREFIX = 'daily_plan_reminder_';

const fmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n));

const todayDateKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const todayDisplayStr = () => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
};

// Fire at 18:00 (early warning) and 22:00 (final reminder)
const getReminderSlot = (): string | null => {
    const h = new Date().getHours();
    if (h >= 18 && h < 19) return '18';
    if (h >= 22 && h < 23) return '22';
    return null;
};

const getTodayIncome = (driverId: string, transactions: Transaction[]): number => {
    const todayKey = todayDateKey();
    return transactions
        .filter(tx =>
            tx.driverId === driverId &&
            tx.type === TransactionType.INCOME &&
            tx.status !== PaymentStatus.DELETED &&
            (tx as any).status !== 'DELETED'
        )
        .filter(tx => {
            const d = new Date(tx.timestamp);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            return key === todayKey;
        })
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
};

const hasDayOffToday = (driverId: string, transactions: Transaction[]): boolean => {
    const todayKey = todayDateKey();
    return transactions.some(tx => {
        if (tx.driverId !== driverId) return false;
        if ((tx.type as string) !== 'DAY_OFF') return false;
        if (tx.status === PaymentStatus.DELETED || (tx as any).status === 'DELETED') return false;
        const d = new Date(tx.timestamp);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return key === todayKey;
    });
};

const getStorageKey = (dateKey: string, slot: string) =>
    `${STORAGE_KEY_PREFIX}${dateKey}_${slot}`;

const getSentDriverIds = (dateKey: string, slot: string): Set<string> => {
    try {
        const raw = localStorage.getItem(getStorageKey(dateKey, slot));
        return new Set<string>(raw ? JSON.parse(raw) : []);
    } catch {
        return new Set<string>();
    }
};

const markDriverSent = (dateKey: string, slot: string, driverId: string) => {
    const ids = getSentDriverIds(dateKey, slot);
    ids.add(driverId);
    localStorage.setItem(getStorageKey(dateKey, slot), JSON.stringify([...ids]));
};

interface UseDailyPlanReminderOptions {
    drivers: Driver[];
    cars: Car[];
    transactions: Transaction[];
    adminUserId: string;
    adminUserName: string;
    enabled: boolean;
}

export const useDailyPlanReminder = ({
    drivers,
    cars,
    transactions,
    adminUserId,
    adminUserName,
    enabled,
}: UseDailyPlanReminderOptions) => {
    const dataRef = useRef({ drivers, cars, transactions, adminUserId, adminUserName });
    useEffect(() => {
        dataRef.current = { drivers, cars, transactions, adminUserId, adminUserName };
    });

    const fire = async () => {
        if (!enabled || !adminUserId) return;

        const slot = getReminderSlot();
        if (!slot) return;

        const { drivers, cars, transactions, adminUserId: aId, adminUserName: aName } = dataRef.current;
        const today = todayDateKey();
        const dateDisplay = todayDisplayStr();
        const alreadySent = getSentDriverIds(today, slot);
        const isFinal = slot === '22';

        const activeDrivers = drivers.filter(d => !d.isDeleted);

        for (const driver of activeDrivers) {
            if (alreadySent.has(driver.id)) continue;

            // Skip drivers on day off
            if (hasDayOffToday(driver.id, transactions)) continue;

            const car = cars.find(c => c.assignedDriverId === driver.id) ?? null;
            const dailyPlan = (car?.dailyPlan ?? 0) > 0
                ? (car!.dailyPlan as number)
                : ((driver as any).dailyPlan ?? 0) as number;

            if (dailyPlan <= 0) continue;

            const todayIncome = getTodayIncome(driver.id, transactions);
            if (todayIncome >= dailyPlan) continue;

            const remaining = dailyPlan - todayIncome;
            const paidPct = Math.round((todayIncome / dailyPlan) * 100);
            const slotLabel = isFinal ? '🔴 Yakuniy eslatma' : '🟡 Ogohlantirish';

            try {
                await sendNotification(
                    {
                        title: `${driver.name} — ${fmt(remaining)} UZS qoldi`,
                        message: `${dateDisplay} · Reja: ${fmt(dailyPlan)} UZS · To'langan: ${fmt(todayIncome)} UZS · Qoldi: ${fmt(remaining)} UZS`,
                        type: 'payment_reminder',
                        category: NotificationCategory.PAYMENT_REMINDER,
                        priority: isFinal ? NotificationPriority.HIGH : NotificationPriority.MEDIUM,
                        targetUsers: 'role:admin',
                        expiresIn: 14 * 60 * 60 * 1000, // 14 h
                        driverAvatar: driver.avatar || undefined,
                        driverId: driver.id,
                        extraTracking: {
                            reminderType: 'daily_plan',
                            driverName: driver.name,
                            dailyPlan,
                            todayIncome,
                            remaining,
                            paidPct,
                            dateDisplay,
                            slot: slotLabel,
                            isFinal,
                        },
                    },
                    aId,
                    aName
                );
                markDriverSent(today, slot, driver.id);
            } catch (err) {
                console.error('[DailyPlanReminder] Failed for driver:', driver.name, err);
            }
        }
    };

    useInterval(fire, 60 * 1000);

    useEffect(() => {
        fire();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, adminUserId]);
};
