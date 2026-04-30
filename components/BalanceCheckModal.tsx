/**
 * Card Ledger — live running balance tracker.
 *
 * User sets starting balance once.
 * Every card INCOME transaction auto-credits.
 * User logs any spending they do from the card.
 * Balance is always current — no re-entry needed.
 *
 *  currentBalance = startingBalance
 *                 + Σ card INCOME since startDate
 *                 − Σ manual spending entries
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Transaction, TransactionType, PaymentStatus } from '../src/core/types/transaction.types';
import { Driver } from '../src/core/types/driver.types';
import { XIcon, CheckIcon, TrashIcon } from './Icons';

// ─── Persistence ──────────────────────────────────────────────────────────────

const STORAGE_KEY = 'avtorim_card_ledger_v2';

interface SpendingEntry {
    id: string;
    amount: number;
    description: string;
    timestamp: number;
}

interface CardLedger {
    startBalance: number;
    startTimestamp: number;  // Only count card txs AFTER this moment
    spending: SpendingEntry[];
}

const EMPTY: CardLedger = { startBalance: 0, startTimestamp: 0, spending: [] };

function load(): CardLedger {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') ?? EMPTY; }
    catch { return EMPTY; }
}

function save(l: CardLedger) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(l));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtNum = (n: number) =>
    new Intl.NumberFormat('uz-UZ').format(Math.round(Math.abs(n)));

const fmtDisp = (v: string) =>
    v.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

const fmtTime = (ts: number) =>
    new Date(ts).toLocaleString('uz-UZ', {
        day: '2-digit', month: 'short',
        hour: '2-digit', minute: '2-digit',
    });

const timeAgo = (ts: number) => {
    const d = Date.now() - ts;
    const m = Math.floor(d / 60_000);
    const h = Math.floor(d / 3_600_000);
    if (m < 1)  return 'hozirgina';
    if (m < 60) return `${m} daqiqa oldin`;
    if (h < 24) return `${h} soat oldin`;
    return `${Math.floor(d / 86_400_000)} kun oldin`;
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    isOpen: boolean;
    onClose: () => void;
    transactions: Transaction[];
    drivers: Driver[];
    theme: 'dark' | 'light';
}

type FeedItem =
    | { kind: 'start';   ts: number; amount: number }
    | { kind: 'income';  ts: number; amount: number; driver: string; txId: string }
    | { kind: 'spend';   ts: number; amount: number; description: string; id: string };

// ─── Component ───────────────────────────────────────────────────────────────

const BalanceCheckModal: React.FC<Props> = ({ isOpen, onClose, transactions, drivers, theme }) => {
    const isDark = theme === 'dark';

    const [ledger,        setLedger]        = useState<CardLedger>(EMPTY);
    const [view,          setView]          = useState<'main' | 'setup' | 'spend'>('main');

    // Setup inputs
    const [setupInput,    setSetupInput]    = useState('');
    const [setupDisplay,  setSetupDisplay]  = useState('');

    // Spend inputs
    const [spendInput,    setSpendInput]    = useState('');
    const [spendDisplay,  setSpendDisplay]  = useState('');
    const [spendDesc,     setSpendDesc]     = useState('');

    const setupRef = useRef<HTMLInputElement>(null);
    const spendRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setLedger(load());
            setView('main');
            setSetupInput(''); setSetupDisplay('');
            setSpendInput(''); setSpendDisplay(''); setSpendDesc('');
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (view !== 'main') setView('main'); else onClose(); } };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [isOpen, onClose, view]);

    // Focus management
    useEffect(() => {
        if (view === 'setup') setTimeout(() => setupRef.current?.focus(), 80);
        if (view === 'spend') setTimeout(() => spendRef.current?.focus(), 80);
    }, [view]);

    // Card income transactions since ledger start
    const cardIncomes = useMemo(() => {
        if (!ledger.startTimestamp) return [];
        return transactions.filter(tx =>
            tx.type === TransactionType.INCOME &&
            (tx as any).paymentMethod === 'card' &&
            tx.status !== PaymentStatus.DELETED &&
            (tx as any).status !== 'DELETED' &&
            tx.timestamp >= ledger.startTimestamp
        );
    }, [transactions, ledger.startTimestamp]);

    const totalIn   = cardIncomes.reduce((s, t) => s + t.amount, 0);
    const totalOut  = ledger.spending.reduce((s, e) => s + e.amount, 0);
    const balance   = ledger.startBalance + totalIn - totalOut;
    const hasLedger = ledger.startTimestamp > 0;

    // Feed: merged timeline of start + incomes + spending
    const feed: FeedItem[] = useMemo(() => {
        const items: FeedItem[] = [];
        if (hasLedger) {
            items.push({ kind: 'start', ts: ledger.startTimestamp, amount: ledger.startBalance });
            for (const tx of cardIncomes) {
                const driver = tx.driverName ?? drivers.find(d => d.id === tx.driverId)?.name ?? "Noma'lum";
                items.push({ kind: 'income', ts: tx.timestamp, amount: tx.amount, driver, txId: tx.id });
            }
            for (const s of ledger.spending) {
                items.push({ kind: 'spend', ts: s.timestamp, amount: s.amount, description: s.description, id: s.id });
            }
            items.sort((a, b) => b.ts - a.ts);
        }
        return items;
    }, [hasLedger, ledger, cardIncomes, drivers]);

    // Actions
    const handleSetup = () => {
        const amt = Number(setupInput.replace(/\D/g, ''));
        if (!amt) return;
        const next: CardLedger = { startBalance: amt, startTimestamp: Date.now(), spending: [] };
        setLedger(next); save(next);
        setView('main');
    };

    const handleSpend = () => {
        const amt = Number(spendInput.replace(/\D/g, ''));
        if (!amt) return;
        const entry: SpendingEntry = {
            id: crypto.randomUUID(),
            amount: amt,
            description: spendDesc.trim() || 'Chiqim',
            timestamp: Date.now(),
        };
        const next: CardLedger = { ...ledger, spending: [...ledger.spending, entry] };
        setLedger(next); save(next);
        setSpendInput(''); setSpendDisplay(''); setSpendDesc('');
        setView('main');
    };

    const deleteSpend = (id: string) => {
        const next: CardLedger = { ...ledger, spending: ledger.spending.filter(s => s.id !== id) };
        setLedger(next); save(next);
    };

    const resetLedger = () => {
        const next = EMPTY;
        setLedger(next); save(next);
        setView('main');
    };

    if (!isOpen) return null;

    // ── Styles ───────────────────────────────────────────────────────────────
    const bg      = isDark ? '#171f33' : '#ffffff';
    const bdr     = isDark ? 'border-white/[0.08]' : 'border-gray-200';
    const s2      = isDark ? 'bg-white/[0.03]' : 'bg-gray-50';
    const txt     = isDark ? 'text-white' : 'text-gray-900';
    const muted   = isDark ? 'text-white/40' : 'text-gray-400';
    const sub     = isDark ? 'text-white/65' : 'text-gray-600';
    const inputCls = `w-full px-4 py-3 rounded-xl border outline-none transition-all font-mono ${
        isDark
            ? 'bg-white/[0.05] border-white/[0.08] text-white placeholder-white/20 focus:border-amber-400/60'
            : 'bg-white border-gray-200 text-gray-900 placeholder-gray-300 focus:border-amber-400'
    }`;

    const balanceColor = balance < 0
        ? 'text-red-400'
        : balance < 500_000
        ? 'text-orange-400'
        : isDark ? 'text-amber-300' : 'text-amber-600';

    return (
        <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div
                className={`relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border shadow-2xl flex flex-col overflow-hidden`}
                style={{ background: bg, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb', maxHeight: '88vh', animation: 'modalPop 0.22s ease-out' }}
            >
                {/* ── Header ── */}
                <div className={`flex items-center justify-between px-5 py-4 border-b ${bdr} flex-shrink-0`}>
                    <div className="flex items-center gap-3">
                        {view !== 'main' && (
                            <button onClick={() => setView('main')} className={`w-8 h-8 flex items-center justify-center rounded-xl mr-1 transition-colors ${isDark ? 'text-white/40 hover:text-white hover:bg-white/[0.06]' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                            </button>
                        )}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${isDark ? 'bg-amber-500/15' : 'bg-amber-50'}`}>
                            💳
                        </div>
                        <div>
                            <h3 className={`font-bold text-[15px] ${txt}`}>
                                {view === 'setup' ? 'Boshlang\'ich balans' : view === 'spend' ? 'Kartadan chiqim' : 'Karta hisobi'}
                            </h3>
                            <p className={`text-[11px] mt-0.5 ${muted}`}>
                                {view === 'main'  ? 'Avtomatik kuzatilmoqda' : view === 'setup' ? 'Hozirgi kartadagi summa' : 'Qancha sarfladingiz?'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors ${isDark ? 'text-white/40 hover:text-white hover:bg-white/[0.06]' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}>
                        <XIcon className="w-4 h-4" />
                    </button>
                </div>

                {/* ══════════════════════ MAIN VIEW ══════════════════════ */}
                {view === 'main' && (
                    <div className="flex flex-col flex-1 overflow-hidden">

                        {/* Balance display */}
                        <div className={`px-5 py-5 border-b ${bdr} ${s2} flex-shrink-0`}>
                            {hasLedger ? (
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className={`text-[11px] font-bold uppercase tracking-widest ${muted}`}>Joriy balans</p>
                                        <p className={`text-[36px] font-black font-mono leading-none mt-1.5 ${balanceColor}`}>
                                            {fmtNum(balance)}
                                        </p>
                                        <p className={`text-[13px] font-semibold mt-0.5 ${muted}`}>UZS</p>
                                        <div className={`flex items-center gap-3 mt-2.5 text-[12px] ${muted}`}>
                                            <span className={isDark ? 'text-teal-400' : 'text-teal-600'}>+{fmtNum(totalIn)} keldi</span>
                                            {totalOut > 0 && <span className={isDark ? 'text-red-400' : 'text-red-500'}>−{fmtNum(totalOut)} sarflandi</span>}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1.5 flex-shrink-0 mt-1">
                                        <button
                                            onClick={() => setView('spend')}
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold bg-red-500 hover:bg-red-600 text-white transition-all active:scale-95 shadow-sm"
                                        >
                                            <span>−</span> Chiqim
                                        </button>
                                        <button
                                            onClick={() => { setSetupDisplay(fmtDisp(String(balance))); setSetupInput(String(Math.round(balance))); setView('setup'); }}
                                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold transition-all active:scale-95 ${isDark ? 'bg-white/[0.06] hover:bg-white/[0.10] text-white/60' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}
                                        >
                                            ✏️ Yangilash
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-2">
                                    <p className={`text-[14px] font-semibold mb-1 ${sub}`}>Hali balans kiritilmagan</p>
                                    <p className={`text-[12px] mb-4 ${muted}`}>Kartangizdagi hozirgi summani bir marta kiriting — keyin avtomatik kuzatiladi</p>
                                    <button
                                        onClick={() => setView('setup')}
                                        className="px-5 py-2.5 rounded-xl text-[13px] font-bold bg-amber-500 hover:bg-amber-600 text-white transition-all active:scale-95 shadow-sm"
                                    >
                                        💳 Balansni kiriting
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Feed */}
                        {hasLedger && (
                            <div className="flex-1 overflow-y-auto">
                                {feed.length === 0 ? (
                                    <div className={`flex flex-col items-center justify-center py-10 gap-2 ${muted}`}>
                                        <span className="text-2xl">📭</span>
                                        <p className="text-[13px]">Hali hech qanday harakat yo'q</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-white/[0.04]">
                                        {feed.map((item, i) => {
                                            if (item.kind === 'start') return (
                                                <div key="start" className={`flex items-center gap-3 px-5 py-3.5 ${s2}`}>
                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${isDark ? 'bg-amber-500/15' : 'bg-amber-50'}`}>💳</div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-[12px] font-bold ${sub}`}>Boshlang'ich balans</p>
                                                        <p className={`text-[11px] mt-0.5 ${muted}`}>{fmtTime(item.ts)}</p>
                                                    </div>
                                                    <p className={`text-[14px] font-black font-mono flex-shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                                                        {fmtNum(item.amount)}
                                                    </p>
                                                </div>
                                            );

                                            if (item.kind === 'income') return (
                                                <div key={item.txId} className="flex items-center gap-3 px-5 py-3.5">
                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${isDark ? 'bg-teal-500/15' : 'bg-teal-50'}`}>
                                                        {item.driver.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-[13px] font-bold truncate ${txt}`}>{item.driver}</p>
                                                        <p className={`text-[11px] mt-0.5 ${muted}`}>{fmtTime(item.ts)} · karta to'lov</p>
                                                    </div>
                                                    <p className={`text-[15px] font-black font-mono flex-shrink-0 ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>
                                                        +{fmtNum(item.amount)}
                                                    </p>
                                                </div>
                                            );

                                            if (item.kind === 'spend') return (
                                                <div key={item.id} className="flex items-center gap-3 px-5 py-3.5 group">
                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${isDark ? 'bg-red-500/15' : 'bg-red-50'}`}>💸</div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-[13px] font-bold truncate ${txt}`}>{item.description}</p>
                                                        <p className={`text-[11px] mt-0.5 ${muted}`}>{fmtTime(item.ts)} · {timeAgo(item.ts)}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        <p className={`text-[15px] font-black font-mono ${isDark ? 'text-red-400' : 'text-red-500'}`}>
                                                            −{fmtNum(item.amount)}
                                                        </p>
                                                        <button
                                                            onClick={() => deleteSpend(item.id)}
                                                            className={`w-6 h-6 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-all ${isDark ? 'text-red-400/60 hover:text-red-400 hover:bg-red-500/10' : 'text-red-300 hover:text-red-500 hover:bg-red-50'}`}
                                                        >
                                                            <TrashIcon className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );

                                            return null;
                                        })}
                                    </div>
                                )}

                                {/* Reset */}
                                <div className="px-5 py-4">
                                    <button
                                        onClick={resetLedger}
                                        className={`w-full py-2.5 rounded-xl text-[12px] font-semibold transition-all ${isDark ? 'text-white/20 hover:text-red-400 hover:bg-red-500/[0.06]' : 'text-gray-300 hover:text-red-400 hover:bg-red-50'}`}
                                    >
                                        Hisobni qayta boshlash
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ══════════════════════ SETUP VIEW ══════════════════════ */}
                {view === 'setup' && (
                    <div className="p-5 space-y-4">
                        <div className={`rounded-2xl border p-4 text-[13px] leading-relaxed ${isDark ? 'border-amber-500/20 bg-amber-500/[0.06] text-amber-300/70' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                            📲 Hozir bank ilovangizni oching va kartangizdagi <strong>aniq summani</strong> kiriting. Shundan keyin barcha karta to'lovlari avtomatik qo'shiladi.
                        </div>
                        <div>
                            <label className={`block text-[11px] font-bold uppercase tracking-wider mb-2 ${muted}`}>Kartadagi hozirgi summa</label>
                            <div className="relative">
                                <input
                                    ref={setupRef}
                                    type="text"
                                    inputMode="numeric"
                                    value={setupDisplay}
                                    onChange={e => { const r = e.target.value.replace(/\D/g, ''); setSetupInput(r); setSetupDisplay(fmtDisp(r)); }}
                                    placeholder="0"
                                    className={`${inputCls} text-3xl font-black h-[68px] pr-14`}
                                />
                                <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-bold ${muted}`}>UZS</span>
                            </div>
                        </div>
                        {hasLedger && (
                            <p className={`text-[12px] px-1 ${muted}`}>
                                ⚠️ Bu bosishi joriy tarix va chiqimlarni <strong>o'chiradi</strong> va yangi hisobdan boshlanadi.
                            </p>
                        )}
                        <button
                            onClick={handleSetup}
                            disabled={!setupInput}
                            className={`w-full py-3.5 rounded-2xl text-[14px] font-bold transition-all active:scale-[0.98] ${
                                setupInput
                                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                                    : isDark ? 'bg-white/[0.05] text-white/20 cursor-not-allowed' : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                            }`}
                        >
                            {hasLedger ? 'Balansni yangilash va qayta boshlash' : 'Boshlash'}
                        </button>
                    </div>
                )}

                {/* ══════════════════════ SPEND VIEW ══════════════════════ */}
                {view === 'spend' && (
                    <div className="p-5 space-y-4">
                        <div className={`rounded-2xl border p-3.5 flex items-center justify-between ${isDark ? 'border-white/[0.08] bg-white/[0.03]' : 'border-gray-200 bg-gray-50'}`}>
                            <p className={`text-[12px] font-semibold ${sub}`}>Hozirgi balans</p>
                            <p className={`text-[16px] font-black font-mono ${balanceColor}`}>{fmtNum(balance)} UZS</p>
                        </div>

                        <div>
                            <label className={`block text-[11px] font-bold uppercase tracking-wider mb-2 ${muted}`}>Sarflangan summa</label>
                            <div className="relative">
                                <input
                                    ref={spendRef}
                                    type="text"
                                    inputMode="numeric"
                                    value={spendDisplay}
                                    onChange={e => { const r = e.target.value.replace(/\D/g, ''); setSpendInput(r); setSpendDisplay(fmtDisp(r)); }}
                                    placeholder="0"
                                    className={`${inputCls} text-3xl font-black h-[68px] pr-14`}
                                />
                                <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-bold ${muted}`}>UZS</span>
                            </div>
                        </div>

                        <div>
                            <label className={`block text-[11px] font-bold uppercase tracking-wider mb-2 ${muted}`}>Nima uchun?</label>
                            <div className="grid grid-cols-3 gap-2 mb-2">
                                {['Yoqilg\'i', 'Ovqat', 'Xarid', 'Kommunal', 'Transport', 'Boshqa'].map(d => (
                                    <button
                                        key={d}
                                        type="button"
                                        onClick={() => setSpendDesc(d)}
                                        className={`py-2 px-2 rounded-xl text-[12px] font-semibold transition-all border ${
                                            spendDesc === d
                                                ? isDark ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-red-50 border-red-300 text-red-600'
                                                : isDark ? 'bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white/80' : 'bg-gray-50 border-gray-200 text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        {d}
                                    </button>
                                ))}
                            </div>
                            <input
                                type="text"
                                value={spendDesc}
                                onChange={e => setSpendDesc(e.target.value)}
                                placeholder="Yoki o'zingiz yozing…"
                                className={`w-full px-4 py-2.5 rounded-xl border outline-none transition-all text-[13px] ${isDark ? 'bg-white/[0.05] border-white/[0.08] text-white placeholder-white/20 focus:border-red-400/60' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-300 focus:border-red-400'}`}
                            />
                        </div>

                        {/* Preview */}
                        {spendInput && (
                            <div className={`rounded-xl border px-4 py-3 flex items-center justify-between ${isDark ? 'border-red-500/20 bg-red-500/[0.06]' : 'border-red-200 bg-red-50'}`}>
                                <p className={`text-[12px] font-semibold ${isDark ? 'text-red-400/70' : 'text-red-500/80'}`}>Sarflandan keyin</p>
                                <p className={`text-[16px] font-black font-mono ${balance - Number(spendInput) < 0 ? 'text-red-400' : isDark ? 'text-amber-300' : 'text-amber-600'}`}>
                                    {fmtNum(balance - Number(spendInput))} UZS
                                </p>
                            </div>
                        )}

                        <button
                            onClick={handleSpend}
                            disabled={!spendInput}
                            className={`w-full py-3.5 rounded-2xl text-[14px] font-bold transition-all active:scale-[0.98] ${
                                spendInput
                                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-sm'
                                    : isDark ? 'bg-white/[0.05] text-white/20 cursor-not-allowed' : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                            }`}
                        >
                            Chiqimni qayd etish
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BalanceCheckModal;
