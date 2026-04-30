import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Driver, Transaction, TransactionType } from '../../core/types';
import { PaymentStatus } from '../../core/types/transaction.types';
import { Car } from '../../core/types/car.types';
import { DriverPlanCalendarModal, DriverPlanMonthInfo } from './components/DriverPlanCalendarModal';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MonthRow {
    driver: Driver;
    car: Car | null;
    monthKey: string;      // 'YYYY-MM'
    totalDays: number;
    workingDays: number;
    dailyPlan: number;
    monthlyTarget: number;
    actualIncome: number;
    remaining: number;     // positive = still owes, 0 or negative = done/overpaid
    paidPercent: number;   // 0–100
    isFutureMonth: boolean;
}

interface DriverPlanSummaryProps {
    drivers: Driver[];
    cars: Car[];
    transactions: Transaction[];
    startDate: Date;
    endDate: Date;
    filterDriverId: string; // 'all' or a driver id
    theme: 'dark' | 'light';
    onDayClick?: (driverId: string, date: Date) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
    new Intl.NumberFormat('uz-UZ').format(Math.round(Math.abs(n)));

const toMonthKey = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
};

const daysInMonthForKey = (mk: string): number => {
    const [y, m] = mk.split('-').map(Number);
    return new Date(y, m, 0).getDate();
};

const monthDisplayLabel = (mk: string, months: string[]): string => {
    const [y, m] = mk.split('-').map(Number);
    return `${months[m - 1] ?? mk} ${y}`;
};

/** All YYYY-MM keys from startDate to endDate inclusive */
const monthRange = (start: Date, end: Date): string[] => {
    const keys: string[] = [];
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);
    const last = new Date(end.getFullYear(), end.getMonth(), 1);
    while (cur <= last) {
        keys.push(toMonthKey(cur));
        cur.setMonth(cur.getMonth() + 1);
    }
    return keys;
};

// ─── Component ────────────────────────────────────────────────────────────────

export const DriverPlanSummary: React.FC<DriverPlanSummaryProps> = ({
    drivers, cars, transactions, startDate, endDate, filterDriverId, theme, onDayClick
}) => {
    const { t } = useTranslation();
    const isDark = theme === 'dark';
    const monthNames = t('months', { returnObjects: true }) as string[];
    const months = useMemo(() => monthRange(startDate, endDate), [startDate, endDate]);
    
    // Store only a selection key so the modal always derives live data from reactive rows
    const [selectedKey, setSelectedKey] = useState<{ driverId: string; monthKey: string } | null>(null);

    const rows = useMemo((): MonthRow[] => {
        const result: MonthRow[] = [];

        const activeDrivers = drivers.filter(d => !d.isDeleted &&
            (filterDriverId === 'all' || d.id === filterDriverId));

        for (const driver of activeDrivers) {
            const car = cars.find(c => c.assignedDriverId === driver.id) ?? null;
            const dailyPlan = car ? (car.dailyPlan ?? 0) : 0;

            if (dailyPlan <= 0) continue; // no plan set — skip

            for (const mk of months) {
                const totalDays = daysInMonthForKey(mk);

                // Cap days correctly:
                //   future month  → 0 (not started, no debt)
                //   current month → today's date (only elapsed days count)
                //   past month    → full month days
                const today = new Date();
                const currentMk = toMonthKey(today);
                const isCurrentMonth = mk === currentMk;
                const isFutureMonth = mk > currentMk;
                const effectiveDays = isFutureMonth ? 0 : isCurrentMonth ? today.getDate() : totalDays;

                // Count actual DAY_OFF transactions for this driver in this month
                const daysOff = transactions.filter(tx =>
                    tx.driverId === driver.id &&
                    tx.type === TransactionType.DAY_OFF &&
                    tx.status !== PaymentStatus.DELETED &&
                    (tx as any).status !== 'DELETED' &&
                    toMonthKey(new Date(tx.timestamp)) === mk
                ).length;

                // Dynamic working days: elapsed days minus actual recorded day-offs
                const workingDays = Math.max(0, effectiveDays - daysOff);
                const monthlyTarget = dailyPlan * workingDays;

                const actualIncome = transactions
                    .filter(tx =>
                        tx.driverId === driver.id &&
                        tx.type === TransactionType.INCOME &&
                        tx.status !== PaymentStatus.DELETED &&
                        (tx as any).status !== 'DELETED' &&
                        toMonthKey(new Date(tx.timestamp)) === mk
                    )
                    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

                const remaining = monthlyTarget - actualIncome;
                const paidPercent = monthlyTarget > 0
                    ? Math.min(100, Math.round((actualIncome / monthlyTarget) * 100))
                    : 0;

                result.push({ driver, car, monthKey: mk, totalDays, workingDays, dailyPlan, monthlyTarget, actualIncome, remaining, paidPercent, isFutureMonth });
            }
        }
        return result;
    }, [drivers, cars, transactions, months, filterDriverId]);

    // Derive live month data from current rows — updates automatically on every realtime tx change
    const liveModalData = useMemo(() => {
        if (!selectedKey) return null;
        return rows.find(r => r.driver.id === selectedKey.driverId && r.monthKey === selectedKey.monthKey) ?? null;
    }, [selectedKey, rows]);

    if (rows.length === 0) return null;

    const totalTarget = rows.reduce((s, r) => s + r.monthlyTarget, 0);
    const totalActual = rows.reduce((s, r) => s + r.actualIncome, 0);
    const totalRemaining = totalTarget - totalActual;
    const currentMonthKey = months[0] || toMonthKey(new Date());

    return (
        <div
            className={`rounded-[32px] border shadow-sm overflow-hidden ${isDark ? 'border-white/[0.07]' : 'bg-white border-gray-200'}`}
            style={{ background: isDark ? 'var(--color-surface)' : undefined }}
        >
            <div
                className={`flex flex-wrap items-center justify-between gap-4 p-6 border-b ${isDark ? 'border-white/[0.06]' : 'border-gray-100 bg-gray-50'}`}
                style={{ background: isDark ? 'var(--color-surface-2)' : undefined }}
            >
                <div className="flex items-center gap-3">
                    <span className="text-2xl">📅</span>
                    <div>
                        <h3 className={`font-black text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>{monthDisplayLabel(currentMonthKey, monthNames)}</h3>
                        <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t('overallReport')}</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-6">
                    <div className="flex flex-col items-end">
                        <span className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t('totalPlanTarget')}</span>
                        <span className={`font-bold font-mono text-lg ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{fmt(totalTarget)} UZS</span>
                    </div>
                    <div className={`px-4 py-2 rounded-2xl flex flex-col items-end ${totalRemaining <= 0 ? (isDark ? 'bg-green-500/10' : 'bg-green-50') : (isDark ? 'bg-red-500/10' : 'bg-red-50')}`}>
                        <span className={`text-[10px] uppercase font-bold tracking-wider ${totalRemaining <= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {totalRemaining <= 0 ? t('surplusIncome') : t('remainingLabel')}
                        </span>
                        <span className={`font-black font-mono text-lg ${totalRemaining <= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {totalRemaining <= 0 ? `+${fmt(-totalRemaining)}` : `-${fmt(totalRemaining)}`} UZS
                        </span>
                    </div>
                </div>
            </div>

            <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {rows.map(row => (
                                <div
                                    key={row.driver.id}
                                    onClick={() => setSelectedKey({ driverId: row.driver.id, monthKey: row.monthKey })}
                                    className={`relative p-5 rounded-3xl border transition-all duration-300 cursor-pointer active:scale-[0.98] group overflow-hidden ${
                                        row.isFutureMonth
                                        ? isDark
                                            ? 'border-white/[0.05] opacity-60 hover:opacity-80'
                                            : 'border-gray-200/50 opacity-60 hover:opacity-80'
                                        : isDark
                                        ? 'border-white/[0.07] shadow-[0_4px_20px_rgb(0,0,0,0.35)] hover:border-white/[0.14]'
                                        : 'bg-white border-gray-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.07)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.11)] hover:border-gray-300'
                                    }`}
                                    style={{ background: isDark ? 'var(--color-surface)' : undefined }}
                                >
                                    {/* Future month overlay pattern */}
                                    {row.isFutureMonth && (
                                        <div className="absolute inset-0 rounded-3xl pointer-events-none"
                                            style={{
                                                backgroundImage: `repeating-linear-gradient(
                                                    -45deg,
                                                    transparent,
                                                    transparent 12px,
                                                    rgba(255,255,255,0.015) 12px,
                                                    rgba(255,255,255,0.015) 13px
                                                )`
                                            }}
                                        />
                                    )}

                                    {/* Inner Glow Pseudo-element */}
                                    <div className="absolute inset-0 rounded-3xl border-[0.5px] border-white/10 dark:border-white/5 pointer-events-none" />

                                    {/* Top row: driver info */}
                                    <div className="flex items-start justify-between mb-5">
                                        <div className="flex items-center gap-3.5">
                                            {row.driver.avatar ? (
                                                <img
                                                    src={row.driver.avatar}
                                                    alt={row.driver.name}
                                                    className={`w-12 h-12 rounded-full object-cover flex-shrink-0 border transition-transform duration-500 group-hover:scale-105 ${isDark ? 'border-white/[0.06]' : 'border-gray-200/50 shadow-sm'} ${row.isFutureMonth ? 'grayscale' : ''}`}
                                                />
                                            ) : (
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold tracking-tight flex-shrink-0 transition-transform duration-500 group-hover:scale-105 ${isDark ? 'bg-surface-2 text-gray-300 border-white/[0.08]' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                                                    {row.driver.name.charAt(0)}
                                                </div>
                                            )}
                                            <div className="flex flex-col">
                                                <p className={`font-semibold text-base tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                    {row.driver.name}
                                                </p>
                                                <p className={`text-xs font-medium mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    {row.car ? `${row.car.name} · ${row.car.licensePlate}` : t('noCar')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status badge */}
                                    <div className="mb-6">
                                        {row.isFutureMonth ? (
                                            <div className={`px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide inline-flex items-center gap-1.5 border ${
                                                isDark
                                                    ? 'bg-white/[0.04] text-gray-500 border-white/[0.08]'
                                                    : 'bg-gray-100 text-gray-400 border-gray-200'
                                            }`}>
                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                                                </svg>
                                                {t('monthNotStarted') ?? 'Oy boshlanmagan'}
                                            </div>
                                        ) : (
                                            <div className={`px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide inline-flex items-center gap-1.5 backdrop-blur-md shadow-sm transition-colors ${
                                                row.remaining <= 0
                                                    ? isDark ? 'bg-green-500/15 text-green-400 border border-green-500/20' : 'bg-green-100/80 text-green-700 border border-green-200'
                                                    : row.paidPercent >= 60
                                                    ? isDark ? 'bg-sky-500/15 text-sky-400 border border-sky-500/20' : 'bg-sky-100/80 text-sky-700 border border-sky-200'
                                                    : row.paidPercent >= 30
                                                    ? isDark ? 'bg-pink-500/15 text-pink-400 border border-pink-500/20' : 'bg-pink-100/80 text-pink-700 border border-pink-200'
                                                    : isDark ? 'bg-pink-600/15 text-pink-400 border border-pink-600/20' : 'bg-pink-100/80 text-pink-700 border border-pink-200'
                                            }`}>
                                                {row.remaining <= 0
                                                    ? `✓ ${t('planCompleted')}`
                                                    : row.paidPercent >= 60
                                                    ? `⚡ ${t('progressGood')} (${row.paidPercent}%)`
                                                    : `⚠ ${t('paymentsLate')}`}
                                            </div>
                                        )}
                                    </div>

                                    {/* Primary Mini-Stats */}
                                    {row.isFutureMonth ? (
                                        /* Future month: show daily plan as the only meaningful number */
                                        <div className="flex flex-col gap-1 mb-6">
                                            <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>{t('dailyPlan')}</p>
                                            <p className={`text-lg font-black tracking-tight ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                {fmt(row.dailyPlan)} <span className="text-sm font-normal">/ {t('dailyPlanUnit')}</span>
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-4 mb-6">
                                            <div className="flex flex-col gap-1">
                                                <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t('monthlyPlan')}</p>
                                                <p className={`text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{fmt(row.monthlyTarget)}</p>
                                            </div>
                                            <div className="flex flex-col gap-1 items-start">
                                                <p className={`text-[10px] font-bold uppercase tracking-widest ${row.remaining <= 0 ? 'text-green-500/80' : isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t('totalPaidAmount')}</p>
                                                <p className={`text-lg font-black tracking-tight ${row.actualIncome >= row.monthlyTarget ? 'text-green-500' : isDark ? 'text-white' : 'text-gray-900'}`}>{fmt(row.actualIncome)}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Progress bar */}
                                    <div className="relative z-10">
                                        {row.isFutureMonth ? (
                                            /* Dashed empty bar for future months */
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className={`text-xs font-semibold ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                                                        — % {t('completedPercent')}
                                                    </span>
                                                    <span className={`text-xs font-medium ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                                                        {t('waitingToStart') ?? 'Kutilmoqda'}
                                                    </span>
                                                </div>
                                                <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/[0.05]' : 'bg-gray-100'}`}
                                                    style={{ backgroundImage: `repeating-linear-gradient(90deg, ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'} 0px, ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'} 6px, transparent 6px, transparent 12px)` }}
                                                />
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                        {row.paidPercent}% {t('completedPercent')}
                                                    </span>
                                                    <span className={`text-xs font-bold tracking-tight ${row.remaining <= 0 ? (isDark ? 'text-green-400' : 'text-green-600') : ''}`}
                                                        style={{ color: row.remaining > 0 ? (row.paidPercent >= 60 ? 'hsl(208, 100%, 45%)' : 'deeppink') : undefined }}
                                                    >
                                                        {row.remaining > 0
                                                            ? `${t('remainingShort')}: ${fmt(row.remaining)}`
                                                            : `+${fmt(-row.remaining)}`}
                                                    </span>
                                                </div>
                                                <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/[0.08]' : 'bg-gray-200'}`}>
                                                    <div
                                                        className="h-full rounded-full transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)]"
                                                        style={{
                                                            width: `${Math.min(100, row.paidPercent)}%`,
                                                            background: row.paidPercent >= 60
                                                                ? '#22c55e'
                                                                : row.paidPercent >= 30
                                                                ? 'hsl(208, 100%, 45%)'
                                                                : 'deeppink'
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Subtle Background Glow */}
                                    {!row.isFutureMonth && (
                                        <div className={`absolute bottom-0 right-0 w-40 h-40 rounded-full blur-[50px] pointer-events-none transition-opacity duration-700 ease-in-out mix-blend-screen opacity-0 group-hover:opacity-10 ${row.remaining <= 0 ? 'bg-green-400' : 'bg-blue-400'}`} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
            {/* Modal — liveModalData is re-derived from reactive rows on every tx change */}
            <DriverPlanCalendarModal 
                isOpen={selectedKey !== null}
                onClose={() => setSelectedKey(null)}
                theme={theme}
                monthData={liveModalData as unknown as DriverPlanMonthInfo}
                transactions={transactions}
                onDayClick={onDayClick}
            />
        </div>
    );
};
