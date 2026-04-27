import React, { useState, useEffect, useMemo } from 'react';
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
    CarIcon,
} from './Icons';

type Tab = 'warnings' | 'transactions';

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

const PAGE_SIZE = 20;

const fmtAmount = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n));

function isPlanReminder(n: Notification) {
    return ((n as any).deliveryTracking?.reminderType === 'daily_plan');
}

function isTransaction(n: Notification) {
    return n.type === 'payment_reminder' && !isPlanReminder(n);
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
    const [isOpen, setIsOpen]       = useState(false);
    const [visible, setVisible]     = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('warnings');
    const [warnPage, setWarnPage]   = useState(1);
    const [txPage, setTxPage]       = useState(1);

    const isDark = theme === 'dark';

    // Animate open/close
    useEffect(() => {
        if (isOpen) {
            requestAnimationFrame(() => setVisible(true));
        } else {
            setVisible(false);
        }
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeSidebar(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    // Prevent body scroll while open
    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    // Reset pagination when switching tabs
    useEffect(() => { setWarnPage(1); setTxPage(1); }, [activeTab]);

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

    // Split notifications into two buckets
    const warnings     = useMemo(() => notifications.filter(n => isPlanReminder(n) || (!isTransaction(n) && !isPlanReminder(n) && n.type !== 'payment_reminder')), [notifications]);
    const transactions = useMemo(() => notifications.filter(isTransaction), [notifications]);

    const unreadWarnings     = warnings.filter(n => !readIds.has(n.id)).length;
    const unreadTransactions = transactions.filter(n => !readIds.has(n.id)).length;

    // Summary stats for warnings tab
    const warnStats = useMemo(() => {
        const planItems = warnings.filter(isPlanReminder);
        const totalRemaining = planItems.reduce((sum, n) => {
            const dt = (n as any).deliveryTracking ?? {};
            return sum + ((dt.remaining as number) ?? 0);
        }, 0);
        return { count: planItems.length, totalRemaining };
    }, [warnings]);

    // ─── Daily Plan Reminder Card ───────────────────────────────────────────
    const renderPlanReminder = (notification: Notification, isRead: boolean) => {
        const dt          = (notification as any).deliveryTracking ?? {};
        const driverName  = (dt.driverName  as string)  ?? notification.title.split(' — ')[0] ?? 'Haydovchi';
        const dailyPlan   = (dt.dailyPlan   as number)  ?? 0;
        const todayIncome = (dt.todayIncome as number)  ?? 0;
        const remaining   = (dt.remaining   as number)  ?? (dailyPlan - todayIncome);
        const paidPct     = dailyPlan > 0 ? Math.min(100, Math.round((todayIncome / dailyPlan) * 100)) : 0;
        const dateDisplay = (dt.dateDisplay as string)  ?? '';
        const avatarUrl   = (dt.driverAvatar as string | undefined);
        const carName     = (dt.carName  as string | null) ?? null;
        const carPlate    = (dt.carPlate as string | null) ?? null;

        const barColor = paidPct >= 80 ? 'bg-teal-500' : paidPct >= 50 ? 'bg-amber-500' : 'bg-red-500';

        return (
            <div
                key={notification.id}
                onClick={() => !isRead && onMarkAsRead(notification.id)}
                className={`group relative transition-colors ${
                    !isRead ? 'border-l-[3px] border-red-500' : 'border-l-[3px] border-transparent'
                } ${
                    isRead
                        ? isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-black/[0.02]'
                        : isDark ? 'bg-red-500/[0.06] hover:bg-red-500/[0.09] cursor-pointer'
                               : 'bg-red-50/60 hover:bg-red-50 cursor-pointer'
                }`}
            >
                <div className="px-4 py-3.5 pr-10">
                    {/* Avatar + name */}
                    <div className="flex items-center gap-3 mb-3">
                        <div className="relative flex-shrink-0">
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl} alt=""
                                    className={`w-9 h-9 rounded-xl object-cover ${isRead ? 'opacity-40' : ''}`}
                                    onError={e => {
                                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                                        (e.currentTarget.nextElementSibling as HTMLElement | null)?.removeAttribute('style');
                                    }}
                                />
                            ) : null}
                            <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-red-500/15' : 'bg-red-50'}`}
                                style={{ display: avatarUrl ? 'none' : 'flex' }}
                            >
                                <AlertTriangleIcon className={`w-4 h-4 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
                            </div>
                            {!isRead && (
                                <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 border-2 ${isDark ? 'border-[#171f33]' : 'border-white'}`} />
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <p className={`text-[13px] font-semibold leading-tight truncate ${isRead ? isDark ? 'text-gray-500' : 'text-gray-400' : isDark ? 'text-white' : 'text-gray-900'}`}>
                                {driverName}
                            </p>
                            {dateDisplay && (
                                <p className={`text-[11px] flex items-center gap-1 mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                    <CalendarIcon className="w-3 h-3" />
                                    {dateDisplay}
                                </p>
                            )}
                            {carName && (
                                <p className={`text-[11px] flex items-center gap-1.5 mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                    <CarIcon className="w-3 h-3 flex-shrink-0" />
                                    <span className="truncate">{carName}</span>
                                    {carPlate && (
                                        <span className={`px-1 py-0.5 rounded text-[10px] font-mono flex-shrink-0 ${isDark ? 'bg-white/[0.08] text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                                            {carPlate}
                                        </span>
                                    )}
                                </p>
                            )}
                        </div>

                        {/* Percent badge */}
                        <span className={`text-[12px] font-bold tabular-nums flex-shrink-0 ${
                            paidPct >= 80 ? 'text-teal-500' : paidPct >= 50 ? 'text-amber-500' : isDark ? 'text-red-400' : 'text-red-500'
                        }`}>
                            {paidPct}%
                        </span>
                    </div>

                    {/* Progress bar */}
                    <div className={`w-full h-1.5 rounded-full overflow-hidden mb-2.5 ${isDark ? 'bg-surface-2' : 'bg-[#E5E5EA]'}`}>
                        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${paidPct}%` }} />
                    </div>

                    {/* Plan / paid / remaining row */}
                    <div className={`grid grid-cols-3 gap-1.5 rounded-xl px-3 py-2 text-center ${isDark ? 'bg-white/[0.05]' : 'bg-[#F2F2F7]'}`}>
                        <div>
                            <p className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Reja</p>
                            <p className={`text-[11px] font-semibold tabular-nums ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{fmtAmount(dailyPlan)}</p>
                        </div>
                        <div>
                            <p className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>To'landi</p>
                            <p className={`text-[11px] font-semibold tabular-nums text-teal-500`}>{fmtAmount(todayIncome)}</p>
                        </div>
                        <div>
                            <p className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Qoldi</p>
                            <p className={`text-[11px] font-bold tabular-nums ${isDark ? 'text-red-400' : 'text-red-500'}`}>
                                {remaining > 0 ? `−${fmtAmount(remaining)}` : '✓'}
                            </p>
                        </div>
                    </div>

                    <p className={`text-[10px] mt-2 flex items-center gap-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                        <ClockIcon className="w-3 h-3" />
                        {formatRelative(notification.createdAt)}
                    </p>
                </div>

                <button
                    onClick={e => { e.stopPropagation(); onDeleteNotification(notification.id); }}
                    className={`absolute top-3 right-2.5 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${isDark ? 'text-gray-600 hover:text-red-400 hover:bg-red-400/10' : 'text-gray-300 hover:text-red-500 hover:bg-red-50'}`}
                >
                    <TrashIcon className="w-3 h-3" />
                </button>
            </div>
        );
    };

    // ─── Payment Transaction Card ───────────────────────────────────────────
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
                        ? isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-black/[0.02]'
                        : isDark ? 'bg-white/[0.05] hover:bg-white/[0.07] cursor-pointer'
                               : 'bg-teal-50/60 hover:bg-teal-50 cursor-pointer'
                }`}
            >
                <div className="px-4 py-3.5 pr-10">
                    <div className="flex items-start gap-3">
                        <div className="relative flex-shrink-0">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt=""
                                    className={`w-9 h-9 rounded-xl object-cover ${isRead ? 'opacity-40' : ''}`}
                                    onError={e => {
                                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                                        (e.currentTarget.nextElementSibling as HTMLElement | null)?.removeAttribute('style');
                                    }}
                                />
                            ) : null}
                            <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-white/[0.07]' : 'bg-gray-100'}`}
                                style={{ display: avatarUrl ? 'none' : 'flex' }}
                            >
                                {isIncome
                                    ? <TrendingUpIcon   className={`w-4 h-4 ${isDark ? 'text-teal-400' : 'text-teal-600'}`} />
                                    : <TrendingDownIcon className={`w-4 h-4 ${isDark ? 'text-red-400'  : 'text-red-500'}`}  />
                                }
                            </div>
                            {!isRead && (
                                <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full bg-teal-500 border-2 ${isDark ? 'border-[#171f33]' : 'border-white'}`} />
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                                <p className={`text-[13px] font-semibold leading-tight truncate ${isRead ? isDark ? 'text-gray-500' : 'text-gray-400' : isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {nameDisplay}
                                </p>
                                <span className={`text-[13px] font-bold font-mono flex-shrink-0 tabular-nums ${isRead ? isDark ? 'text-gray-600' : 'text-gray-400' : isIncome ? 'text-teal-500' : 'text-red-400'}`}>
                                    {isIncome ? '+' : '−'}{amountDisplay} UZS
                                </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 mb-2">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold tracking-wide ${
                                    isIncome
                                        ? isDark ? 'bg-teal-500/15 text-teal-400' : 'bg-teal-50 text-teal-700'
                                        : isDark ? 'bg-red-500/15 text-red-400'  : 'bg-red-50 text-red-600'
                                }`}>
                                    {isIncome ? '↑ KIRIM' : '↓ CHIQIM'}
                                </span>
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
                                    <a href={chequeUrl} target="_blank" rel="noopener noreferrer"
                                        onClick={e => e.stopPropagation()}
                                        className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md font-semibold transition-colors ${isDark ? 'bg-surface-2 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700'}`}
                                    >
                                        <ReceiptIcon className="w-2.5 h-2.5" /> Chek
                                    </a>
                                )}
                            </div>

                            {note && (
                                <p className={`text-[11px] mb-1.5 truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>📝 {note}</p>
                            )}

                            <div className={`flex items-center gap-1.5 text-[10px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                                <ClockIcon className="w-3 h-3" />
                                <span>{formatRelative(notification.createdAt)}</span>
                                {dateStr && timeStr && <><span>·</span><span className="font-mono">{dateStr}, {timeStr}</span></>}
                            </div>
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
    };

    // ─── Generic Card ───────────────────────────────────────────────────────
    const renderGenericItem = (notification: Notification, isRead: boolean) => {
        const getTypeIcon = (type: NotificationType) => {
            const cls = 'w-4 h-4';
            switch (type) {
                case 'feature_update': return <ZapIcon      className={cls} />;
                case 'announcement':   return <BellIcon     className={cls} />;
                case 'system':         return <SettingsIcon className={cls} />;
                default:               return <BellIcon     className={cls} />;
            }
        };
        return (
            <div
                key={notification.id}
                onClick={() => !isRead && onMarkAsRead(notification.id)}
                className={`group relative transition-colors border-l-[3px] ${
                    !isRead ? 'border-violet-500' : 'border-transparent'
                } ${
                    isRead
                        ? isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-black/[0.02]'
                        : isDark ? 'bg-violet-500/[0.05] hover:bg-violet-500/[0.08] cursor-pointer'
                               : 'bg-violet-50/40 hover:bg-violet-50 cursor-pointer'
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
                            <p className={`text-[11px] leading-relaxed line-clamp-2 mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                {notification.message}
                            </p>
                            <p className={`text-[10px] flex items-center gap-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
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
    };

    const renderItem = (notification: Notification) => {
        const isRead = readIds.has(notification.id);
        if (isPlanReminder(notification))  return renderPlanReminder(notification, isRead);
        if (isTransaction(notification))   return renderPaymentItem(notification, isRead);
        return renderGenericItem(notification, isRead);
    };

    // ─── Warnings tab content ───────────────────────────────────────────────
    const renderWarningsTab = () => {
        const planItems = warnings.filter(isPlanReminder);
        const others    = warnings.filter(n => !isPlanReminder(n));
        const all       = [...planItems, ...others]; // plan reminders first
        const visible   = all.slice(0, warnPage * PAGE_SIZE);
        const hasMore   = visible.length < all.length;

        if (all.length === 0) return (
            <div className="flex flex-col items-center justify-center h-full py-20 px-8 text-center">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${isDark ? 'bg-surface-2' : 'bg-gray-100'}`}>
                    <AlertTriangleIcon className={`w-6 h-6 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                </div>
                <p className={`text-[13px] font-semibold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Ogohlantirishlar yo'q
                </p>
                <p className={`text-[11px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                    Barcha haydovchilar rejani bajardi
                </p>
            </div>
        );

        return (
            <>
                {/* Summary banner — only when there are plan reminders */}
                {planItems.length > 0 && (
                    <div className={`mx-4 mt-3 mb-1 rounded-2xl px-4 py-3 flex items-center justify-between ${
                        isDark ? 'bg-red-500/[0.08] border border-red-500/[0.15]' : 'bg-red-50 border border-red-100'
                    }`}>
                        <div>
                            <p className={`text-[12px] font-semibold ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                                {planItems.length} ta haydovchi to'lamagan
                            </p>
                            <p className={`text-[11px] mt-0.5 ${isDark ? 'text-red-400/70' : 'text-red-500'}`}>
                                Jami qoldi: {fmtAmount(warnStats.totalRemaining)} UZS
                            </p>
                        </div>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-red-500/15' : 'bg-red-100'}`}>
                            <AlertTriangleIcon className={`w-4 h-4 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                        </div>
                    </div>
                )}

                <div className={`divide-y ${isDark ? 'divide-white/[0.05]' : 'divide-black/[0.04]'}`}>
                    {visible.map(renderItem)}
                </div>

                {hasMore && (
                    <button
                        onClick={() => setWarnPage(p => p + 1)}
                        className={`w-full py-3 text-[13px] font-medium transition-colors ${
                            isDark ? 'text-gray-400 hover:text-white hover:bg-white/[0.04]' : 'text-gray-500 hover:text-gray-900 hover:bg-black/[0.03]'
                        }`}
                    >
                        Ko'proq ko'rsatish ({all.length - visible.length} ta qoldi)
                    </button>
                )}
            </>
        );
    };

    // ─── Transactions tab content ───────────────────────────────────────────
    const renderTransactionsTab = () => {
        const visible = transactions.slice(0, txPage * PAGE_SIZE);
        const hasMore = visible.length < transactions.length;

        if (transactions.length === 0) return (
            <div className="flex flex-col items-center justify-center h-full py-20 px-8 text-center">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${isDark ? 'bg-surface-2' : 'bg-gray-100'}`}>
                    <TrendingUpIcon className={`w-6 h-6 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                </div>
                <p className={`text-[13px] font-semibold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    O'tkazmalar yo'q
                </p>
                <p className={`text-[11px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                    Bot orqali yuborilgan o'tkazmalar bu yerda ko'rinadi
                </p>
            </div>
        );

        return (
            <>
                <div className={`divide-y ${isDark ? 'divide-white/[0.05]' : 'divide-black/[0.04]'}`}>
                    {visible.map(n => renderPaymentItem(n, readIds.has(n.id)))}
                </div>
                {hasMore && (
                    <button
                        onClick={() => setTxPage(p => p + 1)}
                        className={`w-full py-3 text-[13px] font-medium transition-colors ${
                            isDark ? 'text-gray-400 hover:text-white hover:bg-white/[0.04]' : 'text-gray-500 hover:text-gray-900 hover:bg-black/[0.03]'
                        }`}
                    >
                        Ko'proq ko'rsatish ({transactions.length - visible.length} ta qoldi)
                    </button>
                )}
            </>
        );
    };

    // ─── Sidebar portal ─────────────────────────────────────────────────────
    const sidebar = isOpen ? createPortal(
        <>
            <div
                onClick={closeSidebar}
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
                style={{ zIndex: 9998 }}
            />

            <div
                className={`fixed top-0 right-0 bottom-0 flex flex-col w-full max-w-[420px] shadow-2xl transition-transform duration-300 ease-out ${
                    visible ? 'translate-x-0' : 'translate-x-full'
                }`}
                style={{
                    zIndex: 9999,
                    background: isDark ? '#171f33' : '#faf8ff',
                }}
            >
                {/* Header */}
                <div className={`flex-shrink-0 px-5 pt-4 pb-0 border-b ${isDark ? 'border-white/[0.08]' : 'border-black/[0.07]'}`}>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${isDark ? 'bg-surface-2' : 'bg-[#F2F2F7]'}`}>
                                <BellIcon className={`w-3.5 h-3.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                            </div>
                            <h2 className={`text-[15px] font-semibold ${isDark ? 'text-white' : 'text-black'}`}>
                                Bildirishnomalar
                            </h2>
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

                    {/* Tabs */}
                    <div className="flex">
                        {([
                            { key: 'warnings' as Tab,     label: 'Ogohlantirishlar', count: unreadWarnings,     total: warnings.length },
                            { key: 'transactions' as Tab, label: "O'tkazmalar",      count: unreadTransactions, total: transactions.length },
                        ] as const).map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`relative flex items-center gap-1.5 px-1 pb-3 mr-5 text-[13px] font-medium transition-colors ${
                                    activeTab === tab.key
                                        ? isDark ? 'text-white' : 'text-black'
                                        : isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                {tab.label}
                                {tab.total > 0 && (
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                                        tab.count > 0
                                            ? 'bg-red-500 text-white'
                                            : isDark ? 'bg-white/[0.10] text-gray-400' : 'bg-black/[0.07] text-gray-500'
                                    }`}>
                                        {tab.total > 99 ? '99+' : tab.total}
                                    </span>
                                )}
                                {/* Active underline */}
                                {activeTab === tab.key && (
                                    <span className={`absolute bottom-0 left-0 right-0 h-[2px] rounded-full ${isDark ? 'bg-white' : 'bg-black'}`} />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab content */}
                <div className="flex-1 overflow-y-auto">
                    {activeTab === 'warnings'     ? renderWarningsTab()     : renderTransactionsTab()}
                </div>

                {/* Footer */}
                <div className={`flex-shrink-0 px-5 py-2.5 border-t ${isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'}`}>
                    <p className={`text-center text-[11px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                        {notifications.length} ta bildirishnoma · So'nggi 14 soat
                    </p>
                </div>
            </div>
        </>,
        document.body
    ) : null;

    return (
        <>
            <button
                onClick={openSidebar}
                className={`relative p-2 rounded-xl transition-colors ${isDark
                    ? 'hover:bg-white/[0.08] text-[rgba(235,235,245,0.6)] hover:text-white'
                    : 'hover:bg-black/[0.06] text-[rgba(60,60,67,0.6)] hover:text-black'}`}
                aria-label="Bildirishnomalar"
            >
                <BellIcon className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {sidebar}
        </>
    );
};

export default NotificationBell;
