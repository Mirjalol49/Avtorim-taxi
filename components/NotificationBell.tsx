import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Notification, NotificationType, markNotificationAsRead } from '../services/notificationService';
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
    onClearAllRead,
}) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const isDark = theme === 'dark';

    const formatRelative = (ts: number) => {
        const diff = Date.now() - ts;
        const m = Math.floor(diff / 60000);
        const h = Math.floor(diff / 3600000);
        const d = Math.floor(diff / 86400000);
        if (m < 1)  return t('justNow')    || 'Hozir';
        if (m < 60) return `${m} ${t('minutesAgo') || 'daq oldin'}`;
        if (h < 24) return `${h} ${t('hoursAgo')   || 'soat oldin'}`;
        return `${d} ${t('daysAgo') || 'kun oldin'}`;
    };

    const fmtAmount = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n));

    const getTypeIcon = (type: NotificationType) => {
        switch (type) {
            case 'payment_reminder': return '💰';
            case 'feature_update':  return '✨';
            case 'announcement':    return '📢';
            case 'system':          return '⚙️';
            default:                return '🔔';
        }
    };

    const renderItem = (notification: Notification) => {
        const isRead     = readIds.has(notification.id);
        const dt         = (notification as any).deliveryTracking ?? {};
        const isPayment  = notification.type === 'payment_reminder';
        const txType     = dt.txType as 'income' | 'expense' | undefined;
        const method     = dt.method  as 'cash' | 'card' | null;
        const amount     = dt.amount  as number | undefined;
        const driverName = dt.driverName as string | undefined;
        const note       = dt.note    as string | undefined;
        const dateStr    = dt.dateStr as string | undefined;
        const timeStr    = dt.timeStr as string | undefined;
        const avatarUrl  = dt.driverAvatar as string | undefined;
        const chequeUrl  = dt.chequeImage  as string | undefined;

        // Fallback: parse from title for old notifications
        const isIncome = txType ? txType === 'income'
            : notification.title.includes('💵') || notification.title.includes('💳') || notification.title.includes('Kirim');
        const amountDisplay = amount != null
            ? fmtAmount(amount)
            : (notification.title.match(/([\d\s,]+)\s*UZS/)?.[1]?.trim() ?? '');
        const nameDisplay = driverName
            ?? notification.title.replace(/[💵💳💸]\s*(?:Kirim|Chiqim):\s*/, '').replace(/\s*—.*$/, '').trim();

        return (
            <div
                key={notification.id}
                onClick={() => !isRead && onMarkAsRead(notification.id)}
                className={`group relative transition-colors ${
                    !isRead ? 'border-l-[3px] border-teal-500' : 'border-l-[3px] border-transparent'
                } ${
                    isRead
                        ? isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-gray-50'
                        : isDark ? 'bg-white/[0.05] hover:bg-white/[0.07] cursor-pointer'
                               : 'bg-teal-50/60 hover:bg-teal-50 cursor-pointer'
                }`}
            >
                <div className="px-4 py-3.5 pr-10">
                    {isPayment ? (
                        <div className="flex items-start gap-3">
                            {/* Avatar / icon */}
                            <div className="relative flex-shrink-0">
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt=""
                                        className={`w-10 h-10 rounded-xl object-cover ${isRead ? 'opacity-40' : ''}`}
                                        onError={e => {
                                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                                            (e.currentTarget.nextElementSibling as HTMLElement | null)?.removeAttribute('style');
                                        }}
                                    />
                                ) : null}
                                <div
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${isDark ? 'bg-gray-700/80' : 'bg-gray-100'}`}
                                    style={{ display: avatarUrl ? 'none' : 'flex' }}
                                >
                                    {isIncome ? '💰' : '💸'}
                                </div>
                                {!isRead && (
                                    <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-teal-500 border-2 ${isDark ? 'border-[#111827]' : 'border-white'}`} />
                                )}
                            </div>

                            {/* Body */}
                            <div className="flex-1 min-w-0">
                                {/* Name + amount */}
                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                    <p className={`text-[13px] font-bold leading-tight truncate ${isRead ? isDark ? 'text-gray-500' : 'text-gray-400' : isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {nameDisplay}
                                    </p>
                                    <span className={`text-[13px] font-bold font-mono flex-shrink-0 tabular-nums ${isRead ? isDark ? 'text-gray-600' : 'text-gray-400' : isIncome ? 'text-teal-500' : 'text-red-400'}`}>
                                        {isIncome ? '+' : '−'}{amountDisplay} UZS
                                    </span>
                                </div>

                                {/* Badges */}
                                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                                    {isIncome ? (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold tracking-wide ${isDark ? 'bg-teal-500/15 text-teal-400' : 'bg-teal-50 text-teal-700'}`}>
                                            ↑ KIRIM
                                        </span>
                                    ) : (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold tracking-wide ${isDark ? 'bg-red-500/15 text-red-400' : 'bg-red-50 text-red-600'}`}>
                                            ↓ CHIQIM
                                        </span>
                                    )}
                                    {method === 'card' && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                            💳 Karta
                                        </span>
                                    )}
                                    {method === 'cash' && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${isDark ? 'bg-green-500/15 text-green-400' : 'bg-green-50 text-green-700'}`}>
                                            💵 Naqd
                                        </span>
                                    )}
                                    {chequeUrl && (
                                        <a
                                            href={chequeUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={e => e.stopPropagation()}
                                            className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold transition-colors ${isDark ? 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'}`}
                                        >
                                            📄 Chek
                                        </a>
                                    )}
                                </div>

                                {/* Note */}
                                {note && (
                                    <p className={`text-[11px] mb-1.5 truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                        📝 {note}
                                    </p>
                                )}

                                {/* Time row */}
                                <div className={`flex items-center gap-1.5 text-[11px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                                    <span>{formatRelative(notification.createdAt)}</span>
                                    {dateStr && timeStr && (
                                        <>
                                            <span>·</span>
                                            <span className="font-mono">{dateStr}, {timeStr}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Generic notification */
                        <div className="flex items-start gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${isDark ? 'bg-gray-700/80' : 'bg-gray-100'}`}>
                                {getTypeIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-[13px] font-semibold truncate mb-0.5 ${isRead ? isDark ? 'text-gray-500' : 'text-gray-400' : isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {notification.title}
                                </p>
                                <p className={`text-xs leading-relaxed line-clamp-2 mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                    {notification.message}
                                </p>
                                <p className={`text-[11px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                                    {formatRelative(notification.createdAt)}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Delete button */}
                <button
                    onClick={e => { e.stopPropagation(); onDeleteNotification(notification.id); }}
                    className={`absolute top-3 right-2.5 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${isDark ? 'text-gray-600 hover:text-red-400 hover:bg-red-400/10' : 'text-gray-300 hover:text-red-500 hover:bg-red-50'}`}
                >
                    <TrashIcon className="w-3 h-3" />
                </button>
            </div>
        );
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell */}
            <button
                onClick={() => {
                    const wasOpen = isOpen;
                    setIsOpen(!isOpen);
                    if (!wasOpen && unreadCount > 0) onMarkAllAsRead();
                }}
                className={`relative p-2 rounded-lg transition-colors ${isDark
                    ? 'hover:bg-gray-700 text-gray-300 hover:text-white'
                    : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'}`}
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

            {/* Panel */}
            {isOpen && (
                <div className={`absolute right-0 mt-2 w-[22rem] rounded-2xl shadow-2xl border overflow-hidden z-50 ${isDark
                    ? 'bg-[#111827] border-gray-700/60'
                    : 'bg-white border-gray-200'}`}
                >
                    {/* Header */}
                    <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? 'border-gray-700/60' : 'border-gray-100'}`}>
                        <div className="flex items-center gap-2">
                            <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {t('notifications') || 'Bildirishnomalar'}
                            </h3>
                            {unreadCount > 0 && (
                                <span className="px-1.5 py-0.5 rounded-md bg-teal-500 text-white text-[10px] font-bold leading-none">
                                    {unreadCount}
                                </span>
                            )}
                        </div>
                        {readIds.size > 0 && (
                            <button
                                onClick={onClearAllRead}
                                className={`text-xs font-medium flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${isDark
                                    ? 'text-gray-500 hover:text-red-400 hover:bg-red-400/10'
                                    : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
                            >
                                <TrashIcon className="w-3 h-3" />
                                {t('clear') || 'Tozalash'}
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div className={`max-h-[460px] overflow-y-auto divide-y ${isDark ? 'divide-gray-700/40' : 'divide-gray-100'}`}>
                        {notifications.length === 0 ? (
                            <div className={`px-5 py-12 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                    <svg className="w-6 h-6 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                                        />
                                    </svg>
                                </div>
                                <p className="text-sm font-medium">{t('noNotifications') || "Bildirishnomalar yo'q"}</p>
                                <p className="text-xs mt-1 opacity-50">You're all caught up!</p>
                            </div>
                        ) : (
                            notifications.slice(0, 15).map(renderItem)
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
