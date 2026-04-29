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

// ── History helpers ───────────────────────────────────────────────────────────

const toMonthKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
};

const MONTH_NAMES_UZ = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
const MONTH_SHORT_UZ  = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

interface MonthGroup {
    monthKey:      string;
    label:         string;
    planIncome:    number;   // regular plan payments
    topUps:        number;   // deposit top-ups
    overpayment:   number;   // excess above plan → rolls to deposit
    expense:       number;
    txs:           Transaction[];   // sorted newest-first
    monthlyTarget: number;
    paidPercent:   number;
}

const fmtTime = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const METHOD_LABEL: Record<string, string> = { cash: 'Naqd', card: 'Karta', transfer: "O'tkazma" };
const METHOD_COLOR: Record<string, string> = {
    cash:     'bg-amber-500/15 text-amber-400',
    card:     'bg-sky-500/15 text-sky-400',
    transfer: 'bg-violet-500/15 text-violet-400',
};
const TX_TYPE_LABEL: Record<string, string> = {
    INCOME:  'Kirim',
    EXPENSE: 'Chiqim',
    DAY_OFF: "Kun ta'tili",
    DEBT:    'Qarz',
};

const fmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n));

function getFriendlyDocName(doc: any): string {
    if (doc.category) {
        switch (doc.category) {
            case 'driver_license': return "Haydovchilik guvohnomasi";
            case 'passport': return 'Pasport';
            case 'car_registration': return 'Texnik pasport';
            case 'car_insurance': return "Sug'urta";
        }
    }
    const fn = doc.name || '';
    const lo = fn.toLowerCase();
    if (lo.includes('pasport') || lo.includes('passport') || lo.includes('id')) return 'ID / Pasport';
    if (lo.includes('prava') || lo.includes('license') || lo.includes('guvohnoma')) return "Haydovchilik guvohnomasi";
    if (lo.includes('tex') || lo.includes('tech')) return 'Texnik pasport';
    if (lo.includes('sug') || lo.includes('insur')) return "Sug'urta";
    return (fn.split('.').slice(0, -1).join('.') || fn).replace(/[_-]/g, ' ');
}

const Section: React.FC<{ title: string; icon: React.ReactNode; isDark: boolean; children: React.ReactNode }> = ({ title, icon, isDark, children }) => (
    <div className={`rounded-2xl border overflow-hidden ${isDark ? 'border-white/[0.06] bg-surface-2' : 'border-gray-100 bg-gray-50'}`}>
        <div className={`flex items-center gap-2 px-4 py-3 border-b ${isDark ? 'border-white/[0.05]' : 'border-gray-100'}`}>
            <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>{icon}</span>
            <span className={`text-[11px] font-bold uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{title}</span>
        </div>
        <div className="px-4 py-3">{children}</div>
    </div>
);

export const DriverDetailsSheet: React.FC<Props> = ({
    driver, car, transactions, theme, userRole, isOpen, onClose, onEdit, onDelete, onAddTransaction,
}) => {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);
    const [viewingDoc, setViewingDoc] = useState<{ name: string; data: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'info' | 'history'>('info');
    const [filterMonth, setFilterMonth] = useState<string>('all');
    const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
    // Deposit top-up form
    const [showTopUp, setShowTopUp] = useState(false);
    const [topUpAmount, setTopUpAmount] = useState('');
    const [topUpNote, setTopUpNote] = useState('');
    const [topUpLoading, setTopUpLoading] = useState(false);
    const isDark = theme === 'dark';

    const handleTopUpSubmit = async () => {
        const amount = parseInt(topUpAmount.replace(/\D/g, ''), 10);
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
            setTopUpAmount('');
            setTopUpNote('');
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
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([mk, txs]) => {
                const [y, m] = mk.split('-').map(Number);
                const sorted     = [...txs].sort((a, b) => b.timestamp - a.timestamp);
                const planIncome  = sorted.filter(t => t.type === TransactionType.INCOME && t.category !== 'deposit_topup').reduce((s, t) => s + Math.abs(t.amount), 0);
                const topUps      = sorted.filter(t => t.type === TransactionType.INCOME && t.category === 'deposit_topup').reduce((s, t) => s + Math.abs(t.amount), 0);
                const expense     = sorted.filter(t => t.type !== TransactionType.INCOME).reduce((s, t) => s + Math.abs(t.amount), 0);
                const totalDays   = new Date(y, m, 0).getDate();
                const workingDays = Math.max(0, totalDays - 2);
                const monthlyTarget  = dailyPlan * workingDays;
                const overpayment    = Math.max(0, planIncome - monthlyTarget);
                const paidPercent    = monthlyTarget > 0 ? Math.min(100, Math.round((planIncome / monthlyTarget) * 100)) : 0;
                return {
                    monthKey: mk,
                    label: `${MONTH_NAMES_UZ[m - 1]} ${y}`,
                    planIncome, topUps, overpayment, expense, txs: sorted,
                    monthlyTarget, paidPercent,
                };
            });
    }, [driver, car, transactions]);

    // Auto-expand the most recent month when history tab first opens
    const prevTab = useRef(activeTab);
    useEffect(() => {
        if (activeTab === 'history' && prevTab.current !== 'history' && monthGroups.length > 0) {
            setExpandedMonths(new Set([monthGroups[0].monthKey]));
        }
        prevTab.current = activeTab;
    }, [activeTab, monthGroups]);

    const toggleMonth = (mk: string) =>
        setExpandedMonths(prev => {
            const next = new Set(prev);
            next.has(mk) ? next.delete(mk) : next.add(mk);
            return next;
        });

    const visibleGroups = filterMonth === 'all' ? monthGroups : monthGroups.filter(g => g.monthKey === filterMonth);

    const finance = useMemo((): DriverFinanceSummary | null => {
        if (!driver) return null;
        return calcDriverFinance(driver, car, transactions);
    }, [driver, car, transactions]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            requestAnimationFrame(() => setVisible(true));
        } else {
            setVisible(false);
            const t = setTimeout(() => { document.body.style.overflow = ''; }, 300);
            return () => clearTimeout(t);
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    if (!isOpen && !visible) return null;
    if (!driver) return null;

    const docs = driver.documents ?? [];
    const dailyPlan = car ? (car.dailyPlan ?? 0) : 0;

    const statusColor: Record<string, string> = {
        ACTIVE:  isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600',
        OFFLINE: isDark ? 'bg-gray-500/15 text-gray-400'      : 'bg-gray-100 text-gray-500',
        BUSY:    isDark ? 'bg-amber-500/15 text-amber-400'     : 'bg-amber-50 text-amber-600',
    };
    const statusLabel: Record<string, string> = { ACTIVE: t('active'), OFFLINE: t('offline'), BUSY: t('busy') };

    return createPortal(
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 z-[200] transition-opacity duration-300 ${isDark ? 'bg-black/60' : 'bg-gray-900/30'} backdrop-blur-sm ${visible ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
            />

            {/* Sheet panel */}
            <div
                className={`fixed inset-y-0 right-0 z-[201] w-full max-w-md flex flex-col shadow-2xl transition-transform duration-300 ease-out ${visible ? 'translate-x-0' : 'translate-x-full'} ${isDark ? 'bg-[#0b1326]' : 'bg-[#faf8ff]'}`}
            >
                {/* ── Header ── */}
                <div className={`flex-shrink-0 border-b ${isDark ? 'border-white/[0.06] bg-surface' : 'border-gray-100 bg-white'}`}>
                    <div className="flex items-center justify-between px-5 py-4">
                        <div className="flex items-center gap-3 min-w-0">
                            {driver.avatar ? (
                                <img src={driver.avatar} alt={driver.name} className="w-12 h-12 rounded-2xl object-cover flex-shrink-0 border border-white/10" />
                            ) : (
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black flex-shrink-0 ${isDark ? 'bg-surface-2 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                                    {driver.name.charAt(0)}
                                </div>
                            )}
                            <div className="min-w-0">
                                <h2 className={`text-base font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{driver.name}</h2>
                                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${statusColor[driver.status] ?? statusColor['OFFLINE']}`}>
                                    {statusLabel[driver.status] ?? driver.status}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className={`w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0 ml-2 transition-colors ${isDark ? 'text-gray-500 hover:text-white hover:bg-white/[0.06]' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
                        >
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>
                    {/* Tab bar */}
                    <div className="flex px-5 gap-1 pb-0">
                        {(['info', 'history'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 text-[12px] font-bold tracking-wide rounded-t-xl transition-colors border-b-2 ${
                                    activeTab === tab
                                        ? isDark
                                            ? 'text-teal-400 border-teal-400'
                                            : 'text-teal-600 border-teal-600'
                                        : isDark
                                            ? 'text-gray-500 border-transparent hover:text-gray-300'
                                            : 'text-gray-400 border-transparent hover:text-gray-600'
                                }`}
                            >
                                {tab === 'info' ? 'Ma\'lumot' : 'Tarix'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Scrollable body ── */}
                <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3">

                {activeTab === 'history' ? (
                    monthGroups.length === 0 ? (
                        <div className={`flex flex-col items-center justify-center py-16 gap-3 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                            <span className="text-4xl">📊</span>
                            <p className="text-sm font-medium">Tranzaksiyalar yo'q</p>
                        </div>
                    ) : (
                        <div className="space-y-3">

                            {/* ── Deposit / Salary summary banner ── */}
                            {finance && (finance.driverType === 'deposit' ? (
                                <div className={`rounded-2xl border overflow-hidden ${isDark ? 'border-amber-500/20 bg-amber-500/[0.06]' : 'border-amber-200 bg-amber-50'}`}>
                                    <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${isDark ? 'border-amber-500/15' : 'border-amber-200'}`}>
                                        <span className="text-base">🏦</span>
                                        <span className={`text-[11px] font-black uppercase tracking-widest ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>Depozit holati</span>
                                    </div>
                                    <div className="grid grid-cols-2 divide-x divide-amber-500/[0.12] px-0">
                                        <div className="px-4 py-3">
                                            <p className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${isDark ? 'text-amber-500/60' : 'text-amber-600/70'}`}>Boshlang'ich depozit</p>
                                            <p className={`text-[13px] font-black font-mono tabular-nums ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>{fmt(finance.depositAmount)}</p>
                                        </div>
                                        <div className="px-4 py-3">
                                            <p className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${isDark ? 'text-amber-500/60' : 'text-amber-600/70'}`}>Joriy qoldiq</p>
                                            <p className={`text-[13px] font-black font-mono tabular-nums ${finance.remainingDeposit >= 0 ? (isDark ? 'text-green-400' : 'text-green-600') : 'text-red-400'}`}>
                                                {finance.remainingDeposit >= 0 ? '' : '-'}{fmt(Math.abs(finance.remainingDeposit))}
                                            </p>
                                        </div>
                                    </div>
                                    {finance.depositAmount > 0 && (
                                        <div className={`px-4 pb-3`}>
                                            <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-amber-500/10' : 'bg-amber-200'}`}>
                                                <div className="h-full rounded-full bg-amber-500 transition-all duration-700"
                                                    style={{ width: `${Math.min(100, Math.max(0, (finance.remainingDeposit / finance.depositAmount) * 100))}%` }} />
                                            </div>
                                            <p className={`text-[9px] mt-1 ${isDark ? 'text-amber-500/50' : 'text-amber-600/60'}`}>
                                                {Math.round(Math.max(0, (finance.remainingDeposit / finance.depositAmount) * 100))}% qoldi
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className={`rounded-2xl border overflow-hidden ${isDark ? 'border-violet-500/20 bg-violet-500/[0.06]' : 'border-violet-200 bg-violet-50'}`}>
                                    <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${isDark ? 'border-violet-500/15' : 'border-violet-200'}`}>
                                        <span className="text-base">💳</span>
                                        <span className={`text-[11px] font-black uppercase tracking-widest ${isDark ? 'text-violet-400' : 'text-violet-700'}`}>Oylik maosh holati</span>
                                    </div>
                                    <div className="grid grid-cols-2 divide-x divide-violet-500/[0.12]">
                                        <div className="px-4 py-3">
                                            <p className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${isDark ? 'text-violet-500/60' : 'text-violet-600/70'}`}>Belgilangan maosh</p>
                                            <p className={`text-[13px] font-black font-mono tabular-nums ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>{fmt(finance.salaryAmount)}</p>
                                        </div>
                                        <div className="px-4 py-3">
                                            <p className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${isDark ? 'text-violet-500/60' : 'text-violet-600/70'}`}>Jami kirim</p>
                                            <p className="text-[13px] font-black font-mono tabular-nums text-green-500">
                                                {fmt(monthGroups.reduce((s, r) => s + r.planIncome + r.topUps, 0))}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* ── Month filter chips ── */}
                            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                <button
                                    onClick={() => setFilterMonth('all')}
                                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors ${
                                        filterMonth === 'all'
                                            ? isDark ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' : 'bg-teal-100 text-teal-700 border border-teal-300'
                                            : isDark ? 'bg-white/[0.05] text-gray-400 border border-white/[0.06]' : 'bg-gray-100 text-gray-500 border border-gray-200'
                                    }`}
                                >
                                    Hammasi
                                </button>
                                {monthGroups.map(g => (
                                    <button
                                        key={g.monthKey}
                                        onClick={() => { setFilterMonth(g.monthKey); setExpandedMonths(new Set([g.monthKey])); }}
                                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors ${
                                            filterMonth === g.monthKey
                                                ? isDark ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' : 'bg-teal-100 text-teal-700 border border-teal-300'
                                                : isDark ? 'bg-white/[0.05] text-gray-400 border border-white/[0.06]' : 'bg-gray-100 text-gray-500 border border-gray-200'
                                        }`}
                                    >
                                        {g.label}
                                    </button>
                                ))}
                            </div>

                            {/* ── Month cards ── */}
                            {visibleGroups.map(group => {
                                const isExpanded = expandedMonths.has(group.monthKey);
                                const net = group.planIncome + group.topUps - group.expense;
                                const barColor = group.paidPercent >= 80 ? '#22c55e' : group.paidPercent >= 50 ? 'hsl(208,100%,45%)' : 'deeppink';
                                return (
                                    <div key={group.monthKey} className={`rounded-2xl border overflow-hidden ${isDark ? 'border-white/[0.07] bg-surface-2' : 'border-gray-200 bg-white shadow-sm'}`}>

                                        {/* Month header — tap to expand */}
                                        <button
                                            type="button"
                                            onClick={() => toggleMonth(group.monthKey)}
                                            className={`w-full text-left px-4 pt-4 pb-3 transition-colors ${isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-gray-50'}`}
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <span className={`text-[13px] font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{group.label}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[11px] font-bold font-mono tabular-nums ${net >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                                                        {net >= 0 ? '+' : ''}{fmt(net)} UZS
                                                    </span>
                                                    <span className={`text-[10px] transition-transform duration-200 ${isDark ? 'text-gray-500' : 'text-gray-400'} ${isExpanded ? 'rotate-180' : ''}`}>▾</span>
                                                </div>
                                            </div>

                                            {/* Mini stats row */}
                                            <div className="flex items-center gap-4 mb-3">
                                                <div>
                                                    <p className={`text-[9px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>To'lov</p>
                                                    <p className="text-[12px] font-black font-mono text-green-500">{fmt(group.planIncome)}</p>
                                                    {group.topUps > 0 && (
                                                        <p className={`text-[9px] font-bold font-mono text-amber-400`}>+{fmt(group.topUps)} dep</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className={`text-[9px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Chiqim</p>
                                                    <p className="text-[12px] font-black font-mono text-red-400">{fmt(group.expense)}</p>
                                                </div>
                                                {group.monthlyTarget > 0 && (
                                                    <div className="ml-auto text-right">
                                                        <p className={`text-[9px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Plan</p>
                                                        <p className={`text-[12px] font-black font-mono ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{fmt(group.monthlyTarget)}</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Progress bar */}
                                            {group.monthlyTarget > 0 && (
                                                <div>
                                                    <div className="flex justify-between mb-1">
                                                        <span className={`text-[10px] font-semibold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{group.paidPercent}% to'langan</span>
                                                        {group.planIncome < group.monthlyTarget && (
                                                            <span className="text-[10px] font-bold text-red-400">-{fmt(group.monthlyTarget - group.planIncome)}</span>
                                                        )}
                                                        {group.overpayment > 0 && (
                                                            <span className="text-[10px] font-bold text-green-500">+{fmt(group.overpayment)} ortiqcha</span>
                                                        )}
                                                    </div>
                                                    <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/[0.08]' : 'bg-gray-200'}`}>
                                                        <div
                                                            className="h-full rounded-full transition-all duration-700"
                                                            style={{ width: `${group.paidPercent}%`, background: barColor }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </button>

                                        {/* Transaction list */}
                                        {isExpanded && (
                                            <div className={`border-t ${isDark ? 'border-white/[0.05]' : 'border-gray-100'}`}>
                                                {/* ── Deduction summary for this month ── */}
                                                {finance && (() => {
                                                    const fm = finance.months.find(m => m.monthKey === group.monthKey);
                                                    if (!fm) return null;
                                                    const hasDeductions = fm.shortfall > 0 || fm.expenses > 0 || fm.debts > 0;
                                                    const hasCredits = fm.overpayment > 0 || fm.topUps > 0;
                                                    if (!hasDeductions && !hasCredits && finance.depositAmount === 0) return null;
                                                    return (
                                                        <div className={`mx-3 my-3 rounded-xl border overflow-hidden ${isDark ? 'border-white/[0.06] bg-surface' : 'border-gray-100 bg-gray-50'}`}>
                                                            <div className={`px-3 py-2 border-b ${isDark ? 'border-white/[0.05]' : 'border-gray-100'}`}>
                                                                <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                                    {finance.driverType === 'deposit' ? '🏦 Depozitdan ayirmalar' : '💳 Maoshdan ayirmalar'}
                                                                </p>
                                                            </div>
                                                            <div className="px-3 py-2 space-y-1.5">
                                                                {fm.shortfall > 0 && (
                                                                    <div className="flex justify-between items-center">
                                                                        <span className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>⚠ Reja bajarilmadi</span>
                                                                        <span className="text-[11px] font-bold font-mono text-red-400">−{fmt(fm.shortfall)}</span>
                                                                    </div>
                                                                )}
                                                                {fm.expenses > 0 && (
                                                                    <div className="flex justify-between items-center">
                                                                        <span className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>📤 Xarajatlar</span>
                                                                        <span className="text-[11px] font-bold font-mono text-red-400">−{fmt(fm.expenses)}</span>
                                                                    </div>
                                                                )}
                                                                {fm.debts > 0 && (
                                                                    <div className="flex justify-between items-center">
                                                                        <span className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>🔴 Qarzlar / Jarimalar</span>
                                                                        <span className="text-[11px] font-bold font-mono text-red-400">−{fmt(fm.debts)}</span>
                                                                    </div>
                                                                )}
                                                                {fm.overpayment > 0 && (
                                                                    <div className="flex justify-between items-center">
                                                                        <span className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>⬆ Ortiqcha to'lov (keyingiga o'tadi)</span>
                                                                        <span className="text-[11px] font-bold font-mono text-green-500">+{fmt(fm.overpayment)}</span>
                                                                    </div>
                                                                )}
                                                                {fm.topUps > 0 && (
                                                                    <div className="flex justify-between items-center">
                                                                        <span className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>🏦 Depozit to'ldirildi</span>
                                                                        <span className="text-[11px] font-bold font-mono text-amber-400">+{fmt(fm.topUps)}</span>
                                                                    </div>
                                                                )}
                                                                {!hasDeductions && !hasCredits && (
                                                                    <p className={`text-[11px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>✓ Bu oy ayirmalar yo'q</p>
                                                                )}
                                                                <div className={`pt-1.5 mt-1 border-t flex justify-between items-center ${isDark ? 'border-white/[0.05]' : 'border-gray-100'}`}>
                                                                    {finance.driverType === 'deposit' ? (
                                                                        <>
                                                                            <span className={`text-[10px] font-bold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Oy oxirida depozit</span>
                                                                            <span className={`text-[12px] font-black font-mono ${fm.depositAfter >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                                                                                {fmt(fm.depositAfter)} UZS
                                                                            </span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <span className={`text-[10px] font-bold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Sof maosh</span>
                                                                            <span className={`text-[12px] font-black font-mono ${fm.netSalary > 0 ? 'text-green-500' : 'text-red-400'}`}>
                                                                                {fmt(fm.netSalary)} UZS
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                                {group.txs.map((tx, i) => {
                                                    const isIncome = tx.type === TransactionType.INCOME;
                                                    const method = (tx.paymentMethod ?? '') as string;
                                                    return (
                                                        <div
                                                            key={tx.id}
                                                            className={`flex items-center gap-3 px-4 py-3 ${i < group.txs.length - 1 ? `border-b ${isDark ? 'border-white/[0.04]' : 'border-gray-50'}` : ''} ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50'} transition-colors`}
                                                        >
                                                            {/* Date block */}
                                                            <div className={`flex-shrink-0 w-10 text-center rounded-xl py-1.5 ${isDark ? 'bg-white/[0.05]' : 'bg-gray-100'}`}>
                                                                <p className={`text-[11px] font-black leading-tight ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                                    {new Date(tx.timestamp).getDate()}
                                                                </p>
                                                                <p className={`text-[9px] font-bold leading-tight ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                                                                    {MONTH_SHORT_UZ[new Date(tx.timestamp).getMonth()]}
                                                                </p>
                                                            </div>

                                                            {/* Middle: type + method + description */}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    {tx.category === 'deposit_topup' ? (
                                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-50 text-amber-700'}`}>
                                                                            🏦 Depozit +
                                                                        </span>
                                                                    ) : (
                                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                                                        isIncome
                                                                            ? isDark ? 'bg-green-500/15 text-green-400' : 'bg-green-50 text-green-600'
                                                                            : isDark ? 'bg-red-500/15 text-red-400' : 'bg-red-50 text-red-600'
                                                                    }`}>
                                                                        {TX_TYPE_LABEL[tx.type] ?? tx.type}
                                                                    </span>
                                                                    )}
                                                                    {method && METHOD_LABEL[method] && (
                                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isDark ? METHOD_COLOR[method] ?? 'bg-white/[0.06] text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                                                                            {METHOD_LABEL[method]}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {tx.description && (
                                                                    <p className={`text-[11px] mt-0.5 truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{tx.description}</p>
                                                                )}
                                                                <p className={`text-[10px] ${isDark ? 'text-gray-700' : 'text-gray-300'}`}>{fmtTime(tx.timestamp)}</p>
                                                            </div>

                                                            {/* Amount */}
                                                            <div className="flex-shrink-0 text-right">
                                                                <p className={`text-[13px] font-black font-mono tabular-nums ${tx.category === 'deposit_topup' ? 'text-amber-400' : isIncome ? 'text-green-500' : 'text-red-400'}`}>
                                                                    {isIncome ? '+' : '-'}{fmt(Math.abs(tx.amount))}
                                                                </p>
                                                                <p className={`text-[9px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>UZS</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )
                ) : (<>

                    {/* Driver type + plan badge row */}
                    <div className="flex gap-2">
                        {(() => {
                            const dt = driver.driverType ?? 'deposit';
                            const amount = dt === 'deposit' ? driver.depositAmount ?? 0 : driver.monthlySalary ?? 0;
                            const remaining = finance?.remainingDeposit;
                            return (
                                <div className={`flex-1 rounded-2xl border overflow-hidden ${
                                    dt === 'deposit'
                                        ? isDark ? 'bg-amber-500/[0.08] border-amber-500/[0.20]' : 'bg-amber-50 border-amber-200'
                                        : isDark ? 'bg-violet-500/[0.08] border-violet-500/[0.20]' : 'bg-violet-50 border-violet-200'
                                }`}>
                                    <div className="flex items-center justify-between px-4 py-3">
                                        <div>
                                            <p className={`text-[10px] font-bold uppercase tracking-widest ${dt === 'deposit' ? (isDark ? 'text-amber-500' : 'text-amber-600') : (isDark ? 'text-violet-400' : 'text-violet-600')}`}>
                                                {dt === 'deposit' ? '🏦 Depozitchi' : '💳 Maoshli'}
                                            </p>
                                            {amount > 0 && (
                                                <p className={`text-base font-black font-mono tabular-nums mt-0.5 ${dt === 'deposit' ? (isDark ? 'text-amber-300' : 'text-amber-700') : (isDark ? 'text-violet-300' : 'text-violet-700')}`}>
                                                    {fmt(amount)} UZS
                                                </p>
                                            )}
                                        </div>
                                        {/* Deposit: show remaining + top-up button */}
                                        {dt === 'deposit' && userRole === 'admin' && (
                                            <div className="text-right">
                                                {remaining !== undefined && (
                                                    <p className={`text-[11px] font-black font-mono tabular-nums mb-1 ${remaining >= 1_000_000 ? 'text-green-500' : 'text-red-400'}`}>
                                                        {fmt(remaining)} qoldi
                                                    </p>
                                                )}
                                                <button
                                                    onClick={() => setShowTopUp(v => !v)}
                                                    className={`text-[11px] font-bold px-3 py-1.5 rounded-xl transition-colors ${isDark ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
                                                >
                                                    {showTopUp ? 'Yopish' : '+ To\'ldirish'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {/* Top-up form */}
                                    {showTopUp && dt === 'deposit' && onAddTransaction && (
                                        <div className={`px-4 pb-4 border-t ${isDark ? 'border-amber-500/10' : 'border-amber-200'}`}>
                                            <p className={`text-[10px] font-bold uppercase tracking-wider pt-3 pb-2 ${isDark ? 'text-amber-500/60' : 'text-amber-600/70'}`}>Depozit to'ldirish</p>
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <input
                                                        type="text"
                                                        value={topUpAmount}
                                                        onChange={e => setTopUpAmount(e.target.value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ','))}
                                                        placeholder="Miqdor"
                                                        className={`w-full px-3 py-2.5 pr-12 rounded-xl text-sm font-mono font-bold outline-none border transition-all ${isDark ? 'bg-surface border-amber-500/20 text-white focus:border-amber-500/50 placeholder-gray-600' : 'bg-white border-amber-200 text-gray-900 focus:border-amber-400 placeholder-gray-400'}`}
                                                    />
                                                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold ${isDark ? 'text-amber-500/50' : 'text-amber-500'}`}>UZS</span>
                                                </div>
                                                <button
                                                    onClick={handleTopUpSubmit}
                                                    disabled={topUpLoading || !topUpAmount}
                                                    className="px-4 py-2.5 rounded-xl text-sm font-bold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 transition-colors flex-shrink-0"
                                                >
                                                    {topUpLoading ? '...' : 'Qo\'sh'}
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                value={topUpNote}
                                                onChange={e => setTopUpNote(e.target.value)}
                                                placeholder="Izoh (ixtiyoriy)"
                                                className={`mt-2 w-full px-3 py-2 rounded-xl text-sm outline-none border transition-all ${isDark ? 'bg-surface border-amber-500/10 text-white placeholder-gray-600' : 'bg-white border-amber-200 text-gray-900 placeholder-gray-400'}`}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                        {/* Daily plan badge */}
                        {dailyPlan > 0 && (
                            <div className={`flex flex-col items-center justify-center px-4 py-3 rounded-2xl border ${isDark ? 'bg-teal-500/[0.08] border-teal-500/[0.15]' : 'bg-teal-50 border-teal-200'}`}>
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-teal-500' : 'text-teal-600'}`}>{t('dailyPlan')}</span>
                                <span className={`text-sm font-black font-mono tabular-nums ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>{fmt(dailyPlan)}</span>
                            </div>
                        )}
                    </div>

                    {/* Contact */}
                    <Section title={t('phone')} icon={<PhoneIcon className="w-3.5 h-3.5" />} isDark={isDark}>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className={`text-[13px] font-mono ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{driver.phone}</span>
                                <a href={`tel:${driver.phone}`} className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors ${isDark ? 'bg-white/[0.06] text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700'}`}>
                                    Qo'ng'iroq
                                </a>
                            </div>
                            {driver.extraPhone && (
                                <div className="flex items-center justify-between">
                                    <span className={`text-[13px] font-mono ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{driver.extraPhone}</span>
                                    <a href={`tel:${driver.extraPhone}`} className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors ${isDark ? 'bg-white/[0.06] text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700'}`}>
                                        Qo'ng'iroq
                                    </a>
                                </div>
                            )}
                            {driver.telegram && (
                                <div className={`flex items-center gap-2 text-[13px] ${isDark ? 'text-blue-400' : 'text-blue-500'}`}>
                                    <span>✈</span>
                                    <span className="font-mono">{driver.telegram}</span>
                                </div>
                            )}
                        </div>
                    </Section>

                    {/* Vehicle */}
                    <Section title={t('car')} icon={<CarIcon className="w-3.5 h-3.5" />} isDark={isDark}>
                        {car ? (
                            <div className="flex items-center gap-3">
                                <div className={`w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border ${isDark ? 'border-white/[0.08] bg-surface' : 'border-gray-200 bg-white'}`}>
                                    {car.avatar ? (
                                        <img src={car.avatar} alt={car.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <CarIcon className={`w-6 h-6 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <p className={`text-[14px] font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{car.name}</p>
                                    <span className={`inline-block mt-1 text-[11px] font-mono font-bold tracking-widest px-2 py-0.5 rounded-lg border ${isDark ? 'bg-surface border-white/[0.08] text-gray-400' : 'bg-white border-gray-200 text-gray-500'}`}>
                                        {car.licensePlate}
                                    </span>
                                    {(car.dailyPlan ?? 0) > 0 && (
                                        <p className={`text-[11px] mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                            Plan: {fmt(car.dailyPlan!)} UZS/kun
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <p className={`text-sm ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>{t('carNotAssigned')}</p>
                        )}
                    </Section>

                    {/* Documents */}
                    {docs.length > 0 && (
                        <Section title={t('documents')} icon={<NotesIcon className="w-3.5 h-3.5" />} isDark={isDark}>
                            <div className="space-y-3">
                                {Array.from(new Set(docs.map((d: any) => d.category))).map((cat: any) => {
                                    const catDocs = docs.filter((d: any) => d.category === cat);
                                    return (
                                        <div key={cat}>
                                            <p className={`text-[11px] font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                {getFriendlyDocName(catDocs[0])}
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {catDocs.map((doc: any, idx: number) => {
                                                    const isImage = doc.type?.startsWith('image/');
                                                    return isImage ? (
                                                        <button key={idx} type="button"
                                                            onClick={() => setViewingDoc({ name: doc.name, data: doc.data })}
                                                            className="relative group overflow-hidden rounded-xl border border-white/[0.08] flex-shrink-0"
                                                        >
                                                            <img src={doc.data} alt={doc.name}
                                                                className="w-20 h-20 object-cover" />
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <span className="text-white text-xs font-semibold">Ko'rish</span>
                                                            </div>
                                                            <span className={`absolute bottom-0 left-0 right-0 text-[9px] font-medium text-center py-0.5 ${isDark ? 'bg-black/60 text-gray-300' : 'bg-black/50 text-white'}`}>
                                                                {idx + 1}-rasm
                                                            </span>
                                                        </button>
                                                    ) : (
                                                        <a key={idx} href={doc.data} download={doc.name} target="_blank" rel="noreferrer"
                                                            className={`w-20 h-20 rounded-xl border flex flex-col items-center justify-center gap-1 transition-colors ${isDark ? 'border-red-500/20 bg-red-500/10 hover:bg-red-500/15' : 'border-red-200 bg-red-50 hover:bg-red-100'}`}
                                                        >
                                                            <span className="text-2xl">📄</span>
                                                            <span className="text-[9px] font-bold text-red-400">PDF</span>
                                                            <span className={`text-[8px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{idx + 1}-fayl</span>
                                                        </a>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Section>
                    )}

                    {/* Notes */}
                    {(driver as any).notes && (
                        <Section title={t('notes')} icon={<NotesIcon className="w-3.5 h-3.5" />} isDark={isDark}>
                            <p className={`text-[13px] leading-relaxed whitespace-pre-wrap ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                {(driver as any).notes}
                            </p>
                        </Section>
                    )}
                </>)}
                </div>

                {/* ── Footer ── */}
                {userRole === 'admin' && (
                    <div className={`flex-shrink-0 flex gap-3 px-4 py-4 border-t ${isDark ? 'border-white/[0.06] bg-surface' : 'border-gray-100 bg-white'}`}>
                        <button
                            onClick={() => { onClose(); setTimeout(() => onEdit(driver), 150); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all active:scale-95 border ${isDark ? 'bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 border-teal-500/20' : 'bg-teal-50 text-teal-700 hover:bg-teal-100 border-teal-200'}`}
                        >
                            <EditIcon className="w-4 h-4" />
                            {t('edit')}
                        </button>
                        <button
                            onClick={() => { onClose(); setTimeout(() => onDelete(driver.id), 150); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all active:scale-95 border ${isDark ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200'}`}
                        >
                            <TrashIcon className="w-4 h-4" />
                            {t('delete')}
                        </button>
                    </div>
                )}
            </div>

            {/* Image lightbox */}
            {viewingDoc && createPortal(
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" onClick={() => setViewingDoc(null)}>
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
                    <div className="relative z-10 max-w-2xl w-full" onClick={e => e.stopPropagation()}>
                        <img src={viewingDoc.data} alt={viewingDoc.name} className="w-full rounded-2xl object-contain max-h-[80vh] shadow-2xl" />
                        <button
                            onClick={() => setViewingDoc(null)}
                            className="absolute -top-3 -right-3 w-8 h-8 bg-white text-gray-900 rounded-full flex items-center justify-center shadow-lg"
                        >
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
