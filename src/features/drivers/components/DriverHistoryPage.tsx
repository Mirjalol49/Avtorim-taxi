'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Driver } from '../../../core/types';
import { Car } from '../../../core/types/car.types';
import { Transaction, TransactionType, PaymentStatus } from '../../../core/types/transaction.types';

interface Props {
    driver: Driver;
    car: Car | null;
    transactions: Transaction[];
    theme: 'light' | 'dark';
    onClose: () => void;
}

const fmt = (n: number) =>
    `${new Intl.NumberFormat('uz-UZ').format(Math.round(Math.abs(n)))} UZS`;

const fmtTime = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

const fmtDate = (ts: number) => new Date(ts).toLocaleDateString('en-GB');

const MONTH_NAMES = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];
const MONTH_SHORT = ['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek'];

const METHOD_LABEL: Record<string,string> = { cash:'Naqd', card:'Karta', transfer:"O'tkazma" };
const TX_TYPE_LABEL: Record<string,string> = { INCOME:'Kirim', EXPENSE:'Chiqim', DAY_OFF:"Ta'til", DEBT:'Qarz' };

type Tab = 'transactions' | 'deposit' | 'salary';

const toMonthKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;

export const DriverHistoryPage: React.FC<Props> = ({ driver, car, transactions, theme, onClose }) => {
    const isDark = theme === 'dark';
    const [visible, setVisible] = useState(false);
    const [tab, setTab] = useState<Tab>('transactions');
    const [monthFilter, setMonthFilter] = useState('all');

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

    // Month groups for transactions tab
    const monthGroups = useMemo(() => {
        const map = new Map<string, Transaction[]>();
        for (const tx of planTxs) {
            const mk = toMonthKey(new Date(tx.timestamp));
            if (!map.has(mk)) map.set(mk, []);
            map.get(mk)!.push(tx);
        }
        return Array.from(map.entries())
            .sort((a,b) => b[0].localeCompare(a[0]))
            .map(([mk, txs]) => {
                const [y,m] = mk.split('-').map(Number);
                return { monthKey: mk, label: `${MONTH_NAMES[m-1]} ${y}`, txs };
            });
    }, [planTxs]);

    const visibleGroups = monthFilter === 'all' ? monthGroups : monthGroups.filter(g => g.monthKey === monthFilter);

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
    const bg      = isDark ? '#0b1326' : '#f5f5f7';
    const surface = isDark ? 'bg-[#111e35]' : 'bg-white';
    const bdr     = isDark ? 'border-white/[0.07]' : 'border-gray-200';
    const txt     = isDark ? 'text-white' : 'text-gray-900';
    const muted   = isDark ? 'text-white/35' : 'text-gray-400';
    const sub     = isDark ? 'text-white/60' : 'text-gray-600';
    const divider = isDark ? 'divide-white/[0.04]' : 'divide-gray-100';

    const isSalary = driver.driverType === 'salary';

    const TABS: { id: Tab; icon: string; label: string; count: number }[] = [
        { id: 'transactions', icon: '📋', label: 'Tranzaksiyalar', count: planTxs.length },
    ];
    if (!isSalary) {
        TABS.push({ id: 'deposit', icon: '🏦', label: 'Depozit', count: depositTxs.length });
    } else {
        TABS.push({ id: 'salary', icon: '💳', label: 'Maosh', count: salaryTxs.length });
    }

    // ── Render ───────────────────────────────────────────────────────────────
    return createPortal(
        <div
            className="fixed inset-0 z-[250] flex flex-col"
            style={{
                background: bg,
                transform: visible ? 'translateY(0)' : 'translateY(100%)',
                opacity:   visible ? 1 : 0,
                transition: 'transform 0.32s cubic-bezier(0.22,0.68,0,1.1), opacity 0.22s ease',
            }}
        >
            <div className="relative flex flex-col h-full max-w-3xl mx-auto w-full">

                {/* ── Sticky header ─────────────────────────────────────── */}
                <div
                    className={`flex-shrink-0 sticky top-0 z-10 border-b ${bdr}`}
                    style={{ background: isDark ? 'rgba(11,19,38,0.92)' : 'rgba(245,245,247,0.92)', backdropFilter: 'blur(20px)' }}
                >
                    <div className="flex items-center gap-3 px-4 py-3">
                        <button
                            onClick={handleClose}
                            className={`flex items-center gap-1.5 text-[13px] font-bold transition-colors ${isDark ? 'text-teal-400 hover:text-teal-300' : 'text-teal-600 hover:text-teal-800'}`}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="15 18 9 12 15 6"/>
                            </svg>
                            Orqaga
                        </button>
                        <div className="flex-1 text-center">
                            <p className={`text-[13px] font-black leading-tight ${txt}`}>{driver.name}</p>
                            <p className={`text-[10px] font-semibold uppercase tracking-wider ${muted}`}>Tarix</p>
                        </div>
                        <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                            {driver.avatar
                                ? <img src={driver.avatar} alt={driver.name} className="w-full h-full object-cover"/>
                                : <div className={`w-full h-full flex items-center justify-center text-[10px] font-black ${isDark ? 'bg-white/[0.08] text-white/40' : 'bg-gray-200 text-gray-500'}`}>{driver.name.charAt(0)}</div>
                            }
                        </div>
                    </div>

                    {/* Tab bar */}
                    <div className="flex px-4 pb-0">
                        {TABS.map(t => (
                            <button
                                key={t.id}
                                onClick={() => { setTab(t.id); setMonthFilter('all'); }}
                                className={`flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-bold border-b-2 -mb-px transition-all ${
                                    tab === t.id
                                        ? isDark ? 'text-teal-400 border-teal-400' : 'text-teal-600 border-teal-600'
                                        : isDark ? 'text-white/35 border-transparent hover:text-white/60' : 'text-gray-400 border-transparent hover:text-gray-600'
                                }`}
                            >
                                {t.icon} {t.label}
                                {t.count > 0 && (
                                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ml-0.5 ${
                                        tab === t.id
                                            ? isDark ? 'bg-teal-500/20 text-teal-400' : 'bg-teal-100 text-teal-700'
                                            : isDark ? 'bg-white/[0.06] text-white/30' : 'bg-gray-100 text-gray-400'
                                    }`}>{t.count}</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Scrollable body ────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto">

                    {/* ═══════════ TRANSACTIONS ═══════════ */}
                    {tab === 'transactions' && (
                        <div className="p-4 space-y-3">
                            {planTxs.length === 0 ? (
                                <div className={`flex flex-col items-center justify-center py-24 gap-3 ${muted}`}>
                                    <span className="text-4xl">📋</span>
                                    <p className="text-sm font-semibold">Tranzaksiyalar yo'q</p>
                                </div>
                            ) : (
                                <>
                                    {/* Month chips */}
                                    <div className="flex gap-2 overflow-x-auto pb-1">
                                        {[{ key:'all', label:'Hammasi' }, ...monthGroups.map(g => ({ key: g.monthKey, label: g.label }))].map(({ key, label }) => (
                                            <button
                                                key={key}
                                                onClick={() => setMonthFilter(key)}
                                                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${
                                                    monthFilter === key
                                                        ? isDark ? 'bg-teal-500/20 text-teal-400 border-teal-500/30' : 'bg-teal-100 text-teal-700 border-teal-300'
                                                        : isDark ? 'bg-white/[0.05] text-white/40 border-white/[0.06]' : 'bg-white text-gray-500 border-gray-200'
                                                }`}
                                            >{label}</button>
                                        ))}
                                    </div>

                                    {visibleGroups.map(group => {
                                        const income  = group.txs.filter(t => t.type === TransactionType.INCOME).reduce((s,t) => s + Math.abs(t.amount), 0);
                                        const expense = group.txs.filter(t => t.type !== TransactionType.INCOME && t.type !== TransactionType.DAY_OFF).reduce((s,t) => s + Math.abs(t.amount), 0);
                                        return (
                                            <div key={group.monthKey} className={`rounded-2xl border overflow-hidden ${isDark ? 'border-white/[0.07]' : 'border-gray-200 shadow-sm'}`}>
                                                {/* Month header */}
                                                <div className={`flex items-center justify-between px-4 py-3 border-b ${bdr} ${isDark ? 'bg-white/[0.03]' : 'bg-gray-50'}`}>
                                                    <span className={`text-[13px] font-black ${txt}`}>{group.label}</span>
                                                    <div className="flex items-center gap-2">
                                                        {income  > 0 && <span className="text-[11px] font-bold font-mono text-emerald-500">+{fmt(income)}</span>}
                                                        {expense > 0 && <span className="text-[11px] font-bold font-mono text-red-400">−{fmt(expense)}</span>}
                                                    </div>
                                                </div>
                                                <div className={`divide-y ${divider}`}>
                                                    {group.txs.map(tx => {
                                                        const isIncome = tx.type === TransactionType.INCOME;
                                                        const isDayOff = tx.type === TransactionType.DAY_OFF;
                                                        const method   = (tx.paymentMethod ?? '') as string;
                                                        return (
                                                            <div key={tx.id} className={`flex items-center gap-3 px-4 py-3 ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50/70'} transition-colors`}>
                                                                {/* Date */}
                                                                <div className={`flex-shrink-0 w-10 text-center rounded-xl py-1.5 ${isDark ? 'bg-white/[0.05]' : 'bg-gray-100'}`}>
                                                                    <p className={`text-[11px] font-black ${sub}`}>{new Date(tx.timestamp).getDate()}</p>
                                                                    <p className={`text-[9px] font-bold ${muted}`}>{MONTH_SHORT[new Date(tx.timestamp).getMonth()]}</p>
                                                                </div>
                                                                {/* Labels */}
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                                        {isDayOff ? (
                                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>🏝️ Dam olish</span>
                                                                        ) : (
                                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isIncome ? (isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600') : (isDark ? 'bg-red-500/15 text-red-400' : 'bg-red-50 text-red-600')}`}>
                                                                                {TX_TYPE_LABEL[tx.type] ?? tx.type}
                                                                            </span>
                                                                        )}
                                                                        {method && METHOD_LABEL[method] && (
                                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isDark ? 'bg-white/[0.06] text-white/40' : 'bg-gray-100 text-gray-500'}`}>{METHOD_LABEL[method]}</span>
                                                                        )}
                                                                        {(tx as any).useDeposit && (
                                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-700'}`}>🏦 dep</span>
                                                                        )}
                                                                    </div>
                                                                    {tx.description && <p className={`text-[11px] mt-0.5 truncate ${muted}`}>{tx.description}</p>}
                                                                    <p className={`text-[10px] mt-0.5 ${isDark ? 'text-white/20' : 'text-gray-300'}`}>{fmtTime(tx.timestamp)}</p>
                                                                </div>
                                                                {/* Amount */}
                                                                {!isDayOff && (
                                                                    <p className={`flex-shrink-0 text-[13px] font-black font-mono tabular-nums ${isIncome ? 'text-emerald-500' : 'text-red-400'}`}>
                                                                        {isIncome ? '+' : '−'}{fmt(Math.abs(tx.amount))}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </>
                            )}
                        </div>
                    )}

                    {/* ═══════════ DEPOSIT ═══════════ */}
                    {tab === 'deposit' && (
                        <div className="p-4 space-y-3">
                            {/* Hero */}
                            <div className={`rounded-2xl border px-5 py-4 ${isDark ? 'border-amber-500/25 bg-amber-500/[0.06]' : 'border-amber-200 bg-amber-50'}`}>
                                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-amber-400/70' : 'text-amber-700/70'}`}>🏦 Joriy depozit</p>
                                <p className={`text-[30px] font-black font-mono tabular-nums ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>{fmt(driver.depositAmount ?? 0)}</p>
                                <p className={`text-[11px] font-semibold mt-0.5 ${muted}`}>{depositTxs.length} ta harakat</p>
                            </div>

                            {depositTxs.length === 0 ? (
                                <div className={`flex flex-col items-center justify-center py-16 gap-3 ${muted}`}>
                                    <span className="text-4xl">🏦</span>
                                    <p className="text-sm font-semibold">Depozit harakatlari yo'q</p>
                                </div>
                            ) : (
                                <div className={`rounded-2xl border overflow-hidden ${isDark ? 'border-white/[0.07]' : 'border-gray-200 shadow-sm'}`}>
                                    <div className={`px-4 py-2.5 border-b ${bdr} ${isDark ? 'bg-white/[0.03]' : 'bg-gray-50'}`}>
                                        <p className={`text-[10px] font-black uppercase tracking-widest ${muted}`}>Depozit ledgeri · Qoldiq ko'rinishi</p>
                                    </div>
                                    <div className={`divide-y ${divider}`}>
                                        {depositLedger.map(({ tx, prevBal, newBal }) => {
                                            const isTopUp = tx.category === 'deposit_topup';
                                            return (
                                                <div key={tx.id} className={`flex items-center gap-3 px-4 py-3.5 ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50/70'} transition-colors`}>
                                                    <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold ${isTopUp ? (isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600') : (isDark ? 'bg-red-500/15 text-red-400' : 'bg-red-50 text-red-500')}`}>
                                                        {isTopUp ? '↑' : '↓'}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-[12px] font-bold ${txt}`}>{isTopUp ? "Depozit to'ldirildi" : "Depozitdan yechildi"}</p>
                                                        {tx.description && <p className={`text-[10px] truncate ${muted}`}>{tx.description}</p>}
                                                        <p className={`text-[10px] ${muted}`}>{fmtDate(tx.timestamp)} · {fmtTime(tx.timestamp)}</p>
                                                    </div>
                                                    <div className="flex-shrink-0 text-right">
                                                        <p className={`text-[13px] font-black font-mono tabular-nums ${isTopUp ? 'text-emerald-500' : 'text-red-400'}`}>
                                                            {isTopUp ? '+' : '−'}{fmt(Math.abs(tx.amount))}
                                                        </p>
                                                        <p className={`text-[9px] font-mono mt-0.5 ${muted}`}>{fmt(prevBal)} → {fmt(newBal)}</p>
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
                        <div className="p-4 space-y-3">
                            {/* Hero */}
                            <div className={`rounded-2xl border px-5 py-4 ${isDark ? 'border-violet-500/20 bg-violet-500/[0.06]' : 'border-violet-200 bg-violet-50'}`}>
                                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-violet-400/70' : 'text-violet-700/70'}`}>💳 Oylik maosh</p>
                                <p className={`text-[30px] font-black font-mono tabular-nums ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>{fmt(driver.monthlySalary ?? 0)}</p>
                                <p className={`text-[11px] font-semibold mt-0.5 ${muted}`}>UZS / oy · {salaryTxs.length} ta to'lov</p>
                            </div>

                            {salaryTxs.length === 0 ? (
                                <div className={`flex flex-col items-center justify-center py-16 gap-3 ${muted}`}>
                                    <span className="text-4xl">💳</span>
                                    <p className="text-sm font-semibold">Maosh to'lovlari yo'q</p>
                                </div>
                            ) : (
                                <div className={`rounded-2xl border overflow-hidden ${isDark ? 'border-white/[0.07]' : 'border-gray-200 shadow-sm'}`}>
                                    <div className={`divide-y ${divider}`}>
                                        {salaryTxs.map(tx => (
                                            <div key={tx.id} className={`flex items-center gap-3 px-4 py-3.5 ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50/70'} transition-colors`}>
                                                <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-base ${isDark ? 'bg-violet-500/15' : 'bg-violet-50'}`}>💳</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-[12px] font-bold ${txt}`}>Maosh to'lovi</p>
                                                    {tx.description && <p className={`text-[10px] truncate ${muted}`}>{tx.description}</p>}
                                                    <p className={`text-[10px] ${muted}`}>{fmtDate(tx.timestamp)} · {fmtTime(tx.timestamp)}</p>
                                                </div>
                                                <p className="flex-shrink-0 text-[13px] font-black font-mono tabular-nums text-violet-400">{fmt(Math.abs(tx.amount))}</p>
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
