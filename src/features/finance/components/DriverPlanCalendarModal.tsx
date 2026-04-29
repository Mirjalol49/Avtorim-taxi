import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { XIcon } from '../../../../components/Icons';
import { Driver, Transaction, TransactionType } from '../../../core/types';
import { Car } from '../../../core/types/car.types';
import { PaymentStatus } from '../../../core/types/transaction.types';

export interface DriverPlanMonthInfo {
    driver: Driver;
    car: Car | null;
    monthKey: string;
    totalDays: number;
    workingDays: number;
    dailyPlan: number;
    monthlyTarget: number;
    actualIncome: number;
    remaining: number;
    paidPercent: number;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    theme: 'dark' | 'light';
    monthData: DriverPlanMonthInfo | null;
    transactions: Transaction[];
    onDayClick?: (driverId: string, date: Date) => void;
}

const fmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(Math.abs(n)));

type DayStatus = 'PAID' | 'PARTIAL' | 'UNPAID' | 'DAY_OFF' | 'FUTURE';

const StatusIcon: React.FC<{ status: DayStatus }> = ({ status }) => {
    if (status === 'PAID') return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 text-emerald-500" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M7.5 12.5l3 3 6-6" />
        </svg>
    );
    if (status === 'UNPAID') return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 text-red-500" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    );
    if (status === 'PARTIAL') return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 text-amber-500" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 0 1 0 20V2z" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="10" />
        </svg>
    );
    if (status === 'DAY_OFF') return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 text-blue-500" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
        </svg>
    );
    return null;
};

export const DriverPlanCalendarModal: React.FC<Props> = ({ isOpen, onClose, theme, monthData, transactions, onDayClick }) => {
    const { t } = useTranslation();
    const isDark = theme === 'dark';
    const monthNames = t('months', { returnObjects: true }) as string[];

    const todayStr = useMemo(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }, []);

    React.useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    const days = useMemo(() => {
        if (!monthData) return [];
        const [yStr, mStr] = monthData.monthKey.split('-');
        const year = parseInt(yStr, 10);
        const month = parseInt(mStr, 10) - 1;

        const toLocalDateStr = (ts: number) => {
            const d = new Date(ts);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        };

        return Array.from({ length: monthData.totalDays }, (_, i) => {
            const d = i + 1;
            const date = new Date(year, month, d);
            const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

            const sumTushum = transactions
                .filter(tx =>
                    tx.driverId === monthData.driver.id &&
                    tx.type === TransactionType.INCOME &&
                    tx.status !== PaymentStatus.DELETED &&
                    (tx as any).status !== 'DELETED' &&
                    toLocalDateStr(tx.timestamp) === dayStr
                )
                .reduce((acc, tx) => acc + Math.abs(tx.amount), 0);

            const isDayOff = transactions.some(tx =>
                tx.driverId === monthData.driver.id &&
                tx.type === 'DAY_OFF' &&
                toLocalDateStr(tx.timestamp) === dayStr
            );

            // A day with a recorded payment is always PAID or PARTIAL — even if the
            // calendar date is technically in the future. Only show FUTURE for days
            // that have no income at all yet.
            const isFuture = date.getTime() > Date.now();
            let status: DayStatus = 'UNPAID';
            if (isDayOff) status = 'DAY_OFF';
            else if (sumTushum >= monthData.dailyPlan) status = 'PAID';
            else if (sumTushum > 0) status = 'PARTIAL';
            else if (isFuture) status = 'FUTURE';

            return {
                day: d,
                date,
                dayStr,
                status,
                income: sumTushum,
                debt: status !== 'FUTURE' ? Math.max(0, monthData.dailyPlan - sumTushum) : 0,
            };
        });
    }, [monthData, transactions]);

    if (!isOpen || !monthData) return null;

    const [yStr, mStr] = monthData.monthKey.split('-');
    const firstDayIndex = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, 1).getDay();
    const padDays = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const weekdayLabels = (t('weekdays', { returnObjects: true }) as string[]);
    const orderedDays = [...weekdayLabels.slice(1), weekdayLabels[0]]; // Mon–Sun

    // Card background & border per status
    const cardStyle = (status: DayStatus, isToday: boolean): string => {
        if (isToday) {
            return isDark
                ? 'bg-surface-2 border-2 border-blue-500 shadow-[0_0_0_2px_rgba(59,130,246,0.15)]'
                : 'bg-white border-2 border-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.10)]';
        }
        if (status === 'FUTURE') {
            return isDark
                ? 'bg-surface border border-white/[0.04] opacity-40'
                : 'bg-gray-50/70 border border-gray-100 opacity-60';
        }
        if (status === 'DAY_OFF') {
            return isDark
                ? 'bg-surface-2 border border-blue-500/20'
                : 'bg-slate-50 border border-slate-200';
        }
        return isDark
            ? 'bg-surface-2 border border-white/[0.06] hover:border-white/[0.12]'
            : 'bg-white border border-gray-200 hover:border-gray-300';
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            {/* Backdrop */}
            <div
                className={`absolute inset-0 transition-opacity duration-300 ${isDark ? 'bg-black/75 backdrop-blur-md' : 'bg-gray-900/40 backdrop-blur-sm'}`}
                onClick={onClose}
            />

            <div
                className={`relative w-full max-w-6xl h-full max-h-[92vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border ${
                    isDark ? 'bg-[#0b1326] border-white/[0.08]' : 'bg-[#faf8ff] border-gray-200'
                }`}
            >
                {/* ── Header ── */}
                <div
                    className={`flex items-center justify-between px-5 py-4 sm:px-6 sm:py-5 border-b flex-shrink-0 ${
                        isDark ? 'border-white/[0.06] bg-surface' : 'border-gray-100 bg-white'
                    }`}
                >
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        {monthData.driver.avatar ? (
                            <img
                                src={monthData.driver.avatar}
                                alt="Avatar"
                                className="w-11 h-11 rounded-2xl object-cover flex-shrink-0"
                            />
                        ) : (
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-base font-bold flex-shrink-0 ${isDark ? 'bg-surface-2 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                                {monthData.driver.name.charAt(0)}
                            </div>
                        )}
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className={`text-lg sm:text-xl font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {monthData.driver.name}
                                </h2>
                                <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full flex-shrink-0 ${isDark ? 'bg-surface-3 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                                    {monthNames[parseInt(mStr, 10) - 1] ?? mStr} {yStr}
                                </span>
                            </div>
                            <p className={`text-xs sm:text-sm font-medium mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                {t('dailyPlan')}: <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>{fmt(monthData.dailyPlan)} UZS</span> {t('dailyPlanUnit')}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className={`w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0 transition-colors ml-2 ${isDark ? 'text-gray-500 hover:text-white hover:bg-white/[0.06]' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* ── Content ── */}
                <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 space-y-5">

                    {/* Stats row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {/* Monthly plan */}
                        <div className={`p-4 rounded-2xl ${isDark ? 'bg-surface border border-white/[0.06]' : 'bg-white border border-gray-200'}`}>
                            <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t('monthlyPlan') ?? 'Oylik Reja'}</p>
                            <p className={`text-xl font-black font-mono tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>{fmt(monthData.monthlyTarget)}</p>
                        </div>
                        {/* Paid */}
                        <div className={`p-4 rounded-2xl ${isDark ? 'bg-emerald-500/[0.08] border border-emerald-500/[0.15]' : 'bg-emerald-50 border border-emerald-200'}`}>
                            <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{t('totalPaidAmount')}</p>
                            <p className={`text-xl font-black font-mono tabular-nums ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{fmt(monthData.actualIncome)}</p>
                        </div>
                        {/* Debt */}
                        <div className={`p-4 rounded-2xl ${
                            monthData.remaining <= 0
                                ? isDark ? 'bg-emerald-500/[0.08] border border-emerald-500/[0.15]' : 'bg-emerald-50 border border-emerald-200'
                                : isDark ? 'bg-red-500/[0.08] border border-red-500/[0.15]' : 'bg-red-50 border border-red-200'
                        }`}>
                            <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${monthData.remaining <= 0 ? isDark ? 'text-emerald-400' : 'text-emerald-600' : isDark ? 'text-red-400' : 'text-red-600'}`}>
                                {t('currentDebt')}
                            </p>
                            <p className={`text-xl font-black font-mono tabular-nums ${monthData.remaining <= 0 ? isDark ? 'text-emerald-400' : 'text-emerald-600' : isDark ? 'text-red-400' : 'text-red-600'}`}>
                                {monthData.remaining > 0 ? fmt(monthData.remaining) : `+${fmt(-monthData.remaining)}`}
                            </p>
                        </div>
                        {/* Working days */}
                        <div className={`p-4 rounded-2xl ${isDark ? 'bg-surface border border-white/[0.06]' : 'bg-white border border-gray-200'}`}>
                            <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t('workingDays')}</p>
                            <p className={`text-xl font-black tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {monthData.workingDays}
                                <span className={`text-sm font-normal ml-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>/ {monthData.totalDays}</span>
                            </p>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div>
                        <div className="flex justify-between text-xs font-semibold mb-2">
                            <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>{t('incomeProgress')}</span>
                            <span className={isDark ? 'text-white' : 'text-gray-900'}>{monthData.paidPercent}%</span>
                        </div>
                        <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-surface-3' : 'bg-gray-100'}`}>
                            <div
                                className={`h-full rounded-full transition-all duration-700 ease-out ${
                                    monthData.paidPercent >= 100 ? 'bg-emerald-500'
                                    : monthData.paidPercent >= 60  ? 'bg-amber-400'
                                    : 'bg-red-500'
                                }`}
                                style={{ width: `${Math.min(100, monthData.paidPercent)}%` }}
                            />
                        </div>
                    </div>

                    {/* Legend */}
                    <div className={`flex flex-wrap gap-x-5 gap-y-2 pb-4 border-b ${isDark ? 'border-white/[0.05]' : 'border-gray-100'}`}>
                        {([
                            { status: 'PAID'    as DayStatus, label: t('legendPaid') },
                            { status: 'PARTIAL' as DayStatus, label: t('legendPartial') },
                            { status: 'UNPAID'  as DayStatus, label: t('legendDebt') },
                            { status: 'DAY_OFF' as DayStatus, label: `🏝️ ${t('legendDayOff')}` },
                        ]).map(({ status, label }) => (
                            <div key={status} className="flex items-center gap-1.5">
                                <StatusIcon status={status} />
                                <span className={`text-[11px] font-medium ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{label}</span>
                            </div>
                        ))}
                    </div>

                    {/* ── Calendar ── */}
                    <div>
                        {/* Weekday headers */}
                        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2">
                            {orderedDays.map(day => (
                                <div
                                    key={day}
                                    className={`text-center text-[10px] font-bold uppercase tracking-widest py-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}
                                >
                                    {day.slice(0, 2)}
                                </div>
                            ))}
                        </div>

                        {/* Day cells */}
                        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 md:gap-2.5">
                            {/* Padding empty cells */}
                            {Array(padDays).fill(null).map((_, i) => (
                                <div key={`pad-${i}`} className="min-h-[72px] sm:min-h-[90px] md:min-h-[110px]" />
                            ))}

                            {days.map((d) => {
                                const isToday = d.dayStr === todayStr;
                                const isClickable = d.status !== 'FUTURE';

                                return (
                                    <div
                                        key={d.day}
                                        onClick={() => {
                                            if (onDayClick && isClickable) {
                                                const [year, month] = monthData.monthKey.split('-').map(Number);
                                                onDayClick(monthData.driver.id, new Date(year, month - 1, d.day));
                                            }
                                        }}
                                        className={`relative flex flex-col min-h-[72px] sm:min-h-[90px] md:min-h-[110px] rounded-xl sm:rounded-2xl p-2 sm:p-3 transition-all duration-150 ${
                                            isClickable ? 'cursor-pointer hover:scale-[1.03] hover:shadow-md' : 'cursor-default'
                                        } ${cardStyle(d.status, isToday)}`}
                                    >
                                        {/* Day number */}
                                        <div className="flex items-center justify-between mb-auto">
                                            {isToday ? (
                                                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-500 text-white text-[11px] font-bold flex-shrink-0">
                                                    {d.day}
                                                </span>
                                            ) : (
                                                <span className={`text-[11px] sm:text-xs font-semibold ${
                                                    d.status === 'FUTURE'
                                                        ? isDark ? 'text-gray-700' : 'text-gray-300'
                                                        : isDark ? 'text-gray-500' : 'text-gray-400'
                                                }`}>
                                                    {d.day}
                                                </span>
                                            )}
                                            {/* Status icon */}
                                            {d.status !== 'FUTURE' && (
                                                <StatusIcon status={d.status} />
                                            )}
                                        </div>

                                        {/* Cell body */}
                                        {d.status === 'DAY_OFF' ? (
                                            <div className="flex flex-col items-center justify-center flex-1 gap-1 mt-1">
                                                <span className="text-lg sm:text-xl leading-none">🏝️</span>
                                                <span className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-widest ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>
                                                    {t('legendDayOff')}
                                                </span>
                                                {d.income > 0 && (
                                                    <span className={`text-[9px] sm:text-[10px] font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                                        +{fmt(d.income)}
                                                    </span>
                                                )}
                                            </div>
                                        ) : d.status !== 'FUTURE' ? (
                                            <div className="mt-auto pt-1.5">
                                                {d.income > 0 && (
                                                    <div className={`text-[10px] sm:text-xs font-semibold tabular-nums truncate leading-tight ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                                                        {fmt(d.income)}
                                                    </div>
                                                )}
                                                {d.debt > 0 && d.status !== 'PAID' && (
                                                    <div className={`text-[9px] sm:text-[10px] font-medium tabular-nums truncate leading-tight mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                        −{fmt(d.debt)}
                                                    </div>
                                                )}
                                            </div>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
