import { useState, useEffect, useRef, useCallback } from 'react';
import { subscribeToNotifications, cleanupExpiredNotifications, Notification } from '../../../../services/notificationService';
import { AdminUser, UserRole } from '../../../core/types';

export const useNotifications = (adminUser: AdminUser | null, userRole: UserRole) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());

    // Local set of IDs dismissed by the user this session — survives realtime overwrites
    const localDismissedRef = useRef<Set<string>>(new Set());

    /** Call this when the user deletes one notification */
    const dismissNotification = useCallback((id: string) => {
        localDismissedRef.current.add(id);
        setNotifications(prev => prev.filter(n => n.id !== id));
        setUnreadCount(prev => Math.max(0, prev - 1));
    }, []);

    /** Call this when the user clears all read notifications */
    const dismissReadNotifications = useCallback((readIds: Set<string>) => {
        readIds.forEach(id => localDismissedRef.current.add(id));
        setNotifications(prev => prev.filter(n => !readIds.has(n.id)));
    }, []);

    useEffect(() => {
        if (!adminUser?.id) return;

        const unsubscribe = subscribeToNotifications(
            adminUser.id,
            adminUser.createdAt || 0,
            userRole,
            (newNotifications, count, readIds) => {
                // Filter out any IDs the user has locally dismissed this session
                const filtered = newNotifications.filter(
                    n => !localDismissedRef.current.has(n.id)
                );
                const filteredUnread = filtered.filter(n => !readIds.has(n.id)).length;
                setNotifications(filtered);
                setReadNotificationIds(readIds);
                setUnreadCount(filteredUnread);
            }
        );

        if (userRole === 'admin') {
            cleanupExpiredNotifications();
        }

        return () => unsubscribe();
    }, [adminUser?.id, adminUser?.createdAt, userRole]);

    return {
        notifications,
        unreadCount,
        readNotificationIds,
        setNotifications,
        setUnreadCount,
        setReadNotificationIds,
        dismissNotification,
        dismissReadNotifications,
    };
};
