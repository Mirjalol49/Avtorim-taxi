import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Notification, NotificationType, markNotificationAsRead, markAllNotificationsAsRead } from '../services/notificationService';
import { TrashIcon } from './Icons';

interface NotificationBellProps {
    notifications: Notification[];
    unreadCount: number;
    readIds: Set<string>;
    userId: string;
    theme: 'light' | 'dark';
    onMarkAsRead: (id: string) => void;
    onMarkAllAsRead: () => void;
    onDeleteNotification: (id: string) => void;
    onClearAllRead: () => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({
    notifications,
    unreadCount,
    readIds,
    userId,
    theme,
    onMarkAsRead,
    onMarkAllAsRead,
    onDeleteNotification,
    onClearAllRead
}) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getTypeIcon = (type: NotificationType) => {
        switch (type) {
            case 'payment_reminder':
                return '💰';
            case 'feature_update':
                return '✨';
            case 'announcement':
                return '📢';
            case 'system':
                return '⚙️';
            default:
                return '🔔';
        }
    };

    const formatTime = (timestamp: number) => {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return t('justNow') || 'Just now';
        if (minutes < 60) return `${minutes}${t('minutesAgo') || 'm ago'}`;
        if (hours < 24) return `${hours}${t('hoursAgo') || 'h ago'}`;
        return `${days}${t('daysAgo') || 'd ago'}`;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => {
                    const wasOpen = isOpen;
                    setIsOpen(!isOpen);
                    // Mark all as read when opening the dropdown
                    if (!wasOpen && unreadCount > 0) {
                        onMarkAllAsRead();
                    }
                }}
                className={`relative p-2 rounded-lg transition-colors ${theme === 'dark'
                    ? 'hover:bg-gray-700 text-gray-300 hover:text-white'
                    : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                    }`}
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                </svg>

                {/* Unread Badge */}
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className={`absolute right-0 mt-2 w-80 rounded-xl shadow-2xl border overflow-hidden z-50 ${theme === 'dark'
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-gray-200'
                    }`}>
                    {/* Header */}
                    <div className={`px-4 py-3 border-b flex items-center justify-between ${theme === 'dark' ? 'border-gray-700 bg-gray-900/50' : 'border-gray-100 bg-gray-50'
                        }`}>
                        <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {t('notifications') || 'Notifications'}
                        </h3>
                        <div className="flex items-center gap-2">
                            {readIds.size > 0 && (
                                <button
                                    onClick={onClearAllRead}
                                    className={`text-xs font-medium flex items-center gap-1 transition-colors ${theme === 'dark'
                                        ? 'text-gray-400 hover:text-red-400'
                                        : 'text-gray-500 hover:text-red-500'
                                        }`}
                                    title={t('clearRead') || 'Clear read'}
                                >
                                    <TrashIcon className="w-3 h-3" />
                                    {t('clear') || 'Clear'}
                                </button>
                            )}
                            {unreadCount > 0 && (
                                <button
                                    onClick={() => {
                                        onMarkAllAsRead();
                                    }}
                                    className="text-xs text-[#0d9488] hover:text-[#0f766e] font-medium"
                                >
                                    {t('markAllAsRead') || 'Mark all as read'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Notification List */}
                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className={`px-4 py-8 text-center ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                                }`}>
                                <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                                    />
                                </svg>
                                <p className="text-sm">{t('noNotifications') || 'No new notifications'}</p>
                            </div>
                        ) : (
                            notifications
                                .slice(0, 10)
                                .map((notification) => {
                                    const isRead = readIds.has(notification.id);
                                    return (
                                        <div
                                            key={notification.id}
                                            onClick={() => !isRead && onMarkAsRead(notification.id)}
                                            className={`group relative px-4 py-3 border-b transition-all duration-200 ${isRead
                                                ? theme === 'dark'
                                                    ? 'border-gray-700 bg-gray-800/30'
                                                    : 'border-gray-100 bg-white'
                                                : theme === 'dark'
                                                    ? 'border-gray-700 bg-gray-700/50 hover:bg-gray-700 cursor-pointer'
                                                    : 'border-gray-100 bg-blue-50 hover:bg-gray-50 cursor-pointer'
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <span className={`text-xl ${isRead ? 'opacity-50' : ''}`}>{getTypeIcon(notification.type)}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <h4 className={`font-medium text-sm truncate ${isRead
                                                            ? theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                                                            : theme === 'dark' ? 'text-white' : 'text-gray-900'
                                                            } ${isRead ? '' : 'font-semibold'}`}>
                                                            {notification.title}
                                                        </h4>
                                                        {!isRead && <span className="w-2 h-2 bg-[#0d9488] rounded-full flex-shrink-0" />}
                                                    </div>
                                                    <p className={`text-xs mt-1 line-clamp-2 ${isRead
                                                        ? theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                                                        : theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                                                        }`}>
                                                        {notification.message}
                                                    </p>
                                                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                                                        }`}>
                                                        {formatTime(notification.createdAt)}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Delete Button - Shows on Hover */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeleteNotification(notification.id);
                                                }}
                                                className={`absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 ${theme === 'dark'
                                                    ? 'bg-gray-800 text-gray-400 hover:text-red-400 hover:bg-gray-700 shadow-lg border border-gray-700'
                                                    : 'bg-white text-gray-400 hover:text-red-500 hover:bg-gray-50 shadow-md border border-gray-100'
                                                    }`}
                                                title={t('delete') || 'Delete'}
                                            >
                                                <TrashIcon className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    );
                                })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
