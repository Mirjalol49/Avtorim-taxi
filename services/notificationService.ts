import { supabase } from '../supabase';
import {
    Notification,
    NotificationCategory,
    NotificationPriority,
    NotificationTargetType,
    UserNotificationRead,
    UserNotificationDelete,
    NotificationDeliveryTracking
} from '../src/core/types';

export type NotificationType = 'payment_reminder' | 'feature_update' | 'announcement' | 'system';
export type {
    Notification,
    NotificationCategory,
    NotificationPriority,
    UserNotificationRead
};

function isNotificationTargetedToUser(
    targetUsers: NotificationTargetType,
    userId: string,
    userRole: 'admin' | 'viewer'
): boolean {
    if (targetUsers === 'all') return true;
    if (targetUsers === 'role:admin' && userRole === 'admin') return true;
    if (targetUsers === 'role:viewer' && userRole === 'viewer') return true;
    if (Array.isArray(targetUsers) && targetUsers.includes(userId)) return true;
    return false;
}

export const sendNotification = async (
    notificationData: {
        title: string;
        message: string;
        type: NotificationType;
        category: NotificationCategory;
        priority: NotificationPriority;
        targetUsers: NotificationTargetType;
        expiresIn?: number;
        minAccountAge?: number;
        driverAvatar?: string;
        driverId?: string;
        extraTracking?: Record<string, unknown>;
    },
    createdBy: string,
    createdByName: string
): Promise<string> => {
    const now = Date.now();
    const expiresAt = now + (notificationData.expiresIn || 24 * 60 * 60 * 1000);

    const deliveryTracking: Record<string, unknown> = {
        sent: now, delivered: [], read: [],
        ...(notificationData.extraTracking ?? {}),
    };
    // ⚠️ Do NOT store driverAvatar (base64) in the DB — massive egress cost.
    // Store only driverId; the UI resolves the avatar from already-loaded drivers.
    if (notificationData.driverId) deliveryTracking.driverId = notificationData.driverId;

    const { data, error } = await supabase
        .from('notifications')
        .insert({
            title: notificationData.title,
            message: notificationData.message,
            type: notificationData.type,
            category: notificationData.category,
            priority: notificationData.priority,
            target_users: notificationData.targetUsers,
            created_by: createdBy || null,
            created_by_name: createdByName,
            created_ms: now,
            expires_at: expiresAt,
            delivery_tracking: deliveryTracking,
            min_account_age: notificationData.minAccountAge ?? null,
            fleet_id: createdBy || null,
        })
        .select('id')
        .single();

    if (error) throw error;
    return data.id as string;
};

export const subscribeToNotifications = (
    userId: string,
    _userCreatedAt: number,
    userRole: 'admin' | 'viewer',
    callback: (notifications: Notification[], unreadCount: number, readIds: Set<string>) => void
) => {
    const now = Date.now();
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const fetchAndNotify = () => {
        // Debounce: collapse rapid successive realtime events into one fetch
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            // Select only the columns we actually use — skip heavy JSONB where possible
            const { data: rows } = await supabase
                .from('notifications')
                .select('id,title,message,type,category,priority,target_users,created_by,created_by_name,created_ms,expires_at,delivery_tracking,min_account_age')
                .eq('fleet_id', userId)
                .gt('expires_at', now)
                .order('created_ms', { ascending: false })
                .limit(100); // cap at 100 — no need to fetch thousands of old notifications

            const notifications: Notification[] = (rows ?? [])
                .filter(r => isNotificationTargetedToUser(r.target_users as NotificationTargetType, userId, userRole))
                .map(r => ({
                    id: r.id,
                    title: r.title,
                    message: r.message,
                    type: r.type,
                    category: r.category,
                    priority: r.priority,
                    targetUsers: r.target_users,
                    createdBy: r.created_by,
                    createdByName: r.created_by_name,
                    createdAt: r.created_ms,
                    expiresAt: r.expires_at,
                    deliveryTracking: r.delivery_tracking,
                    minAccountAge: r.min_account_age
                } as Notification));

            const { data: reads } = await supabase
                .from('notification_reads')
                .select('notification_id')
                .eq('user_id', userId);
            const readIds = new Set<string>((reads ?? []).map(r => r.notification_id));

            const { data: deletes } = await supabase
                .from('notification_deletes')
                .select('notification_id')
                .eq('user_id', userId);
            const deletedIds = new Set<string>((deletes ?? []).map(r => r.notification_id));

            const active = notifications.filter(n => !deletedIds.has(n.id));
            const unreadCount = active.filter(n => !readIds.has(n.id)).length;
            callback(active, unreadCount, readIds);
        }, 400); // 400ms debounce — collapses bursts of realtime events
    };

    fetchAndNotify();

    const channel = supabase
        .channel(`notifications_${userId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `fleet_id=eq.${userId}` }, fetchAndNotify)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notification_reads', filter: `user_id=eq.${userId}` }, fetchAndNotify)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notification_deletes', filter: `user_id=eq.${userId}` }, fetchAndNotify)
        .subscribe();

    return () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        supabase.removeChannel(channel);
    };
};

export const markNotificationAsRead = async (notificationId: string, userId: string): Promise<void> => {
    const { data: existing } = await supabase
        .from('notification_reads')
        .select('id')
        .eq('notification_id', notificationId)
        .eq('user_id', userId)
        .limit(1);

    if (!existing || existing.length === 0) {
        await supabase.from('notification_reads').insert({
            notification_id: notificationId,
            user_id: userId,
            read_at: Date.now()
        });

        const { data: notif } = await supabase
            .from('notifications')
            .select('delivery_tracking')
            .eq('id', notificationId)
            .single();
        if (notif) {
            const dt = notif.delivery_tracking ?? { sent: 0, delivered: [], read: [] };
            const readArr: string[] = Array.isArray(dt.read) ? dt.read : [];
            if (!readArr.includes(userId)) {
                await supabase.from('notifications').update({
                    delivery_tracking: { ...dt, read: [...readArr, userId] }
                }).eq('id', notificationId);
            }
        }
    }
};

export const markAllNotificationsAsRead = async (notificationIds: string[], userId: string): Promise<void> => {
    const { data: existing } = await supabase
        .from('notification_reads')
        .select('notification_id')
        .eq('user_id', userId);
    const existingIds = new Set<string>((existing ?? []).map(r => r.notification_id));

    const toInsert = notificationIds
        .filter(id => !existingIds.has(id))
        .map(id => ({ notification_id: id, user_id: userId, read_at: Date.now() }));

    if (toInsert.length > 0) {
        await supabase.from('notification_reads').insert(toInsert);
    }
};

export const deleteNotification = async (notificationId: string, userId: string): Promise<void> => {
    try {
        // Hard-delete the row from the notifications table (permanent — row is gone from DB)
        const { error: delError } = await supabase.from('notifications').delete().eq('id', notificationId);
        
        // If there was an error (e.g. RLS blocked it), we fallback to soft-delete
        if (delError) {
            console.warn('Hard delete failed, falling back to soft delete:', delError);
            await supabase.from('notification_deletes').insert({
                notification_id: notificationId,
                user_id: userId,
                deleted_at: Date.now()
            }).maybeSingle(); // ignore duplicate key errors
        }
    } catch (err) {
        console.error('Failed to delete notification:', err);
    }
};

export const clearAllReadNotifications = async (userId: string): Promise<void> => {
    try {
        const { data: reads } = await supabase
            .from('notification_reads')
            .select('notification_id')
            .eq('user_id', userId);
        const readIds = (reads ?? []).map(r => r.notification_id);
        if (readIds.length === 0) return;

        // Try to hard-delete all read notification rows permanently
        await supabase.from('notifications').delete().in('id', readIds);

        // Check which ones STILL exist (failed to hard-delete due to RLS)
        const { data: remaining } = await supabase.from('notifications').select('id').in('id', readIds);
        const remainingIds = new Set((remaining ?? []).map(r => r.id));

        if (remainingIds.size === 0) return; // All deleted successfully!

        // Also record in notification_deletes as fallback for the ones that couldn't be hard-deleted
        const { data: deletes } = await supabase
            .from('notification_deletes')
            .select('notification_id')
            .eq('user_id', userId);
        const deletedIds = new Set<string>((deletes ?? []).map(r => r.notification_id));

        const toInsert = Array.from(remainingIds)
            .filter(id => !deletedIds.has(id))
            .map(id => ({ notification_id: id, user_id: userId, deleted_at: Date.now() }));

        if (toInsert.length > 0) {
            await supabase.from('notification_deletes').insert(toInsert);
        }
    } catch (err) {
        console.error('Failed to clear read notifications:', err);
    }
};

export const getReadNotificationIds = async (userId: string): Promise<Set<string>> => {
    const { data } = await supabase
        .from('notification_reads')
        .select('notification_id')
        .eq('user_id', userId);
    return new Set<string>((data ?? []).map(r => r.notification_id));
};

export const cleanupExpiredNotifications = async (): Promise<void> => {
    const now = Date.now();
    await supabase.from('notifications').delete().lte('expires_at', now);
};

export const clearNotificationsForNewAccount = async (userId: string): Promise<void> => {
    const { data: notifications } = await supabase.from('notifications').select('id');
    if (!notifications || notifications.length === 0) return;

    const now = Date.now();
    const toInsert = notifications.map(n => ({
        notification_id: n.id,
        user_id: userId,
        deleted_at: now
    }));

    await supabase.from('notification_deletes').insert(toInsert);
};

export const sendBulkNotificationByRole = async (
    notificationData: {
        title: string;
        message: string;
        type: NotificationType;
        category: NotificationCategory;
        priority: NotificationPriority;
        expiresIn?: number;
    },
    role: 'admin' | 'viewer',
    createdBy: string,
    createdByName: string
): Promise<string> => {
    return sendNotification(
        { ...notificationData, targetUsers: `role:${role}` as NotificationTargetType },
        createdBy,
        createdByName
    );
};
