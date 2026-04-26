import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Notification, NotificationType, markNotificationAsRead } from '../services/notificationService';
import {
    TrashIcon,
    BellIcon,
    TrendingUpIcon,
    TrendingDownIcon,
    ZapIcon,
    SettingsIcon,
    XIcon,
    CheckCheckIcon,
    ClockIcon,
    CalendarIcon,
    CreditCardIcon,
    BanknoteIcon,
    AlertTriangleIcon,
    ReceiptIcon,
} from './Icons';

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
    const [visible, setVisible] = useState(false);

    const isDark = theme === 'dark';

    // Animate open/close
    useEffect(() => {
        if (isOpen) {
            // Mount first, then trigger animation
            requestAnimationFrame(() => setVisible(true));
        } else {
            setVisible(false);
        }
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeSidebar();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    // Prevent body scroll while open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const openSidebar = () => {
        setIsOpen(true);
        if (unreadCount > 0) onMarkAllAsRead();
    };

    const closeSidebar = () => {
        setVisible(false);
        setTimeout(() => setIsOpen(false), 300);
    };

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
        const cls = 'w-5 h-5';
        switch (type) {
            case 'payment_reminder': return <TrendingUpIcon className={cls} />;
            case 'feature_update':   return <ZapIcon        className={cls} />;
            case 'announcement':     return <BellIcon       className={cls} />;
            case 'system':           return <SettingsIcon   className={cls} />;
            default:                 return <BellIcon       className={cls} />;
        }
    };

    // ─── Daily Plan Reminder Card ─────────────────────────────────────────────
    const renderPlanReminder = (notification: Notification, isRead: boolean) => {
        const dt           = (notification as any).deliveryTracking ?? {};
        const driverName   = (dt.driverName   as string)  ?? notification.title.split(' — ')[0] ?? 'Haydovchi';
        const dailyPlan    = (dt.dailyPlan    as number)  ?? 0;
        const todayIncome  = (dt.todayIncome  as number)  ?? 0;
        const remaining    = (dt.remaining    as number)  ?? (dailyPlan - todayIncome);
        const paidPct      = dailyPlan > 0 ? Math.min(100, Math.round((todayIncome / dailyPlan) * 100)) : 0;
        const isFinal      = (dt.isFinal      as boolean) ?? false;
        const dateDisplay  = (dt.dateDisplay  as string)  ?? '';
        const avatarUrl    = (dt.driverAvatar as string | undefined);

        const barColor     = paidPct >= 80 ? 'bg-teal-500' : paidPct >= 50 ? 'bg-amber-500' : 'bg-red-500';
        const badgeBg      = isFinal
            ? (isDark ? 'bg-red-500/15 text-red-400' : 'bg-red-50 text-red-600')
            : (isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-700');

        return (
            <div
                key={notification.id}
                onClick={() => !isRead && onMarkAsRead(notification.id)}
                className={`group relative transition-colors ${
                    !isRead ? 'border-l-[3px] border-orange-400' : 'border-l-[3px] border-transparent'
                } ${
                    isRead
                        ? isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-black/[0.03]'
                        : isDark ? 'bg-orange-500/[0.06] hover:bg-orange-500/10 cursor-pointer'
                               : 'bg-orange-50/50 hover:bg-orange-50 cursor-pointer'
                }`}
            >
                <div className="px-4 py-4 pr-10">
                    {/* Header row: avatar + name + badge */}
                    <div className="flex items-center gap-3 mb-3">
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
                                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-orange-500/15' : 'bg-orange-100'}`}
                                style={{ display: avatarUrl ? 'none' : 'flex' }}
                            >
                                <AlertTriangleIcon className={`w-5 h-5 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
                            </div>
                            {!isRead && (
                                <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-orange-400 border-2 ${isDark ? 'border-[#080808]' : 'border-white'}`} />
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                                <p className={`text-[13px] font-bold leading-tight truncate ${isRead ? isDark ? 'text-gray-500' : 'text-gray-400' : isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {driverName}
                                </p>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${badgeBg}`}>
                                    {isFinal ? '🔴 Yakuniy' : '🟡 Eslatma'}
                                </span>
                            </div>
                            {dateDisplay && (
                                <p className={`text-[11px] flex items-center gap-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                    <CalendarIcon className="w-3 h-3" />
                                    {dateDisplay}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-2.5">
                        <div className="flex items-center justify-between mb-1">
                            <span className={`text-[11px] font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                To'langan: <span className={`font-bold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{fmtAmount(todayIncome)} UZS</span>
                            </span>
                            <span className={`text-[11px] font-bold tabular-nums ${
                                paidPct >= 80 ? 'text-teal-500' : paidPct >= 50 ? 'text-amber-500' : 'text-red-400'
                            }`}>
                                {paidPct}%
                            </span>
                        </div>
                        <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-[#2C2C2E]' : 'bg-gray-200'}`}>
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                                style={{ width: `${paidPct}%` }}
                            />
                        </div>
                    </div>

                    {/* Remaining amount + plan */}
                    <div className={`flex items-center justify-between rounded-xl px-3 py-2 ${isDark ? 'bg-[#2C2C2E]/60' : 'bg-[#F2F2F7]'}`}>
                        <div>
                            <p className={`text-[10px] font-medium mb-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Kunlik reja</p>
                            <p className={`text-xs font-bold tabular-nums ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{fmtAmount(dailyPlan)} UZS</p>
                        </div>
                        <div className="text-right">
                            <p className={`text-[10px] font-medium mb-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Qoldi</p>
                            <p className={`text-sm font-extrabold tabular-nums ${remaining > 0 ? isDark ? 'text-red-400' : 'text-red-500' : 'text-teal-500'}`}>
                                {remaining > 0 ? `−${fmtAmount(remaining)} UZS` : '✓ Bajarildi'}
                            </p>
                        </div>
                    </div>

                    {/* Time */}
                    <p className={`text-[11px] mt-2 flex items-center gap-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                        <ClockIcon className="w-3 h-3" />
                        {formatRelative(notification.createdAt)}
                    </p>
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

    // ─── Payment Transaction Card ─────────────────────────────────────────────
    const renderPaymentItem = (notification: Notification, isRead: boolean) => {
        const dt         = (notification as any).deliveryTracking ?? {};
        const txType     = dt.txType    as 'income' | 'expense' | undefined;
        const method     = dt.method    as 'cash' | 'card' | null;
        const amount     = dt.amount    as number | undefined;
        const driverName = dt.driverName as string | undefined;
        const note       = dt.note      as string | undefined;
        const dateStr    = dt.dateStr   as string | undefined;
        const timeStr    = dt.timeStr   as string | undefined;
        const avatarUrl  = dt.driverAvatar as string | undefined;
        const chequeUrl  = dt.chequeImage  as string | undefined;

        const isIncome = txType ? txType === 'income'
            : notification.title.includes('Kirim') || notification.title.includes('💵') || notification.title.includes('💳');
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
                        ? isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-black/[0.03]'
                        : isDark ? 'bg-white/[0.05] hover:bg-white/[0.07] cursor-pointer'
                               : 'bg-teal-50/60 hover:bg-teal-50 cursor-pointer'
                }`}
            >
                <div className="px-4 py-3.5 pr-10">
                    <div className="flex items-start gap-3">
                        {/* Avatar */}
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
                                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-white/[0.07]' : 'bg-gray-100'}`}
                                style={{ display: avatarUrl ? 'none' : 'flex' }}
                            >
                                {isIncome
                                    ? <TrendingUpIcon   className={`w-5 h-5 ${isDark ? 'text-teal-400' : 'text-teal-600'}`} />
                                    : <TrendingDownIcon className={`w-5 h-5 ${isDark ? 'text-red-400'  : 'text-red-500'}`}  />
                                }
                            </div>
                            {!isRead && (
                                <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-teal-500 border-2 ${isDark ? 'border-[#080808]' : 'border-white'}`} />
                            )}
                        </div>

                        {/* Body */}
                        <div className="flex-1 min-w-0">
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
                                    <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                        <CreditCardIcon className="w-2.5 h-2.5" /> Karta
                                    </span>
                                )}
                                {method === 'cash' && (
                                    <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${isDark ? 'bg-green-500/15 text-green-400' : 'bg-green-50 text-green-700'}`}>
                                        <BanknoteIcon className="w-2.5 h-2.5" /> Naqd
                                    </span>
                                )}
                                {chequeUrl && (
                                    <a
                                        href={chequeUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={e => e.stopPropagation()}
                                        className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md font-semibold transition-colors ${isDark ? 'bg-[#2C2C2E] text-gray-400 hover:bg-white/[0.06] hover:text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'}`}
                                    >
                                        <ReceiptIcon className="w-2.5 h-2.5" /> Chek
                                    </a>
                                )}
                            </div>

                            {note && (
                                <p className={`text-[11px] mb-1.5 truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                    📝 {note}
                                </p>
                            )}

                            <div className={`flex items-center gap-1.5 text-[11px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                                <ClockIcon className="w-3 h-3" />
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

    // ─── Generic Card ─────────────────────────────────────────────────────────
    const renderGenericItem = (notification: Notification, isRead: boolean) => (
        <div
            key={notification.id}
            onClick={() => !isRead && onMarkAsRead(notification.id)}
            className={`group relative transition-colors border-l-[3px] ${
                !isRead ? 'border-purple-500' : 'border-transparent'
            } ${
                isRead
                    ? isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-black/[0.03]'
                    : isDark ? 'bg-purple-500/[0.05] hover:bg-purple-500/[0.08] cursor-pointer'
                           : 'bg-purple-50/40 hover:bg-purple-50 cursor-pointer'
            }`}
        >
            <div className="px-4 py-3.5 pr-10">
                <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-white/[0.07]' : 'bg-gray-100'}`}>
                        {getTypeIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className={`text-[13px] font-semibold truncate mb-0.5 ${isRead ? isDark ? 'text-gray-500' : 'text-gray-400' : isDark ? 'text-white' : 'text-gray-900'}`}>
                            {notification.title}
                        </p>
                        <p className={`text-xs leading-relaxed line-clamp-2 mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            {notification.message}
                        </p>
                        <p className={`text-[11px] flex items-center gap-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                            <ClockIcon className="w-3 h-3" />
                            {formatRelative(notification.createdAt)}
                        </p>
                    </div>
                </div>
            </div>
            <button
                onClick={e => { e.stopPropagation(); onDeleteNotification(notification.id); }}
                className={`absolute top-3 right-2.5 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${isDark ? 'text-gray-600 hover:text-red-400 hover:bg-red-400/10' : 'text-gray-300 hover:text-red-500 hover:bg-red-50'}`}
            >
                <TrashIcon className="w-3 h-3" />
            </button>
        </div>
    );

    const renderItem = (notification: Notification) => {
        const isRead = readIds.has(notification.id);
        const dt = (notification as any).deliveryTracking ?? {};

        // Daily plan reminder — special card with progress bar
        if (dt.reminderType === 'daily_plan') {
            return renderPlanReminder(notification, isRead);
        }

        // Payment transaction
        if (notification.type === 'payment_reminder') {
            return renderPaymentItem(notification, isRead);
        }

        // Everything else
        return renderGenericItem(notification, isRead);
    };

    // ─── Sidebar portal ───────────────────────────────────────────────────────
    const sidebar = isOpen ? createPortal(
        <>
            {/* Backdrop — sits above sidebar nav (z-[9998]) */}
            <div
                onClick={closeSidebar}
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
                style={{ zIndex: 9998 }}
            />

            {/* Drawer panel */}
            <div
                className={`fixed top-0 right-0 bottom-0 flex flex-col w-full max-w-[420px] shadow-2xl transition-transform duration-300 ease-out ${
                    visible ? 'translate-x-0' : 'translate-x-full'
                } ${isDark ? 'bg-[#1C1C1E]' : 'bg-white'}`}
                style={{ zIndex: 9999 }}
            >
                {/* Header */}
                <div className={`flex-shrink-0 px-5 py-4 border-b ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDark ? 'bg-teal-500/15' : 'bg-teal-50'}`}>
                                <BellIcon className={`w-4 h-4 ${isDark ? 'text-teal-400' : 'text-teal-600'}`} />
                            </div>
                            <div>
                                <h2 className={`text-sm font-bold leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {t('notifications') || 'Bildirishnomalar'}
                                </h2>
                                <p className={`text-[11px] leading-tight ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                    {notifications.length > 0 ? `${notifications.length} ta xabar` : "Hamma narsa o'qildi"}
                                </p>
                            </div>
                            {unreadCount > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-teal-500 text-white text-[11px] font-bold leading-none">
                                    {unreadCount}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-1">
                            {unreadCount > 0 && (
                                <button
                                    onClick={onMarkAllAsRead}
                                    title="Barchasini o'qildi deb belgilash"
                                    className={`p-2 rounded-xl transition-colors ${isDark ? 'text-gray-500 hover:text-teal-400 hover:bg-teal-400/10' : 'text-gray-400 hover:text-teal-600 hover:bg-teal-50'}`}
                                >
                                    <CheckCheckIcon className="w-4 h-4" />
                                </button>
                            )}
                            {readIds.size > 0 && (
                                <button
                                    onClick={onClearAllRead}
                                    title="O'qilganlarni o'chirish"
                                    className={`p-2 rounded-xl transition-colors ${isDark ? 'text-gray-500 hover:text-red-400 hover:bg-red-400/10' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                onClick={closeSidebar}
                                className={`p-2 rounded-xl transition-colors ${isDark ? 'text-gray-500 hover:text-white hover:bg-white/[0.06]' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
                            >
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Notification list */}
                <div className={`flex-1 overflow-y-auto divide-y ${isDark ? 'divide-white/[0.05]' : 'divide-black/[0.05]'}`}>
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-20 px-8 text-center">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${isDark ? 'bg-[#2C2C2E]' : 'bg-gray-100'}`}>
                                <BellIcon className={`w-7 h-7 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                            </div>
                            <p className={`text-sm font-semibold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                {t('noNotifications') || "Bildirishnomalar yo'q"}
                            </p>
                            <p className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                                Yangi xabarlar shu yerda ko'rinadi
                            </p>
                        </div>
                    ) : (
                        notifications.slice(0, 30).map(renderItem)
                    )}
                </div>

                {/* Footer */}
                {notifications.length > 0 && (
                    <div className={`flex-shrink-0 px-5 py-3 border-t ${isDark ? 'border-white/[0.06] bg-[#1C1C1E]' : 'border-gray-100 bg-white'}`}
>
                        <p className={`text-center text-[11px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                            {notifications.length} ta bildirishnoma · So'nggi 14 soat
                        </p>
                    </div>
                )}
            </div>
        </>,
        document.body
    ) : null;

    return (
        <>
            {/* Bell button */}
            <button
                onClick={openSidebar}
                className={`relative p-2 rounded-xl transition-colors ${isDark
                    ? 'hover:bg-white/[0.06] text-gray-300 hover:text-white'
                    : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'}`}
                aria-label="Bildirishnomalar"
            >
                <BellIcon className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Full-height sidebar portal */}
            {sidebar}
        </>
    );
};

export default NotificationBell;
