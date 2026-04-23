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
            case 'payment_reminder': return '💰';
            case 'feature_update': return '✨';
            case 'announcement': return '📢';
            case 'system': return '⚙️';
            default: return '🔔';
        }
    };

    const formatTime = (timestamp: number) => {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        if (minutes < 1) return t('justNow') || 'Just now';
        if (minutes < 60) return `${minutes} ${t('minutesAgo') || 'min ago'}`;
        if (hours < 24) return `${hours} ${t('hoursAgo') || 'h ago'}`;
        return `${days} ${t('daysAgo') || 'd ago'}`;
    };

    const parseAmount = (title: string): string | null => {
        const m = title.match(/([\d\s,]+)\s*UZS/);
        return m ? m[0].trim() : null;
    };

    const isDark = theme === 'dark';

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => {
                    const wasOpen = isOpen;
                    setIsOpen(!isOpen);
                    if (!wasOpen && unreadCount > 0) onMarkAllAsRead();
                }}
                className={`relative p-2 rounded-lg transition-colors ${isDark
                    ? 'hover:bg-gray-700 text-gray-300 hover:text-white'
                    : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                }`}
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className={`absolute right-0 mt-2 w-96 rounded-2xl shadow-2xl border overflow-hidden z-50 ${isDark
                    ? 'bg-[#111827] border-gray-700/80'
                    : 'bg-white border-gray-200'
                }`}>
                    {/* Header */}
                    <div className={`px-5 py-4 border-b flex items-center justify-between ${isDark ? 'border-gray-700/80 bg-gray-800/60' : 'border-gray-100 bg-gray-50'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDark ? 'bg-teal-500/20' : 'bg-teal-50'}`}>
                                <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                                    />
                                </svg>
                            </div>
                            <div>
                                <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {t('notifications') || 'Notifications'}
                                </h3>
                                {unreadCount > 0 && (
                                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                        {unreadCount} unread
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {readIds.size > 0 && (
                                <button
                                    onClick={onClearAllRead}
                                    className={`text-xs font-medium flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors ${isDark
                                        ? 'text-gray-400 hover:text-red-400 hover:bg-red-400/10'
                                        : 'text-gray-500 hover:text-red-500 hover:bg-red-50'
                                    }`}
                                >
                                    <TrashIcon className="w-3 h-3" />
                                    {t('clear') || 'Clear'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Notification List */}
                    <div className="max-h-[400px] overflow-y-auto divide-y divide-transparent">
                        {notifications.length === 0 ? (
                            <div className={`px-5 py-10 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                    <svg className="w-7 h-7 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                                        />
                                    </svg>
                                </div>
                                <p className="text-sm font-medium">{t('noNotifications') || 'No notifications yet'}</p>
                                <p className="text-xs mt-1 opacity-60">You're all caught up!</p>
                            </div>
                        ) : (
                            notifications.slice(0, 10).map((notification) => {
                                const isRead = readIds.has(notification.id);
                                const avatarUrl = (notification as any).deliveryTracking?.driverAvatar;
                                const amount = parseAmount(notification.title);
                                const isPayment = notification.type === 'payment_reminder';

                                return (
                                    <div
                                        key={notification.id}
                                        onClick={() => !isRead && onMarkAsRead(notification.id)}
                                        className={`group relative px-4 py-4 transition-all duration-150 ${isRead
                                            ? isDark
                                                ? 'bg-transparent hover:bg-gray-800/30'
                                                : 'bg-white hover:bg-gray-50'
                                            : isDark
                                                ? 'bg-gray-800/50 hover:bg-gray-800/80 cursor-pointer'
                                                : 'bg-teal-50/60 hover:bg-teal-50 cursor-pointer'
                                        } ${!isRead ? 'border-l-2 border-teal-500' : 'border-l-2 border-transparent'}`}
                                    >
                                        <div className="flex items-start gap-3 pr-6">
                                            {/* Avatar */}
                                            <div className="flex-shrink-0 relative">
                                                {avatarUrl ? (
                                                    <img
                                                        src={avatarUrl}
                                                        alt=""
                                                        className={`w-11 h-11 rounded-xl object-cover ring-2 ${isRead
                                                            ? isDark ? 'ring-gray-700' : 'ring-gray-200'
                                                            : isDark ? 'ring-teal-500/40' : 'ring-teal-400/50'
                                                        } ${isRead ? 'opacity-60' : ''}`}
                                                        onError={e => {
                                                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                                                            (e.currentTarget.nextSibling as HTMLElement)?.style?.setProperty('display', 'flex');
                                                        }}
                                                    />
                                                ) : null}
                                                <div
                                                    className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${isDark ? 'bg-gray-700' : 'bg-gray-100'} ${avatarUrl ? 'hidden' : 'flex'}`}
                                                >
                                                    {getTypeIcon(notification.type)}
                                                </div>
                                                {!isRead && (
                                                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-teal-500 rounded-full border-2 border-[#111827]" />
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                {isPayment && amount ? (
                                                    <>
                                                        {/* Driver name + amount row */}
                                                        <div className="flex items-baseline justify-between gap-2 mb-0.5">
                                                            <span className={`text-sm font-bold truncate ${isRead
                                                                ? isDark ? 'text-gray-400' : 'text-gray-500'
                                                                : isDark ? 'text-white' : 'text-gray-900'
                                                            }`}>
                                                                {notification.title.replace(/[💵💳]\s*/, '').replace(/\s*—.*$/, '').trim()}
                                                            </span>
                                                            <span className={`text-sm font-bold font-mono flex-shrink-0 ${isRead ? 'text-gray-500' : 'text-teal-500'}`}>
                                                                +{amount}
                                                            </span>
                                                        </div>
                                                        {/* Method pill */}
                                                        <div className="flex items-center gap-1.5 mb-1">
                                                            {notification.title.includes('💳') ? (
                                                                <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold ${isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                                                    💳 Card
                                                                </span>
                                                            ) : (
                                                                <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold ${isDark ? 'bg-green-500/15 text-green-400' : 'bg-green-50 text-green-600'}`}>
                                                                    💵 Cash
                                                                </span>
                                                            )}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <p className={`text-sm font-semibold truncate mb-1 ${isRead
                                                        ? isDark ? 'text-gray-400' : 'text-gray-500'
                                                        : isDark ? 'text-white' : 'text-gray-900'
                                                    }`}>
                                                        {notification.title}
                                                    </p>
                                                )}

                                                {/* Message */}
                                                <p className={`text-xs leading-relaxed line-clamp-2 ${isRead
                                                    ? isDark ? 'text-gray-600' : 'text-gray-400'
                                                    : isDark ? 'text-gray-400' : 'text-gray-500'
                                                }`}>
                                                    {notification.message}
                                                </p>

                                                {/* Time */}
                                                <p className={`text-[11px] mt-1.5 font-medium ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                                                    {formatTime(notification.createdAt)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Delete on hover */}
                                        <button
                                            onClick={e => { e.stopPropagation(); onDeleteNotification(notification.id); }}
                                            className={`absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-150 ${isDark
                                                ? 'bg-gray-900 text-gray-500 hover:text-red-400 hover:bg-red-400/10 border border-gray-700'
                                                : 'bg-white text-gray-400 hover:text-red-500 hover:bg-red-50 shadow-sm border border-gray-100'
                                            }`}
                                        >
                                            <TrashIcon className="w-3 h-3" />
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
