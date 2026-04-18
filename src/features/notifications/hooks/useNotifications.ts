import { useState, useEffect } from 'react';
import { subscribeToNotifications, cleanupExpiredNotifications, Notification } from '../../../../services/notificationService';
import { AdminUser, UserRole } from '../../../core/types';

export const useNotifications = (adminUser: AdminUser | null, userRole: UserRole) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!adminUser?.id) return;

        const unsubscribe = subscribeToNotifications(
            adminUser.id,
            adminUser.createdAt || 0,
            userRole,
            (newNotifications, count, readIds) => {
                setNotifications(newNotifications);
                setReadNotificationIds(readIds);
                setUnreadCount(count);
            }
        );

        if (userRole === 'admin') {
            cleanupExpiredNotifications();
        }

        return () => unsubscribe();
    }, [adminUser?.id, adminUser?.createdAt, userRole]);

    return { notifications, unreadCount, readNotificationIds, setNotifications, setUnreadCount, setReadNotificationIds };
};
