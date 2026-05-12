/**
 * useDailyPlanReminder
 *
 * Checks every minute. Fires ONE reminder at 22:00 for drivers who
 * haven't met their daily plan.
 *
 * Rules:
 *  - Driver has a day-off transaction today → skipped
 *  - Driver paid ≥ dailyPlan → skipped
 *  - Driver paid 0 → shows full plan remaining
 *  - Driver paid partial → shows exact remaining amount
 *
 * Dedup: localStorage `daily_plan_reminder_YYYY-MM-DD_22` per driver.
 */

import { useEffect, useRef } from 'react';
import { useInterval } from './useInterval';
import { Driver } from '../src/core/types/driver.types';
import { Car } from '../src/core/types/car.types';
import { Transaction, TransactionType, PaymentStatus } from '../src/core/types/transaction.types';
import { NotificationCategory, NotificationPriority } from '../src/core/types/notification.types';
import { sendNotification } from '../services/notificationService';
import { supabase } from '../supabase';

const STORAGE_KEY_PREFIX = 'daily_plan_reminder_';

/**
 * Module-level in-memory dedup set.
 * Survives re-renders within a session. Cleared only on full page reload.
 * Key format: `YYYY-MM-DD_22_driverId`
 */
const SESSION_SENT = new Set<string>();

const fmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n));

const todayDateKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const todayDisplayStr = () => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
};

// Fire only at 22:00 — single end-of-day warning
const getReminderSlot = (): string | null => {
    const h = new Date().getHours();
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
    const sessionKey = `${dateKey}_${slot}_${driverId}`;
    SESSION_SENT.add(sessionKey);
    try {
        const ids = getSentDriverIds(dateKey, slot);
        ids.add(driverId);
        localStorage.setItem(getStorageKey(dateKey, slot), JSON.stringify([...ids]));
    } catch {
        // localStorage may be unavailable — session dedup still protects us
    }
};

const isAlreadySent = (dateKey: string, slot: string, driverId: string): boolean => {
    // Check in-memory first (fastest, most reliable within a session)
    if (SESSION_SENT.has(`${dateKey}_${slot}_${driverId}`)) return true;
    // Then check localStorage (survives page reload)
    return getSentDriverIds(dateKey, slot).has(driverId);
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
    const isFiringRef = useRef(false);

    useEffect(() => {
        dataRef.current = { drivers, cars, transactions, adminUserId, adminUserName };
    });

    const fire = async () => {
        if (!enabled || !adminUserId) return;
        // Prevent concurrent executions (race condition guard)
        if (isFiringRef.current) return;
        isFiringRef.current = true;

        try {
            const slot = getReminderSlot();
            if (!slot) return;

            const { drivers, cars, transactions, adminUserId: aId, adminUserName: aName } = dataRef.current;
            const today = todayDateKey();
            const dateDisplay = todayDisplayStr();
            const activeDrivers = drivers.filter(d => !d.isDeleted);

            // Build the list of drivers that need reminders
            type Eligible = {
                driver: Driver;
                car: Car | null;
                dailyPlan: number;
                todayIncome: number;
                remaining: number;
                paidPct: number;
            };
            const eligible: Eligible[] = [];

            for (const driver of activeDrivers) {
                // Double-guard: session memory + localStorage
                if (isAlreadySent(today, slot, driver.id)) continue;
                if (hasDayOffToday(driver.id, transactions)) continue;

                const car = cars.find(c => c.assignedDriverId === driver.id) ?? null;
                const dailyPlan = (car?.dailyPlan ?? 0) > 0
                    ? (car!.dailyPlan as number)
                    : ((driver as any).dailyPlan ?? 0) as number;

                if (dailyPlan <= 0) continue;

                const todayIncome = getTodayIncome(driver.id, transactions);
                if (todayIncome >= dailyPlan) continue;

                eligible.push({
                    driver,
                    car,
                    dailyPlan,
                    todayIncome,
                    remaining: dailyPlan - todayIncome,
                    paidPct: Math.round((todayIncome / dailyPlan) * 100),
                });
            }

            if (eligible.length === 0) return;

            // Pre-mark ALL eligible drivers synchronously before any async work.
            // This prevents a second concurrent fire() from sending duplicates within the same tab.
            for (const { driver } of eligible) {
                markDriverSent(today, slot, driver.id);
            }

            // Server-side dedup: check which drivers already have a daily_plan reminder in DB for today.
            // This prevents multi-tab/multi-device sends (localStorage is per-browser, DB is shared).
            const todayStartMs = new Date().setHours(0, 0, 0, 0);
            const { data: existing } = await supabase
                .from('notifications')
                .select('delivery_tracking')
                .eq('fleet_id', aId)
                .eq('type', 'payment_reminder')
                .gte('created_ms', todayStartMs);

            const alreadySentInDb = new Set<string>(
                (existing ?? [])
                    .filter((r: any) => r.delivery_tracking?.reminderType === 'daily_plan')
                    .map((r: any) => r.delivery_tracking?.driverId as string | undefined)
                    .filter(Boolean) as string[]
            );

            // Now send notifications only for drivers not already in DB for today
            for (const { driver, car, dailyPlan, todayIncome, remaining, paidPct } of eligible) {
                if (alreadySentInDb.has(driver.id)) continue; // server-side guard
                try {
                    await sendNotification(
                        {
                            title: `${driver.name} — ${fmt(remaining)} UZS qoldi`,
                            message: `${dateDisplay} · Reja: ${fmt(dailyPlan)} · To'langan: ${fmt(todayIncome)} · Qoldi: ${fmt(remaining)} UZS`,
                            type: 'payment_reminder',
                            category: NotificationCategory.PAYMENT_REMINDER,
                            priority: NotificationPriority.HIGH,
                            targetUsers: 'role:admin',
                            expiresIn: 14 * 60 * 60 * 1000,
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
                                isFinal: true,
                                carName: car?.name ?? null,
                                carPlate: car?.licensePlate ?? null,
                            },
                        },
                        aId,
                        aName
                    );
                } catch {
                    // per-driver notification failure should not stop the loop
                }
            }
        } finally {
            isFiringRef.current = false;
        }
    };

    useInterval(fire, 60 * 1000);

    // Run once on mount only — NOT on every prop change.
    // useInterval handles subsequent checks every minute.
    const hasFiredOnMount = useRef(false);
    useEffect(() => {
        if (hasFiredOnMount.current) return;
        hasFiredOnMount.current = true;
        if (enabled && adminUserId) fire();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
};
