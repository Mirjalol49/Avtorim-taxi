import { useState, useEffect, useRef, useCallback } from 'react';
import { subscribeToNotifications, cleanupExpiredNotifications, Notification } from '../../../../services/notificationService';
import { AdminUser, UserRole } from '../../../core/types';

export const useNotifications = (adminUser: AdminUser | null, userRole: UserRole) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());

    // Local set of IDs dismissed by the user — survives realtime overwrites and page reloads.
    const localDismissedRef = useRef<Set<string>>(new Set());
    const dismissStorageKeyRef = useRef<string | null>(null);

    const persistDismissed = useCallback(() => {
        const key = dismissStorageKeyRef.current;
        if (!key) return;
        try {
            localStorage.setItem(key, JSON.stringify([...localDismissedRef.current]));
        } catch {
            // localStorage may be unavailable; in-memory dismissal still prevents realtime bounce-back.
        }
    }, []);

    /** Call this when the user deletes one notification */
    const dismissNotification = useCallback((id: string) => {
        localDismissedRef.current.add(id);
        persistDismissed();
        setNotifications(prev => prev.filter(n => n.id !== id));
        setUnreadCount(prev => Math.max(0, prev - 1));
    }, [persistDismissed]);

    /** Call this when the user clears visible/read notifications */
    const dismissReadNotifications = useCallback((ids: Set<string>) => {
        ids.forEach(id => localDismissedRef.current.add(id));
        persistDismissed();
        setNotifications(prev => prev.filter(n => !ids.has(n.id)));
        setUnreadCount(prev => Math.max(0, prev - ids.size));
    }, [persistDismissed]);

    useEffect(() => {
        if (!adminUser?.id) return;

        const storageKey = `avtorim.dismissedNotifications.${adminUser.id}`;
        dismissStorageKeyRef.current = storageKey;
        try {
            const stored = localStorage.getItem(storageKey);
            localDismissedRef.current = new Set<string>(stored ? JSON.parse(stored) : []);
        } catch {
            localDismissedRef.current = new Set<string>();
        }

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
