import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Driver } from '../../../core/types';
import { Car } from '../../../core/types/car.types';
import { Transaction, TransactionType, PaymentStatus } from '../../../core/types/transaction.types';
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
    monthKey: string;
    label:    string;
    income:   number;
    expense:  number;
    txs:      Transaction[];   // sorted newest-first
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
    driver, car, transactions, theme, userRole, isOpen, onClose, onEdit, onDelete,
}) => {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);
    const [viewingDoc, setViewingDoc] = useState<{ name: string; data: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'info' | 'history'>('info');
    const [filterMonth, setFilterMonth] = useState<string>('all');
    const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
    const isDark = theme === 'dark';

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
                const sorted = [...txs].sort((a, b) => b.timestamp - a.timestamp);
                const income  = sorted.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + Math.abs(t.amount), 0);
                const expense = sorted.filter(t => t.type !== TransactionType.INCOME).reduce((s, t) => s + Math.abs(t.amount), 0);
                const totalDays    = new Date(y, m, 0).getDate();
                const workingDays  = Math.max(0, totalDays - 2);
                const monthlyTarget = dailyPlan * workingDays;
                const paidPercent  = monthlyTarget > 0 ? Math.min(100, Math.round((income / monthlyTarget) * 100)) : 0;
                return {
                    monthKey: mk,
                    label: `${MONTH_NAMES_UZ[m - 1]} ${y}`,
                    income, expense, txs: sorted,
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

                            {/* ── All-time totals ── */}
                            <div className={`grid grid-cols-2 gap-0 rounded-2xl border overflow-hidden ${isDark ? 'border-white/[0.06] bg-surface-2' : 'border-gray-100 bg-gray-50'}`}>
                                <div className={`px-4 py-3 border-r ${isDark ? 'border-white/[0.05]' : 'border-gray-100'}`}>
                                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Jami kirim</p>
                                    <p className="text-base font-black font-mono tabular-nums text-green-500">
                                        {fmt(monthGroups.reduce((s, r) => s + r.income, 0))} <span className={`text-[10px] font-bold ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>UZS</span>
                                    </p>
                                </div>
                                <div className="px-4 py-3">
                                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Jami chiqim</p>
                                    <p className="text-base font-black font-mono tabular-nums text-red-400">
                                        {fmt(monthGroups.reduce((s, r) => s + r.expense, 0))} <span className={`text-[10px] font-bold ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>UZS</span>
                                    </p>
                                </div>
                            </div>

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
                                const net = group.income - group.expense;
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
                                                    <p className={`text-[9px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Kirim</p>
                                                    <p className="text-[12px] font-black font-mono text-green-500">{fmt(group.income)}</p>
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
                                                        {group.income < group.monthlyTarget && (
                                                            <span className="text-[10px] font-bold text-red-400">-{fmt(group.monthlyTarget - group.income)}</span>
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
                                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                                                        isIncome
                                                                            ? isDark ? 'bg-green-500/15 text-green-400' : 'bg-green-50 text-green-600'
                                                                            : isDark ? 'bg-red-500/15 text-red-400' : 'bg-red-50 text-red-600'
                                                                    }`}>
                                                                        {TX_TYPE_LABEL[tx.type] ?? tx.type}
                                                                    </span>
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
                                                                <p className={`text-[13px] font-black font-mono tabular-nums ${isIncome ? 'text-green-500' : 'text-red-400'}`}>
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

                    {/* Daily plan badge */}
                    {dailyPlan > 0 && (
                        <div className={`flex items-center justify-between px-4 py-3 rounded-2xl border ${isDark ? 'bg-teal-500/[0.08] border-teal-500/[0.15]' : 'bg-teal-50 border-teal-200'}`}>
                            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>{t('dailyPlan')}</span>
                            <span className={`text-base font-black font-mono tabular-nums ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>{fmt(dailyPlan)} UZS</span>
                        </div>
                    )}

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
