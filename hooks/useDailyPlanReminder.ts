/**
 * useDailyPlanReminder
 *
 * Fires once per day at 22:00 (local time).
 * For every active driver who hasn't hit today's daily plan,
 * sends an individual high-priority notification with their avatar.
 *
 * Dedup: localStorage key `daily_plan_reminder_YYYY-MM-DD` stores a
 * JSON array of driver IDs already notified today.
 */

import { useEffect, useRef } from 'react';
import { useInterval } from './useInterval';
import { Driver } from '../src/core/types/driver.types';
import { Car } from '../src/core/types/car.types';
import { Transaction, TransactionType, PaymentStatus } from '../src/core/types/transaction.types';
import { NotificationCategory, NotificationPriority } from '../src/core/types/notification.types';
import { sendNotification } from '../services/notificationService';

const STORAGE_KEY_PREFIX = 'daily_plan_reminder_';

const todayDateKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const todayDisplayStr = () => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
};

const isPastTenPM = (): boolean => new Date().getHours() >= 22;

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
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === todayKey;
        })
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
};

const getSentDriverIds = (dateKey: string): Set<string> => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_PREFIX + dateKey);
        return new Set<string>(raw ? JSON.parse(raw) : []);
    } catch {
        return new Set<string>();
    }
};

const markDriverSent = (dateKey: string, driverId: string) => {
    const ids = getSentDriverIds(dateKey);
    ids.add(driverId);
    localStorage.setItem(STORAGE_KEY_PREFIX + dateKey, JSON.stringify([...ids]));
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
        if (!isPastTenPM()) return;

        const { drivers, cars, transactions, adminUserId: aId, adminUserName: aName } = dataRef.current;
        const today = todayDateKey();
        const dateDisplay = todayDisplayStr();
        const alreadySent = getSentDriverIds(today);

        const activeDrivers = drivers.filter(d => !d.isDeleted && d.status === 'ACTIVE');

        for (const driver of activeDrivers) {
            if (alreadySent.has(driver.id)) continue;

            const car = cars.find(c => c.assignedDriverId === driver.id) ?? null;
            const dailyPlan = (car?.dailyPlan ?? 0) > 0
                ? (car!.dailyPlan as number)
                : ((driver as any).dailyPlan ?? 0) as number;

            if (dailyPlan <= 0) continue;

            const todayIncome = getTodayIncome(driver.id, transactions);
            if (todayIncome >= dailyPlan) continue;

            try {
                await sendNotification(
                    {
                        title: `🌙 ${driver.name} — ${dateDisplay}`,
                        message: `${driver.name} did not fulfill ${dateDisplay} daily plan`,
                        type: 'payment_reminder',
                        category: NotificationCategory.PAYMENT_REMINDER,
                        priority: NotificationPriority.HIGH,
                        targetUsers: 'role:admin',
                        expiresIn: 12 * 60 * 60 * 1000,
                        driverAvatar: driver.avatar || undefined,
                        driverId: driver.id,
                    },
                    aId,
                    aName
                );
                markDriverSent(today, driver.id);
            } catch (err) {
                console.error('[DailyPlanReminder] Failed to send notification for driver:', driver.name, err);
            }
        }
    };

    useInterval(fire, 60 * 1000);

    useEffect(() => {
        fire();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, adminUserId]);
};
