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
import { Driver } from '../src/core/types/driver.types';
import { Car } from '../src/core/types/car.types';
import { Transaction, TransactionType, PaymentStatus } from '../src/core/types/transaction.types';
import { NotificationCategory, NotificationPriority } from '../src/core/types/notification.types';
import { DayOff, getDaysOffSet } from '../services/daysOffService';
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

/** Milliseconds until next 22:00 local time */
const msUntilTenPM = (): number => {
    const now = new Date();
    const target = new Date(now);
    target.setHours(22, 0, 0, 0);
    if (target <= now) {
        // Already past 22:00 today → aim for tomorrow
        target.setDate(target.getDate() + 1);
    }
    return target.getTime() - now.getTime();
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
    daysOff: DayOff[];
    adminUserId: string;
    adminUserName: string;
    enabled: boolean; // only run when the user is admin
}

export const useDailyPlanReminder = ({
    drivers,
    cars,
    transactions,
    daysOff,
    adminUserId,
    adminUserName,
    enabled,
}: UseDailyPlanReminderOptions) => {
    // Keep up-to-date data in a ref so the timeout closure always sees fresh data
    const dataRef = useRef({ drivers, cars, transactions, daysOff, adminUserId, adminUserName });
    useEffect(() => {
        dataRef.current = { drivers, cars, transactions, daysOff, adminUserId, adminUserName };
    });

    useEffect(() => {
        if (!enabled || !adminUserId) return;

        let fireTimeout: ReturnType<typeof setTimeout>;
        let nextDayTimeout: ReturnType<typeof setTimeout>;

        const fire = async () => {
            const { drivers, cars, transactions, daysOff, adminUserId, adminUserName } =
                dataRef.current;

            const today = todayDateKey();

            // Deduplicate: only fire once per day
            const lastSent = localStorage.getItem(STORAGE_KEY);
            if (lastSent === today) {
                scheduleNextDay();
                return;
            }

            // ── Find drivers who haven't completed today's plan ──────────────────
            const behindDrivers = drivers
                .filter(d => !d.isDeleted && d.status === 'ACTIVE')
                .map(d => {
                    const car = cars.find(c => c.assignedDriverId === d.id) ?? null;
                    const dailyPlan = (car?.dailyPlan ?? 0) > 0
                        ? (car!.dailyPlan as number)
                        : ((d as any).dailyPlan ?? 0) as number;

                    if (dailyPlan <= 0) return null; // no plan set

                    // Check if today is a day off for this driver
                    const daysOffSet = getDaysOffSet(daysOff, d.id);
                    if (daysOffSet.has(today)) return null; // day off → skip

                    const todayIncome = getTodayIncome(d.id, transactions);
                    const missing = dailyPlan - todayIncome;
                    if (missing <= 0) return null; // done ✓

                    return { driver: d, dailyPlan, todayIncome, missing };
                })
                .filter(Boolean) as { driver: Driver; dailyPlan: number; todayIncome: number; missing: number }[];

            if (behindDrivers.length === 0) {
                // All drivers are done — still mark as sent
                localStorage.setItem(STORAGE_KEY, today);
                scheduleNextDay();
                return;
            }

            // ── Send one notification per driver who is behind ──────────────────
            const MONTHS_UZ = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];
            const now = new Date();
            const dateStr = `${now.getDate()} ${MONTHS_UZ[now.getMonth()]} ${now.getFullYear()}`;

            try {
                // Send a single grouped notification listing all behind drivers
                const driverLines = behindDrivers
                    .map((bd, i) =>
                        `${i + 1}. ${bd.driver.name} — ${fmtUZS(bd.todayIncome)}/${fmtUZS(bd.dailyPlan)} UZS (${fmtUZS(bd.missing)} UZS qoldi)`
                    )
                    .join('\n');

                await sendNotification(
                    {
                        title: `🌙 Kechki reja tekshiruvi — ${dateStr}`,
                        message:
                            `Bugun ${behindDrivers.length} ta haydovchi kunlik rejani bajarmadi:\n\n${driverLines}\n\nUlarga eslatma yuboring yoki hisob-kitob qiling.`,
                        type: 'payment_reminder',
                        category: NotificationCategory.PAYMENT_REMINDER,
                        priority: NotificationPriority.HIGH,
                        targetUsers: 'role:admin',
                        expiresIn: 12 * 60 * 60 * 1000, // expires in 12 hours
                    },
                    adminUserId,
                    adminUserName
                );

                localStorage.setItem(STORAGE_KEY, today);
            } catch (err) {
                console.error('[DailyPlanReminder] Failed to send notification:', err);
            }

            scheduleNextDay();
        };

        const scheduleNextDay = () => {
            // Re-schedule for next 22:00
            nextDayTimeout = setTimeout(fire, msUntilTenPM());
        };

        // Schedule for today's 22:00 (or tomorrow's if it's already past)
        fireTimeout = setTimeout(fire, msUntilTenPM());

        return () => {
            clearTimeout(fireTimeout);
            clearTimeout(nextDayTimeout);
        };
    }, [enabled, adminUserId]); // only re-bind when admin changes
};
