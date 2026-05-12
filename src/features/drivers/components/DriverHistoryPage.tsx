'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Driver } from '../../../core/types';
import { Car } from '../../../core/types/car.types';
import { Transaction, TransactionType, PaymentStatus } from '../../../core/types/transaction.types';
import { getEffectivePlanForDriverDay, getDriverDayOverrideType } from '../utils/driverPlanHistory';
import { getEffectivePlanForDay } from '../../cars/utils/planHistory';
import DatePicker from '../../../../components/DatePicker';

interface Props {
    driver: Driver;
    car: Car | null;
    transactions: Transaction[];
    theme: 'light' | 'dark';
    onClose: () => void;
}

const fmt = (n: number) => `${new Intl.NumberFormat('uz-UZ').format(Math.round(Math.abs(n)))} UZS`;
const fmtCompact = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(Math.abs(n)));

const fmtTime = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

const fmtDate = (ts: number) => new Date(ts).toLocaleDateString('en-GB');

const MONTH_NAMES = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];
const MONTH_SHORT = ['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek'];

type Tab = 'daily_history' | 'deposit' | 'salary';

interface DailyHistory {
    dateKey: string;     
    timestamp: number;   
    dateObj: Date;
    expectedPlan: number;
    paidAmount: number;
    dailyDebt: number; 
    overrideType?: string; 
    isDayOff: boolean;
    status: 'PAID' | 'PARTIAL' | 'UNPAID' | 'DAY_OFF' | 'NOT_WORKING';
    carName: string; 
    transactions: Transaction[];
}

interface MonthGroup {
    monthKey: string;
    label: string;
    days: DailyHistory[];
    totalPaid: number;
    totalExpected: number;
    totalDebt: number;
}

const WalletIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
        <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
        <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z" />
    </svg>
);

const generateDailyTimeline = (
    driver: Driver, 
    fallbackCar: Car | null, 
    planTxs: Transaction[]
): MonthGroup[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Determine start date
    let start = new Date(driver.createdAt || (Date.now() - 30 * 24 * 60 * 60 * 1000));
    start.setHours(0, 0, 0, 0);
    
    const daysArr: DailyHistory[] = [];
    const txMapByDay = new Map<string, Transaction[]>();
    
    planTxs.forEach(tx => {
        const d = new Date(tx.timestamp);
        const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        if (!txMapByDay.has(k)) txMapByDay.set(k, []);
        txMapByDay.get(k)!.push(tx);
        
        if (d.getTime() < start.getTime()) {
            start = new Date(d.getTime());
            start.setHours(0, 0, 0, 0);
        }
    });

    let current = new Date(today);
    
    while (current.getTime() >= start.getTime()) {
        const key = `${current.getFullYear()}-${String(current.getMonth()+1).padStart(2,'0')}-${String(current.getDate()).padStart(2,'0')}`;
        const dayTxs = txMapByDay.get(key) || [];
        
        const overrideType = getDriverDayOverrideType(driver, current, fallbackCar);
        let expectedPlan = getEffectivePlanForDriverDay(driver, current, fallbackCar);
        // Fallback: if driver's own plan resolves to 0 but the car has a real plan, use the car's
        if (expectedPlan === 0 && fallbackCar) {
            const carPlan = getEffectivePlanForDay(fallbackCar, current);
            if (carPlan > 0) expectedPlan = carPlan;
        }
        
        const hasDayOffTx = dayTxs.some(t => t.type === TransactionType.DAY_OFF);
        const isDayOff = overrideType === 'OFF' || overrideType === 'NOT_WORKING' || hasDayOffTx;
        
        const paidAmount = dayTxs
            .filter(t => t.type === TransactionType.INCOME)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
            
        let dailyDebt = 0;
        let status: DailyHistory['status'] = 'UNPAID';
        
        if (isDayOff) {
            status = 'DAY_OFF';
        } else {
            dailyDebt = Math.max(0, expectedPlan - paidAmount);
            if (paidAmount >= expectedPlan) {
                status = 'PAID';
            } else if (paidAmount > 0) {
                status = 'PARTIAL';
            } else {
                status = 'UNPAID';
            }
        }
        
        let carName = driver.carModel || 'Noma\'lum avto';
        const carTx = dayTxs.find(t => t.carName);
        if (carTx && carTx.carName) {
            carName = carTx.carName;
        }

        daysArr.push({
            dateKey: key,
            timestamp: current.getTime(),
            dateObj: new Date(current),
            expectedPlan,
            paidAmount,
            dailyDebt,
            overrideType,
            isDayOff,
            status,
            carName,
            transactions: dayTxs
        });
        
        current.setDate(current.getDate() - 1);
    }
    
    const monthGroups = new Map<string, MonthGroup>();
    
    for (const day of daysArr) {
        const d = day.dateObj;
        const mk = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        if (!monthGroups.has(mk)) {
            monthGroups.set(mk, {
                monthKey: mk,
                label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
                days: [],
                totalPaid: 0,
                totalExpected: 0,
                totalDebt: 0
            });
        }
        const grp = monthGroups.get(mk)!;
        grp.days.push(day);
        grp.totalPaid += day.paidAmount;
        if (!day.isDayOff) {
            grp.totalExpected += day.expectedPlan;
            grp.totalDebt += day.dailyDebt;
        }
    }
    
    return Array.from(monthGroups.values());
};

export const DriverHistoryPage: React.FC<Props> = ({ driver, car, transactions, theme, onClose }) => {
    const isDark = theme === 'dark';
    const [visible, setVisible] = useState(false);
    const [tab, setTab] = useState<Tab>('daily_history');
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

    const toggleMonth = (monthKey: string) => {
        setExpandedMonths(prev => ({ ...prev, [monthKey]: !prev[monthKey] }));
    };

    useEffect(() => {
        requestAnimationFrame(() => setVisible(true));
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
        document.addEventListener('keydown', h);
        return () => document.removeEventListener('keydown', h);
    }, []);

    const handleClose = () => { setVisible(false); setTimeout(onClose, 300); };

    // ── Data slices ──────────────────────────────────────────────────────────
    const allDriverTxs = useMemo(() =>
        transactions
            .filter(tx => tx.driverId === driver.id && tx.status !== PaymentStatus.DELETED)
            .sort((a,b) => b.timestamp - a.timestamp),
        [driver.id, transactions]
    );

    const planTxs     = allDriverTxs.filter(tx => tx.category !== 'deposit_topup');
    const depositTxs  = allDriverTxs.filter(tx => tx.category === 'deposit_topup' || (tx as any).useDeposit);
    const salaryTxs   = allDriverTxs.filter(tx => tx.category === 'salary_payment');

    const timeline = useMemo(() => generateDailyTimeline(driver, car, planTxs), [driver, car, planTxs]);

    const filteredTimeline = useMemo(() => {
        let groups = timeline;
        const start = startDate ? startDate.getTime() : 0;
        const end = endDate ? new Date(endDate) : new Date(2100, 0, 1);
        if (endDate) end.setHours(23, 59, 59, 999);
        const endMs = end.getTime();
        
        if (startDate || endDate) {
            groups = groups.map(g => {
                const filteredDays = g.days.filter(d => d.timestamp >= start && d.timestamp <= endMs);
                return {
                    ...g,
                    days: filteredDays,
                    totalPaid: filteredDays.reduce((sum, d) => sum + d.paidAmount, 0),
                    totalExpected: filteredDays.filter(d => !d.isDayOff).reduce((sum, d) => sum + d.expectedPlan, 0),
                    totalDebt: filteredDays.filter(d => !d.isDayOff).reduce((sum, d) => sum + d.dailyDebt, 0)
                };
            }).filter(g => g.days.length > 0);
        }
        return groups;
    }, [timeline, startDate, endDate]);

    const periodSummary = useMemo(() => {
        if (!startDate && !endDate) return null;
        return filteredTimeline.reduce((acc, g) => {
            acc.totalPaid += g.totalPaid;
            acc.totalDebt += g.totalDebt;
            return acc;
        }, { totalPaid: 0, totalDebt: 0 });
    }, [filteredTimeline, startDate, endDate]);

    // Deposit ledger with running balance (newest first)
    const depositLedger = useMemo(() => {
        const initial = driver.depositAmount ?? 0;
        const sorted = [...depositTxs].sort((a,b) => a.timestamp - b.timestamp);
        let bal = initial;
        const rows = sorted.map(tx => {
            const prev = bal;
            bal = tx.category === 'deposit_topup' ? bal + Math.abs(tx.amount) : bal - Math.abs(tx.amount);
            return { tx, prevBal: prev, newBal: bal };
        });
        return rows.reverse();
    }, [depositTxs, driver.depositAmount]);

    // ── Styles ───────────────────────────────────────────────────────────────
    const bg      = isDark ? '#000000' : '#F2F2F7'; // True iOS backgrounds
    const surface = isDark ? 'bg-[#1C1C1E]' : 'bg-white';
    const bdr     = isDark ? 'border-[#38383A]' : 'border-[#E5E5EA]';
    const txt     = isDark ? 'text-white' : 'text-black';
    const muted   = isDark ? 'text-[#EBEBF5]/60' : 'text-[#3C3C43]/60';
    const divider = isDark ? 'divide-[#38383A]' : 'divide-[#E5E5EA]';

    const isSalary = driver.driverType === 'salary';

    const TABS: { id: Tab; icon: string; label: string; count: number }[] = [
        { id: 'daily_history', icon: '📅', label: 'Tarix', count: 0 },
    ];
    if (!isSalary) {
        TABS.push({ id: 'deposit', icon: '🏦', label: 'Depozit', count: depositTxs.length });
    } else {
        TABS.push({ id: 'salary', icon: '💳', label: 'Maosh', count: salaryTxs.length });
    }

    return createPortal(
        <div
            className="fixed inset-0 z-[250] flex flex-col"
            style={{
                background: bg,
                transform: visible ? 'translateY(0)' : 'translateY(100%)',
                opacity:   visible ? 1 : 0,
                transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
            }}
        >
            {/* ── Header & Hero ─────────────────────────────────────── */}
            <div 
                className={`flex-shrink-0 sticky top-0 z-10 border-b ${bdr}`}
                style={{ background: isDark ? 'rgba(28,28,30,0.85)' : 'rgba(242,242,247,0.85)', backdropFilter: 'blur(20px)' }}
            >
                {/* Navigation Bar */}
                <div className="flex items-center justify-between px-4 h-14 w-full">
                    <button onClick={handleClose} className={`flex items-center gap-1.5 text-[17px] -ml-2 px-2 py-1 rounded-lg active:opacity-50 transition-opacity ${isDark ? 'text-[#0A84FF]' : 'text-[#007AFF]'}`}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6"/>
                        </svg>
                        Orqaga
                    </button>
                    <div className={`text-[17px] font-semibold tracking-tight ${txt}`}>Haydovchi Tarixi</div>
                    <div className="w-[70px]" /> {/* Placeholder for balance to center title */}
                </div>

                {/* Hero Section */}
                <div className="px-6 pb-6 pt-2 flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full overflow-hidden mb-3 border-2 border-white/10 shadow-lg">
                        {driver.avatar
                            ? <img src={driver.avatar} alt={driver.name} className="w-full h-full object-cover"/>
                            : <div className={`w-full h-full flex items-center justify-center text-3xl font-bold ${isDark ? 'bg-[#2C2C2E] text-white/40' : 'bg-gray-200 text-gray-500'}`}>{driver.name.charAt(0)}</div>
                        }
                    </div>
                    <h1 className={`text-[22px] font-bold tracking-tight mb-1 ${txt}`}>{driver.name}</h1>
                    <div className={`flex items-center justify-center flex-wrap gap-2 text-[15px] ${muted}`}>
                        <span className="truncate">{driver.carModel || 'Noma\'lum avto'}</span>
                        <span>•</span>
                        <span className="font-mono">{driver.licensePlate}</span>
                    </div>

                    {/* Global Balance Widget */}
                    <div className="mt-5 w-full max-w-md">
                        <div className={`rounded-2xl p-4 flex items-center justify-between shadow-sm border ${isDark ? 'bg-[#1C1C1E] border-[#38383A]' : 'bg-white border-[#E5E5EA]'}`}>
                            <div className="flex flex-col">
                                <span className={`text-[13px] font-medium ${muted}`}>Umumiy Qarz / Balans</span>
                                <span className={`text-[24px] font-bold tracking-tight font-mono ${driver.balance < 0 ? (isDark ? 'text-[#FF453A]' : 'text-[#FF3B30]') : (driver.balance > 0 ? (isDark ? 'text-[#30D158]' : 'text-[#34C759]') : txt)}`}>
                                    {driver.balance > 0 ? '+' : ''}{fmtCompact(driver.balance)} UZS
                                </span>
                            </div>
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${driver.balance < 0 ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
                                <WalletIcon className={`w-6 h-6 ${driver.balance < 0 ? 'text-red-500' : 'text-emerald-500'}`} />
                            </div>
                        </div>
                    </div>

                    {/* iOS Segmented Control */}
                    <div className={`mt-6 p-1 rounded-[9px] flex w-full max-w-md mx-auto ${isDark ? 'bg-[#1C1C1E]' : 'bg-[#E3E3E8]'}`}>
                        {TABS.map(t => (
                            <button
                                key={t.id}
                                onClick={() => setTab(t.id)}
                                className={`flex-1 flex justify-center items-center gap-1.5 py-1.5 text-[13px] font-semibold rounded-md transition-all ${
                                    tab === t.id 
                                    ? (isDark ? 'bg-[#636366] text-white shadow-sm' : 'bg-white text-black shadow-sm') 
                                    : (isDark ? 'text-[#EBEBF5]/60 hover:text-white' : 'text-[#3C3C43]/60 hover:text-black')
                                }`}
                            >
                                {t.label} {t.count > 0 && `(${t.count})`}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Scrollable Content ────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto pb-safe">
                <div className="w-full max-w-4xl mx-auto px-4 py-6">

                    {/* ═══════════ DAILY HISTORY ═══════════ */}
                    {tab === 'daily_history' && (
                        <div className="space-y-6">
                            {/* Filter Section */}
                            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#1C1C1E] border-[#38383A]' : 'bg-white border-[#E5E5EA]'}`}>
                                <div className="flex flex-col sm:flex-row gap-4 items-end">
                                    <div className="flex-1 w-full relative z-20">
                                        <DatePicker 
                                            label="Boshlanish sanasi" 
                                            value={startDate} 
                                            onChange={setStartDate} 
                                            theme={theme} 
                                            placeholder="dd/mm/yyyy" 
                                        />
                                    </div>
                                    <div className="flex-1 w-full relative z-10">
                                        <DatePicker 
                                            label="Tugash sanasi" 
                                            value={endDate} 
                                            onChange={setEndDate} 
                                            theme={theme} 
                                            placeholder="dd/mm/yyyy" 
                                        />
                                    </div>
                                    {(startDate || endDate) && (
                                        <button 
                                            onClick={() => { setStartDate(null); setEndDate(null); }}
                                            className={`px-4 py-2 rounded-xl text-[13px] font-bold h-[46px] ${isDark ? 'bg-white/10 hover:bg-white/15 text-white' : 'bg-black/5 hover:bg-black/10 text-black'}`}
                                        >
                                            Tozalash
                                        </button>
                                    )}
                                </div>
                                
                                {periodSummary && (
                                    <div className={`mt-4 pt-4 border-t flex flex-col sm:flex-row gap-4 justify-between ${isDark ? 'border-[#38383A]' : 'border-[#E5E5EA]'}`}>
                                        <div>
                                            <p className={`text-[12px] font-medium ${muted}`}>Tanlangan oraliqda to'langan</p>
                                            <p className={`text-[18px] font-bold font-mono tracking-tight ${isDark ? 'text-[#30D158]' : 'text-[#34C759]'}`}>+{fmtCompact(periodSummary.totalPaid)} UZS</p>
                                        </div>
                                        <div>
                                            <p className={`text-[12px] font-medium ${muted}`}>Tanlangan oraliqda qarz</p>
                                            <p className={`text-[18px] font-bold font-mono tracking-tight ${periodSummary.totalDebt > 0 ? (isDark ? 'text-[#FF453A]' : 'text-[#FF3B30]') : txt}`}>
                                                {periodSummary.totalDebt > 0 ? '−' : ''}{fmtCompact(periodSummary.totalDebt)} UZS
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {filteredTimeline.length === 0 ? (
                                <div className={`flex flex-col items-center justify-center py-24 gap-3 ${muted}`}>
                                    <span className="text-4xl">📅</span>
                                    <p className="text-[15px] font-medium">Tarix topilmadi</p>
                                </div>
                            ) : (
                                filteredTimeline.map(group => (
                                    <div key={group.monthKey} className="space-y-2">
                                        <button 
                                            onClick={() => toggleMonth(group.monthKey)}
                                            className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${isDark ? 'bg-[#1C1C1E] border-[#38383A] hover:bg-[#2C2C2E]' : 'bg-white border-[#E5E5EA] shadow-sm hover:bg-gray-50'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-[#2C2C2E]' : 'bg-[#F2F2F7]'}`}>
                                                    <span className="text-xl">📅</span>
                                                </div>
                                                <div className="text-left">
                                                    <h2 className={`text-[17px] font-bold tracking-tight ${txt}`}>{group.label}</h2>
                                                    <p className={`text-[12px] font-medium ${muted}`}>{group.days.length} kun</p>
                                                </div>
                                            </div>
                                            <div className="text-right flex items-center gap-3">
                                                <div className="hidden sm:block">
                                                    <p className={`text-[12px] font-semibold ${muted}`}>Kutilgan: {fmtCompact(group.totalExpected)}</p>
                                                    {group.totalDebt > 0 && <p className="text-[12px] font-bold text-[#FF3B30] dark:text-[#FF453A]">Qarz: {fmtCompact(group.totalDebt)}</p>}
                                                </div>
                                                <svg 
                                                    className={`w-5 h-5 transition-transform ${expandedMonths[group.monthKey] || (startDate || endDate) ? 'rotate-180' : ''} ${muted}`} 
                                                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                                >
                                                    <polyline points="6 9 12 15 18 9"/>
                                                </svg>
                                            </div>
                                        </button>

                                        {(expandedMonths[group.monthKey] || (startDate || endDate)) && (
                                            <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-[#1C1C1E] border-[#38383A]' : 'bg-white border-[#E5E5EA] shadow-sm'} animate-in fade-in slide-in-from-top-2 duration-200`}>
                                            <div className={`divide-y ${divider}`}>
                                                {group.days.map(day => (
                                                    <div key={day.dateKey} className={`flex flex-col sm:flex-row sm:items-center p-3 sm:p-4 gap-3 ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50/50'} transition-colors`}>
                                                        
                                                        {/* Left: Date */}
                                                        <div className={`flex-shrink-0 w-[52px] h-[52px] rounded-xl flex flex-col items-center justify-center ${isDark ? 'bg-[#2C2C2E]' : 'bg-[#F2F2F7]'}`}>
                                                            <span className={`text-[11px] font-semibold uppercase tracking-wider ${muted}`}>{MONTH_SHORT[day.dateObj.getMonth()]}</span>
                                                            <span className={`text-[20px] font-bold leading-none mt-0.5 ${txt}`}>{day.dateObj.getDate()}</span>
                                                        </div>

                                                        {/* Center: Status & Car */}
                                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                                {day.status === 'PAID' && <span className="px-2 py-0.5 rounded-[5px] text-[11px] font-bold bg-[#34C759]/15 text-[#34C759]">To'landi</span>}
                                                                {day.status === 'PARTIAL' && <span className="px-2 py-0.5 rounded-[5px] text-[11px] font-bold bg-[#FF9500]/15 text-[#FF9500]">Qisman</span>}
                                                                {day.status === 'UNPAID' && <span className="px-2 py-0.5 rounded-[5px] text-[11px] font-bold bg-[#FF3B30]/15 text-[#FF3B30]">To'lanmadi</span>}
                                                                {day.status === 'DAY_OFF' && <span className="px-2 py-0.5 rounded-[5px] text-[11px] font-bold bg-[#0A84FF]/15 text-[#0A84FF]">🏝️ Dam olish</span>}
                                                            </div>
                                                            <div className={`text-[14px] font-medium truncate ${txt}`}>
                                                                {day.carName}
                                                            </div>
                                                            {day.transactions.filter(t => t.description && t.type !== TransactionType.DAY_OFF).map(t => (
                                                                <div key={t.id} className={`text-[12px] truncate mt-0.5 ${muted}`}>
                                                                    ↳ {t.description}
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* Right: Financials */}
                                                        <div className="flex-shrink-0 text-left sm:text-right min-w-[110px] mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-transparent sm:border-t-0" style={{ borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                                                            {!day.isDayOff && (
                                                                <>
                                                                    <div className={`text-[12px] font-medium mb-0.5 flex sm:block justify-between ${muted}`}>
                                                                        <span>Reja:</span> <span>{fmtCompact(day.expectedPlan)}</span>
                                                                    </div>
                                                                    <div className={`text-[16px] font-bold font-mono tracking-tight flex sm:block justify-between ${day.paidAmount > 0 ? (isDark ? 'text-[#30D158]' : 'text-[#34C759]') : muted}`}>
                                                                        <span>To'lov:</span> <span>{day.paidAmount > 0 ? '+' : ''}{fmtCompact(day.paidAmount)}</span>
                                                                    </div>
                                                                    {day.dailyDebt > 0 && (
                                                                        <div className={`text-[12px] font-bold mt-1 flex sm:block justify-between ${isDark ? 'text-[#FF453A]' : 'text-[#FF3B30]'}`}>
                                                                            <span>Qarz:</span> <span>−{fmtCompact(day.dailyDebt)}</span>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}
                                                            {day.isDayOff && (
                                                                <div className={`text-[14px] font-medium h-full flex items-center justify-start sm:justify-end ${muted}`}>
                                                                    Reja yo'q
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* ═══════════ DEPOSIT ═══════════ */}
                    {tab === 'deposit' && (
                        <div className="space-y-6">
                            {/* Hero */}
                            <div className={`rounded-2xl border px-6 py-5 ${isDark ? 'border-[#FF9F0A]/20 bg-[#FF9F0A]/10' : 'border-[#FF9500]/20 bg-[#FF9500]/10'}`}>
                                <p className={`text-[11px] font-bold uppercase tracking-widest mb-1.5 ${isDark ? 'text-[#FF9F0A]/80' : 'text-[#FF9500]/80'}`}>🏦 Joriy depozit</p>
                                <p className={`text-[32px] font-bold tracking-tight font-mono ${isDark ? 'text-[#FF9F0A]' : 'text-[#FF9500]'}`}>{fmt(driver.depositAmount ?? 0)}</p>
                                <p className={`text-[13px] font-medium mt-1 ${muted}`}>{depositTxs.length} ta harakat</p>
                            </div>

                            {depositTxs.length === 0 ? (
                                <div className={`flex flex-col items-center justify-center py-16 gap-3 ${muted}`}>
                                    <span className="text-4xl">🏦</span>
                                    <p className="text-[15px] font-medium">Depozit harakatlari yo'q</p>
                                </div>
                            ) : (
                                <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-[#1C1C1E] border-[#38383A]' : 'bg-white border-[#E5E5EA] shadow-sm'}`}>
                                    <div className={`px-4 py-3 border-b ${bdr} ${isDark ? 'bg-[#2C2C2E]' : 'bg-[#F2F2F7]'}`}>
                                        <p className={`text-[11px] font-bold uppercase tracking-widest ${muted}`}>Depozit ledgeri</p>
                                    </div>
                                    <div className={`divide-y ${divider}`}>
                                        {depositLedger.map(({ tx, prevBal, newBal }) => {
                                            const isTopUp = tx.category === 'deposit_topup';
                                            return (
                                                <div key={tx.id} className={`flex items-center gap-3 px-4 py-3.5 ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50/70'} transition-colors`}>
                                                    <div className={`flex-shrink-0 w-10 h-10 rounded-[10px] flex items-center justify-center text-lg font-bold ${isTopUp ? (isDark ? 'bg-[#30D158]/15 text-[#30D158]' : 'bg-[#34C759]/15 text-[#34C759]') : (isDark ? 'bg-[#FF453A]/15 text-[#FF453A]' : 'bg-[#FF3B30]/15 text-[#FF3B30]')}`}>
                                                        {isTopUp ? '↑' : '↓'}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-[14px] font-semibold ${txt}`}>{isTopUp ? "Depozit to'ldirildi" : "Depozitdan yechildi"}</p>
                                                        {tx.description && <p className={`text-[12px] truncate mt-0.5 ${muted}`}>{tx.description}</p>}
                                                        <p className={`text-[11px] mt-1 ${muted}`}>{fmtDate(tx.timestamp)} • {fmtTime(tx.timestamp)}</p>
                                                    </div>
                                                    <div className="flex-shrink-0 text-right">
                                                        <p className={`text-[15px] font-bold font-mono tracking-tight ${isTopUp ? (isDark ? 'text-[#30D158]' : 'text-[#34C759]') : (isDark ? 'text-[#FF453A]' : 'text-[#FF3B30]')}`}>
                                                            {isTopUp ? '+' : '−'}{fmt(Math.abs(tx.amount))}
                                                        </p>
                                                        <p className={`text-[11px] font-mono mt-1 ${muted}`}>{fmtCompact(prevBal)} → {fmtCompact(newBal)}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══════════ SALARY ═══════════ */}
                    {tab === 'salary' && (
                        <div className="space-y-6">
                            {/* Hero */}
                            <div className={`rounded-2xl border px-6 py-5 ${isDark ? 'border-[#BF5AF2]/20 bg-[#BF5AF2]/10' : 'border-[#AF52DE]/20 bg-[#AF52DE]/10'}`}>
                                <p className={`text-[11px] font-bold uppercase tracking-widest mb-1.5 ${isDark ? 'text-[#BF5AF2]/80' : 'text-[#AF52DE]/80'}`}>💳 Oylik maosh</p>
                                <p className={`text-[32px] font-bold tracking-tight font-mono ${isDark ? 'text-[#BF5AF2]' : 'text-[#AF52DE]'}`}>{fmt(driver.monthlySalary ?? 0)}</p>
                                <p className={`text-[13px] font-medium mt-1 ${muted}`}>UZS / oy • {salaryTxs.length} ta to'lov</p>
                            </div>

                            {salaryTxs.length === 0 ? (
                                <div className={`flex flex-col items-center justify-center py-16 gap-3 ${muted}`}>
                                    <span className="text-4xl">💳</span>
                                    <p className="text-[15px] font-medium">Maosh to'lovlari yo'q</p>
                                </div>
                            ) : (
                                <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-[#1C1C1E] border-[#38383A]' : 'bg-white border-[#E5E5EA] shadow-sm'}`}>
                                    <div className={`divide-y ${divider}`}>
                                        {salaryTxs.map(tx => (
                                            <div key={tx.id} className={`flex items-center gap-3 px-4 py-3.5 ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50/70'} transition-colors`}>
                                                <div className={`flex-shrink-0 w-10 h-10 rounded-[10px] flex items-center justify-center text-lg ${isDark ? 'bg-[#BF5AF2]/15' : 'bg-[#AF52DE]/10'}`}>💳</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-[14px] font-semibold ${txt}`}>Maosh to'lovi</p>
                                                    {tx.description && <p className={`text-[12px] truncate mt-0.5 ${muted}`}>{tx.description}</p>}
                                                    <p className={`text-[11px] mt-1 ${muted}`}>{fmtDate(tx.timestamp)} • {fmtTime(tx.timestamp)}</p>
                                                </div>
                                                <p className="flex-shrink-0 text-[15px] font-bold font-mono tracking-tight text-[#AF52DE]">{fmt(Math.abs(tx.amount))}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>,
        document.body
    );
};
