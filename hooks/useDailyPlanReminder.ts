/**
 * useDailyPlanReminder
 *
 * Fires once every day at exactly 22:00 (local time).
 * Checks each active driver's today income versus their daily plan.
 * For every driver who hasn't hit today's plan, sends a high-priority
 * notification through the existing notification service.
 *
 * Deduplication: We store "YYYY-MM-DD" in localStorage so the reminder
 * only fires once per calendar day even if the page is reloaded.
 */

import { useEffect, useRef } from 'react';
import { useInterval } from './useInterval';
import { Driver } from '../src/core/types/driver.types';
import { Car } from '../src/core/types/car.types';
import { Transaction, TransactionType, PaymentStatus } from '../src/core/types/transaction.types';
import { NotificationCategory, NotificationPriority } from '../src/core/types/notification.types';
import { sendNotification } from '../services/notificationService';



const STORAGE_KEY = 'daily_plan_reminder_sent';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtUZS = (n: number) =>
    new Intl.NumberFormat('uz-UZ').format(Math.round(n));

const todayDateKey = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

/** Check if it's currently past 10 PM (22:00) */
const isPastTenPM = (): boolean => {
    const now = new Date();
    return now.getHours() >= 22;
};

/** Returns today's income for a driver */
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

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseDailyPlanReminderOptions {
    drivers: Driver[];
    cars: Car[];
    transactions: Transaction[];
    adminUserId: string;
    adminUserName: string;
    enabled: boolean; // only run when the user is admin
}

export const useDailyPlanReminder = ({
    drivers,
    cars,
    transactions,
    adminUserId,
    adminUserName,
    enabled,
}: UseDailyPlanReminderOptions) => {
    // Keep up-to-date data in a ref so the timeout closure always sees fresh data
    const dataRef = useRef({ drivers, cars, transactions, daysOff, adminUserId, adminUserName });
    useEffect(() => {
        dataRef.current = { drivers, cars, transactions, daysOff, adminUserId, adminUserName };
    });

    const fire = async () => {
        if (!enabled || !adminUserId) return;

        const { drivers, cars, transactions, daysOff, adminUserId: aId, adminUserName: aName } = dataRef.current;

        const today = todayDateKey();
        const lastSent = localStorage.getItem(STORAGE_KEY);
        
        // Only run if it's past 10 PM and we haven't sent it today
        if (!isPastTenPM() || lastSent === today) {
            return;
        }

        // ── Analyze drivers ──────────────────
        const activeDrivers = drivers.filter(d => !d.isDeleted && d.status === 'ACTIVE');
        
        const behindDrivers: any[] = [];
        const completedDrivers: any[] = [];

        activeDrivers.forEach(d => {
            const car = cars.find(c => c.assignedDriverId === d.id) ?? null;
            const dailyPlan = (car?.dailyPlan ?? 0) > 0
                ? (car!.dailyPlan as number)
                : ((d as any).dailyPlan ?? 0) as number;

            if (dailyPlan <= 0) return; // no plan set

            const todayIncome = getTodayIncome(d.id, transactions);
            const missing = dailyPlan - todayIncome;
            
            if (missing <= 0) {
                completedDrivers.push({ driver: d, dailyPlan, todayIncome });
            } else {
                behindDrivers.push({ driver: d, dailyPlan, todayIncome, missing });
            }
        });

        // ── Send Notification ──────────────────
        const MONTHS_UZ = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];
        const now = new Date();
        const dateStr = `${now.getDate()} ${MONTHS_UZ[now.getMonth()]} ${now.getFullYear()}`;

        try {
            const behindCount = behindDrivers.length;
            
            if (behindCount === 0) {
                localStorage.setItem(STORAGE_KEY, today);
                return;
            }

            const driverLines = behindDrivers
                .map((bd, i) => `${i + 1}. ${bd.driver.name} — ${fmtUZS(bd.missing)} UZS qoldi`)
                .join('\n');
            const message = `Bugun ${behindCount} ta haydovchi kunlik rejani bajarmadi:\n\n${driverLines}`;

            await sendNotification(
                {
                    title: `🌙 Kechki reja hisoboti — ${dateStr}`,
                    message,
                    type: 'payment_reminder',
                    category: NotificationCategory.PAYMENT_REMINDER,
                    priority: behindCount > 0 ? NotificationPriority.HIGH : NotificationPriority.NORMAL,
                    targetUsers: 'role:admin',
                    expiresIn: 12 * 60 * 60 * 1000, // expires in 12 hours
                },
                aId,
                aName
            );

            localStorage.setItem(STORAGE_KEY, today);
        } catch (err) {
            console.error('[DailyPlanReminder] Failed to send notification:', err);
        }
    };

    // Run interval every 1 minute
    useInterval(fire, 60 * 1000);

    // Also run once on mount in case it's already past 10 PM
    useEffect(() => {
        fire();
    }, [enabled, adminUserId]);
};
