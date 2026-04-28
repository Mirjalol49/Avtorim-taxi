import React, { useEffect, useMemo, useState } from 'react';
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

// ── Monthly history helpers ───────────────────────────────────────────────────

const toMonthKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
};

interface MonthSummary {
    monthKey: string;
    label: string;
    income: number;
    expenseOut: number; // withdrawals/expenses paid out
}

const MONTH_NAMES_UZ = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];

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
    const isDark = theme === 'dark';

    const monthlySummaries = useMemo((): MonthSummary[] => {
        if (!driver) return [];
        const driverTxs = transactions.filter(tx =>
            tx.driverId === driver.id &&
            tx.status !== PaymentStatus.DELETED &&
            (tx as any).status !== 'DELETED'
        );
        if (driverTxs.length === 0) return [];

        const byMonth = new Map<string, { income: number; expenseOut: number }>();
        for (const tx of driverTxs) {
            const mk = toMonthKey(new Date(tx.timestamp));
            const entry = byMonth.get(mk) ?? { income: 0, expenseOut: 0 };
            if (tx.type === TransactionType.INCOME) {
                entry.income += Math.abs(tx.amount);
            } else {
                entry.expenseOut += Math.abs(tx.amount);
            }
            byMonth.set(mk, entry);
        }

        return Array.from(byMonth.entries())
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([mk, data]) => {
                const [y, m] = mk.split('-').map(Number);
                return {
                    monthKey: mk,
                    label: `${MONTH_NAMES_UZ[m - 1]} ${y}`,
                    income: data.income,
                    expenseOut: data.expenseOut,
                };
            });
    }, [driver, transactions]);

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
                    monthlySummaries.length === 0 ? (
                        <div className={`flex flex-col items-center justify-center py-16 gap-3 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                            <span className="text-4xl">📊</span>
                            <p className="text-sm font-medium">Tranzaksiyalar yo'q</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Totals */}
                            <div className={`grid grid-cols-2 gap-3 p-4 rounded-2xl border ${isDark ? 'border-white/[0.06] bg-surface-2' : 'border-gray-100 bg-gray-50'}`}>
                                <div>
                                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Jami kirim</p>
                                    <p className={`text-base font-black font-mono tabular-nums text-green-500`}>
                                        {fmt(monthlySummaries.reduce((s, r) => s + r.income, 0))}
                                    </p>
                                </div>
                                <div>
                                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Jami chiqim</p>
                                    <p className={`text-base font-black font-mono tabular-nums text-red-400`}>
                                        {fmt(monthlySummaries.reduce((s, r) => s + r.expenseOut, 0))}
                                    </p>
                                </div>
                            </div>

                            {monthlySummaries.map(row => {
                                const net = row.income - row.expenseOut;
                                return (
                                    <div
                                        key={row.monthKey}
                                        className={`rounded-2xl border overflow-hidden ${isDark ? 'border-white/[0.06] bg-surface-2' : 'border-gray-100 bg-gray-50'}`}
                                    >
                                        <div className={`flex items-center justify-between px-4 py-2.5 border-b ${isDark ? 'border-white/[0.05]' : 'border-gray-100'}`}>
                                            <span className={`text-[12px] font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{row.label}</span>
                                            <span className={`text-[11px] font-bold font-mono tabular-nums ${net >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                                                {net >= 0 ? '+' : ''}{fmt(net)} UZS
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 divide-x divide-white/[0.04] px-0">
                                            <div className="px-4 py-3">
                                                <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Kirim</p>
                                                <p className={`text-[13px] font-black font-mono tabular-nums text-green-500`}>{fmt(row.income)}</p>
                                            </div>
                                            <div className="px-4 py-3">
                                                <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Chiqim</p>
                                                <p className={`text-[13px] font-black font-mono tabular-nums text-red-400`}>{fmt(row.expenseOut)}</p>
                                            </div>
                                        </div>
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
