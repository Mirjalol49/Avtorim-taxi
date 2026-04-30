import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, TransactionType, PaymentStatus } from '../src/core/types/transaction.types';
import { Driver } from '../src/core/types/driver.types';
import { XIcon, CheckIcon } from './Icons';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BalanceSnapshot {
    id: string;
    balance: number;
    timestamp: number;
    note?: string;
}

const STORAGE_KEY = 'avtorim_card_balance_snapshots';

function loadSnapshots(): BalanceSnapshot[] {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
        return [];
    }
}

function saveSnapshots(snapshots: BalanceSnapshot[]) {
    // Keep only last 20 snapshots
    const trimmed = snapshots.slice(-20);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
    new Intl.NumberFormat('uz-UZ').format(Math.round(Math.abs(n)));

const fmtDisplay = (v: string) =>
    v.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

function timeAgo(ts: number): string {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60_000);
    const hrs  = Math.floor(diff / 3_600_000);
    const days = Math.floor(diff / 86_400_000);
    if (mins < 1)   return 'Hozir';
    if (mins < 60)  return `${mins} daqiqa oldin`;
    if (hrs  < 24)  return `${hrs} soat oldin`;
    return `${days} kun oldin`;
}

function fmtTime(ts: number): string {
    return new Date(ts).toLocaleString('uz-UZ', {
        day: '2-digit', month: 'short',
        hour: '2-digit', minute: '2-digit',
    });
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    isOpen: boolean;
    onClose: () => void;
    transactions: Transaction[];
    drivers: Driver[];
    theme: 'dark' | 'light';
    fleetId?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

const BalanceCheckModal: React.FC<Props> = ({ isOpen, onClose, transactions, drivers, theme }) => {
    const isDark = theme === 'dark';

    const [snapshots,         setSnapshots]         = useState<BalanceSnapshot[]>([]);
    const [balanceInput,      setBalanceInput]       = useState('');
    const [displayBalance,    setDisplayBalance]     = useState('');
    const [noteInput,         setNoteInput]          = useState('');
    const [actualInput,       setActualInput]        = useState('');
    const [displayActual,     setDisplayActual]      = useState('');
    const [step,              setStep]               = useState<'check' | 'confirm'>('check');
    const [savedIndicator,    setSavedIndicator]     = useState(false);

    // Load snapshots from localStorage on open
    useEffect(() => {
        if (isOpen) {
            setSnapshots(loadSnapshots());
            setBalanceInput('');
            setDisplayBalance('');
            setNoteInput('');
            setActualInput('');
            setDisplayActual('');
            setStep('check');
        }
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    const lastSnapshot = snapshots[snapshots.length - 1] ?? null;

    // Card INCOME transactions since last snapshot
    const cardTxsSince = useMemo(() => {
        const since = lastSnapshot ? lastSnapshot.timestamp : 0;
        return transactions.filter(tx =>
            tx.type === TransactionType.INCOME &&
            (tx as any).paymentMethod === 'card' &&
            tx.status !== PaymentStatus.DELETED &&
            (tx as any).status !== 'DELETED' &&
            tx.timestamp > since
        ).sort((a, b) => b.timestamp - a.timestamp);
    }, [transactions, lastSnapshot]);

    // Group card txs by driver
    const byDriver = useMemo(() => {
        const map = new Map<string, { name: string; total: number; txs: Transaction[] }>();
        for (const tx of cardTxsSince) {
            const name = tx.driverName
                ?? drivers.find(d => d.id === tx.driverId)?.name
                ?? 'Noma\'lum';
            const key  = tx.driverId ?? name;
            const entry = map.get(key) ?? { name, total: 0, txs: [] };
            entry.total += tx.amount;
            entry.txs.push(tx);
            map.set(key, entry);
        }
        return Array.from(map.values()).sort((a, b) => b.total - a.total);
    }, [cardTxsSince, drivers]);

    const totalCardIncome = cardTxsSince.reduce((s, tx) => s + tx.amount, 0);
    const expectedBalance = lastSnapshot ? lastSnapshot.balance + totalCardIncome : null;

    // Actual balance input
    const actualNum = Number(actualInput.replace(/\D/g, ''));
    const diff      = expectedBalance !== null && actualInput ? actualNum - expectedBalance : null;
    const isMatch   = diff !== null && Math.abs(diff) < 1;

    // Save snapshot
    const handleSaveSnapshot = () => {
        const amt = Number(balanceInput.replace(/\D/g, ''));
        if (!amt) return;
        const newSnap: BalanceSnapshot = {
            id:        crypto.randomUUID(),
            balance:   amt,
            timestamp: Date.now(),
            note:      noteInput.trim() || undefined,
        };
        const updated = [...snapshots, newSnap];
        setSnapshots(updated);
        saveSnapshots(updated);
        setBalanceInput(''); setDisplayBalance(''); setNoteInput('');
        setSavedIndicator(true);
        setTimeout(() => setSavedIndicator(false), 2000);
        setStep('check');
    };

    const handleDeleteSnapshot = (id: string) => {
        const updated = snapshots.filter(s => s.id !== id);
        setSnapshots(updated);
        saveSnapshots(updated);
    };

    if (!isOpen) return null;

    // ── Styles ────────────────────────────────────────────────────────────────
    const surface = isDark ? 'bg-[#171f33]' : 'bg-white';
    const surface2 = isDark ? 'bg-white/[0.04]' : 'bg-gray-50';
    const border   = isDark ? 'border-white/[0.08]' : 'border-gray-200';
    const textMain = isDark ? 'text-white' : 'text-gray-900';
    const textMuted = isDark ? 'text-white/40' : 'text-gray-400';
    const textSub  = isDark ? 'text-white/65' : 'text-gray-600';
    const inputCls = `w-full px-4 py-3 rounded-xl border outline-none transition-all text-[15px] font-mono ${
        isDark ? 'bg-white/[0.05] border-white/[0.08] text-white placeholder-white/25 focus:border-amber-400/60' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-300 focus:border-amber-400'
    }`;

    return (
        <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Panel */}
            <div
                className={`relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${surface} ${border}`}
                style={{ maxHeight: '90vh', animation: 'modalPop 0.22s ease-out' }}
            >
                {/* Header */}
                <div className={`flex items-center justify-between px-6 py-5 border-b ${border} flex-shrink-0`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl ${isDark ? 'bg-amber-500/15' : 'bg-amber-50'}`}>
                            💳
                        </div>
                        <div>
                            <h3 className={`font-bold text-base ${textMain}`}>Karta Balansi Nazorati</h3>
                            <p className={`text-[12px] mt-0.5 ${textMuted}`}>Haydovchilar to'lovlarini tekshiring</p>
                        </div>
                    </div>
                    <button onClick={onClose} className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors ${isDark ? 'text-white/40 hover:text-white hover:bg-white/[0.06]' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}>
                        <XIcon className="w-4 h-4" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-6 space-y-5">

                    {/* ── Last snapshot + income since ── */}
                    {lastSnapshot ? (
                        <div className={`rounded-2xl border overflow-hidden ${border}`}>
                            {/* Snapshot row */}
                            <div className={`px-4 py-3 flex items-center justify-between ${surface2}`}>
                                <div>
                                    <p className={`text-[11px] font-bold uppercase tracking-wide ${textMuted}`}>Oxirgi saqlangan balans</p>
                                    <p className={`text-[22px] font-black font-mono mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                                        {fmt(lastSnapshot.balance)} <span className="text-[13px] font-semibold opacity-60">UZS</span>
                                    </p>
                                    <p className={`text-[11px] mt-0.5 ${textMuted}`}>
                                        {fmtTime(lastSnapshot.timestamp)} · {timeAgo(lastSnapshot.timestamp)}
                                        {lastSnapshot.note && <span className="ml-2 opacity-60">· {lastSnapshot.note}</span>}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleDeleteSnapshot(lastSnapshot.id)}
                                    className={`text-[11px] px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${isDark ? 'text-red-400/70 hover:text-red-400 hover:bg-red-500/10' : 'text-red-400 hover:bg-red-50'}`}
                                >
                                    O'chirish
                                </button>
                            </div>

                            {/* Card income since snapshot */}
                            <div className={`border-t ${border}`}>
                                {byDriver.length === 0 ? (
                                    <div className={`px-4 py-4 flex items-center gap-3 ${textMuted}`}>
                                        <span className="text-lg">🕐</span>
                                        <p className="text-[13px]">Hali karta orqali to'lov qayd etilmagan</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className={`px-4 pt-3 pb-1`}>
                                            <p className={`text-[11px] font-bold uppercase tracking-wide ${textMuted}`}>
                                                Saqlangandan beri karta to'lovlari
                                            </p>
                                        </div>
                                        <div className="divide-y divide-white/[0.04]">
                                            {byDriver.map(({ name, total, txs }) => (
                                                <div key={name} className="px-4 py-3 flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${isDark ? 'bg-white/[0.06] text-white/50' : 'bg-gray-100 text-gray-500'}`}>
                                                            {name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className={`text-[13px] font-semibold truncate ${textMain}`}>{name}</p>
                                                            <p className={`text-[11px] ${textMuted}`}>
                                                                {txs.length} ta to'lov · {txs.map(t => fmtTime(t.timestamp)).join(', ').slice(0, 40)}{txs.length > 1 ? '…' : ''}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <p className={`text-[15px] font-black font-mono flex-shrink-0 ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>
                                                        +{fmt(total)}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                        {/* Total */}
                                        <div className={`px-4 py-3 flex items-center justify-between border-t ${border} ${isDark ? 'bg-teal-500/[0.06]' : 'bg-teal-50/60'}`}>
                                            <p className={`text-[13px] font-bold ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>Jami kelgan</p>
                                            <p className={`text-[18px] font-black font-mono ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                                                +{fmt(totalCardIncome)} UZS
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Expected balance */}
                            {expectedBalance !== null && (
                                <div className={`px-4 py-3 flex items-center justify-between border-t ${border} ${isDark ? 'bg-white/[0.03]' : 'bg-gray-50'}`}>
                                    <div>
                                        <p className={`text-[11px] font-bold uppercase tracking-wide ${textMuted}`}>Kutilayotgan joriy balans</p>
                                        <p className={`text-[11px] mt-0.5 ${textMuted}`}>
                                            {fmt(lastSnapshot.balance)} + {fmt(totalCardIncome)}
                                        </p>
                                    </div>
                                    <p className={`text-[20px] font-black font-mono ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {fmt(expectedBalance)} <span className="text-[12px] font-semibold opacity-50">UZS</span>
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className={`rounded-2xl border border-dashed px-5 py-6 text-center ${isDark ? 'border-white/[0.10]' : 'border-gray-200'}`}>
                            <span className="text-3xl">💳</span>
                            <p className={`mt-2 text-[14px] font-semibold ${textSub}`}>Hali balans saqlanmagan</p>
                            <p className={`text-[12px] mt-1 ${textMuted}`}>Quyida joriy karta balansini kiriting va saqlang</p>
                        </div>
                    )}

                    {/* ── Actual balance check ── */}
                    {expectedBalance !== null && (
                        <div className={`rounded-2xl border overflow-hidden ${
                            isMatch
                                ? isDark ? 'border-teal-500/40' : 'border-teal-400'
                                : diff !== null
                                ? isDark ? 'border-red-500/40' : 'border-red-400'
                                : border
                        }`}>
                            <div className="px-4 pt-4 pb-3">
                                <p className={`text-[11px] font-bold uppercase tracking-wide mb-2 ${textMuted}`}>
                                    Hozir kartadagi haqiqiy balans
                                </p>
                                <div className="relative">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={displayActual}
                                        onChange={e => {
                                            const raw = e.target.value.replace(/\D/g, '');
                                            setActualInput(raw);
                                            setDisplayActual(fmtDisplay(raw));
                                        }}
                                        placeholder="Balansni kiriting…"
                                        className={inputCls}
                                    />
                                    <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-bold ${textMuted}`}>UZS</span>
                                </div>
                            </div>

                            {diff !== null && (
                                <div className={`px-4 pb-4`}>
                                    {isMatch ? (
                                        <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl ${isDark ? 'bg-teal-500/10' : 'bg-teal-50'}`}>
                                            <span className="text-xl">✅</span>
                                            <div>
                                                <p className={`text-[13px] font-bold ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>To'liq mos keldi!</p>
                                                <p className={`text-[11px] mt-0.5 ${isDark ? 'text-teal-400/60' : 'text-teal-600/70'}`}>
                                                    Barcha haydovchi to'lovlari to'g'ri qayd etilgan
                                                </p>
                                            </div>
                                        </div>
                                    ) : diff > 0 ? (
                                        <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl ${isDark ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
                                            <span className="text-xl">🔵</span>
                                            <div>
                                                <p className={`text-[13px] font-bold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                                                    +{fmt(diff)} UZS ortiqcha
                                                </p>
                                                <p className={`text-[11px] mt-0.5 ${isDark ? 'text-blue-400/60' : 'text-blue-600/70'}`}>
                                                    Kiritilmagan to'lov bo'lishi mumkin
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={`flex items-start gap-2.5 px-4 py-3 rounded-xl ${isDark ? 'bg-red-500/10' : 'bg-red-50'}`}>
                                            <span className="text-xl mt-0.5">⚠️</span>
                                            <div>
                                                <p className={`text-[13px] font-bold ${isDark ? 'text-red-400' : 'text-red-700'}`}>
                                                    {fmt(Math.abs(diff))} UZS yetishmayapti
                                                </p>
                                                <p className={`text-[11px] mt-0.5 ${isDark ? 'text-red-400/60' : 'text-red-600/70'}`}>
                                                    Biror haydovchi to'lov yubormaganda yoki
                                                    noto'g'ri summa kiritilgan bo'lishi mumkin
                                                </p>
                                                {byDriver.length > 0 && (
                                                    <div className="mt-2 space-y-1">
                                                        {byDriver.map(d => (
                                                            <p key={d.name} className={`text-[11px] ${isDark ? 'text-red-400/50' : 'text-red-500/70'}`}>
                                                                · {d.name}: {fmt(d.total)} UZS
                                                            </p>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Save new snapshot ── */}
                    <div className={`rounded-2xl border overflow-hidden ${border}`}>
                        <div className="px-4 pt-4 pb-3 space-y-3">
                            <p className={`text-[11px] font-bold uppercase tracking-wide ${textMuted}`}>
                                {lastSnapshot ? '🔄 Yangi balans saqlash' : '💾 Joriy balansni saqlash'}
                            </p>
                            <div className="relative">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={displayBalance}
                                    onChange={e => {
                                        const raw = e.target.value.replace(/\D/g, '');
                                        setBalanceInput(raw);
                                        setDisplayBalance(fmtDisplay(raw));
                                    }}
                                    placeholder="Kartadagi hozirgi summani kiriting…"
                                    className={inputCls}
                                />
                                <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-bold ${textMuted}`}>UZS</span>
                            </div>
                            <input
                                type="text"
                                value={noteInput}
                                onChange={e => setNoteInput(e.target.value)}
                                placeholder="Eslatma (ixtiyoriy: Ertalab, Tushdan keyin…)"
                                className={`w-full px-4 py-2.5 rounded-xl border outline-none transition-all text-[13px] ${isDark ? 'bg-white/[0.05] border-white/[0.08] text-white placeholder-white/25 focus:border-amber-400/60' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-300 focus:border-amber-400'}`}
                            />
                        </div>
                        <div className={`px-4 pb-4`}>
                            <button
                                onClick={handleSaveSnapshot}
                                disabled={!balanceInput}
                                className={`w-full py-3 rounded-xl text-[14px] font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                                    balanceInput
                                        ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                                        : isDark ? 'bg-white/[0.06] text-white/25 cursor-not-allowed' : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                }`}
                            >
                                {savedIndicator
                                    ? <><CheckIcon className="w-4 h-4" /> Saqlandi!</>
                                    : <><span>💾</span> Balansni saqlash</>
                                }
                            </button>
                        </div>
                    </div>

                    {/* ── Snapshot history ── */}
                    {snapshots.length > 1 && (
                        <div className={`rounded-2xl border overflow-hidden ${border}`}>
                            <div className={`px-4 py-3 border-b ${border} ${surface2}`}>
                                <p className={`text-[11px] font-bold uppercase tracking-wide ${textMuted}`}>Tarix (so'nggi {Math.min(snapshots.length, 5)} ta)</p>
                            </div>
                            <div className="divide-y divide-white/[0.04]">
                                {snapshots.slice(-5).reverse().map((snap, i) => (
                                    <div key={snap.id} className="px-4 py-3 flex items-center justify-between gap-3">
                                        <div>
                                            <p className={`text-[13px] font-bold font-mono ${i === 0 ? (isDark ? 'text-amber-400' : 'text-amber-600') : textMain}`}>
                                                {fmt(snap.balance)} UZS
                                                {i === 0 && <span className={`ml-2 text-[10px] font-normal ${textMuted}`}>← joriy</span>}
                                            </p>
                                            <p className={`text-[11px] mt-0.5 ${textMuted}`}>
                                                {fmtTime(snap.timestamp)}
                                                {snap.note && <span className="ml-1.5">· {snap.note}</span>}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteSnapshot(snap.id)}
                                            className={`text-[11px] px-2 py-1 rounded-lg transition-colors flex-shrink-0 ${isDark ? 'text-red-400/40 hover:text-red-400 hover:bg-red-500/10' : 'text-red-300 hover:text-red-500 hover:bg-red-50'}`}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BalanceCheckModal;
