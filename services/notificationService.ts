import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    updateDoc,
    doc,
    deleteDoc,
    getDocs,
    writeBatch,
    Timestamp,
    serverTimestamp,
    arrayUnion
} from 'firebase/firestore';
import { db } from '../firebase';
import {
    Notification,
    NotificationCategory,
    NotificationPriority,
    NotificationTargetType,
    UserNotificationRead,
    UserNotificationDelete,
    NotificationDeliveryTracking
} from '../src/core/types';

// Re-export types for backward compatibility
export type NotificationType = 'payment_reminder' | 'feature_update' | 'announcement' | 'system';
export type {
    Notification,
    NotificationCategory,
    NotificationPriority,
    UserNotificationRead
};

const NOTIFICATIONS_COLLECTION = 'notifications';
const NOTIFICATION_READS_COLLECTION = 'notification_reads';
const NOTIFICATION_DELETES_COLLECTION = 'notification_deletes';

/**
 * Send a new notification with enhanced targeting and tracking
 */
export const sendNotification = async (
    notificationData: {
        title: string;
        message: string;
        type: NotificationType;
        category: NotificationCategory;
        priority: NotificationPriority;
        targetUsers: NotificationTargetType;
        expiresIn?: number; // Milliseconds from now, defaults to 24 hours
        minAccountAge?: number;
    },
    createdBy: string,
    createdByName: string
): Promise<string> => {
    try {
        const now = Date.now();
        const expiresAt = now + (notificationData.expiresIn || 24 * 60 * 60 * 1000);

        // Build notification object, excluding undefined values
        const notification: Record<string, any> = {
            title: notificationData.title,
            message: notificationData.message,
            type: notificationData.type,
            category: notificationData.category,
            priority: notificationData.priority,
            targetUsers: notificationData.targetUsers,
            createdBy,
            createdByName,
            createdAt: now,
            expiresAt,
            deliveryTracking: {
                sent: now,
                delivered: [],
                read: []
            }
        };

        // Only add minAccountAge if it's defined (Firestore rejects undefined)
        if (notificationData.minAccountAge !== undefined) {
            notification.minAccountAge = notificationData.minAccountAge;
        }

        const docRef = await addDoc(collection(db, NOTIFICATIONS_COLLECTION), notification);
        console.log('✅ Notification created:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error sending notification:', error);
        throw error;
    }
};

/**
 * Subscribe to notifications for a user with account-specific filtering
 * 
 * Filters notifications based on:
 * - Expiration date
 * - User/role targeting
 * - Deletion status
 */
export const subscribeToNotifications = (
    userId: string,
    userCreatedAt: number,
    userRole: 'admin' | 'viewer',
    callback: (notifications: Notification[], unreadCount: number, readIds: Set<string>) => void
) => {
    const now = Date.now();

    // Query notifications that haven't expired yet
    // Note: Removed createdAt >= userCreatedAt filter as it was too restrictive
    const q = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('expiresAt', '>', now),
        orderBy('expiresAt', 'desc')
    );

    console.log('📡 Subscribing to notifications for user:', userId, 'role:', userRole);

    return onSnapshot(q, async (snapshot) => {
        const notifications: Notification[] = [];

        console.log('📬 Raw notifications from DB:', snapshot.size);

        snapshot.forEach((doc) => {
            const data = doc.data() as Omit<Notification, 'id'>;

            // Check if notification is targeted to this user
            const isTargeted = isNotificationTargetedToUser(
                data.targetUsers,
                userId,
                userRole
            );

            if (isTargeted) {
                notifications.push({ id: doc.id, ...data } as Notification);
            }
        });

        console.log('📩 Targeted notifications:', notifications.length);

        // Get read status for this user
        const readsQuery = query(
            collection(db, NOTIFICATION_READS_COLLECTION),
            where('userId', '==', userId)
        );
        const readsSnapshot = await getDocs(readsQuery);
        const readIds = new Set<string>();
        readsSnapshot.forEach((doc) => {
            readIds.add(doc.data().notificationId);
        });

        // Get deleted status for this user
        const deletesQuery = query(
            collection(db, NOTIFICATION_DELETES_COLLECTION),
            where('userId', '==', userId)
        );
        const deletesSnapshot = await getDocs(deletesQuery);
        const deletedIds = new Set<string>();
        deletesSnapshot.forEach((doc) => {
            deletedIds.add(doc.data().notificationId);
        });

        // Filter out deleted notifications
        const activeNotifications = notifications.filter(n => !deletedIds.has(n.id));

        console.log('🔔 Active notifications (after delete filter):', activeNotifications.length);

        // Count unread
        const unreadCount = activeNotifications.filter(n => !readIds.has(n.id)).length;

        callback(activeNotifications, unreadCount, readIds);
    }, (error) => {
        console.error('Error subscribing to notifications:', error);
    });
};

/**
 * Helper: Check if notification is targeted to a specific user
 */
function isNotificationTargetedToUser(
    targetUsers: NotificationTargetType,
    userId: string,
    userRole: 'admin' | 'viewer'
): boolean {
    // Broadcast to all users
    if (targetUsers === 'all') {
        return true;
    }

    // Role-based targeting
    if (targetUsers === 'role:admin' && userRole === 'admin') {
        return true;
    }
    if (targetUsers === 'role:viewer' && userRole === 'viewer') {
        return true;
    }

    // Specific user IDs
    if (Array.isArray(targetUsers) && targetUsers.includes(userId)) {
        return true;
    }

    return false;
}

/**
 * Mark a notification as read and update delivery tracking
 */
export const markNotificationAsRead = async (
    notificationId: string,
    userId: string
): Promise<void> => {
    try {
        // Check if already marked as read
        const q = query(
            collection(db, NOTIFICATION_READS_COLLECTION),
            where('notificationId', '==', notificationId),
            where('userId', '==', userId)
        );
        const existing = await getDocs(q);

        if (existing.empty) {
            // Add to reads collection
            await addDoc(collection(db, NOTIFICATION_READS_COLLECTION), {
                notificationId,
                userId,
                readAt: Date.now()
            });

            // Update notification's delivery tracking
            const notificationRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
            await updateDoc(notificationRef, {
                'deliveryTracking.read': arrayUnion(userId)
            });
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
        throw error;
    }
};

// Mark all notifications as read for a user
export const markAllNotificationsAsRead = async (
    notificationIds: string[],
    userId: string
): Promise<void> => {
    try {
        // Get existing reads
        const q = query(
            collection(db, NOTIFICATION_READS_COLLECTION),
            where('userId', '==', userId)
        );
        const existing = await getDocs(q);
        const existingIds = new Set<string>();
        existing.forEach((doc) => {
            existingIds.add(doc.data().notificationId);
        });

        // Add reads for notifications not yet marked
        const batch = writeBatch(db);
        const now = Date.now();

        notificationIds.forEach((notificationId) => {
            if (!existingIds.has(notificationId)) {
                const docRef = doc(collection(db, NOTIFICATION_READS_COLLECTION));
                batch.set(docRef, {
                    notificationId,
                    userId,
                    readAt: now
                });
            }
        });

        await batch.commit();
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        throw error;
    }
};

// Delete a notification for a user
export const deleteNotification = async (
    notificationId: string,
    userId: string
): Promise<void> => {
    try {
        await addDoc(collection(db, NOTIFICATION_DELETES_COLLECTION), {
            notificationId,
            userId,
            deletedAt: Date.now()
        });
    } catch (error) {
        console.error('Error deleting notification:', error);
        throw error;
    }
};

// Clear all read notifications for a user
export const clearAllReadNotifications = async (
    userId: string
): Promise<void> => {
    try {
        // Get all read notifications
        const readsQuery = query(
            collection(db, NOTIFICATION_READS_COLLECTION),
            where('userId', '==', userId)
        );
        const readsSnapshot = await getDocs(readsQuery);
        const readIds = new Set<string>();
        readsSnapshot.forEach((doc) => {
            readIds.add(doc.data().notificationId);
        });

        if (readIds.size === 0) return;

        // Get already deleted notifications to avoid duplicates
        const deletesQuery = query(
            collection(db, NOTIFICATION_DELETES_COLLECTION),
            where('userId', '==', userId)
        );
        const deletesSnapshot = await getDocs(deletesQuery);
        const deletedIds = new Set<string>();
        deletesSnapshot.forEach((doc) => {
            deletedIds.add(doc.data().notificationId);
        });

        const batch = writeBatch(db);
        const now = Date.now();
        let count = 0;

        readIds.forEach((notificationId) => {
            if (!deletedIds.has(notificationId)) {
                const docRef = doc(collection(db, NOTIFICATION_DELETES_COLLECTION));
                batch.set(docRef, {
                    notificationId,
                    userId,
                    deletedAt: now
                });
                count++;
            }
        });

        if (count > 0) {
            await batch.commit();
        }
    } catch (error) {
        console.error('Error clearing read notifications:', error);
        throw error;
    }
};

// Get read notification IDs for a user
export const getReadNotificationIds = async (userId: string): Promise<Set<string>> => {
    try {
        const q = query(
            collection(db, NOTIFICATION_READS_COLLECTION),
            where('userId', '==', userId)
        );
        const snapshot = await getDocs(q);
        const readIds = new Set<string>();
        snapshot.forEach((doc) => {
            readIds.add(doc.data().notificationId);
        });
        return readIds;
    } catch (error) {
        console.error('Error getting read notifications:', error);
        return new Set();
    }
};

/**
 * Cleanup expired notifications (past their expiration date)
 */
export const cleanupExpiredNotifications = async (): Promise<void> => {
    try {
        const now = Date.now();

        // Query expired notifications
        const q = query(
            collection(db, NOTIFICATIONS_COLLECTION),
            where('expiresAt', '<=', now)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) return;

        const batch = writeBatch(db);
        snapshot.forEach((doc) => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        console.log(`Cleaned up ${snapshot.size} expired notifications`);
    } catch (error) {
        console.error('Error cleaning up expired notifications:', error);
    }
};

/**
 * Clear all notifications for a new account to ensure clean slate
 * Called when a new account is created
 */
export const clearNotificationsForNewAccount = async (userId: string): Promise<void> => {
    try {
        // Get all existing notifications
        const notificationsQuery = query(collection(db, NOTIFICATIONS_COLLECTION));
        const notificationsSnapshot = await getDocs(notificationsQuery);

        if (notificationsSnapshot.empty) return;

        const batch = writeBatch(db);
        const now = Date.now();

        // Mark all existing notifications as deleted for this new user
        notificationsSnapshot.forEach((notificationDoc) => {
            const deleteRef = doc(collection(db, NOTIFICATION_DELETES_COLLECTION));
            batch.set(deleteRef, {
                notificationId: notificationDoc.id,
                userId,
                deletedAt: now
            });
        });

        await batch.commit();
        console.log(`Cleared ${notificationsSnapshot.size} notifications for new account: ${userId}`);
    } catch (error) {
        console.error('Error clearing notifications for new account:', error);
        throw error;
    }
};

/**
 * Send bulk notifications based on role targeting
 */
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
        {
            ...notificationData,
            targetUsers: `role:${role}` as NotificationTargetType
        },
        createdBy,
        createdByName
    );
};
