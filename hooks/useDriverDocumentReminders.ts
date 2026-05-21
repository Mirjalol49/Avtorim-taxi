import { useEffect, useRef } from 'react';
import { Driver } from '../src/core/types/driver.types';
import { NotificationCategory, NotificationPriority } from '../src/core/types/notification.types';
import { sendNotification } from '../services/notificationService';
import { supabase } from '../supabase';

const DAY_MS = 24 * 60 * 60 * 1000;
const SESSION_SENT = new Set<string>();

type DriverDocRow = Pick<Driver, 'id' | 'name' | 'avatar' | 'isDeleted' | 'documents'> & { is_deleted?: boolean };

interface Options {
    drivers: Driver[];
    adminUserId: string;
    adminUserName: string;
    enabled: boolean;
}

const dateKey = (ms: number) => {
    const d = new Date(ms);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDate = (ms: number) => new Intl.DateTimeFormat('uz-UZ', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
}).format(new Date(ms));

export const useDriverDocumentReminders = ({
    drivers,
    adminUserId,
    adminUserName,
    enabled,
}: Options) => {
    const dataRef = useRef({ drivers, adminUserId, adminUserName });
    const firingRef = useRef(false);

    useEffect(() => {
        dataRef.current = { drivers, adminUserId, adminUserName };
    });

    useEffect(() => {
        if (!enabled || !adminUserId) return;

        const check = async () => {
            if (firingRef.current) return;
            firingRef.current = true;

            try {
                const { drivers: currentDrivers, adminUserId: fleetId, adminUserName: creatorName } = dataRef.current;
                const now = Date.now();
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);
                const activeDriverIds = new Set(currentDrivers.filter(driver => !driver.isDeleted).map(driver => driver.id));
                const { data: driverRows } = await supabase
                    .from('drivers')
                    .select('id,name,avatar,documents,is_deleted')
                    .eq('fleet_id', fleetId);

                const candidates = ((driverRows ?? []) as DriverDocRow[])
                    .filter(driver => activeDriverIds.has(driver.id) && !driver.is_deleted)
                    .flatMap(driver => (driver.documents ?? [])
                        .filter(doc => doc.category === 'driver_license' && typeof doc.expiryMs === 'number')
                        .map(doc => {
                            const expiryMs = Number(doc.expiryMs);
                            const reminderDays = Number(doc.reminderDaysBefore ?? 2);
                            const daysLeft = Math.ceil((new Date(expiryMs).setHours(0, 0, 0, 0) - todayStart.getTime()) / DAY_MS);
                            return { driver, doc, expiryMs, reminderDays, daysLeft };
                        }))
                    .filter(item => item.daysLeft <= item.reminderDays && item.daysLeft >= -1);

                if (candidates.length === 0) return;

                const { data: existing } = await supabase
                    .from('notifications')
                    .select('delivery_tracking')
                    .eq('fleet_id', fleetId)
                    .eq('type', 'payment_reminder')
                    .gte('created_ms', now - 14 * DAY_MS);

                const alreadySent = new Set<string>(
                    (existing ?? [])
                        .filter((row: any) => row.delivery_tracking?.reminderType === 'driver_document_expiry')
                        .map((row: any) => row.delivery_tracking?.dedupKey)
                        .filter(Boolean)
                );

                for (const item of candidates) {
                    const dedupKey = `${item.driver.id}:driver_license:${dateKey(item.expiryMs)}:${dateKey(now)}`;
                    if (SESSION_SENT.has(dedupKey) || alreadySent.has(dedupKey)) continue;

                    const title = item.daysLeft < 0
                        ? `${item.driver.name} — haydovchilik hujjati muddati o'tgan`
                        : `${item.driver.name} — haydovchilik hujjati ${item.daysLeft} kun qoldi`;
                    const message = item.daysLeft < 0
                        ? `Haydovchilik guvohnomasi ${formatDate(item.expiryMs)} kuni tugagan.`
                        : `Haydovchilik guvohnomasi ${formatDate(item.expiryMs)} kuni tugaydi. Eslatma: ${item.reminderDays} kun oldin.`;

                    await sendNotification(
                        {
                            title,
                            message,
                            type: 'payment_reminder',
                            category: NotificationCategory.PAYMENT_REMINDER,
                            priority: item.daysLeft <= 0 ? NotificationPriority.HIGH : NotificationPriority.MEDIUM,
                            targetUsers: 'role:admin',
                            expiresIn: 14 * DAY_MS,
                            driverId: item.driver.id,
                            extraTracking: {
                                reminderType: 'driver_document_expiry',
                                dedupKey,
                                driverName: item.driver.name,
                                documentCategory: item.doc.category,
                                documentName: item.doc.name,
                                expiryMs: item.expiryMs,
                                daysLeft: item.daysLeft,
                                reminderDays: item.reminderDays,
                            },
                        },
                        fleetId,
                        creatorName
                    );
                    SESSION_SENT.add(dedupKey);
                }
            } finally {
                firingRef.current = false;
            }
        };

        void check();
        const interval = window.setInterval(check, 60 * 60 * 1000);
        return () => window.clearInterval(interval);
    }, [enabled, adminUserId]);
};
