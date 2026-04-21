import React, { useState, useMemo } from 'react';
import { Driver, Transaction, TransactionType } from '../../core/types';
import { PaymentStatus } from '../../core/types/transaction.types';
import { Car } from '../../core/types/car.types';
import { DayOff, MONTHLY_ALLOWANCE } from '../../../services/daysOffService';
import { DayOff, MONTHLY_ALLOWANCE } from '../../../services/daysOffService';
import { DriverPlanCalendarModal, DriverPlanMonthInfo } from './components/DriverPlanCalendarModal';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MonthRow {
    driver: Driver;
    car: Car | null;
    monthKey: string;      // 'YYYY-MM'
    totalDays: number;
    daysOffCount: number;
    workingDays: number;
    dailyPlan: number;
    monthlyTarget: number;
    actualIncome: number;
    remaining: number;     // positive = still owes, 0 or negative = done/overpaid
    paidPercent: number;   // 0–100
}

interface DriverPlanSummaryProps {
    drivers: Driver[];
    cars: Car[];
    transactions: Transaction[];
    daysOff: DayOff[];
    startDate: Date;
    endDate: Date;
    filterDriverId: string; // 'all' or a driver id
    theme: 'dark' | 'light';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
    new Intl.NumberFormat('uz-UZ').format(Math.round(Math.abs(n)));

const toMonthKey = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
};

const daysInMonthForKey = (mk: string): number => {
    const [y, m] = mk.split('-').map(Number);
    return new Date(y, m, 0).getDate();
};

const MONTHS_UZ = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
];

const monthDisplayLabel = (mk: string): string => {
    const [y, m] = mk.split('-').map(Number);
    return `${MONTHS_UZ[m - 1]} ${y}`;
};

/** All YYYY-MM keys from startDate to endDate inclusive */
const monthRange = (start: Date, end: Date): string[] => {
    const keys: string[] = [];
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);
    const last = new Date(end.getFullYear(), end.getMonth(), 1);
    while (cur <= last) {
        keys.push(toMonthKey(cur));
        cur.setMonth(cur.getMonth() + 1);
    }
    return keys;
};

// ─── Component ────────────────────────────────────────────────────────────────

export const DriverPlanSummary: React.FC<DriverPlanSummaryProps> = ({
    drivers, cars, transactions, daysOff, startDate, endDate, filterDriverId, theme,
}) => {
    const isDark = theme === 'dark';
    const months = useMemo(() => monthRange(startDate, endDate), [startDate, endDate]);
    
    // State for modal
    const [selectedMonthData, setSelectedMonthData] = useState<MonthRow | null>(null);

    const rows = useMemo((): MonthRow[] => {
        const result: MonthRow[] = [];

        const activeDrivers = drivers.filter(d => !d.isDeleted &&
            (filterDriverId === 'all' || d.id === filterDriverId));

        for (const driver of activeDrivers) {
            const car = cars.find(c => c.assignedDriverId === driver.id) ?? null;
            const dailyPlan = (car?.dailyPlan ?? 0) > 0
                ? (car!.dailyPlan as number)
                : ((driver as any).dailyPlan ?? 0) as number;

            if (dailyPlan <= 0) continue; // no plan set — skip

            for (const mk of months) {
                const totalDays = daysInMonthForKey(mk);

                // Always deduct exactly 2 days per month (policy: 2 free days regardless of usage)
                const daysOffCount = MONTHLY_ALLOWANCE;
                const workingDays = totalDays - daysOffCount;
                const monthlyTarget = dailyPlan * workingDays;


                const actualIncome = transactions
                    .filter(tx =>
                        tx.driverId === driver.id &&
                        tx.type === TransactionType.INCOME &&
                        tx.status !== PaymentStatus.DELETED &&
                        (tx as any).status !== 'DELETED' &&
                        toMonthKey(new Date(tx.timestamp)) === mk
                    )
                    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

                const remaining = monthlyTarget - actualIncome;
                const paidPercent = monthlyTarget > 0
                    ? Math.min(100, Math.round((actualIncome / monthlyTarget) * 100))
                    : 0;

                result.push({ driver, car, monthKey: mk, totalDays, daysOffCount, workingDays, dailyPlan, monthlyTarget, actualIncome, remaining, paidPercent });
            }
        }
        return result;
    }, [drivers, cars, transactions, daysOff, months, filterDriverId]);

    if (rows.length === 0) return null;

    // Group by month key
    const byMonth: Record<string, MonthRow[]> = {};
    rows.forEach(r => {
        if (!byMonth[r.monthKey]) byMonth[r.monthKey] = [];
        byMonth[r.monthKey].push(r);
    });

    return (
        <div className="space-y-5">
            <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <span>📊</span> Haydovchilar oylik rejasi
            </h3>

            {months.map(mk => {
                const monthRows = byMonth[mk];
                if (!monthRows || monthRows.length === 0) return null;

                const totalTarget  = monthRows.reduce((s, r) => s + r.monthlyTarget, 0);
                const totalActual  = monthRows.reduce((s, r) => s + r.actualIncome, 0);
                const totalRemaining = totalTarget - totalActual;

                return (
                    <div
                        key={mk}
                        className={`rounded-2xl border overflow-hidden shadow-sm ${isDark ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'}`}
                    >
                        {/* Month header */}
                        <div className={`flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b ${isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-100 bg-gray-50'}`}>
                            <div className="flex items-center gap-2">
                                <span className="text-base">📅</span>
                                <span className={`font-black text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {monthDisplayLabel(mk)}
                                </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs flex-wrap">
                                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                                    Jami reja:{' '}
                                    <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {fmt(totalTarget)} UZS
                                    </span>
                                </span>
                                <span className={`font-bold ${totalRemaining <= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {totalRemaining <= 0
                                        ? `✓ Oriqcha: +${fmt(-totalRemaining)} UZS`
                                        : `Qoldi: −${fmt(totalRemaining)} UZS`}
                                </span>
                            </div>
                        </div>

                        {/* Driver rows as Grid Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-5">
                            {monthRows.map(row => (
                                <div
                                    key={row.driver.id}
                                    onClick={() => setSelectedMonthData(row)}
                                    className={`relative p-5 rounded-3xl border shadow-sm transition-all duration-300 cursor-pointer active:scale-95 group overflow-hidden ${
                                        isDark 
                                        ? 'bg-gray-800/40 border-gray-700/50 hover:bg-gray-800/80 hover:border-gray-500 hover:shadow-lg' 
                                        : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-xl'
                                    }`}
                                >
                                    {/* Top row: driver + status badge */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            {row.driver.avatar ? (
                                                <img
                                                    src={row.driver.avatar}
                                                    alt={row.driver.name}
                                                    className={`w-11 h-11 rounded-full object-cover flex-shrink-0 border-2 transition-transform duration-300 group-hover:scale-105 ${isDark ? 'border-gray-600' : 'border-gray-200'}`}
                                                />
                                            ) : (
                                                <div className={`w-11 h-11 rounded-full flex items-center justify-center text-lg font-black flex-shrink-0 transition-transform duration-300 group-hover:scale-105 ${isDark ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                                    {row.driver.name.charAt(0)}
                                                </div>
                                            )}
                                            <div>
                                                <p className={`font-bold text-base leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                    {row.driver.name}
                                                </p>
                                                <p className={`text-[11px] font-medium mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                    {row.car ? `${row.car.name} · ${row.car.licensePlate}` : 'Avtomobil yo\'q'}
                                                </p>
                                            </div>
                                        </div>
                                        
                                    </div>
                                    
                                    <div className="mb-4">
                                        <div className={`px-2.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm ${
                                            row.remaining <= 0
                                                ? isDark ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-green-50 justify-center text-green-700 border border-green-200'
                                                : row.paidPercent >= 60
                                                ? isDark ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                                : isDark ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-red-50 text-red-700 border border-red-200'
                                        }`}>
                                            {row.remaining <= 0
                                                ? "✓ To'liq plan yopildi"
                                                : row.paidPercent >= 60
                                                ? '⚡ Yaxshi progres ('+row.paidPercent+'%)'
                                                : '⚠ To\'lovlar kechikmoqda'}
                                        </div>
                                    </div>

                                    {/* Primary Mini-Stats */}
                                    <div className="grid grid-cols-2 gap-3 mb-5">
                                        <div className={`p-3 rounded-2xl ${isDark ? 'bg-gray-900/50' : 'bg-gray-50/80 border border-gray-100'}`}>
                                            <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Oylik Reja</p>
                                            <p className={`text-sm font-bold font-mono ${isDark ? 'text-white' : 'text-gray-900'}`}>{fmt(row.monthlyTarget)}</p>
                                        </div>
                                        <div className={`p-3 rounded-2xl ${
                                            row.remaining <= 0
                                                ? isDark ? 'bg-green-500/10' : 'bg-green-50 border border-green-100'
                                                : isDark ? 'bg-gray-900/50' : 'bg-gray-50/80 border border-gray-100'
                                        }`}>
                                            <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${row.remaining <= 0 ? 'text-green-500/70' : isDark ? 'text-gray-500' : 'text-gray-400'}`}>Jami To'ladi</p>
                                            <p className={`text-sm font-bold font-mono ${row.actualIncome >= row.monthlyTarget ? 'text-green-500' : isDark ? 'text-white' : 'text-gray-900'}`}>{fmt(row.actualIncome)}</p>
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`text-[11px] font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                {row.paidPercent}% bajarildi
                                            </span>
                                            <span className={`text-xs font-black ${row.remaining <= 0 ? (isDark ? 'text-green-400' : 'text-green-600') : (isDark ? 'text-red-400' : 'text-red-500')}`}>
                                                {row.remaining > 0
                                                    ? `Qoldi: ${fmt(row.remaining)}`
                                                    : `+${fmt(-row.remaining)}`}
                                            </span>
                                        </div>
                                        <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ease-out ${
                                                    row.paidPercent >= 100 ? 'bg-green-500' :
                                                    row.paidPercent >= 60  ? 'bg-amber-400' : 'bg-orange-500'
                                                }`}
                                                style={{ width: `${row.paidPercent}%` }}
                                            />
                                        </div>
                                        {row.daysOffCount > 0 && (
                                            <p className="text-[10px] text-teal-500 mt-3 font-medium flex items-center justify-center opacity-80">
                                                🏖️ Bu oyda {row.daysOffCount} ta dam olish kuni ajratilgan
                                            </p>
                                        )}
                                    </div>
                                    
                                    <div className={`absolute bottom-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none opacity-[0.03] transition-opacity duration-300 group-hover:opacity-10 ${row.remaining <= 0 ? 'bg-green-500' : 'bg-orange-500'}`} />
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}

            {/* Modal */}
            <DriverPlanCalendarModal 
                isOpen={selectedMonthData !== null}
                onClose={() => setSelectedMonthData(null)}
                theme={theme}
                monthData={selectedMonthData as unknown as DriverPlanMonthInfo}
                transactions={transactions}
                daysOff={daysOff}
            />
        </div>
    );
};
