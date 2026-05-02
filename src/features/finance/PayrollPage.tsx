import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Driver } from '../../core/types';
import { Car } from '../../core/types/car.types';
import { Transaction, TransactionType } from '../../core/types/transaction.types';
import { CarIcon, XIcon } from '../../../components/Icons';
import { calcDriverFinance } from '../drivers/utils/debtUtils';
import { exportDriversToExcel } from '../../../utils/exportToExcel';

interface PayrollPageProps {
    drivers: Driver[];
    cars: Car[];
    transactions: Transaction[];
    theme: 'light' | 'dark';
    userRole: 'admin' | 'viewer';
    onPaySalary: (driver: Driver, period: { year: number; month: number }) => Promise<void>;
}

const fmt = (n: number) => `${new Intl.NumberFormat('uz-UZ').format(Math.round(n))} UZS`;

function isPayedForPeriod(transactions: Transaction[], driverId: string, year: number, month: number): boolean {
    const periodKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    return transactions.some(tx => 
        tx.driverId === driverId &&
        tx.type === TransactionType.EXPENSE &&
        (tx as any).note === `SALARY|${periodKey}` &&
        tx.status !== 'DELETED'
    );
}

function isNewDriverInPeriod(driver: Driver, year: number, month: number): boolean {
    if (!driver.createdAt) return false;
    const cd = new Date(driver.createdAt);
    return cd.getFullYear() === year && cd.getMonth() === month;
}

function wasDriverCreatedAfterPeriod(driver: Driver, year: number, month: number): boolean {
    if (!driver.createdAt) return false;
    const cd = new Date(driver.createdAt);
    if (cd.getFullYear() > year) return true;
    if (cd.getFullYear() === year && cd.getMonth() > month) return true;
    return false;
}

const MONTH_NAMES_UZ = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];

function formatDate(ts: number): string {
    const d = new Date(ts);
    return `${String(d.getDate()).padStart(2,'0')} ${MONTH_NAMES_UZ[d.getMonth()]}, ${d.getFullYear()}`;
}

function parsePeriodFromNote(note?: string): string | null {
    if (!note) return null;
    const match = note.match(/^SALARY\|(\d{4}-\d{2})$/);
    return match ? match[1] : null;
}

function periodLabel(periodKey: string, monthNames: string[]): string {
    const [y, m] = periodKey.split('-');
    const idx = parseInt(m, 10) - 1;
    return `${monthNames[idx] ?? m} ${y}`;
}

// ── Custom dropdown ─────────────────────────────────────────────────────────
function Dropdown<T extends string | number>({
    value,
    options,
    onChange,
    isDark,
}: {
    value: T;
    options: { value: T; label: string }[];
    onChange: (v: T) => void;
    isDark: boolean;
}) {
    const [open, setOpen] = useState(false);
    const btnRef = useRef<HTMLButtonElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState<{ top: number; left: number; width: number; flipUp: boolean } | null>(null);

    // Compute position when opening
    const handleOpen = () => {
        if (!btnRef.current) return;
        const r = btnRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - r.bottom;
        const estimatedHeight = Math.min(options.length * 40, 220);
        const flipUp = spaceBelow < estimatedHeight + 8;
        setCoords({
            top: flipUp ? r.top - estimatedHeight - 4 : r.bottom + 4,
            left: r.left,
            width: r.width,
            flipUp,
        });
        setOpen(true);
    };

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (
                btnRef.current?.contains(e.target as Node) ||
                listRef.current?.contains(e.target as Node)
            ) return;
            setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const selected = options.find(o => o.value === value);

    return (
        <div className="relative">
            <button
                ref={btnRef}
                type="button"
                onClick={() => open ? setOpen(false) : handleOpen()}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    isDark
                        ? `bg-surface-2 border-white/[0.10] text-white ${open ? 'border-[#0f766e]' : 'hover:border-white/[0.18]'}`
                        : `bg-gray-50 border-gray-200 text-gray-900 ${open ? 'border-[#0f766e]' : 'hover:border-gray-300'}`
                }`}
            >
                <span className="truncate">{selected?.label ?? '—'}</span>
                <svg
                    className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''} ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {open && coords && createPortal(
                <div
                    ref={listRef}
                    style={{
                        position: 'fixed',
                        top: coords.top,
                        left: coords.left,
                        width: coords.width,
                        zIndex: 9999,
                    }}
                    className={`rounded-xl border shadow-2xl overflow-hidden max-h-[220px] overflow-y-auto ${
                        isDark ? 'bg-[#1a2236] border-white/[0.10]' : 'bg-white border-gray-200'
                    }`}
                >
                    {options.map(opt => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => { onChange(opt.value); setOpen(false); }}
                            className={`w-full text-left px-3 py-2.5 text-sm font-medium transition-colors ${
                                opt.value === value
                                    ? isDark
                                        ? 'bg-[#0f766e]/20 text-[#6bd8cb]'
                                        : 'bg-[#0f766e]/10 text-[#0f766e]'
                                    : isDark
                                        ? 'text-gray-300 hover:bg-white/[0.05]'
                                        : 'text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>,
                document.body
            )}
        </div>
    );
}

// ── Month/Year picker modal ─────────────────────────────────────────────────
const ConfirmPayModal: React.FC<{
    driver: Driver;
    cars: Car[];
    transactions: Transaction[];
    theme: 'light' | 'dark';
    monthNames: string[];
    initialYear?: number;
    initialMonth?: number;
    onConfirm: (period: { year: number; month: number }) => Promise<void>;
    onCancel: () => void;
}> = ({ driver, cars, transactions, theme, monthNames, initialYear, initialMonth, onConfirm, onCancel }) => {
    const { t } = useTranslation();
    const isDark = theme === 'dark';
    const [loading, setLoading] = useState(false);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIdx = now.getMonth(); // 0-based

    // Default to previous month (if Jan, stay in Jan of current year)
    const defaultMonth = currentMonthIdx === 0 ? 0 : currentMonthIdx - 1;
    const [selYear, setSelYear] = useState(initialYear ?? currentYear);
    const [selMonth, setSelMonth] = useState(initialMonth ?? defaultMonth);

    const firstBtnRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        firstBtnRef.current?.focus();
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onCancel]);

    // Only show years from app start (2026) up to current year — grows automatically
    const APP_START_YEAR = 2026;
    const yearOptions = Array.from(
        { length: currentYear - APP_START_YEAR + 1 },
        (_, i) => ({ value: APP_START_YEAR + i, label: String(APP_START_YEAR + i) })
    );

    // Only show months that have already started (0..currentMonth)
    const monthOptions = monthNames
        .slice(0, selYear === currentYear ? currentMonthIdx + 1 : 12)
        .map((name, i) => ({ value: i, label: name }));

    // If selected month is out of range for selected year, clamp it
    const effectiveMaxMonth = selYear === currentYear ? currentMonthIdx : 11;
    const clampedMonth = Math.min(selMonth, effectiveMaxMonth);

    const handleConfirm = async () => {
        setLoading(true);
        try {
            await onConfirm({ year: selYear, month: clampedMonth });
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div
                className={`absolute inset-0 backdrop-blur-sm ${isDark ? 'bg-black/70' : 'bg-gray-900/40'}`}
                onClick={onCancel}
            />
            <div
                className={`relative z-10 w-full max-w-sm rounded-3xl border shadow-2xl overflow-hidden ${
                    isDark ? 'bg-[#171f33] border-white/[0.08]' : 'bg-white border-gray-200'
                }`}
                style={{ animation: 'payModalIn 0.18s cubic-bezier(0.34,1.56,0.64,1) both' }}
            >
                {/* Header */}
                <div className={`flex items-center justify-between px-6 pt-6 pb-4 border-b ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                    <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {t('confirmSalaryPayTitle')}
                    </h3>
                    <button
                        onClick={onCancel}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${isDark ? 'text-gray-500 hover:text-white hover:bg-white/[0.06]' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
                    >
                        <XIcon className="w-4 h-4" />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-4">
                    {/* Driver chip */}
                    <div className={`flex items-center gap-3 p-3 rounded-2xl ${isDark ? 'bg-white/[0.04]' : 'bg-gray-50'}`}>
                        {driver.avatar ? (
                            <img src={driver.avatar} alt={driver.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                        ) : (
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 ${isDark ? 'bg-surface-2 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                                {driver.name.charAt(0)}
                            </div>
                        )}
                        <div>
                            <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{driver.name}</p>
                            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{driver.phone}</p>
                        </div>
                    </div>

                    {/* Amount — shows net (gross minus advance already given for the selected period) */}
                    {(() => {
                        const car = cars.find(c => c.assignedDriverId === driver.id && !c.isDeleted) ?? null;
                        const finance = calcDriverFinance(driver, car, transactions);
                        // Use the period the picker is set to, NOT today's date
                        const selectedMk = `${selYear}-${String(clampedMonth + 1).padStart(2, '0')}`;
                        const thisMonth = finance.months.find(m => m.monthKey === selectedMk);
                        const advance = thisMonth?.salaryAdvance ?? 0;
                        // If no finance entry exists for this period, fall back to the fixed salary
                        const gross = driver.monthlySalary ?? 0;
                        const net = thisMonth ? (thisMonth.netSalary ?? gross) : gross;
                        return (
                            <div className={`rounded-2xl border overflow-hidden ${
                                isDark ? 'bg-emerald-500/[0.07] border-emerald-500/[0.18]' : 'bg-emerald-50 border-emerald-200'
                            }`}>
                                <div className="flex items-center justify-between px-4 py-3.5">
                                    <span className={`text-xs font-bold uppercase tracking-wider ${
                                        isDark ? 'text-emerald-400' : 'text-emerald-700'
                                    }`}>
                                        {advance > 0 ? 'Sof maosh (bu oy)' : t('monthlySalary')}
                                    </span>
                                    <span className={`text-lg font-black font-mono tabular-nums ${
                                        isDark ? 'text-emerald-400' : 'text-emerald-700'
                                    }`}>
                                        {new Intl.NumberFormat('uz-UZ').format(Math.round(net))} <span className="text-sm font-semibold opacity-60">UZS</span>
                                    </span>
                                </div>
                                {advance > 0 && (
                                    <div className={`flex items-center justify-between px-4 py-2.5 border-t text-[11px] ${
                                        isDark ? 'border-emerald-500/10 text-gray-400' : 'border-emerald-100 text-gray-500'
                                    }`}>
                                        <span className="flex items-center gap-1">
                                            <span>💼</span>
                                            <span>Maoshdan avans berildi</span>
                                        </span>
                                        <span className={`font-bold font-mono ${
                                            isDark ? 'text-violet-400' : 'text-violet-600'
                                        }`}>
                                            −{fmt(advance)} UZS
                                        </span>
                                    </div>
                                )}
                                {advance > 0 && (
                                    <div className={`flex items-center justify-between px-4 py-2 text-[10px] ${
                                        isDark ? 'text-gray-600' : 'text-gray-400'
                                    }`}>
                                        <span>Oylik maosh (brutto)</span>
                                        <span className="font-mono line-through">{fmt(gross)} UZS</span>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* Period picker */}
                    <div>
                        <label className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            {t('salaryPeriod')}
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <Dropdown
                                value={clampedMonth}
                                options={monthOptions}
                                onChange={(v) => setSelMonth(v as number)}
                                isDark={isDark}
                            />
                            <Dropdown
                                value={selYear}
                                options={yearOptions}
                                onChange={(v) => setSelYear(v as number)}
                                isDark={isDark}
                            />
                        </div>
                        <p className={`text-[10px] mt-1.5 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                            {t('salaryPeriodHint')}
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-6 pb-6">
                    <button
                        ref={firstBtnRef}
                        onClick={onCancel}
                        disabled={loading}
                        className={`flex-1 py-3 rounded-2xl text-sm font-semibold border transition-all ${isDark ? 'border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.04]' : 'border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                    >
                        {t('cancel')}
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={loading}
                        className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-sm font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading && (
                            <svg className="animate-spin w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        )}
                        {loading ? t('paying') : t('paySalary')}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes payModalIn {
                    from { opacity: 0; transform: scale(0.94) translateY(6px); }
                    to   { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>,
        document.body
    );
};

// ── Main page ───────────────────────────────────────────────────────────────
export const PayrollPage: React.FC<PayrollPageProps> = ({
    drivers, cars, transactions, theme, userRole, onPaySalary,
}) => {
    const { t } = useTranslation();
    const isDark = theme === 'dark';
    const [activeTab, setActiveTab] = useState<'payroll' | 'history'>('payroll');
    const [confirmDriver, setConfirmDriver] = useState<Driver | null>(null);
    const [payingId, setPayingId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'due'>('all');

    const monthNames = t('months', { returnObjects: true }) as string[];

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIdx = now.getMonth();

    const [filterYear, setFilterYear] = useState(currentYear);
    const [filterMonth, setFilterMonth] = useState(currentMonthIdx);

    const APP_START_YEAR = 2026;
    const yearOptions = Array.from(
        { length: currentYear - APP_START_YEAR + 1 },
        (_, i) => ({ value: APP_START_YEAR + i, label: String(APP_START_YEAR + i) })
    );

    const filterMonthOptions = monthNames
        .slice(0, filterYear === currentYear ? currentMonthIdx + 1 : 12)
        .map((name, i) => ({ value: i, label: name }));

    const handleFilterYearChange = (y: number) => {
        setFilterYear(y);
        if (y === currentYear && filterMonth > currentMonthIdx) {
            setFilterMonth(currentMonthIdx);
        }
    };

    const salaryDrivers = useMemo(
        () => drivers.filter(d => 
            !d.isDeleted && 
            (d.monthlySalary ?? 0) > 0 &&
            !wasDriverCreatedAfterPeriod(d, filterYear, filterMonth)
        ),
        [drivers, filterYear, filterMonth]
    );

    const filteredSalaryDrivers = useMemo(() => {
        const q = search.toLowerCase().trim();
        return salaryDrivers.filter(d => {
            if (q) {
                const car = cars.find(c => c.assignedDriverId === d.id);
                if (!d.name.toLowerCase().includes(q) && !(car?.licensePlate?.toLowerCase().includes(q))) return false;
            }
            const isPaid = isPayedForPeriod(transactions, d.id, filterYear, filterMonth);
            const isNew = isNewDriverInPeriod(d, filterYear, filterMonth);
            
            if (statusFilter === 'paid' && !isPaid) return false;
            if (statusFilter === 'due' && (isPaid || isNew)) return false;
            return true;
        });
    }, [salaryDrivers, search, statusFilter, cars, filterYear, filterMonth, transactions]);

    const salaryHistory = useMemo(
        () => transactions
            .filter(tx =>
                tx.type === TransactionType.EXPENSE &&
                tx.description?.startsWith('Ish haqi:') &&
                (tx as any).note?.startsWith('SALARY|')
            )
            .sort((a, b) => b.timestamp - a.timestamp),
        [transactions]
    );

    const totalMonthly = salaryDrivers.reduce((s, d) => s + (d.monthlySalary ?? 0), 0);
    const paidCount    = salaryDrivers.filter(d => isPayedForPeriod(transactions, d.id, filterYear, filterMonth)).length;
    const dueCount     = salaryDrivers.filter(d => !isPayedForPeriod(transactions, d.id, filterYear, filterMonth) && !isNewDriverInPeriod(d, filterYear, filterMonth)).length;

    const handleExport = () => {
        exportDriversToExcel(salaryDrivers, 'Ish-haqi-ruyxati');
    };

    const handleConfirmPay = async (period: { year: number; month: number }) => {
        if (!confirmDriver) return;
        setPayingId(confirmDriver.id);
        const drv = confirmDriver;
        setConfirmDriver(null);
        try {
            await onPaySalary(drv, period);
        } finally {
            setPayingId(null);
        }
    };

    const cardBase = `${isDark ? 'bg-surface border-white/[0.07]' : 'bg-white border-gray-200'} border rounded-2xl`;
    const cardShadow = isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.06)';

    return (
        <div className="space-y-6">
            {/* ── Summary cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={`p-5 ${cardBase}`} style={{ boxShadow: cardShadow }}>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {t('totalSalaries')}
                    </p>
                    <p className={`text-2xl font-black font-mono tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>{fmt(totalMonthly)}</p>
                    <p className={`text-[10px] mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>UZS / {t('perMonth')}</p>
                </div>
                <div className={`p-5 rounded-2xl border ${isDark ? 'bg-emerald-500/[0.07] border-emerald-500/[0.15]' : 'bg-emerald-50 border-emerald-200'}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>{t('paidThisMonth')}</p>
                    <p className={`text-2xl font-black tabular-nums ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>{paidCount}</p>
                    <p className={`text-[10px] mt-1 ${isDark ? 'text-emerald-600' : 'text-emerald-600'}`}>{t('drivers')}</p>
                </div>
                <div className={`p-5 rounded-2xl border ${dueCount > 0 ? isDark ? 'bg-red-500/[0.07] border-red-500/[0.15]' : 'bg-red-50 border-red-200' : cardBase}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${dueCount > 0 ? isDark ? 'text-red-400' : 'text-red-600' : isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t('salaryDue')}</p>
                    <p className={`text-2xl font-black tabular-nums ${dueCount > 0 ? isDark ? 'text-red-400' : 'text-red-600' : isDark ? 'text-white' : 'text-gray-900'}`}>{dueCount}</p>
                    <p className={`text-[10px] mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>{t('drivers')}</p>
                </div>
            </div>

            {/* ── Control bar ── */}
            <div className={`flex flex-col sm:flex-row gap-3 p-4 rounded-2xl border ${isDark ? 'bg-surface border-white/[0.07]' : 'bg-white border-gray-200'}`} style={{ boxShadow: cardShadow }}>
                {/* Year filter */}
                <div className="w-full sm:w-28 flex-shrink-0">
                    <Dropdown
                        value={filterYear}
                        options={yearOptions}
                        onChange={(v) => handleFilterYearChange(v as number)}
                        isDark={isDark}
                    />
                </div>
                {/* Month filter */}
                <div className="w-full sm:w-36 flex-shrink-0">
                    <Dropdown
                        value={filterMonth}
                        options={filterMonthOptions}
                        onChange={(v) => setFilterMonth(v as number)}
                        isDark={isDark}
                    />
                </div>
                {/* Search */}
                <div className="relative flex-1">
                    <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35"/></svg>
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Haydovchi yoki davlat raqami..."
                        className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border outline-none transition-colors ${
                            isDark
                                ? 'bg-surface-2 border-white/[0.10] text-white placeholder-gray-600 focus:border-[#0f766e]'
                                : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#0f766e]'
                        }`}
                    />
                </div>
                {/* Status filter */}
                <div className="w-full sm:w-48">
                    <Dropdown
                        value={statusFilter}
                        options={[
                            { value: 'all', label: 'Barchasi' },
                            { value: 'paid', label: "To'langan" },
                            { value: 'due', label: "To'lash kerak" },
                        ]}
                        onChange={(v) => setStatusFilter(v as 'all' | 'paid' | 'due')}
                        isDark={isDark}
                    />
                </div>
                {/* Export */}
                <button
                    onClick={handleExport}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all active:scale-[0.98] ${
                        isDark
                            ? 'border-white/[0.10] text-gray-400 hover:text-white hover:bg-white/[0.05]'
                            : 'border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Excel
                </button>
            </div>

            {/* ── Tabs ── */}
            <div className={`rounded-3xl border overflow-hidden ${cardBase}`} style={{ boxShadow: cardShadow }}>
                {/* Tab bar */}
                <div className={`flex border-b ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                    {([
                        { key: 'payroll', label: t('tabPayroll') },
                        { key: 'history', label: t('tabHistory'), count: salaryHistory.length },
                    ] as const).map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 transition-all ${
                                activeTab === tab.key
                                    ? isDark
                                        ? 'border-[#6bd8cb] text-[#6bd8cb]'
                                        : 'border-[#0f766e] text-[#0f766e]'
                                    : `border-transparent ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-700'}`
                            }`}
                        >
                            {tab.label}
                            {'count' in tab && tab.count > 0 && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md tabular-nums ${
                                    activeTab === tab.key
                                        ? isDark ? 'bg-[#6bd8cb]/20 text-[#6bd8cb]' : 'bg-[#0f766e]/10 text-[#0f766e]'
                                        : isDark ? 'bg-white/[0.05] text-gray-500' : 'bg-gray-100 text-gray-500'
                                }`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── Tab 1: Payroll ── */}
                {activeTab === 'payroll' && (
                    filteredSalaryDrivers.length === 0 ? (
                        <div className="text-center py-20">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-surface-2' : 'bg-gray-100'}`}>
                                <svg className={`w-8 h-8 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75" />
                                </svg>
                            </div>
                            <p className={`text-base font-semibold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t('noSalaryDrivers')}</p>
                            <p className={`text-sm mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>{t('noSalaryDriversHint')}</p>
                        </div>
                    ) : (
                        <div>
                            {/* Table header */}
                            <div className={`grid gap-4 px-5 py-3 border-b text-[10px] font-bold uppercase tracking-widest ${isDark ? 'border-white/[0.06] text-gray-500' : 'border-gray-100 text-gray-400'}`}
                                style={{ gridTemplateColumns: userRole === 'admin' ? '1fr auto auto auto' : '1fr auto auto' }}>
                                <span>{t('driverCol')}</span>
                                <span className="text-right">{t('monthlySalary')}</span>
                                <span className="text-right">{t('lastSalaryPaid')}</span>
                                {userRole === 'admin' && <span className="text-right">{t('action')}</span>}
                            </div>

                            {/* Rows */}
                            <div className={`divide-y ${isDark ? 'divide-white/[0.05]' : 'divide-gray-50'}`}>
                                {filteredSalaryDrivers.map(driver => {
                                    const isPaid = isPayedForPeriod(transactions, driver.id, filterYear, filterMonth);
                                    const isNew  = isNewDriverInPeriod(driver, filterYear, filterMonth);
                                    const car = cars.find(c => c.assignedDriverId === driver.id) ?? null;

                                    // Status badge
                                    let badgeClass: string;
                                    let badgeLabel: string;
                                    let dotClass: string;
                                    if (isPaid) {
                                        badgeClass = isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-700';
                                        dotClass = 'bg-emerald-500';
                                        badgeLabel = t('paidThisMonth');
                                    } else if (isNew) {
                                        badgeClass = isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-700';
                                        dotClass = 'bg-blue-400';
                                        badgeLabel = t('newDriver');
                                    } else {
                                        badgeClass = isDark ? 'bg-red-500/15 text-red-400' : 'bg-red-50 text-red-600';
                                        dotClass = 'bg-red-500';
                                        badgeLabel = t('salaryDue');
                                    }

                                    return (
                                        <div
                                            key={driver.id}
                                            style={{ gridTemplateColumns: userRole === 'admin' ? '1fr auto auto auto' : '1fr auto auto' }}
                                            className={`grid gap-4 items-center px-5 py-4 transition-colors ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50/60'}`}
                                        >
                                            {/* Driver */}
                                            <div className="flex items-center gap-3 min-w-0">
                                                {driver.avatar ? (
                                                    <img src={driver.avatar} alt={driver.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                                                ) : (
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 ${isDark ? 'bg-surface-2 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                                                        {driver.name.charAt(0)}
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{driver.name}</p>
                                                    {car ? (
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <CarIcon className={`w-3 h-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                                                            <span className={`text-[11px] font-mono truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{car.licensePlate}</span>
                                                        </div>
                                                    ) : (
                                                        <span className={`text-[11px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>{t('noCar')}</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Fixed monthly salary — dynamic avans breakdown is in the History tab */}
                                            <div className="text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <span className={`text-sm font-bold font-mono tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                        {new Intl.NumberFormat('uz-UZ').format(driver.monthlySalary ?? 0)}
                                                    </span>
                                                    <span className={`text-[10px] font-semibold ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>UZS</span>
                                                </div>
                                            </div>

                                            {/* Status + last paid date */}
                                            <div className="text-right space-y-1">
                                                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClass}`} />
                                                    {badgeLabel}
                                                </span>
                                                <p className={`text-[10px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                                                    {driver.lastSalaryPaidAt ? formatDate(driver.lastSalaryPaidAt) : '—'}
                                                </p>
                                            </div>

                                            {/* Pay button */}
                                            {userRole === 'admin' && (
                                                <div className="flex justify-end">
                                                    {(driver.monthlySalary ?? 0) > 0 && (
                                                        <button
                                                            onClick={() => setConfirmDriver(driver)}
                                                            disabled={payingId === driver.id}
                                                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 border whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${
                                                                isPaid
                                                                    ? isDark
                                                                        ? 'border-white/[0.08] text-gray-500 hover:text-white hover:border-white/[0.15] hover:bg-white/[0.04]'
                                                                        : 'border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300'
                                                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent'
                                                            }`}
                                                        >
                                                            {payingId === driver.id ? (
                                                                <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                                </svg>
                                                            ) : t('paySalary')}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )
                )}

                {/* ── Tab 2: History ── */}
                {activeTab === 'history' && (
                    salaryHistory.length === 0 ? (
                        <div className="text-center py-20">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-surface-2' : 'bg-gray-100'}`}>
                                <svg className={`w-8 h-8 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <p className={`text-base font-semibold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t('noHistoryYet')}</p>
                        </div>
                    ) : (
                        <div>
                            {/* History table header */}
                            <div className={`grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 border-b text-[10px] font-bold uppercase tracking-widest ${isDark ? 'border-white/[0.06] text-gray-500' : 'border-gray-100 text-gray-400'}`}>
                                <span>{t('driverCol')}</span>
                                <span className="text-right">{t('amountCol')}</span>
                                <span className="text-right">{t('salaryPeriod')}</span>
                                <span className="text-right">{t('paymentDate')}</span>
                            </div>

                            <div className={`divide-y ${isDark ? 'divide-white/[0.05]' : 'divide-gray-50'}`}>
                                {salaryHistory.map(tx => {
                                    const driver = drivers.find(d => d.id === tx.driverId);
                                    const period = parsePeriodFromNote((tx as any).note);
                                    return (
                                        <div
                                            key={tx.id}
                                            className={`grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-4 transition-colors ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50/60'}`}
                                        >
                                            {/* Driver */}
                                            <div className="flex items-center gap-3 min-w-0">
                                                {driver?.avatar ? (
                                                    <img src={driver.avatar} alt={driver.name} className="w-8 h-8 rounded-xl object-cover flex-shrink-0" />
                                                ) : (
                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0 ${isDark ? 'bg-surface-2 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                                                        {(tx.driverName ?? '?').charAt(0)}
                                                    </div>
                                                )}
                                                <span className={`text-sm font-medium truncate ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                                                    {tx.driverName ?? t('unknownDriver')}
                                                </span>
                                            </div>

                                            {/* Amount */}
                                            <div className="text-right">
                                                <span className={`text-sm font-bold font-mono tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>{new Intl.NumberFormat('uz-UZ').format(Math.round(tx.amount))}</span>
                                                <span className={`text-[10px] ml-1 font-semibold ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>UZS</span>
                                            </div>

                                            {/* Period */}
                                            <div className="text-right">
                                                {period ? (
                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${isDark ? 'bg-surface-2 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                                                        {periodLabel(period, monthNames)}
                                                    </span>
                                                ) : (
                                                    <span className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>—</span>
                                                )}
                                            </div>

                                            {/* Date paid */}
                                            <div className={`text-right text-xs tabular-nums ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                {formatDate(tx.timestamp)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )
                )}
            </div>

            {/* Confirm modal */}
            {confirmDriver && (
                <ConfirmPayModal
                    driver={confirmDriver}
                    cars={cars}
                    transactions={transactions}
                    theme={theme}
                    monthNames={monthNames}
                    initialYear={filterYear}
                    initialMonth={filterMonth}
                    onConfirm={handleConfirmPay}
                    onCancel={() => setConfirmDriver(null)}
                />
            )}
        </div>
    );
};
