import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { XIcon } from '../../../../components/Icons';
import { Driver, Transaction, TransactionType } from '../../../core/types';
import { Car } from '../../../core/types/car.types';
import { PaymentStatus } from '../../../core/types/transaction.types';
import { getEffectivePlanForDay, isDayOverrideOff } from '../../cars/utils/planHistory';
import { setDayOverride, clearDayOverride } from '../../../../services/carsService';

export interface DriverPlanMonthInfo {
    driver: Driver;
    car: Car | null;      // needed for getPlanForDate historical lookup
    monthKey: string;
    totalDays: number;
    workingDays: number;
    dailyPlan: number;    // current plan (for header display only)
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

const fmt = (n: number) => `${new Intl.NumberFormat('uz-UZ').format(Math.round(Math.abs(n)))} UZS`;


type DayStatus = 'PAID' | 'PARTIAL' | 'UNPAID' | 'DAY_OFF' | 'FUTURE' | 'FUTURE_OFF' | 'FUTURE_DISCOUNT';

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
    if (status === 'FUTURE_OFF') return (
        <span className="text-[12px] leading-none">🏝️</span>
    );
    if (status === 'FUTURE_DISCOUNT') return (
        <span className="text-[10px] font-black bg-orange-500/20 text-orange-500 px-1 rounded">-%</span>
    );
    return null;
};

export const DriverPlanCalendarModal: React.FC<Props> = ({ isOpen, onClose, theme, monthData, transactions, onDayClick }) => {
    const { t } = useTranslation();
    const isDark = theme === 'dark';
    const monthNames = t('months', { returnObjects: true }) as string[];
    
    const [overrideDate, setOverrideDate] = React.useState<Date | null>(null);
    const [overrideLoading, setOverrideLoading] = React.useState(false);
    const [overrideError, setOverrideError] = React.useState<string | null>(null);
    const [customPlanStr, setCustomPlanStr] = React.useState('');

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

            // ── Historically-correct plan for THIS specific day ───────────────────
            // Uses the planHistory snapshot to find what plan was active on `date`,
            // and applies any per-day overrides.
            const planForDay = getEffectivePlanForDay(monthData.car, date);
            const isOverrideOff = isDayOverrideOff(monthData.car, date);

            const sumTushum = transactions
                .filter(tx =>
                    tx.driverId === monthData.driver.id &&
                    tx.type === TransactionType.INCOME &&
                    tx.status !== PaymentStatus.DELETED &&
                    (tx as any).status !== 'DELETED' &&
                    toLocalDateStr(tx.timestamp) === dayStr
                )
                .reduce((acc, tx) => acc + Math.abs(tx.amount), 0);

            const isDayOffTx = transactions.some(tx =>
                tx.driverId === monthData.driver.id &&
                tx.type === 'DAY_OFF' &&
                toLocalDateStr(tx.timestamp) === dayStr
            );

            const isFuture = date.getTime() > Date.now();
            let status: DayStatus = 'UNPAID';

            if (isDayOffTx || isOverrideOff) {
                // Explicit day-off always wins
                status = isFuture ? 'FUTURE_OFF' : 'DAY_OFF';
            } else if (planForDay > 0 && sumTushum >= planForDay) {
                // Fully paid — show regardless of whether date is future
                status = 'PAID';
            } else if (sumTushum > 0) {
                // Partially paid — show regardless of whether date is future
                status = 'PARTIAL';
            } else if (isFuture) {
                // No income yet, genuinely future → show override type or plain future
                const override = monthData.car?.dayOverrides?.[dayStr];
                status = override?.type === 'DISCOUNT' ? 'FUTURE_DISCOUNT' : 'FUTURE';
            }

            return {
                day: d,
                date,
                dayStr,
                status,
                income: sumTushum,
                // debt: show whenever income exists (even on a future-dated tx), but not for day-off or plain future
                debt: (sumTushum > 0 || !isFuture) && status !== 'DAY_OFF' && status !== 'FUTURE' && status !== 'FUTURE_OFF'
                    ? Math.max(0, planForDay - sumTushum)
                    : 0,
                planForDay,
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
        if (status === 'FUTURE' || status === 'FUTURE_DISCOUNT') {
            return isDark
                ? 'bg-surface border border-white/[0.04] opacity-50 hover:opacity-100 hover:border-white/[0.12]'
                : 'bg-gray-50/70 border border-gray-100 opacity-60 hover:opacity-100 hover:border-gray-300';
        }
        if (status === 'DAY_OFF' || status === 'FUTURE_OFF') {
            return isDark
                ? 'bg-surface-2 border border-blue-500/20'
                : 'bg-slate-50 border border-slate-200';
        }
        return isDark
            ? 'bg-surface-2 border border-white/[0.06] hover:border-white/[0.12]'
            : 'bg-white border border-gray-200 hover:border-gray-300';
    };

    return createPortal(
        <div className={`fixed inset-0 z-[100] flex flex-col overflow-y-auto animate-in slide-in-from-bottom-8 duration-300 ${
            isDark ? 'bg-[#0b1326]' : 'bg-[#faf8ff]'
        }`}>
            {/* ── Top Navigation Bar ── */}
            <div className={`sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 h-16 border-b backdrop-blur-xl flex-shrink-0 ${
                isDark ? 'bg-[#0b1326]/80 border-white/[0.06]' : 'bg-[#faf8ff]/80 border-gray-200'
            }`}>
                <button
                    onClick={onClose}
                    className={`flex items-center gap-2 px-3 py-2 -ml-3 rounded-xl transition-colors font-semibold ${
                        isDark ? 'text-blue-400 hover:bg-blue-500/10' : 'text-blue-600 hover:bg-blue-50'
                    }`}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                    {t('back', 'Orqaga')}
                </button>
                <div className={`font-bold text-sm sm:text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {monthNames[parseInt(mStr, 10) - 1] ?? mStr} {yStr}
                </div>
                <div className="w-20" /> {/* Spacer to center title */}
            </div>

            {/* ── Content Container ── */}
            <div className="w-full max-w-6xl mx-auto px-4 py-6 sm:px-6 space-y-6 sm:space-y-8 flex-1">
                {/* ── Profile Header ── */}
                <div className={`flex items-center justify-between gap-4 p-3 sm:p-4 rounded-2xl border ${
                    isDark ? 'bg-surface border-white/[0.06] shadow-sm' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 w-full">
                        {monthData.driver.avatar ? (
                            <img
                                src={monthData.driver.avatar}
                                alt="Avatar"
                                className="w-11 h-11 rounded-2xl object-cover flex-shrink-0"
                            />
                        ) : (
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-base font-bold flex-shrink-0 ${isDark ? 'bg-surface-2 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                                {monthData.driver.name.charAt(0)}
                            </div>
                        )}
                        <div className="min-w-0 flex flex-1 items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                            <h2 className={`text-lg sm:text-xl font-bold tracking-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {monthData.driver.name}
                            </h2>
                            <div className={`text-sm font-medium whitespace-nowrap ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                <span className="font-bold">{fmt(monthData.dailyPlan)}</span> <span className="text-slate-500">/ kun</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Dashboard (Stats + Progress) ── */}
                <div className={`p-4 sm:p-5 rounded-3xl border flex flex-col gap-6 ${isDark ? 'bg-surface border-white/[0.06]' : 'bg-white border-slate-200'}`}>
                    {/* Stats grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                        {/* Monthly plan */}
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">{t('monthlyPlan') ?? 'Oylik Reja'}</p>
                            <p className={`text-2xl font-bold tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>{fmt(monthData.monthlyTarget)}</p>
                        </div>
                        {/* Paid */}
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">{t('totalPaidAmount') ?? "Jami To'ladi"}</p>
                            <p className={`text-2xl font-bold tabular-nums ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{fmt(monthData.actualIncome)}</p>
                        </div>
                        {/* Debt / Prepaid card */}
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1.5">
                                {monthData.remaining <= 0 ? (
                                    <>
                                        {t('prepaidAmount') ?? 'Oldindan to\'lov'}
                                    </>
                                ) : (
                                    <>
                                        {t('currentDebt') ?? 'Hozirgi Qarz'}
                                    </>
                                )}
                            </p>
                            <p className={`text-2xl font-bold tabular-nums ${
                                monthData.remaining <= 0
                                    ? isDark ? 'text-emerald-400' : 'text-emerald-600'
                                    : isDark ? 'text-red-400' : 'text-red-500'
                            }`}>
                                {monthData.remaining > 0 ? `-${fmt(monthData.remaining)}` : `+${fmt(-monthData.remaining)}`}
                            </p>
                        </div>
                        {/* Working days */}
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">{t('workingDays') ?? 'Ish Kunlari'}</p>
                            <p className={`text-2xl font-bold tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {monthData.workingDays}
                                <span className={`text-lg font-medium ml-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>/ {monthData.totalDays}</span>
                            </p>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div>
                        <div className="flex justify-between text-sm font-medium mb-2">
                            <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>{t('incomeProgress') ?? 'Tushum progressi'}</span>
                            <span className={isDark ? 'text-white' : 'text-slate-900'}>{monthData.paidPercent}%</span>
                        </div>
                        <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-surface-3' : 'bg-slate-100'}`}>
                            <div
                                className={`h-full rounded-full transition-all duration-700 ease-out ${
                                    monthData.paidPercent >= 100 ? 'bg-emerald-500'
                                    : 'bg-blue-500'
                                }`}
                                style={{ width: `${Math.min(100, monthData.paidPercent)}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* ── Calendar ── */}
                <div>
                    {/* Legend */}
                    <div className="flex items-center justify-end w-full mb-3">
                        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
                            {([
                                { status: 'PAID'    as DayStatus, label: t('legendPaid') ?? "To'liq to'landi" },
                                { status: 'PARTIAL' as DayStatus, label: t('legendPartial') ?? 'Qisman' },
                                { status: 'UNPAID'  as DayStatus, label: t('legendDebt') ?? 'Qarz' },
                                { status: 'DAY_OFF' as DayStatus, label: `🏝️ ${t('legendDayOff') ?? 'Dam olish'}` },
                            ]).map(({ status, label }) => (
                                <div key={status} className="flex items-center gap-1.5">
                                    <StatusIcon status={status} />
                                    <span className={`text-xs font-medium ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

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
                                const isFuture = d.status.startsWith('FUTURE');
                                const isClickable = true; // all days clickable now

                                return (
                                    <div
                                        key={d.day}
                                        onClick={() => {
                                            if (isFuture) {
                                                setOverrideDate(d.date);
                                                const existingOverride = monthData.car?.dayOverrides?.[d.dayStr];
                                                setCustomPlanStr(existingOverride?.type === 'DISCOUNT' ? String(existingOverride.customPlan || '') : '');
                                            } else if (onDayClick && isClickable) {
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
                                                    d.status.startsWith('FUTURE')
                                                        ? isDark ? 'text-gray-600' : 'text-gray-400'
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
                                        {d.status === 'DAY_OFF' || d.status === 'FUTURE_OFF' ? (
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
                                        ) : !d.status.startsWith('FUTURE') ? (() => {
                                            const excess = d.income - d.planForDay;
                                            const isOverpaid = d.income > d.planForDay && d.planForDay > 0;
                                            return (
                                                <div className="mt-auto pt-3 flex flex-col gap-1">
                                                    {d.income > 0 && (
                                                        <div className={`text-[10px] sm:text-xs font-bold tabular-nums truncate leading-tight ${
                                                            isOverpaid
                                                                ? isDark ? 'text-emerald-400' : 'text-emerald-600'
                                                                : isDark ? 'text-gray-200' : 'text-gray-800'
                                                        }`}>
                                                            {fmt(d.income)}
                                                        </div>
                                                    )}
                                                    {/* Overpaid excess badge */}
                                                    {isOverpaid && (
                                                        <div className={`inline-flex items-center gap-0.5 text-[8px] sm:text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full w-fit ${
                                                            isDark
                                                                ? 'bg-emerald-500/20 text-emerald-400'
                                                                : 'bg-emerald-100 text-emerald-700'
                                                        }`}>
                                                            <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                                                <polyline points="18 15 12 9 6 15" />
                                                            </svg>
                                                            +{fmt(excess)}
                                                        </div>
                                                    )}
                                                    {/* Debt badge — red pill, mirrors the overpaid badge */}
                                                    {d.debt > 0 && d.status !== 'PAID' && (
                                                        <div className={`inline-flex items-center gap-0.5 text-[8px] sm:text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full w-fit ${
                                                            isDark
                                                                ? 'bg-red-500/20 text-red-400'
                                                                : 'bg-red-100 text-red-600'
                                                        }`}>
                                                            <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                                                <polyline points="6 9 12 15 18 9" />
                                                            </svg>
                                                            -{fmt(d.debt)}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })() : d.status === 'FUTURE_DISCOUNT' ? (
                                            <div className="mt-auto pt-3">
                                                <div className={`text-[10px] font-semibold tabular-nums truncate ${isDark ? 'text-orange-400' : 'text-orange-500'}`}>
                                                    {fmt(d.planForDay)} <span className="text-orange-500/70">/ kun</span>
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>

                                );
                            })}
                        </div>
                    </div>
                </div>

            {/* Day Override Mini-Modal */}
            {overrideDate && monthData.car && (() => {
                const dKey = `${overrideDate.getFullYear()}-${String(overrideDate.getMonth() + 1).padStart(2, '0')}-${String(overrideDate.getDate()).padStart(2, '0')}`;
                const carId = monthData.car!.id;

                const handleSave = async (fn: () => Promise<void>) => {
                    setOverrideError(null);
                    setOverrideLoading(true);
                    try {
                        await fn();
                        setOverrideDate(null);
                        setCustomPlanStr('');
                    } catch (err: any) {
                        console.error('Override save error:', err);
                        setOverrideError(err?.message ?? 'Xatolik yuz berdi. DB migration run qiling.');
                    } finally {
                        setOverrideLoading(false);
                    }
                };

                return (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setOverrideDate(null); setOverrideError(null); }} />
                        <div className={`relative w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 ${isDark ? 'bg-[#1a2540] border border-white/[0.08]' : 'bg-white border border-gray-200'}`}>
                            <div className="flex justify-between items-center mb-5">
                                <div>
                                    <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {overrideDate.getDate()} {monthNames[overrideDate.getMonth()]}
                                    </h3>
                                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Kelajak rejasini o'zgartirish</p>
                                </div>
                                <button onClick={() => { setOverrideDate(null); setOverrideError(null); }} className={`p-2 rounded-full ${isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                                    <XIcon className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Error banner */}
                            {overrideError && (
                                <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold">
                                    ⚠ {overrideError}
                                </div>
                            )}

                            <div className="space-y-3">
                                {/* Standard */}
                                <button
                                    disabled={overrideLoading}
                                    onClick={() => handleSave(() => clearDayOverride(carId, dKey))}
                                    className={`w-full py-3.5 px-4 rounded-xl flex justify-between items-center transition-all active:scale-[0.98] disabled:opacity-50 ${isDark ? 'bg-white/[0.06] hover:bg-white/10 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-900'}`}
                                >
                                    <span className="font-semibold flex items-center gap-2">↩️ Standart</span>
                                    <span className={`text-sm font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{fmt(monthData.dailyPlan)}</span>
                                </button>

                                {/* Day off */}
                                <button
                                    disabled={overrideLoading}
                                    onClick={() => handleSave(() => setDayOverride(carId, dKey, { type: 'OFF' }))}
                                    className={`w-full py-3.5 px-4 rounded-xl flex justify-between items-center transition-all active:scale-[0.98] disabled:opacity-50 ${isDark ? 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400' : 'bg-blue-50 hover:bg-blue-100 text-blue-600'}`}
                                >
                                    <span className="font-semibold flex items-center gap-2">🏝️ Dam olish</span>
                                    <span className="text-sm font-bold opacity-50">0</span>
                                </button>

                                {/* Custom discount */}
                                <div className={`p-4 rounded-xl ${isDark ? 'bg-orange-500/10' : 'bg-orange-50'}`}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-lg">💸</span>
                                        <span className={`font-semibold ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>Chegirma (Custom)</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            value={customPlanStr}
                                            onChange={e => setCustomPlanStr(e.target.value)}
                                            placeholder={String(monthData.dailyPlan)}
                                            className={`flex-1 px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${isDark ? 'bg-black/20 border-white/10 text-white placeholder:text-gray-600' : 'bg-white border-orange-200 text-gray-900'}`}
                                        />
                                        <button
                                            disabled={overrideLoading || !customPlanStr}
                                            onClick={() => handleSave(() => setDayOverride(carId, dKey, { type: 'DISCOUNT', customPlan: Number(customPlanStr) }))}
                                            className="px-4 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold rounded-lg transition-all disabled:opacity-40"
                                        >
                                            {overrideLoading ? '...' : 'Saqlash'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>,
        document.body
    );
};
