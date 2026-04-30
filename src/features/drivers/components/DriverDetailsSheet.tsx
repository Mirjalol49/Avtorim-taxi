import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Driver } from '../../../core/types';
import { Car } from '../../../core/types/car.types';
import { Transaction, TransactionType, PaymentStatus } from '../../../core/types/transaction.types';
import { calcDriverFinance, DriverFinanceSummary } from '../utils/debtUtils';
import {
    XIcon, EditIcon, TrashIcon, PhoneIcon, CarIcon, NotesIcon,
} from '../../../../components/Icons';

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

const fmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n));
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
    const { t } = useTranslation();
    const isDark = theme === 'dark';

    const [visible,        setVisible]        = useState(false);
    const [viewingDoc,     setViewingDoc]      = useState<{ name:string; data:string }|null>(null);
    const [activeTab,      setActiveTab]       = useState<'info'|'history'>('info');
    const [filterMonth,    setFilterMonth]     = useState<string>('all');
    const [expandedMonths, setExpandedMonths]  = useState<Set<string>>(new Set());

    // Top-up form
    const [showTopUp,    setShowTopUp]    = useState(false);
    const [topUpRaw,     setTopUpRaw]     = useState('');
    const [topUpDisplay, setTopUpDisplay] = useState('');
    const [topUpNote,    setTopUpNote]    = useState('');
    const [topUpLoading, setTopUpLoading] = useState(false);

    const handleTopUpSubmit = async () => {
        const amount = parseInt(topUpRaw, 10);
        if (!driver || isNaN(amount) || amount <= 0 || !onAddTransaction) return;
        setTopUpLoading(true);
        try {
            await onAddTransaction({
                driverId: driver.id,
                driverName: driver.name,
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
        if (!driver) return [];
        const dailyPlan = car?.dailyPlan ?? 0;
        const driverTxs = transactions.filter(tx =>
            tx.driverId === driver.id &&
            tx.status !== PaymentStatus.DELETED &&
            (tx as any).status !== 'DELETED'
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
                const totalDays  = new Date(y, m, 0).getDate();
                const nowMk      = toMonthKey(new Date());
                const effectiveDays = mk === nowMk ? new Date().getDate() : totalDays;
                const workingDays   = Math.max(0, effectiveDays - daysOff);
                const monthlyTarget = dailyPlan * workingDays;
                const overpayment   = Math.max(0, planIncome - monthlyTarget);
                const paidPercent   = monthlyTarget > 0 ? Math.min(100, Math.round((planIncome / monthlyTarget) * 100)) : 0;
                return {
                    monthKey: mk,
                    label: `${MONTH_NAMES_UZ[m-1]} ${y}`,
                    planIncome, topUps, overpayment, expense, txs: sorted,
                    monthlyTarget, paidPercent,
                };
            });
    }, [driver, car, transactions]);

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
        if (!driver) return null;
        return calcDriverFinance(driver, car, transactions);
    }, [driver, car, transactions]);

    // Animate open/close
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            requestAnimationFrame(() => setVisible(true));
        } else {
            setVisible(false);
            const timer = setTimeout(() => { document.body.style.overflow = ''; }, 280);
            return () => clearTimeout(timer);
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', h);
        return () => document.removeEventListener('keydown', h);
    }, [onClose]);

    if (!isOpen && !visible) return null;
    if (!driver) return null;

    const docs       = driver.documents ?? [];
    const dailyPlan  = car?.dailyPlan ?? 0;
    const dt         = driver.driverType ?? 'deposit';
    const remaining  = finance?.remainingDeposit ?? 0;
    const initial    = finance?.depositAmount ?? driver.depositAmount ?? 0;
    const depositPct = initial > 0 ? Math.max(0, Math.min(100, (remaining / initial) * 100)) : 0;
    const threshold  = driver.depositWarningThreshold ?? 1_000_000;
    const isLow      = dt === 'deposit' && remaining <= threshold;

    const statusColor: Record<string,string> = {
        ACTIVE:  isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600 border border-emerald-200',
        OFFLINE: isDark ? 'bg-gray-500/15 text-gray-400'      : 'bg-gray-100 text-gray-500',
        BUSY:    isDark ? 'bg-amber-500/15 text-amber-400'     : 'bg-amber-50 text-amber-600',
    };
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

            {/* ── Centered modal ── */}
            <div className="fixed inset-0 z-[201] flex items-center justify-center p-3 sm:p-5 pointer-events-none">
                <div
                    className={`relative w-full pointer-events-auto flex flex-col rounded-3xl border shadow-2xl overflow-hidden`}
                    style={{
                        background: bg,
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb',
                        maxWidth: 760,
                        maxHeight: '90vh',
                        transform: visible ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(12px)',
                        opacity: visible ? 1 : 0,
                        transition: 'transform 0.28s cubic-bezier(.22,.68,0,1.2), opacity 0.22s ease',
                    }}
                >
                    {/* ══ HEADER ══════════════════════════════════════════════ */}
                    <div className={`flex-shrink-0 flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b ${bdr}`}>
                        <div className="flex items-center gap-4 min-w-0">
                            {driver.avatar ? (
                                <img src={driver.avatar} alt={driver.name}
                                    className="w-14 h-14 rounded-2xl object-cover flex-shrink-0 ring-2 ring-black/10" />
                            ) : (
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black flex-shrink-0 ${isDark ? 'bg-white/[0.06] text-white/40' : 'bg-gray-100 text-gray-400'}`}>
                                    {driver.name.charAt(0)}
                                </div>
                            )}
                            <div className="min-w-0">
                                <h2 className={`text-lg font-bold truncate ${txt}`}>{driver.name}</h2>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className={`inline-flex text-[11px] font-bold px-2 py-0.5 rounded-full ${statusColor[driver.status] ?? statusColor['OFFLINE']}`}>
                                        {statusLabel[driver.status] ?? driver.status}
                                    </span>
                                    {car && (
                                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${isDark ? 'border-white/[0.08] text-white/40' : 'border-gray-200 text-gray-400'}`}>
                                            🚗 {car.licensePlate}
                                        </span>
                                    )}
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

                    {/* ══ DEPOSIT / SALARY HERO ═══════════════════════════════ */}
                    {dt === 'deposit' ? (
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
                                <p className={`text-[10px] font-black uppercase tracking-[0.15em] mb-1 ${isDark ? 'text-violet-400/70' : 'text-violet-700/70'}`}>💳 Oylik maosh</p>
                                <p className={`text-[28px] font-black font-mono leading-none tabular-nums ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>
                                    {fmt(driver.monthlySalary ?? 0)}
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

                    {/* ══ TABS ════════════════════════════════════════════════ */}
                    <div className={`flex-shrink-0 flex gap-0 px-5 pt-4 border-b ${bdr}`}>
                        {(['info','history'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2.5 text-[13px] font-bold tracking-wide rounded-t-xl transition-all border-b-2 -mb-px ${
                                    activeTab === tab
                                        ? isDark ? 'text-teal-400 border-teal-400' : 'text-teal-600 border-teal-600'
                                        : isDark ? 'text-white/35 border-transparent hover:text-white/60' : 'text-gray-400 border-transparent hover:text-gray-600'
                                }`}
                            >
                                {tab === 'info' ? "Ma'lumot" : 'Tarix'}
                            </button>
                        ))}
                    </div>

                    {/* ══ SCROLLABLE BODY ═════════════════════════════════════ */}
                    <div className="flex-1 overflow-y-auto">

                    {/* ── INFO TAB ── */}
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
                                {driver.phone && (
                                    <div className={`rounded-2xl border px-4 py-3 flex flex-col justify-between ${isDark ? 'border-white/[0.07] bg-white/[0.03]' : 'border-gray-200 bg-gray-50'}`}>
                                        <p className={`text-[10px] font-black uppercase tracking-wider mb-1 ${muted}`}>📞 Telefon</p>
                                        <div>
                                            <p className={`text-[13px] font-mono font-bold ${sub}`}>{driver.phone}</p>
                                            {driver.extraPhone && <p className={`text-[11px] font-mono mt-0.5 ${muted}`}>{driver.extraPhone}</p>}
                                            {driver.telegram && <p className={`text-[11px] font-mono mt-0.5 text-sky-400`}>✈ {driver.telegram}</p>}
                                        </div>
                                        <a href={`tel:${driver.phone}`} className={`mt-2 text-[11px] font-bold px-3 py-1 rounded-lg self-start transition-colors ${isDark ? 'bg-white/[0.05] text-white/40 hover:text-white' : 'bg-gray-200 text-gray-500 hover:text-gray-700'}`}>
                                            Qo'ng'iroq
                                        </a>
                                    </div>
                                )}
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
                                            <span className={`inline-block mt-1 text-[11px] font-mono font-bold tracking-widest px-2.5 py-0.5 rounded-lg border ${isDark ? 'border-white/[0.08] bg-surface text-white/40' : 'border-gray-200 bg-white text-gray-500'}`}>
                                                {car.licensePlate}
                                            </span>
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
                                                                <a key={idx} href={doc.data} download={doc.name} target="_blank" rel="noreferrer"
                                                                    className={`w-20 h-20 rounded-xl border flex flex-col items-center justify-center gap-1 transition-colors ${isDark ? 'border-red-500/20 bg-red-500/10 hover:bg-red-500/15' : 'border-red-200 bg-red-50 hover:bg-red-100'}`}
                                                                >
                                                                    <span className="text-2xl">📄</span>
                                                                    <span className="text-[9px] font-bold text-red-400">PDF</span>
                                                                    <span className={`text-[8px] ${muted}`}>{idx+1}-fayl</span>
                                                                </a>
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
                            {(driver as any).notes && (
                                <div className={`rounded-2xl border overflow-hidden ${isDark ? 'border-white/[0.07]' : 'border-gray-200'}`}>
                                    <div className={`px-4 py-2.5 border-b ${bdr} ${bg2}`}>
                                        <p className={`text-[10px] font-black uppercase tracking-wider ${muted}`}>📝 Izohlar</p>
                                    </div>
                                    <p className={`px-4 py-3 text-[13px] leading-relaxed whitespace-pre-wrap ${sub}`}>{(driver as any).notes}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── HISTORY TAB ── */}
                    {activeTab === 'history' && (
                        <div className="p-5 space-y-3">
                            {monthGroups.length === 0 ? (
                                <div className={`flex flex-col items-center justify-center py-16 gap-3 ${muted}`}>
                                    <span className="text-4xl">📊</span>
                                    <p className="text-sm font-medium">Tranzaksiyalar yo'q</p>
                                </div>
                            ) : (
                                <>
                                    {/* Month filter chips */}
                                    <div className="flex gap-2 overflow-x-auto pb-1">
                                        {[{ key: 'all', label: 'Hammasi' }, ...monthGroups.map(g => ({ key: g.monthKey, label: g.label }))].map(({ key, label }) => (
                                            <button
                                                key={key}
                                                onClick={() => { setFilterMonth(key); if (key !== 'all') setExpandedMonths(new Set([key])); }}
                                                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors border ${
                                                    filterMonth === key
                                                        ? isDark ? 'bg-teal-500/20 text-teal-400 border-teal-500/30' : 'bg-teal-100 text-teal-700 border-teal-300'
                                                        : isDark ? 'bg-white/[0.05] text-white/40 border-white/[0.06]' : 'bg-gray-100 text-gray-500 border-gray-200'
                                                }`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Month cards */}
                                    {visibleGroups.map(group => {
                                        const isExpanded = expandedMonths.has(group.monthKey);
                                        const net = group.planIncome + group.topUps - group.expense;
                                        const barColor = group.paidPercent >= 80 ? '#22c55e' : group.paidPercent >= 50 ? '#3b82f6' : '#f43f5e';
                                        return (
                                            <div key={group.monthKey} className={`rounded-2xl border overflow-hidden ${isDark ? 'border-white/[0.07] bg-white/[0.02]' : 'border-gray-200 bg-white shadow-sm'}`}>
                                                {/* Month header */}
                                                <button
                                                    type="button"
                                                    onClick={() => toggleMonth(group.monthKey)}
                                                    className={`w-full text-left px-4 pt-4 pb-3 transition-colors ${isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-gray-50'}`}
                                                >
                                                    <div className="flex items-center justify-between mb-3">
                                                        <span className={`text-[14px] font-black ${txt}`}>{group.label}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[12px] font-bold font-mono ${net >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                                                                {net >= 0 ? '+' : ''}{fmt(net)}
                                                            </span>
                                                            <span className={`text-[10px] transition-transform duration-200 ${muted} ${isExpanded ? 'rotate-180' : ''}`}>▾</span>
                                                        </div>
                                                    </div>
                                                    {/* Stats */}
                                                    <div className="flex items-center gap-4 mb-3">
                                                        <div>
                                                            <p className={`text-[9px] font-bold uppercase tracking-wider ${muted}`}>To'lov</p>
                                                            <p className="text-[13px] font-black font-mono text-green-500">{fmt(group.planIncome)}</p>
                                                            {group.topUps > 0 && <p className="text-[9px] font-bold font-mono text-amber-400">+{fmt(group.topUps)} dep</p>}
                                                        </div>
                                                        <div>
                                                            <p className={`text-[9px] font-bold uppercase tracking-wider ${muted}`}>Chiqim</p>
                                                            <p className="text-[13px] font-black font-mono text-red-400">{fmt(group.expense)}</p>
                                                        </div>
                                                        {group.monthlyTarget > 0 && (
                                                            <div className="ml-auto text-right">
                                                                <p className={`text-[9px] font-bold uppercase tracking-wider ${muted}`}>Plan</p>
                                                                <p className={`text-[13px] font-black font-mono ${sub}`}>{fmt(group.monthlyTarget)}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {group.monthlyTarget > 0 && (
                                                        <div>
                                                            <div className="flex justify-between mb-1">
                                                                <span className={`text-[10px] font-semibold ${muted}`}>{group.paidPercent}% to'langan</span>
                                                                {group.planIncome < group.monthlyTarget && <span className="text-[10px] font-bold text-red-400">−{fmt(group.monthlyTarget - group.planIncome)}</span>}
                                                                {group.overpayment > 0 && <span className="text-[10px] font-bold text-green-500">+{fmt(group.overpayment)} ortiq</span>}
                                                            </div>
                                                            <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/[0.08]' : 'bg-gray-200'}`}>
                                                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${group.paidPercent}%`, background: barColor }} />
                                                            </div>
                                                        </div>
                                                    )}
                                                </button>

                                                {/* Transactions */}
                                                {isExpanded && (
                                                    <div className={`border-t ${isDark ? 'border-white/[0.05]' : 'border-gray-100'}`}>
                                                        {finance && (() => {
                                                            const fm = finance.months.find(m => m.monthKey === group.monthKey);
                                                            if (!fm) return null;
                                                            const hasDeductions = fm.shortfall > 0 || fm.expenses > 0 || fm.debts > 0;
                                                            const hasCredits    = fm.overpayment > 0 || fm.topUps > 0;
                                                            if (!hasDeductions && !hasCredits && finance.depositAmount === 0) return null;
                                                            return (
                                                                <div className={`mx-3 my-3 rounded-xl border overflow-hidden ${isDark ? 'border-white/[0.06] bg-surface' : 'border-gray-100 bg-gray-50'}`}>
                                                                    <div className={`px-3 py-2 border-b ${isDark ? 'border-white/[0.05]' : 'border-gray-100'}`}>
                                                                        <p className={`text-[10px] font-black uppercase tracking-widest ${muted}`}>
                                                                            {finance.driverType === 'deposit' ? '🏦 Depozit harakati' : '💳 Maosh harakati'}
                                                                        </p>
                                                                    </div>
                                                                    <div className="px-3 py-2 space-y-1.5">
                                                                        {fm.shortfall > 0 && (
                                                                            <div className="flex justify-between items-center">
                                                                                <span className={`text-[11px] ${sub}`}>⚠ Reja bajarilmadi</span>
                                                                                <span className="text-[11px] font-bold font-mono text-red-400">−{fmt(fm.shortfall)}</span>
                                                                            </div>
                                                                        )}
                                                                        {fm.expenses > 0 && (
                                                                            <div className="flex justify-between items-center">
                                                                                <span className={`text-[11px] ${sub}`}>📤 Xarajatlar</span>
                                                                                <span className="text-[11px] font-bold font-mono text-red-400">−{fmt(fm.expenses)}</span>
                                                                            </div>
                                                                        )}
                                                                        {fm.debts > 0 && (
                                                                            <div className="flex justify-between items-center">
                                                                                <span className={`text-[11px] ${sub}`}>🔴 Qarzlar</span>
                                                                                <span className="text-[11px] font-bold font-mono text-red-400">−{fmt(fm.debts)}</span>
                                                                            </div>
                                                                        )}
                                                                        {fm.overpayment > 0 && (
                                                                            <div className="flex justify-between items-center">
                                                                                <span className={`text-[11px] ${sub}`}>⬆ Ortiqcha to'lov</span>
                                                                                <span className="text-[11px] font-bold font-mono text-green-500">+{fmt(fm.overpayment)}</span>
                                                                            </div>
                                                                        )}
                                                                        {fm.topUps > 0 && (
                                                                            <div className="flex justify-between items-center">
                                                                                <span className={`text-[11px] ${sub}`}>🏦 Depozit to'ldirildi</span>
                                                                                <span className="text-[11px] font-bold font-mono text-amber-400">+{fmt(fm.topUps)}</span>
                                                                            </div>
                                                                        )}
                                                                        <div className={`pt-1.5 mt-1 border-t flex justify-between items-center ${isDark ? 'border-white/[0.05]' : 'border-gray-100'}`}>
                                                                            {finance.driverType === 'deposit' ? (
                                                                                <>
                                                                                    <span className={`text-[10px] font-bold ${muted}`}>Oy oxirida depozit</span>
                                                                                    <span className={`text-[12px] font-black font-mono ${fm.depositAfter >= 0 ? 'text-green-500' : 'text-red-400'}`}>{fmt(fm.depositAfter)} UZS</span>
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <span className={`text-[10px] font-bold ${muted}`}>Sof maosh</span>
                                                                                    <span className={`text-[12px] font-black font-mono ${fm.netSalary > 0 ? 'text-green-500' : 'text-red-400'}`}>{fmt(fm.netSalary)} UZS</span>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}

                                                        {group.txs.map((tx, i) => {
                                                            const isIncome = tx.type === TransactionType.INCOME;
                                                            const method   = (tx.paymentMethod ?? '') as string;
                                                            return (
                                                                <div
                                                                    key={tx.id}
                                                                    className={`flex items-center gap-3 px-4 py-3 ${i < group.txs.length - 1 ? `border-b ${isDark ? 'border-white/[0.04]' : 'border-gray-50'}` : ''} ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50'} transition-colors`}
                                                                >
                                                                    <div className={`flex-shrink-0 w-10 text-center rounded-xl py-1.5 ${isDark ? 'bg-white/[0.05]' : 'bg-gray-100'}`}>
                                                                        <p className={`text-[11px] font-black ${sub}`}>{new Date(tx.timestamp).getDate()}</p>
                                                                        <p className={`text-[9px] font-bold ${muted}`}>{MONTH_SHORT_UZ[new Date(tx.timestamp).getMonth()]}</p>
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                                            {tx.category === 'deposit_topup' ? (
                                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-50 text-amber-700'}`}>🏦 Depozit +</span>
                                                                            ) : (
                                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                                                                    isIncome
                                                                                        ? isDark ? 'bg-green-500/15 text-green-400' : 'bg-green-50 text-green-600'
                                                                                        : isDark ? 'bg-red-500/15 text-red-400' : 'bg-red-50 text-red-600'
                                                                                }`}>{TX_TYPE_LABEL[tx.type] ?? tx.type}</span>
                                                                            )}
                                                                            {method && METHOD_LABEL[method] && (
                                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isDark ? METHOD_COLOR[method] ?? 'bg-white/[0.06] text-white/40' : 'bg-gray-100 text-gray-500'}`}>
                                                                                    {METHOD_LABEL[method]}
                                                                                </span>
                                                                            )}
                                                                            {(tx as any).useDeposit && (
                                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-700'}`}>🏦 depozitdan</span>
                                                                            )}
                                                                        </div>
                                                                        {tx.description && <p className={`text-[11px] mt-0.5 truncate ${muted}`}>{tx.description}</p>}
                                                                        <p className={`text-[10px] ${isDark ? 'text-white/20' : 'text-gray-300'}`}>{fmtTime(tx.timestamp)}</p>
                                                                    </div>
                                                                    <div className="flex-shrink-0 text-right">
                                                                        <p className={`text-[13px] font-black font-mono tabular-nums ${tx.category === 'deposit_topup' ? 'text-amber-400' : isIncome ? 'text-green-500' : 'text-red-400'}`}>
                                                                            {isIncome ? '+' : '−'}{fmt(Math.abs(tx.amount))}
                                                                        </p>
                                                                        <p className={`text-[9px] ${muted}`}>UZS</p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </>
                            )}
                        </div>
                    )}
                    </div>

                    {/* ══ FOOTER ══════════════════════════════════════════════ */}
                    {userRole === 'admin' && (
                        <div className={`flex-shrink-0 flex gap-3 px-5 py-4 border-t ${bdr} ${isDark ? '' : 'bg-gray-50'}`}>
                            <button
                                onClick={() => { onClose(); setTimeout(() => onEdit(driver), 150); }}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[13px] font-bold transition-all active:scale-95 border ${isDark ? 'bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 border-teal-500/20' : 'bg-teal-50 text-teal-700 hover:bg-teal-100 border-teal-200'}`}
                            >
                                <EditIcon className="w-4 h-4" /> Tahrirlash
                            </button>
                            <button
                                onClick={() => { onClose(); setTimeout(() => onDelete(driver.id), 150); }}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[13px] font-bold transition-all active:scale-95 border ${isDark ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200'}`}
                            >
                                <TrashIcon className="w-4 h-4" /> O'chirish
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Image lightbox */}
            {viewingDoc && createPortal(
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" onClick={() => setViewingDoc(null)}>
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
                    <div className="relative z-10 max-w-2xl w-full" onClick={e => e.stopPropagation()}>
                        <img src={viewingDoc.data} alt={viewingDoc.name} className="w-full rounded-2xl object-contain max-h-[80vh] shadow-2xl" />
                        <button onClick={() => setViewingDoc(null)} className="absolute -top-3 -right-3 w-8 h-8 bg-white text-gray-900 rounded-full flex items-center justify-center shadow-lg">
                            <XIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </>,
        document.body
    );
};
