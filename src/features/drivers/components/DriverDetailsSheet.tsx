import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Lottie from 'lottie-react';
import cardAnimation from '../../../../Images/card.json';
import { FileViewer } from '../../../../components/ui/FileViewer';
import { LicensePlate } from '../../../components/ui/LicensePlate';
import { updateDriver } from '../../../../services/firestoreService';
import { unassignCar } from '../../../../services/carsService';
import { getEffectivePlanForDriverDay } from '../utils/driverPlanHistory';
import { Driver, DriverStatus } from '../../../core/types';
import { Car } from '../../../core/types/car.types';
import { Transaction, TransactionType, PaymentStatus } from '../../../core/types/transaction.types';
import { calcDriverFinance, DriverFinanceSummary } from '../utils/debtUtils';
import {
    XIcon, EditIcon, TrashIcon, PhoneIcon, CarIcon, NotesIcon, LogOutIcon,
} from '../../../../components/Icons';
import { DriverHistoryPage } from './DriverHistoryPage';
import { DriverAvatar } from './DriverAvatar';
import { supabase } from '../../../../supabase';
import { forceDownload } from '../../../../utils/downloadHelper';

interface Props {
    driver: Driver | null;
    car: Car | null;
    transactions: Transaction[];
    theme: 'light' | 'dark';
    userRole: 'admin' | 'viewer';
    isOpen: boolean;
    onClose: () => void;
    onEdit: (driver: Driver) => void;
    onDelete: (id: string) => void;
    onAddTransaction?: (data: Omit<Transaction, 'id'>) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toMonthKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
};

const MONTH_NAMES_UZ  = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];
const MONTH_SHORT_UZ  = ['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek'];

const fmtTime = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

const METHOD_LABEL: Record<string,string> = { cash:'Naqd', card:'Karta', transfer:"O'tkazma" };
const METHOD_COLOR: Record<string,string> = {
    cash:     'bg-amber-500/15 text-amber-400',
    card:     'bg-sky-500/15 text-sky-400',
    transfer: 'bg-violet-500/15 text-violet-400',
};
const TX_TYPE_LABEL: Record<string,string> = {
    INCOME:'Kirim', EXPENSE:'Chiqim', DAY_OFF:"Ta'til", DEBT:'Qarz',
};

const fmt = (n: number) => `${new Intl.NumberFormat('uz-UZ').format(Math.round(n))} UZS`;
const fmtDisp = (v: string) => v.replace(/\D/g,'').replace(/\B(?=(\d{3})+(?!\d))/g,' ');

function getFriendlyDocName(doc: any): string {
    if (doc.category) {
        switch (doc.category) {
            case 'driver_license':   return 'Haydovchilik guvohnomasi';
            case 'passport':         return 'Pasport';
            case 'car_registration': return 'Texnik pasport';
            case 'car_insurance':    return "Sug'urta";
        }
    }
    const fn = doc.name || '';
    const lo = fn.toLowerCase();
    if (lo.includes('pasport')||lo.includes('passport')||lo.includes('id')) return 'ID / Pasport';
    if (lo.includes('prava')||lo.includes('license')||lo.includes('guvohnoma')) return 'Haydovchilik guvohnomasi';
    if (lo.includes('tex')||lo.includes('tech')) return 'Texnik pasport';
    if (lo.includes('sug')||lo.includes('insur')) return "Sug'urta";
    return (fn.split('.').slice(0,-1).join('.')||fn).replace(/[_-]/g,' ');
}

interface MonthGroup {
    monthKey:      string;
    label:         string;
    planIncome:    number;
    topUps:        number;
    overpayment:   number;
    expense:       number;
    txs:           Transaction[];
    monthlyTarget: number;
    paidPercent:   number;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const DriverDetailsSheet: React.FC<Props> = ({
    driver, car, transactions, theme, userRole, isOpen, onClose, onEdit, onDelete, onAddTransaction,
}) => {
    const isDark = theme === 'dark';

    const [visible,        setVisible]         = useState(false);
    const [shouldRender,   setShouldRender]    = useState(false);
    const [internalDriver, setInternalDriver]  = useState<Driver | null>(null);
    const [viewingDoc,     setViewingDoc]      = useState<{ name:string; data:string }|null>(null);
    const [activeTab,      setActiveTab]       = useState<'info'|'finance'|'history'>('info');
    const [filterMonth,    setFilterMonth]     = useState<string>('all');
    const [expandedMonths, setExpandedMonths]  = useState<Set<string>>(new Set());
    const [showHistory,    setShowHistory]     = useState(false);
    const [showTerminate,  setShowTerminate]   = useState(false);
    const [docs,           setDocs]            = useState<any[]>([]);

    useEffect(() => {
        if (driver) {
            setInternalDriver(driver);
        }
    }, [driver]);

    const activeDriver = internalDriver || driver;

    useEffect(() => {
        if (isOpen && activeDriver?.id) {
            supabase.from('drivers').select('documents').eq('id', activeDriver.id).single()
                .then(({ data, error }) => {
                    if (!error && data?.documents) {
                        setDocs(data.documents);
                    } else {
                        setDocs([]);
                    }
                });
        } else if (!isOpen && !shouldRender) {
            setDocs([]);
            setShowTerminate(false);
        }
    }, [isOpen, activeDriver?.id, shouldRender]);

    // Top-up form
    const [showTopUp,    setShowTopUp]    = useState(false);
    const [topUpRaw,     setTopUpRaw]     = useState('');
    const [topUpDisplay, setTopUpDisplay] = useState('');
    const [topUpNote,    setTopUpNote]    = useState('');
    const [topUpLoading, setTopUpLoading] = useState(false);

    const handleTopUpSubmit = async () => {
        const amount = parseInt(topUpRaw, 10);
        if (!activeDriver || isNaN(amount) || amount <= 0 || !onAddTransaction) return;
        setTopUpLoading(true);
        try {
            await onAddTransaction({
                driverId: activeDriver.id,
                driverName: activeDriver.name,
                amount,
                type: TransactionType.INCOME,
                category: 'deposit_topup',
                description: topUpNote.trim() || "Depozit to'ldirish",
                timestamp: Date.now(),
                status: 'ACTIVE' as any,
            } as any);
            setTopUpRaw(''); setTopUpDisplay(''); setTopUpNote('');
            setShowTopUp(false);
        } finally {
            setTopUpLoading(false);
        }
    };

    const monthGroups = useMemo((): MonthGroup[] => {
        if (!activeDriver) return [];
        const fallbackDailyPlan = activeDriver.dailyPlan ?? 0;
        const dailyPlan = car ? (car.dailyPlan ?? 0) : fallbackDailyPlan;
        const driverTxs = transactions.filter(tx =>
            tx.driverId === activeDriver.id &&
            tx.status !== PaymentStatus.DELETED
        );
        if (driverTxs.length === 0) return [];

        const byMonth = new Map<string, Transaction[]>();
        for (const tx of driverTxs) {
            const mk = toMonthKey(new Date(tx.timestamp));
            if (!byMonth.has(mk)) byMonth.set(mk, []);
            byMonth.get(mk)!.push(tx);
        }

        return Array.from(byMonth.entries())
            .sort((a,b) => b[0].localeCompare(a[0]))
            .map(([mk, txs]) => {
                const [y,m] = mk.split('-').map(Number);
                const sorted     = [...txs].sort((a,b) => b.timestamp - a.timestamp);
                const planIncome = sorted.filter(t => t.type === TransactionType.INCOME && t.category !== 'deposit_topup').reduce((s,t) => s + Math.abs(t.amount), 0);
                const topUps     = sorted.filter(t => t.type === TransactionType.INCOME && t.category === 'deposit_topup').reduce((s,t) => s + Math.abs(t.amount), 0);
                const expense    = sorted.filter(t => t.type === TransactionType.EXPENSE || t.type === TransactionType.DEBT).reduce((s,t) => s + Math.abs(t.amount), 0);
                const daysOff    = sorted.filter(t => t.type === TransactionType.DAY_OFF).length;
                const notWorkingDays = sorted.filter(t => t.type === 'NOT_WORKING').length;
                const totalDays  = new Date(y, m, 0).getDate();
                const nowMk      = toMonthKey(new Date());
                const effectiveDays = mk === nowMk ? new Date().getDate() : totalDays;
                
                // Working days = elapsed days - days they were officially off or not working
                const workingDays   = Math.max(0, effectiveDays - daysOff - notWorkingDays);

                let monthlyTarget = 0;
                for (let d = 1; d <= effectiveDays; d++) {
                    const dayDate = new Date(y, m - 1, d);
                    
                    const isDayOffTx = sorted.some(tx =>
                        tx.type === TransactionType.DAY_OFF &&
                        new Date(tx.timestamp).getDate() === d
                    );
                    
                    const isNotWorkingTx = sorted.some(tx =>
                        tx.type === 'NOT_WORKING' &&
                        new Date(tx.timestamp).getDate() === d
                    );
                    
                    if (!isDayOffTx && !isNotWorkingTx) {
                        monthlyTarget += getEffectivePlanForDriverDay(activeDriver, dayDate, car);
                    }
                }

                const overpayment   = Math.max(0, planIncome - monthlyTarget);
                const paidPercent   = monthlyTarget > 0 ? Math.min(100, Math.round((planIncome / monthlyTarget) * 100)) : 0;
                return {
                    monthKey: mk,
                    label: `${MONTH_NAMES_UZ[m-1]} ${y}`,
                    planIncome, topUps, overpayment, expense, txs: sorted,
                    monthlyTarget, paidPercent,
                };
            });
    }, [activeDriver, car, transactions]);

    const prevTab = useRef(activeTab);
    useEffect(() => {
        if (activeTab === 'history' && prevTab.current !== 'history' && monthGroups.length > 0)
            setExpandedMonths(new Set([monthGroups[0].monthKey]));
        prevTab.current = activeTab;
    }, [activeTab, monthGroups]);

    const toggleMonth = (mk: string) => setExpandedMonths(prev => {
        const next = new Set(prev);
        next.has(mk) ? next.delete(mk) : next.add(mk);
        return next;
    });

    const visibleGroups = filterMonth === 'all' ? monthGroups : monthGroups.filter(g => g.monthKey === filterMonth);

    const finance = useMemo((): DriverFinanceSummary | null => {
        if (!activeDriver) return null;
        return calcDriverFinance(activeDriver, car, transactions);
    }, [activeDriver, car, transactions]);

    // Animate open/close
    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            document.body.style.overflow = 'hidden';
            // slight delay ensures the initial off-screen state is painted before animating in
            const timer = setTimeout(() => setVisible(true), 10);
            return () => clearTimeout(timer);
        } else if (shouldRender) {
            setVisible(false);
            const timer = setTimeout(() => {
                setShouldRender(false);
                document.body.style.overflow = '';
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen, shouldRender]);

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', h);
        return () => document.removeEventListener('keydown', h);
    }, [onClose]);

    if (!shouldRender || !activeDriver) return null;

    const dailyPlan  = car?.dailyPlan ?? 0;
    const dt         = activeDriver.driverType ?? 'deposit';
    const remaining  = finance?.remainingDeposit ?? 0;
    const initial    = finance?.depositAmount ?? activeDriver.depositAmount ?? 0;
    const depositPct = initial > 0 ? Math.max(0, Math.min(100, (remaining / initial) * 100)) : 0;
    const threshold  = activeDriver.depositWarningThreshold ?? 1_000_000;
    const isLow      = dt === 'deposit' && remaining <= threshold;

    const statusLabel: Record<string,string> = { ACTIVE: 'Faol', OFFLINE: 'Oflayn', BUSY: "Band" };

    // ── Base styles ───────────────────────────────────────────────────────────
    const bg    = isDark ? '#0f1827' : '#ffffff';
    const bg2   = isDark ? 'bg-white/[0.03]' : 'bg-gray-50';
    const bdr   = isDark ? 'border-white/[0.07]' : 'border-gray-200';
    const txt   = isDark ? 'text-white' : 'text-gray-900';
    const muted = isDark ? 'text-white/35' : 'text-gray-400';
    const sub   = isDark ? 'text-white/60' : 'text-gray-600';

    return createPortal(
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 z-[200] transition-all duration-280 ${isDark ? 'bg-black/70' : 'bg-gray-900/40'} backdrop-blur-sm`}
                style={{ opacity: visible ? 1 : 0 }}
                onClick={onClose}
            />

            {/* ── Right-Side Slide-Over Sheet ── */}
            <div className="fixed inset-y-0 right-0 z-[201] flex pointer-events-none w-full sm:w-[520px]">
                <div
                    className={`relative w-full h-full pointer-events-auto flex flex-col shadow-2xl overflow-hidden`}
                    style={{
                        background: bg,
                        borderLeft: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
                        transform: visible ? 'translateX(0)' : 'translateX(100%)',
                        transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                >
                    {/* ══ HEADER ══════════════════════════════════════════════ */}
                    <div className={`flex-shrink-0 flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b ${bdr}`}>
                        <div className="flex items-center gap-4 min-w-0">
                            <DriverAvatar
                                src={activeDriver.avatar}
                                name={activeDriver.name}
                                size={56}
                                theme={theme}
                                rounded="2xl"
                                className="flex-shrink-0 ring-2 ring-black/10"
                            />
                            <div className="min-w-0">
                                <h2 className={`text-lg font-bold truncate ${txt}`}>{activeDriver.name}</h2>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className={`w-8 h-8 flex items-center justify-center rounded-xl flex-shrink-0 transition-colors ${isDark ? 'text-white/30 hover:text-white hover:bg-white/[0.06]' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
                        >
                            <XIcon className="w-4 h-4" />
                        </button>
                    </div>

                    {/* ══ TABS ════════════════════════════════════════════════ */}
                    <div className={`flex-shrink-0 flex gap-0 px-5 pt-4 border-b ${bdr}`}>
                        {(['info','finance','history'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2.5 text-[13px] font-bold tracking-wide rounded-t-xl transition-all border-b-2 -mb-px ${
                                    activeTab === tab
                                        ? isDark ? 'text-teal-400 border-teal-400' : 'text-teal-600 border-teal-600'
                                        : isDark ? 'text-white/35 border-transparent hover:text-white/60' : 'text-gray-400 border-transparent hover:text-gray-600'
                                }`}
                            >
                                {tab === 'info' ? "Ma'lumot" : tab === 'finance' ? "Moliya" : 'Tarix'}
                            </button>
                        ))}
                    </div>

                    {/* ══ SCROLLABLE BODY ═════════════════════════════════════ */}
                    <div className="flex-1 overflow-y-auto">

                    {/* ── FINANCE TAB ── */}
                    {activeTab === 'finance' && (
                        <div className="pb-5">
                            {/* DEPOSIT / SALARY HERO / LEASE HERO */}
                            {dt === 'lease_to_own' ? (
                                <div className={`flex-shrink-0 mx-5 mt-4 rounded-2xl overflow-hidden border ${isDark ? 'border-teal-500/30 bg-teal-500/[0.07]' : 'border-teal-200 bg-teal-50'}`}>
                                    <div className="flex items-start gap-0 divide-x divide-teal-500/[0.12]">
                                        {/* Remaining */}
                                        <div className="flex-1 px-5 py-4">
                                            <p className={`text-[10px] font-black uppercase tracking-[0.15em] mb-1 ${isDark ? 'text-teal-400/70' : 'text-teal-700/70'}`}>
                                                🚗 Shartnoma qoldig'i
                                            </p>
                                            <p className={`text-[28px] font-black font-mono leading-none tabular-nums ${isDark ? 'text-teal-300' : 'text-teal-700'}`}>
                                                {fmt(finance?.contractRemaining ?? 0)}
                                            </p>
                                            <p className={`text-[11px] font-semibold mt-0.5 ${muted}`}>UZS</p>
                                        </div>

                                        {/* Stats column */}
                                        <div className="flex flex-col divide-y divide-teal-500/[0.10]">
                                            <div className="px-4 py-2.5 min-w-[130px]">
                                                <p className={`text-[9px] font-bold uppercase tracking-wider ${muted}`}>Jami</p>
                                                <p className={`text-[15px] font-black font-mono tabular-nums mt-0.5 ${isDark ? 'text-teal-400/70' : 'text-teal-600/80'}`}>{fmt(activeDriver.totalContractAmount ?? 0)}</p>
                                            </div>
                                            <div className="px-4 py-2.5">
                                                <p className={`text-[9px] font-bold uppercase tracking-wider ${muted}`}>To'langan</p>
                                                <p className={`text-[15px] font-black font-mono tabular-nums mt-0.5 ${isDark ? 'text-teal-400/70' : 'text-teal-600/80'}`}>{fmt(finance?.contractPaid ?? 0)}</p>
                                            </div>
                                            <div className="px-4 py-2.5">
                                                <p className={`text-[9px] font-bold uppercase tracking-wider ${muted}`}>Foizi</p>
                                                <p className={`text-[15px] font-black font-mono tabular-nums mt-0.5 ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>
                                                    {activeDriver.totalContractAmount ? Math.round(((finance?.contractPaid ?? 0) / activeDriver.totalContractAmount) * 100) : 0}%
                                                </p>
                                            </div>
                                            {(activeDriver.contractDurationMonths && activeDriver.contractDurationMonths > 0) ? (() => {
                                                const totalM = activeDriver.contractDurationMonths;
                                                const startMs = activeDriver.contractStartDate || Date.now();
                                                const msPassed = Math.max(0, Date.now() - startMs);
                                                const mPassed = Math.floor(msPassed / (1000 * 60 * 60 * 24 * 30.44));
                                                
                                                return (
                                                    <div className="px-4 py-2.5 bg-teal-500/5">
                                                        <p className={`text-[9px] font-bold uppercase tracking-wider ${muted}`}>Muddat ({totalM} oy)</p>
                                                        <p className={`text-[13px] font-black mt-0.5 ${isDark ? 'text-teal-400/80' : 'text-teal-700/80'}`}>
                                                            {mPassed} oy o'tdi
                                                        </p>
                                                        <p className={`text-[10px] font-semibold mt-0.5 ${isDark ? 'text-teal-400/50' : 'text-teal-700/50'}`}>
                                                            {Math.max(0, totalM - mPassed)} oy qoldi
                                                        </p>
                                                    </div>
                                                );
                                            })() : null}
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    {activeDriver.totalContractAmount && activeDriver.totalContractAmount > 0 ? (
                                        <div className={`px-5 pb-4 mt-2`}>
                                            <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-black/30' : 'bg-teal-200/60'}`}>
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700 bg-teal-500`}
                                                    style={{ width: `${Math.round(((finance?.contractPaid ?? 0) / activeDriver.totalContractAmount) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            ) : dt === 'deposit' ? (
                                <div className={`flex-shrink-0 mx-5 mt-4 rounded-2xl overflow-hidden border ${
                                    isLow
                                        ? isDark ? 'border-red-500/30 bg-red-500/[0.07]' : 'border-red-200 bg-red-50'
                                        : isDark ? 'border-amber-500/25 bg-amber-500/[0.07]' : 'border-amber-200 bg-amber-50'
                                }`}>
                                    <div className="flex items-start gap-0 divide-x divide-amber-500/[0.12]">
                                        {/* Remaining */}
                                        <div className="flex-1 px-5 py-4">
                                            <p className={`text-[10px] font-black uppercase tracking-[0.15em] mb-1 ${isLow ? (isDark ? 'text-red-400' : 'text-red-500') : (isDark ? 'text-amber-400/70' : 'text-amber-700/70')}`}>
                                                🏦 Depozit qoldig'i
                                            </p>
                                            <p className={`text-[28px] font-black font-mono leading-none tabular-nums ${
                                                isLow ? 'text-red-400' : isDark ? 'text-amber-300' : 'text-amber-700'
                                            }`}>
                                                {fmt(Math.max(0, remaining))}
                                            </p>
                                            <p className={`text-[11px] font-semibold mt-0.5 ${muted}`}>UZS</p>
                                            {isLow && (
                                                <p className={`text-[11px] font-bold mt-1.5 ${isDark ? 'text-red-400' : 'text-red-500'}`}>
                                                    ⚠ Depozit kam — to'ldiring
                                                </p>
                                            )}
                                        </div>

                                        {/* Stats column */}
                                        <div className="flex flex-col divide-y divide-amber-500/[0.10]">
                                            <div className="px-4 py-2.5 min-w-[130px]">
                                                <p className={`text-[9px] font-bold uppercase tracking-wider ${muted}`}>Boshlang'ich</p>
                                                <p className={`text-[15px] font-black font-mono tabular-nums mt-0.5 ${isDark ? 'text-amber-400/70' : 'text-amber-600/80'}`}>{fmt(initial)}</p>
                                            </div>
                                            <div className="px-4 py-2.5">
                                                <p className={`text-[9px] font-bold uppercase tracking-wider ${muted}`}>Ishlatilgan</p>
                                                <p className={`text-[15px] font-black font-mono tabular-nums mt-0.5 ${isDark ? 'text-red-400/70' : 'text-red-500/80'}`}>{fmt(Math.max(0, initial - remaining))}</p>
                                            </div>
                                            <div className="px-4 py-2.5">
                                                <p className={`text-[9px] font-bold uppercase tracking-wider ${muted}`}>Foizi</p>
                                                <p className={`text-[15px] font-black font-mono tabular-nums mt-0.5 ${isLow ? 'text-red-400' : isDark ? 'text-amber-400' : 'text-amber-600'}`}>{Math.round(depositPct)}%</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    {initial > 0 && (
                                        <div className={`px-5 pb-3`}>
                                            <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-black/30' : 'bg-amber-200/60'}`}>
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700 ${isLow ? 'bg-red-500' : 'bg-amber-500'}`}
                                                    style={{ width: `${depositPct}%` }}
                                                />
                                            </div>
                                            <p className={`text-[10px] mt-1 ${muted}`}>{Math.round(depositPct)}% qoldi</p>
                                        </div>
                                    )}

                                    {/* Top-up inline */}
                                    {userRole === 'admin' && onAddTransaction && (
                                        <div className={`border-t ${isDark ? 'border-amber-500/[0.12]' : 'border-amber-200'}`}>
                                            {showTopUp ? (
                                                <div className="px-5 py-3 flex flex-col gap-2">
                                                    <p className={`text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-amber-400/60' : 'text-amber-700/60'}`}>Depozit to'ldirish</p>
                                                    <div className="flex gap-2">
                                                        <div className="relative flex-1">
                                                            <input
                                                                type="text"
                                                                inputMode="numeric"
                                                                value={topUpDisplay}
                                                                onChange={e => { const r = e.target.value.replace(/\D/g,''); setTopUpRaw(r); setTopUpDisplay(fmtDisp(r)); }}
                                                                placeholder="Miqdor (UZS)"
                                                                autoFocus
                                                                className={`w-full px-3 py-2.5 pr-12 rounded-xl text-[14px] font-mono font-bold outline-none border transition-all ${isDark ? 'bg-black/30 border-amber-500/20 text-white placeholder-white/20 focus:border-amber-500/50' : 'bg-white border-amber-300 text-gray-900 placeholder-gray-300 focus:border-amber-500'}`}
                                                            />
                                                            <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold ${isDark ? 'text-amber-500/50' : 'text-amber-600'}`}>UZS</span>
                                                        </div>
                                                        <button
                                                            onClick={handleTopUpSubmit}
                                                            disabled={topUpLoading || !topUpRaw}
                                                            className="px-4 py-2.5 rounded-xl text-[13px] font-bold bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 transition-colors flex-shrink-0 active:scale-95"
                                                        >
                                                            {topUpLoading ? '…' : "Qo'sh"}
                                                        </button>
                                                        <button
                                                            onClick={() => { setShowTopUp(false); setTopUpRaw(''); setTopUpDisplay(''); setTopUpNote(''); }}
                                                            className={`px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-colors flex-shrink-0 ${isDark ? 'text-white/30 hover:text-white/60 hover:bg-white/[0.05]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                                                        >
                                                            Bekor
                                                        </button>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={topUpNote}
                                                        onChange={e => setTopUpNote(e.target.value)}
                                                        placeholder="Izoh (ixtiyoriy)"
                                                        className={`w-full px-3 py-2 rounded-xl text-[13px] outline-none border transition-all ${isDark ? 'bg-black/20 border-amber-500/10 text-white placeholder-white/20' : 'bg-white border-amber-200 text-gray-900 placeholder-gray-300'}`}
                                                    />
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setShowTopUp(true)}
                                                    className={`w-full py-2.5 text-[12px] font-bold transition-colors ${isDark ? 'text-amber-400/70 hover:text-amber-400 hover:bg-amber-500/[0.08]' : 'text-amber-700 hover:bg-amber-100'}`}
                                                >
                                                    + Depozit to'ldirish
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* Salary hero */
                                <div className={`flex-shrink-0 mx-5 mt-4 rounded-2xl border px-5 py-4 flex items-center justify-between gap-4 ${isDark ? 'border-violet-500/20 bg-violet-500/[0.06]' : 'border-violet-200 bg-violet-50'}`}>
                                    <div>
                                        <p className={`text-[10px] font-black uppercase tracking-[0.15em] mb-1 flex items-center gap-1 ${isDark ? 'text-violet-400/70' : 'text-violet-700/70'}`}>
                                            <div className="w-3 h-3 flex items-center justify-center"><Lottie animationData={cardAnimation} loop={true} /></div>
                                            Oylik maosh
                                        </p>
                                        <p className={`text-[28px] font-black font-mono leading-none tabular-nums ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>
                                            {fmt(activeDriver.monthlySalary ?? 0)}
                                        </p>
                                        <p className={`text-[11px] font-semibold mt-0.5 ${muted}`}>UZS / oy</p>
                                    </div>
                                    {dailyPlan > 0 && (
                                        <div className="text-right">
                                            <p className={`text-[10px] font-black uppercase tracking-wider ${muted}`}>Kunlik reja</p>
                                            <p className={`text-[20px] font-black font-mono tabular-nums ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>{fmt(dailyPlan)}</p>
                                            <p className={`text-[11px] ${muted}`}>UZS/kun</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    {activeTab === 'info' && (
                        <div className="p-5 space-y-4">

                            {/* Daily plan + contact row */}
                            <div className="grid grid-cols-2 gap-3">
                                {/* Kunlik reja */}
                                {dailyPlan > 0 && (
                                    <div className={`rounded-2xl border px-4 py-3 ${isDark ? 'border-teal-500/15 bg-teal-500/[0.06]' : 'border-teal-200 bg-teal-50'}`}>
                                        <p className={`text-[10px] font-black uppercase tracking-wider mb-1 ${isDark ? 'text-teal-500/70' : 'text-teal-600/70'}`}>Kunlik reja</p>
                                        <p className={`text-[18px] font-black font-mono tabular-nums ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>{fmt(dailyPlan)}</p>
                                        <p className={`text-[10px] ${muted}`}>UZS/kun</p>
                                    </div>
                                )}
                                {/* Phone */}
                                {activeDriver.phone && (
                                    <div className={`rounded-2xl border px-4 py-3 flex flex-col justify-between ${isDark ? 'border-white/[0.07] bg-white/[0.03]' : 'border-gray-200 bg-gray-50'}`}>
                                        <p className={`text-[10px] font-black uppercase tracking-wider mb-1 ${muted}`}>📞 Telefon</p>
                                        <div>
                                            <p className={`text-[13px] font-mono font-bold ${sub}`}>{activeDriver.phone}</p>
                                            {activeDriver.extraPhone && <p className={`text-[11px] font-mono mt-0.5 ${muted}`}>{activeDriver.extraPhone}</p>}
                                            {activeDriver.telegram && <p className={`text-[11px] font-mono mt-0.5 text-sky-400`}>✈ {activeDriver.telegram}</p>}
                                        </div>
                                        <a href={`tel:${activeDriver.phone}`} className={`mt-2 text-[11px] font-bold px-3 py-1 rounded-lg self-start transition-colors ${isDark ? 'bg-white/[0.05] text-white/40 hover:text-white' : 'bg-gray-200 text-gray-500 hover:text-gray-700'}`}>
                                            Qo'ng'iroq
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* Employment Info */}
                            <div className={`rounded-2xl border px-4 py-3 flex flex-col justify-between ${isDark ? 'border-white/[0.07] bg-white/[0.03]' : 'border-gray-200 bg-gray-50'}`}>
                                <p className={`text-[10px] font-black uppercase tracking-wider mb-2 ${muted}`}>🏢 Ish staji (Faoliyat tarixi)</p>
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className={`text-[12px] font-semibold ${sub}`}>Boshladi:</span>
                                        <span className={`text-[12px] font-bold ${txt}`}>
                                            {(() => {
                                                const dMs = activeDriver.startDate || activeDriver.createdAt;
                                                if (!dMs) return 'Noma\'lum';
                                                const d = new Date(dMs);
                                                return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
                                            })()}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className={`text-[12px] font-semibold ${sub}`}>Holati:</span>
                                        {activeDriver.quitDate ? (
                                            <span className={`text-[12px] font-bold text-red-500`}>
                                                Bo'shatilgan ({(() => {
                                                    const d = new Date(activeDriver.quitDate);
                                                    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
                                                })()})
                                            </span>
                                        ) : (
                                            <span className={`text-[12px] font-bold text-emerald-500`}>Hali ishlamoqda</span>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between pt-1 border-t border-black/5 dark:border-white/5">
                                        <span className={`text-[12px] font-semibold ${sub}`}>Jami muddat:</span>
                                        <span className={`text-[12px] font-black ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                                            {(() => {
                                                const start = activeDriver.startDate || activeDriver.createdAt || Date.now();
                                                const end = activeDriver.quitDate || Date.now();
                                                const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24));
                                                if (diffDays <= 0) return '0 kun';
                                                const years = Math.floor(diffDays / 365);
                                                const months = Math.floor((diffDays % 365) / 30);
                                                const days = (diffDays % 365) % 30;
                                                let res = [];
                                                if (years > 0) res.push(`${years} yil`);
                                                if (months > 0) res.push(`${months} oy`);
                                                if (days > 0 && years === 0) res.push(`${days} kun`);
                                                return res.join(' ') || '0 kun';
                                            })()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Vehicle */}
                            {car && (
                                <div className={`rounded-2xl border overflow-hidden ${isDark ? 'border-white/[0.07]' : 'border-gray-200'}`}>
                                    <div className={`px-4 py-2.5 border-b ${bdr} ${bg2}`}>
                                        <p className={`text-[10px] font-black uppercase tracking-wider ${muted}`}>🚗 Avtomobil</p>
                                    </div>
                                    <div className="flex items-center gap-4 px-4 py-3">
                                        <div className={`w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border ${isDark ? 'border-white/[0.07]' : 'border-gray-200'}`}>
                                            {car.avatar
                                                ? <img src={car.avatar} alt={car.name} className="w-full h-full object-cover" />
                                                : <div className={`w-full h-full flex items-center justify-center ${isDark ? 'bg-surface-2' : 'bg-gray-100'}`}><CarIcon className={`w-7 h-7 ${isDark ? 'text-white/20' : 'text-gray-300'}`} /></div>
                                            }
                                        </div>
                                        <div>
                                            <p className={`text-[15px] font-bold ${txt}`}>{car.name}</p>
                                            <div className="mt-1.5">
                                                <LicensePlate plate={car.licensePlate} size="sm" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Documents */}
                            {docs.length > 0 && (
                                <div className={`rounded-2xl border overflow-hidden ${isDark ? 'border-white/[0.07]' : 'border-gray-200'}`}>
                                    <div className={`px-4 py-2.5 border-b ${bdr} ${bg2}`}>
                                        <p className={`text-[10px] font-black uppercase tracking-wider ${muted}`}>📄 Hujjatlar</p>
                                    </div>
                                    <div className="px-4 py-3 space-y-3">
                                        {Array.from(new Set(docs.map((d:any) => d.category))).map((cat:any) => {
                                            const catDocs = docs.filter((d:any) => d.category === cat);
                                            return (
                                                <div key={cat}>
                                                    <p className={`text-[10px] font-semibold uppercase tracking-wide mb-2 ${muted}`}>{getFriendlyDocName(catDocs[0])}</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {catDocs.map((doc:any, idx:number) => {
                                                            const isImage = doc.type?.startsWith('image/');
                                                            return isImage ? (
                                                                <button key={idx} type="button"
                                                                    onClick={() => setViewingDoc({ name: doc.name, data: doc.data })}
                                                                    className="relative group overflow-hidden rounded-xl border border-white/[0.08] flex-shrink-0"
                                                                >
                                                                    <img src={doc.data} alt={doc.name} className="w-20 h-20 object-cover" />
                                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                        <span className="text-white text-[11px] font-bold">Ko'rish</span>
                                                                    </div>
                                                                    <span className={`absolute bottom-0 left-0 right-0 text-[9px] font-medium text-center py-0.5 bg-black/60 text-white`}>{idx+1}-rasm</span>
                                                                </button>
                                                            ) : (
                                                                <button key={idx} onClick={(e) => { e.stopPropagation(); forceDownload(doc.data, doc.name); }}
                                                                    className={`w-20 h-20 rounded-xl border flex flex-col items-center justify-center gap-1 transition-colors ${isDark ? 'border-red-500/20 bg-red-500/10 hover:bg-red-500/15' : 'border-red-200 bg-red-50 hover:bg-red-100'}`}
                                                                >
                                                                    <span className="text-2xl">📄</span>
                                                                    <span className="text-[9px] font-bold text-red-400">PDF</span>
                                                                    <span className={`text-[8px] ${muted}`}>{idx+1}-fayl</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            {(activeDriver as any).notes && (
                                <div className={`rounded-2xl border overflow-hidden ${isDark ? 'border-white/[0.07]' : 'border-gray-200'}`}>
                                    <div className={`px-4 py-2.5 border-b ${bdr} ${bg2}`}>
                                        <p className={`text-[10px] font-black uppercase tracking-wider ${muted}`}>📝 Izohlar</p>
                                    </div>
                                    <p className={`px-4 py-3 text-[13px] leading-relaxed whitespace-pre-wrap ${sub}`}>{(activeDriver as any).notes}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── HISTORY TAB ── */}
                    {activeTab === 'history' && (
                        <div className="p-5 space-y-3">
                            {/* Launch pad — 3 section buttons */}
                            <button
                                onClick={() => setShowHistory(true)}
                                className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border transition-all active:scale-[0.98] ${isDark ? 'border-teal-500/20 bg-teal-500/[0.06] hover:bg-teal-500/10' : 'border-teal-200 bg-teal-50 hover:bg-teal-100'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">📋</span>
                                    <div className="text-left">
                                        <p className={`text-[14px] font-black ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>Tranzaksiyalar tarixi</p>
                                        <p className={`text-[11px] ${muted}`}>Barcha kirim / chiqim yozuvlari</p>
                                    </div>
                                </div>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={isDark ? 'text-teal-400' : 'text-teal-600'}>
                                    <polyline points="9 18 15 12 9 6"/>
                                </svg>
                            </button>

                            {dt === 'deposit' && (
                                <button
                                    onClick={() => setShowHistory(true)}
                                    className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border transition-all active:scale-[0.98] ${isDark ? 'border-amber-500/20 bg-amber-500/[0.06] hover:bg-amber-500/10' : 'border-amber-200 bg-amber-50 hover:bg-amber-100'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">🏦</span>
                                        <div className="text-left">
                                            <p className={`text-[14px] font-black ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>Depozit tarixi</p>
                                            <p className={`text-[11px] ${muted}`}>To'ldirish va sarflash ledgeri</p>
                                        </div>
                                    </div>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={isDark ? 'text-amber-400' : 'text-amber-600'}>
                                        <polyline points="9 18 15 12 9 6"/>
                                    </svg>
                                </button>
                            )}

                            {dt === 'salary' && (
                                <button
                                    onClick={() => setShowHistory(true)}
                                    className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border transition-all active:scale-[0.98] ${isDark ? 'border-violet-500/20 bg-violet-500/[0.06] hover:bg-violet-500/10' : 'border-violet-200 bg-violet-50 hover:bg-violet-100'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 flex items-center justify-center"><Lottie animationData={cardAnimation} loop={true} /></div>
                                        <div className="text-left">
                                            <p className={`text-[14px] font-black ${isDark ? 'text-violet-400' : 'text-violet-700'}`}>Maosh tarixi</p>
                                            <p className={`text-[11px] ${muted}`}>Oylik maosh to'lovlari</p>
                                        </div>
                                    </div>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={isDark ? 'text-violet-400' : 'text-violet-600'}>
                                        <polyline points="9 18 15 12 9 6"/>
                                    </svg>
                                </button>
                            )}

                            {monthGroups.length === 0 && (
                                <div className={`flex flex-col items-center justify-center py-8 gap-2 ${muted}`}>
                                    <span className="text-3xl">📊</span>
                                    <p className="text-sm font-medium">Tranzaksiyalar yo'q</p>
                                </div>
                            )}
                        </div>
                    )}
                    </div>

                    {/* ══ FOOTER ══════════════════════════════════════════════ */}
                    {userRole === 'admin' && (
                        <div className={`flex-shrink-0 flex gap-2 px-5 py-4 border-t pb-8 sm:pb-4 ${bdr} ${isDark ? '' : 'bg-gray-50'}`}>
                            <button
                                onClick={() => { onClose(); setTimeout(() => onEdit(activeDriver), 150); }}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl text-[13px] font-bold transition-all active:scale-95 border ${isDark ? 'bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 border-teal-500/20' : 'bg-teal-50 text-teal-700 hover:bg-teal-100 border-teal-200'}`}
                            >
                                <EditIcon className="w-4 h-4" /> Tahrirlash
                            </button>
                            {activeDriver.quitDate ? (
                                <button
                                    onClick={async () => {
                                        const now = Date.now();
                                        setInternalDriver(prev => prev ? { ...prev, quitDate: null, status: DriverStatus.ACTIVE } : null);
                                        await updateDriver(activeDriver.id, {
                                            quitDate: null,
                                            status: DriverStatus.ACTIVE
                                        } as any, 'system');
                                    }}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl text-[13px] font-bold transition-all active:scale-95 border ${isDark ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-200'}`}
                                >
                                    <EditIcon className="w-4 h-4" /> Qayta ishga olish
                                </button>
                            ) : (
                                <button
                                    onClick={() => setShowTerminate(true)}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl text-[13px] font-bold transition-all active:scale-95 border ${isDark ? 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border-orange-500/20' : 'bg-orange-50 text-orange-600 hover:bg-orange-100 border-orange-200'}`}
                                >
                                    <LogOutIcon className="w-4 h-4" /> Bo'shatish
                                </button>
                            )}
                            <button
                                onClick={() => { onClose(); setTimeout(() => onDelete(activeDriver.id), 150); }}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl text-[13px] font-bold transition-all active:scale-95 border ${isDark ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200'}`}
                            >
                                <TrashIcon className="w-4 h-4" /> O'chirish
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Terminate Modal */}
            {showTerminate && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', animation: 'fadeIn 0.12s ease-out' }}>
                    <div className={`w-full max-w-sm rounded-[24px] overflow-hidden shadow-2xl border ${isDark ? 'bg-[#1a2236] border-white/[0.08]' : 'bg-white border-gray-200'}`} style={{ animation: 'popUp 0.18s cubic-bezier(0.34,1.56,0.64,1)' }}>
                        <div className="flex flex-col items-center pt-8 pb-2 px-6 text-center">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isDark ? 'bg-orange-500/15' : 'bg-orange-50'}`}>
                                <LogOutIcon className="w-7 h-7 text-orange-500" />
                            </div>
                            <h3 className={`text-[18px] font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Ishdan bo'shatish</h3>
                            <p className={`text-[13px] leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                <b>{activeDriver.name}</b>ni ishdan bo'shatmoqchimisiz?<br />
                                {car && "Unga biriktirilgan mashina avtomatik ravishda olinadi va "}Holati oflayn qilinadi.
                            </p>
                        </div>
                        <div className={`mx-6 mt-6 mb-0 h-px ${isDark ? 'bg-white/[0.06]' : 'bg-gray-100'}`} />
                        <div className="flex">
                            <button onClick={() => setShowTerminate(false)} className={`flex-1 py-4 text-[15px] font-semibold transition-colors border-r ${isDark ? 'text-gray-300 hover:bg-white/[0.04] border-white/[0.06]' : 'text-gray-700 hover:bg-gray-50 border-gray-100'}`}>Bekor</button>
                            <button
                                onClick={async () => {
                                    setShowTerminate(false);
                                    if (car) await unassignCar(car.id);
                                    const now = Date.now();
                                    setInternalDriver(prev => prev ? { ...prev, quitDate: now, status: DriverStatus.OFFLINE } : null);
                                    await updateDriver(activeDriver.id, {
                                        quitDate: now,
                                        status: DriverStatus.OFFLINE
                                    } as any, 'system');
                                }}
                                className="flex-1 py-4 text-[15px] font-bold text-orange-500 hover:bg-orange-500/[0.06] transition-colors active:scale-[0.98]"
                            >
                                Bo'shatish
                            </button>
                        </div>
                    </div>
                </div>, document.body
            )}

            {/* Image lightbox */}
            {viewingDoc && createPortal(
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Hujjat rasmi"
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-10"
                    style={{
                        background: 'rgba(0,0,0,0.72)',
                        backdropFilter: 'blur(8px)',
                        animation: 'rcFadeIn 0.2s ease-out',
                    }}
                    onClick={() => setViewingDoc(null)}
                    onKeyDown={e => { if (e.key === 'Escape') setViewingDoc(null); }}
                >
                    {/* Card */}
                    <div
                        className={`relative flex flex-col rounded-3xl shadow-2xl overflow-hidden w-full ${
                            isDark ? 'bg-[#141c2e]' : 'bg-[#f5f5f7]'
                        }`}
                        style={{
                            maxWidth: 520,
                            maxHeight: 'calc(100vh - 80px)',
                            animation: 'rcPopUp 0.28s cubic-bezier(0.34,1.56,0.64,1)',
                            boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* ── Header ── */}
                        <div
                            className={`flex items-center justify-between px-5 py-4 flex-shrink-0 border-b ${
                                isDark ? 'border-white/[0.07] bg-[#1a2336]' : 'border-black/[0.07] bg-white'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                                    isDark ? 'bg-teal-500/15' : 'bg-teal-50'
                                }`}>
                                    <svg className="w-4.5 h-4.5 text-teal-500" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5l-2-2H10z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className={`text-[14px] font-bold leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {viewingDoc.name}
                                    </p>
                                    <p className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                        👤 {activeDriver.name}
                                    </p>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); forceDownload(viewingDoc.data, viewingDoc.name); }}
                                    title="Yuklab olish"
                                    className={`w-10 h-10 flex items-center justify-center rounded-2xl font-semibold transition-all active:scale-90 ${
                                        isDark
                                            ? 'bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border border-blue-500/20'
                                            : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
                                    }`}
                                >
                                    <svg className="w-4.5 h-4.5" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                </button>
                                <button
                                    autoFocus
                                    onClick={() => setViewingDoc(null)}
                                    title="Yopish"
                                    className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-all active:scale-90 ${
                                        isDark
                                            ? 'bg-white/[0.08] text-gray-300 hover:bg-white/[0.14] hover:text-white border border-white/[0.10]'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 border border-gray-200'
                                    }`}
                                >
                                    <svg className="w-4.5 h-4.5" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* ── Image area ── */}
                        <div
                            className={`flex-1 overflow-y-auto flex items-center justify-center p-4 ${
                                isDark ? 'bg-[#0e1525]' : 'bg-gray-100'
                            }`}
                            style={{ minHeight: 200 }}
                        >
                            <img
                                src={viewingDoc.data}
                                alt={viewingDoc.name}
                                className="w-full rounded-2xl object-contain shadow-xl"
                                style={{ maxHeight: 'calc(100vh - 240px)' }}
                            />
                        </div>

                        {/* ── Footer ── */}
                        <div className={`px-5 py-3.5 flex items-center justify-between flex-shrink-0 border-t ${
                            isDark ? 'border-white/[0.07] bg-[#1a2336]' : 'border-black/[0.07] bg-white'
                        }`}>
                            <span className={`text-[11px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                                Tashqariga bosing yoki{' '}
                                <kbd className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                                    isDark ? 'bg-white/[0.08] border border-white/[0.12] text-gray-400' : 'bg-gray-100 border border-gray-200 text-gray-500'
                                }`}>Esc</kbd>{' '}
                                yopish uchun
                            </span>
                            <button
                                onClick={() => setViewingDoc(null)}
                                className={`text-[12px] font-semibold px-3.5 py-1.5 rounded-xl transition-all active:scale-95 ${
                                    isDark ? 'text-gray-400 hover:text-white hover:bg-white/[0.08]' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                                }`}
                            >
                                Yopish
                            </button>
                        </div>
                    </div>

                    <style>{`
                        @keyframes rcFadeIn { from { opacity:0 } to { opacity:1 } }
                        @keyframes rcPopUp  { from { opacity:0; transform:scale(0.92) translateY(12px) } to { opacity:1; transform:scale(1) translateY(0) } }
                    `}</style>
                </div>,
                document.body
            )}
            {/* DriverHistoryPage — full-screen slide-over */}
            {showHistory && driver && (
                <DriverHistoryPage
                    driver={driver}
                    car={car}
                    transactions={transactions}
                    theme={theme}
                    onClose={() => setShowHistory(false)}
                />
            )}
        </>,
        document.body
    );
};
