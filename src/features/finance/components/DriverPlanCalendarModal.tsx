import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { XIcon, AlertTriangleIcon } from '../../../../components/Icons';
import { Driver, Transaction, TransactionType } from '../../../core/types';
import { Car } from '../../../core/types/car.types';
import { PaymentStatus } from '../../../core/types/transaction.types';
import { getEffectivePlanForDriverDay, getDriverDayOverrideType } from '../../drivers/utils/driverPlanHistory';
import { setDriverDayOverride, clearDriverDayOverride } from '../../../../services/firestoreService';
import Lottie from 'lottie-react';
import restAnimation from '../../../../Images/rest.json';
import planDoneAnimation from '../../../../Images/plan_done.json';
import repairSticker from '../../../../Images/sticker.webm';

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
const fmtCompact = (n: number) => `${new Intl.NumberFormat('uz-UZ').format(Math.round(Math.abs(n)))} UZS`;


type DayStatus = 'PAID' | 'PARTIAL' | 'UNPAID' | 'DAY_OFF' | 'FUTURE' | 'FUTURE_OFF' | 'FUTURE_DISCOUNT' | 'NOT_WORKING' | 'REPAIR';

const StatusIcon: React.FC<{ status: DayStatus }> = ({ status }) => {
    if (status === 'PAID') return (
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 drop-shadow-sm">
            <Lottie animationData={planDoneAnimation} loop={true} />
        </div>
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
        <div className="w-3.5 h-3.5"><Lottie animationData={restAnimation} loop={true} /></div>
    );
    if (status === 'FUTURE_DISCOUNT') return (
        <span className="text-[10px] font-black bg-orange-500/20 text-orange-500 px-1 rounded">-%</span>
    );
    if (status === 'NOT_WORKING') return (
        <span className="text-[12px] leading-none">❌</span>
    );
    if (status === 'REPAIR') return (
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
            <video 
                src={repairSticker} 
                autoPlay 
                loop 
                muted 
                playsInline 
                className="w-full h-full object-contain filter drop-shadow-sm pointer-events-none"
            />
        </div>
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
            const planForDay = getEffectivePlanForDriverDay(monthData.driver, date, monthData.car);
            const overrideType = getDriverDayOverrideType(monthData.driver, date, monthData.car);

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
                tx.status !== PaymentStatus.DELETED &&
                (tx as any).status !== 'DELETED' &&
                toLocalDateStr(tx.timestamp) === dayStr
            );

            const isNotWorkingTx = transactions.some(tx =>
                tx.driverId === monthData.driver.id &&
                tx.type === 'NOT_WORKING' &&
                tx.status !== PaymentStatus.DELETED &&
                (tx as any).status !== 'DELETED' &&
                toLocalDateStr(tx.timestamp) === dayStr
            );

            const isFuture = date.getTime() > Date.now();
            let status: DayStatus = 'UNPAID';

            if (overrideType === 'REPAIR') {
                status = 'REPAIR';
            } else if (isDayOffTx || overrideType === 'OFF') {
                // Explicit day-off always wins
                status = isFuture ? 'FUTURE_OFF' : 'DAY_OFF';
            } else if (isNotWorkingTx || overrideType === 'NOT_WORKING') {
                status = 'NOT_WORKING';
            } else if (planForDay > 0 && sumTushum >= planForDay) {
                // Fully paid — show regardless of whether date is future
                status = 'PAID';
            } else if (sumTushum > 0 && planForDay === 0) {
                // If there's no plan but they paid money, treat as a "PAID" overpayment
                status = 'PAID';
            } else if (sumTushum > 0) {
                // Partially paid — show regardless of whether date is future
                status = 'PARTIAL';
            } else if (isFuture) {
                // No income yet, genuinely future → show override type or plain future
                status = overrideType === 'DISCOUNT' ? 'FUTURE_DISCOUNT' : 'FUTURE';
            }

            return {
                day: d,
                date,
                dayStr,
                status,
                income: sumTushum,
                // debt: show whenever income exists (even on a future-dated tx), but not for day-off, repair, not-working or plain future
                debt: (sumTushum > 0 || !isFuture) && status !== 'DAY_OFF' && status !== 'REPAIR' && status !== 'NOT_WORKING' && status !== 'FUTURE' && status !== 'FUTURE_OFF'
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
                ? 'bg-surface-2 shadow-md ring-2 ring-emerald-500 ring-offset-2 ring-offset-[#0b1326]'
                : 'bg-white shadow-md ring-2 ring-emerald-500 ring-offset-2 ring-offset-slate-50';
        }
        if (status === 'FUTURE' || status === 'FUTURE_DISCOUNT') {
            return isDark
                ? 'bg-surface border border-white/[0.04] opacity-50 hover:opacity-100'
                : 'bg-gray-50/70 border-transparent opacity-60 hover:opacity-100';
        }
        if (status === 'NOT_WORKING') {
            return isDark
                ? 'bg-surface-3 border-transparent'
                : 'bg-gray-50 border-transparent text-gray-400';
        }
        if (status === 'DAY_OFF' || status === 'FUTURE_OFF') {
            return isDark
                ? 'bg-surface-2 border border-blue-500/20'
                : 'bg-white border border-transparent shadow-sm';
        }
        if (status === 'PAID') {
            return isDark
                ? 'bg-surface-2 border border-emerald-500/20 hover:border-emerald-500/40 hover:bg-surface-3'
                : 'bg-white border-transparent shadow-sm hover:shadow-md';
        }
        return isDark
            ? 'bg-surface-2 border border-white/[0.06] hover:bg-surface-3'
            : 'bg-white border-transparent shadow-sm hover:shadow-md';
    };

    return createPortal(
        <div className={`fixed top-16 md:left-64 right-0 bottom-0 z-[40] flex flex-col overflow-y-auto animate-in fade-in duration-200 ${
            isDark ? 'bg-[#0b1326]' : 'bg-slate-50'
        }`}>
            {/* ── Top Navigation Bar ── */}
            <div className={`sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 h-16 border-b backdrop-blur-xl flex-shrink-0 ${
                isDark ? 'bg-[#0b1326]/80 border-white/[0.06]' : 'bg-slate-50/80 border-slate-200/50'
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
                    Orqaga
                </button>
                <div className={`font-bold text-sm sm:text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {monthNames[parseInt(mStr, 10) - 1] ?? mStr} {yStr}
                </div>
                <div className="w-20" /> {/* Spacer to center title */}
            </div>

            {/* ── Content Container ── */}
            <div className="w-full px-4 py-6 sm:px-6 md:px-8 space-y-6 sm:space-y-8 flex-1">
                {/* ── Profile Header ── */}
                <div className={`flex items-center justify-between gap-4 p-3 sm:p-4 rounded-2xl ${
                    isDark ? 'bg-surface border border-white/[0.06] shadow-sm' : 'bg-white border-transparent shadow-sm'
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
                <div className={`p-4 sm:p-5 rounded-3xl flex flex-col gap-6 ${isDark ? 'bg-surface border border-white/[0.06]' : 'bg-white border-transparent shadow-sm'}`}>
                    {/* Stats grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                        {/* Monthly plan */}
                        <div className="min-w-0">
                            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1 truncate">{t('monthlyPlan') ?? 'Oylik Reja'}</p>
                            <p className={`text-lg sm:text-2xl font-bold tabular-nums truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{fmt(monthData.monthlyTarget)}</p>
                        </div>
                        {/* Paid */}
                        <div className="min-w-0">
                            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1 truncate">{t('totalPaidAmount') ?? "Jami To'ladi"}</p>
                            <p className={`text-lg sm:text-2xl font-bold tabular-nums truncate ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{fmt(monthData.actualIncome)}</p>
                        </div>
                        {/* Debt / Prepaid card */}
                        <div className="min-w-0">
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
                            <p className={`text-lg sm:text-2xl font-bold tabular-nums truncate ${
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
                        <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-surface-3' : 'bg-slate-100'}`}>
                            <div
                                className={`h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-teal-500 to-emerald-400`}
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
                                { status: 'DAY_OFF' as DayStatus, label: <span className="flex items-center gap-1"><div className="w-3.5 h-3.5 flex items-center justify-center"><Lottie animationData={restAnimation} loop={true} /></div> {t('legendDayOff') ?? 'Dam olish'}</span> },
                                { status: 'NOT_WORKING' as DayStatus, label: `❌ Ishlamagan` },
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

                            {days.map((d, i) => {
                                const isToday = d.dayStr === todayStr;
                                const isFuture = d.status.startsWith('FUTURE');
                                const isSunday = (padDays + i) % 7 === 6;
                                const isReducedRate = d.planForDay > 0 && d.planForDay < monthData.dailyPlan;
                                const isClickable = true; // all days clickable now

                                return (
                                    <div
                                        key={d.day}
                                        onClick={() => {
                                            if (isFuture) {
                                                setOverrideDate(d.date);
                                                const existingOverride = monthData.driver.dayOverrides?.[d.dayStr];
                                                setCustomPlanStr(existingOverride?.type === 'DISCOUNT' ? String(existingOverride.customPlan || '') : '');
                                            } else if (onDayClick && isClickable) {
                                                const [year, month] = monthData.monthKey.split('-').map(Number);
                                                onDayClick(monthData.driver.id, new Date(year, month - 1, d.day));
                                            }
                                        }}
                                        className={`relative flex flex-col min-h-[72px] sm:min-h-[90px] md:min-h-[110px] rounded-xl sm:rounded-2xl p-2 sm:p-3 transition-all duration-150 overflow-hidden group ${
                                            isClickable ? 'cursor-pointer hover:scale-[1.03] hover:shadow-md' : 'cursor-default'
                                        } ${(d.status === 'DAY_OFF' || d.status === 'FUTURE_OFF' || d.status === 'REPAIR') ? 'border border-transparent shadow-sm' : cardStyle(d.status, isToday)} ${isReducedRate && d.status !== 'DAY_OFF' && d.status !== 'NOT_WORKING' && d.status !== 'REPAIR' ? (isDark ? 'bg-indigo-500/5' : 'bg-indigo-50/50') : ''}`}
                                    >
                                        {/* Background Lottie for DAY_OFF */}
                                        {(d.status === 'DAY_OFF' || d.status === 'FUTURE_OFF') && (
                                            <div className="absolute inset-0 z-0 pointer-events-none bg-[#1c1229] overflow-hidden">
                                                <div className="absolute inset-0 scale-105 sm:scale-110 flex items-center justify-center origin-center">
                                                    <Lottie 
                                                        animationData={restAnimation} 
                                                        loop={true} 
                                                        style={{ width: '100%', height: '100%' }}
                                                        rendererSettings={{ preserveAspectRatio: 'xMidYMid slice' }}
                                                    />
                                                </div>
                                                <div className="absolute inset-0 bg-gradient-to-t from-[#1c1229] via-[#1c1229]/30 to-transparent opacity-90"></div>
                                            </div>
                                        )}
                                        {/* Background Video for REPAIR */}
                                        {d.status === 'REPAIR' && (
                                            <div className="absolute inset-0 z-0 pointer-events-none bg-[#151111] overflow-hidden">
                                                <div className="absolute inset-0 scale-105 sm:scale-110 flex items-center justify-center origin-center">
                                                    <video 
                                                        src={repairSticker} 
                                                        autoPlay 
                                                        loop 
                                                        muted 
                                                        playsInline 
                                                        className="w-full h-full object-cover brightness-110"
                                                    />
                                                </div>
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent"></div>
                                            </div>
                                        )}
                                        
                                        <div className="flex flex-col h-full w-full relative z-10">
                                            {/* Date Header */}
                                            <div className="mb-2">
                                                {isToday ? (
                                                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md bg-blue-500 text-white text-[11px] font-bold shadow-sm">
                                                        {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d.date)}
                                                    </span>
                                                ) : (
                                                    <span className={`text-[12px] sm:text-[14px] font-bold ${
                                                        (d.status === 'DAY_OFF' || d.status === 'FUTURE_OFF' || d.status === 'REPAIR')
                                                            ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'
                                                            : d.status.startsWith('FUTURE')
                                                                ? isDark ? 'text-gray-600' : 'text-gray-400'
                                                                : isDark ? 'text-gray-300' : 'text-slate-800'
                                                    }`}>
                                                        {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d.date)}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Center / Income */}
                                            {!d.status.startsWith('FUTURE') && d.status !== 'REPAIR' && d.status !== 'DAY_OFF' && (
                                                <div className="flex flex-col mb-auto">
                                                    <span className={`text-[9px] sm:text-[10px] mb-0.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Tushum:</span>
                                                    <div className={`text-[12px] sm:text-[14px] font-black tabular-nums tracking-tight truncate leading-none ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                                        {d.income > 0 ? fmtCompact(d.income) : '0 UZS'}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Bottom Full-width Badge */}
                                            <div className="mt-auto pt-1 w-full flex-shrink-0">
                                                {d.status === 'DAY_OFF' || d.status === 'FUTURE_OFF' ? (
                                                    <div className="w-full flex justify-center mb-0.5 pointer-events-none">
                                                        <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-[#ffeadb] drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">Dam olish</span>
                                                    </div>
                                                ) : d.status === 'REPAIR' ? (
                                                    <div className="w-full flex justify-center mb-0.5 pointer-events-none">
                                                        <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-white drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">Ta'mirda</span>
                                                    </div>
                                                ) : d.status === 'NOT_WORKING' ? (
                                                    <div className={`w-full py-1 px-1 rounded sm:rounded-md flex items-center justify-center ${isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                                        <span className="text-[8px] sm:text-[9px] font-bold uppercase">Ishlamagan</span>
                                                    </div>
                                                ) : !d.status.startsWith('FUTURE') ? (() => {
                                                    const excess = d.income - d.planForDay;
                                                    const isOverpaid = d.income > d.planForDay && d.planForDay > 0;
                                                    
                                                    if (d.status === 'PAID') {
                                                        return (
                                                            <div className={`w-full py-1 sm:py-1.5 px-1 rounded-md sm:rounded-lg flex flex-col items-center justify-center relative overflow-hidden ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#eafaf1] text-emerald-700'}`}>
                                                                <div className="flex items-center gap-1 sm:gap-1.5 relative z-10">
                                                                    <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 -ml-1">
                                                                        <Lottie animationData={planDoneAnimation} loop={true} />
                                                                    </div>
                                                                    <span className="text-[9px] sm:text-[11px] font-black tracking-tight">+{fmtCompact(excess > 0 ? excess : d.income)}</span>
                                                                </div>
                                                                <span className="text-[7px] sm:text-[8px] font-bold opacity-60 uppercase mt-0.5 leading-none hidden sm:block">
                                                                    {excess > 0 ? "Ortiqcha to'landi" : "To'liq to'landi"}
                                                                </span>
                                                            </div>
                                                        );
                                                    } else if (d.debt > 0) {
                                                        return (
                                                            <div className={`w-full py-1.5 sm:py-2 px-1 rounded-md sm:rounded-lg flex flex-col items-center justify-center ${isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-50 text-red-700'}`}>
                                                                <div className="flex items-center gap-1.5 relative z-10">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500">
                                                                        <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" clipRule="evenodd" />
                                                                    </svg>
                                                                    <span className="text-[10px] sm:text-[12px] font-black tracking-tight">-{fmtCompact(d.debt)}</span>
                                                                </div>
                                                                <span className="text-[8px] sm:text-[9px] font-bold text-red-800/60 uppercase mt-0.5 leading-none hidden sm:block">Qarz</span>
                                                            </div>
                                                        );
                                                    } else if (isOverpaid) {
                                                        return (
                                                            <div className={`w-full py-1 sm:py-1.5 px-1 rounded-md sm:rounded-lg flex flex-col items-center justify-center ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#eafaf1] text-emerald-700'}`}>
                                                                <div className="flex items-center gap-1 sm:gap-1.5 relative z-10">
                                                                    <span className="text-[9px] sm:text-[11px] font-black tracking-tight">+{fmtCompact(excess)}</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    } else if (d.income > 0) {
                                                        return (
                                                            <div className={`w-full py-1 sm:py-1.5 px-1 rounded-md sm:rounded-lg flex flex-col items-center justify-center ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                                                <div className="flex items-center gap-1 relative z-10">
                                                                    <span className="text-[9px] sm:text-[11px] font-black tracking-tight">Qisman</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })() : d.status === 'FUTURE_DISCOUNT' ? (
                                                    <div className={`w-full py-1 px-1 rounded sm:rounded-md flex flex-col items-center justify-center ${isDark ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-50 text-orange-600'}`}>
                                                        <span className="text-[9px] sm:text-[10px] font-bold">{fmtCompact(d.planForDay)}</span>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>

                                );
                            })}
                        </div>
                    </div>
                </div>

            {/* Day Override Mini-Modal */}
            {overrideDate && (() => {
                const dKey = `${overrideDate.getFullYear()}-${String(overrideDate.getMonth() + 1).padStart(2, '0')}-${String(overrideDate.getDate()).padStart(2, '0')}`;
                const driverId = monthData.driver.id;

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
                                    onClick={() => handleSave(() => clearDriverDayOverride(driverId, dKey))}
                                    className={`w-full py-3.5 px-4 rounded-xl flex justify-between items-center transition-all active:scale-[0.98] disabled:opacity-50 ${isDark ? 'bg-white/[0.06] hover:bg-white/10 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-900'}`}
                                >
                                    <span className="font-semibold flex items-center gap-2">↩️ Standart</span>
                                    <span className={`text-sm font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{fmt(monthData.dailyPlan)}</span>
                                </button>

                                {/* Day off */}
                                <button
                                    disabled={overrideLoading}
                                    onClick={() => handleSave(() => setDriverDayOverride(driverId, dKey, { type: 'OFF' }))}
                                    className={`w-full py-3.5 px-4 rounded-xl flex justify-between items-center transition-all active:scale-[0.98] disabled:opacity-50 ${isDark ? 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400' : 'bg-blue-50 hover:bg-blue-100 text-blue-600'}`}
                                >
                                    <span className="font-semibold flex items-center gap-2"><div className="w-5 h-5 flex items-center justify-center"><Lottie animationData={restAnimation} loop={true} /></div> Dam olish</span>
                                    <span className="text-sm font-bold opacity-50">0</span>
                                </button>

                                {/* Not working */}
                                <button
                                    disabled={overrideLoading}
                                    onClick={() => handleSave(() => setDriverDayOverride(driverId, dKey, { type: 'NOT_WORKING' }))}
                                    className={`w-full py-3.5 px-4 rounded-xl flex justify-between items-center transition-all active:scale-[0.98] disabled:opacity-50 ${isDark ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400' : 'bg-red-50 hover:bg-red-100 text-red-600'}`}
                                >
                                    <span className="font-semibold flex items-center gap-2">❌ Ishlamagan</span>
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
                                            onClick={() => handleSave(() => setDriverDayOverride(driverId, dKey, { type: 'DISCOUNT', customPlan: Number(customPlanStr) }))}
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
