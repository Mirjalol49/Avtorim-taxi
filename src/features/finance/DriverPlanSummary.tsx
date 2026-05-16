import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Driver, Transaction, TransactionType } from '../../core/types';
import { PaymentStatus } from '../../core/types/transaction.types';
import { Car } from '../../core/types/car.types';
import { DriverPlanCalendarModal, DriverPlanMonthInfo } from './components/DriverPlanCalendarModal';
import { getEffectivePlanForDay } from '../cars/utils/planHistory';
import { getEffectivePlanForDriverDay, getDriverDayOverrideType } from '../drivers/utils/driverPlanHistory';
import { LicensePlate } from '../../components/ui/LicensePlate';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MonthRow {
    driver: Driver;
    car: Car | null;
    monthKey: string;      // 'YYYY-MM'
    totalDays: number;
    workingDays: number;
    dailyPlan: number;
    monthlyTarget: number; // Full month plan (all days)
    pastTarget: number;    // Elapsed days plan (for debt calculation)
    actualIncome: number;
    remaining: number;     // positive = still owes, 0 or negative = done/overpaid (based on pastTarget)
    paidPercent: number;   // 0–100 (based on pastTarget)
    isFutureMonth: boolean;
}

interface DriverPlanSummaryProps {
    drivers: Driver[];
    cars: Car[];
    transactions: Transaction[];
    startDate: Date;
    endDate: Date;
    filterDriverId: string; // 'all' or a driver id
    theme: 'dark' | 'light';
    onDayClick?: (driverId: string, date: Date) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
    `${new Intl.NumberFormat('uz-UZ').format(Math.round(Math.abs(n)))} UZS`;

const fmtCompact = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(Math.abs(n)));

const toMonthKey = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
};

const daysInMonthForKey = (mk: string): number => {
    const [y, m] = mk.split('-').map(Number);
    return new Date(y, m, 0).getDate();
};

const monthDisplayLabel = (mk: string, months: string[]): string => {
    const [y, m] = mk.split('-').map(Number);
    return `${months[m - 1] ?? mk} ${y}`;
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
    drivers, cars, transactions, startDate, endDate, filterDriverId, theme, onDayClick
}) => {
    const { t } = useTranslation();
    const isDark = theme === 'dark';
    const monthNames = t('months', { returnObjects: true }) as string[];
    const months = useMemo(() => monthRange(startDate, endDate), [startDate, endDate]);
    
    // Store only a selection key so the modal always derives live data from reactive rows
    const [selectedKey, setSelectedKey] = useState<{ driverId: string; monthKey: string } | null>(null);

    const computeMonthRow = useCallback((driver: Driver, car: Car | null, mk: string): MonthRow => {
        const totalDays = daysInMonthForKey(mk);

        // Cap days correctly:
        //   future month  → 0 (not started, no debt)
        //   current month → today's date (only elapsed days count)
        //   past month    → full month days
        const today = new Date();
        const currentMk = toMonthKey(today);
        const isCurrentMonth = mk === currentMk;
        const isFutureMonth = mk > currentMk;
        const effectiveDays = isFutureMonth ? 0 : isCurrentMonth ? today.getDate() : totalDays;

        // ── Historically-correct monthly target ─────────────────────────────
        const [mkYear, mkMonth] = mk.split('-').map(Number);
        let monthlyTarget = 0;
        let pastTarget = 0;
        let actualWorkingDays = 0; // count days that had a >0 plan
        
        for (let d = 1; d <= totalDays; d++) {
            const dayDate = new Date(mkYear, mkMonth - 1, d);
            const isDayOffTx = transactions.some(tx =>
                tx.driverId === driver.id &&
                tx.type === TransactionType.DAY_OFF &&
                tx.status !== PaymentStatus.DELETED &&
                (tx as any).status !== 'DELETED' &&
                toMonthKey(new Date(tx.timestamp)) === mk &&
                new Date(tx.timestamp).getDate() === d
            );
            
            const isNotWorkingTx = transactions.some(tx =>
                tx.driverId === driver.id &&
                tx.type === 'NOT_WORKING' &&
                tx.status !== PaymentStatus.DELETED &&
                (tx as any).status !== 'DELETED' &&
                toMonthKey(new Date(tx.timestamp)) === mk &&
                new Date(tx.timestamp).getDate() === d
            );

            let planForDay = 0;
            if (!isDayOffTx && !isNotWorkingTx) {
                planForDay = getEffectivePlanForDriverDay(driver, dayDate, car);
            }
            
            monthlyTarget += planForDay;
            if (d <= effectiveDays) {
                pastTarget += planForDay;
                if (planForDay > 0) actualWorkingDays++;
            }
        }

        const dailyPlan = car?.dailyPlan ?? 0;
        const workingDays = actualWorkingDays;

        const actualIncome = transactions
            .filter(tx =>
                tx.driverId === driver.id &&
                tx.type === TransactionType.INCOME &&
                tx.status !== PaymentStatus.DELETED &&
                (tx as any).status !== 'DELETED' &&
                toMonthKey(new Date(tx.timestamp)) === mk
            )
            .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

        const remaining = pastTarget - actualIncome;
        const paidPercent = pastTarget > 0
            ? Math.min(100, Math.round((actualIncome / pastTarget) * 100))
            : 0;

        return { driver, car, monthKey: mk, totalDays, workingDays, dailyPlan, monthlyTarget, pastTarget, actualIncome, remaining, paidPercent, isFutureMonth };
    }, [transactions]);

    const rows = useMemo((): MonthRow[] => {
        const result: MonthRow[] = [];

        const activeDrivers = drivers.filter(d => !d.isDeleted &&
            (filterDriverId === 'all' || d.id === filterDriverId));

        for (const driver of activeDrivers) {
            const car = cars.find(c => c.assignedDriverId === driver.id) ?? null;
            const dailyPlan = car ? (car.dailyPlan ?? 0) : 0;

            if (dailyPlan <= 0) continue; // no plan set — skip

            for (const mk of months) {
                result.push(computeMonthRow(driver, car, mk));
            }
        }
        return result;
    }, [drivers, cars, months, filterDriverId, computeMonthRow]);

    // Derive live month data from current rows — updates automatically on every realtime tx change
    const liveModalData = useMemo(() => {
        if (!selectedKey) return null;
        const existingRow = rows.find(r => r.driver.id === selectedKey.driverId && r.monthKey === selectedKey.monthKey);
        if (existingRow) return existingRow;
        
        // If row wasn't pre-computed (because we navigated to a month outside global filter), compute it dynamically
        const driver = drivers.find(d => d.id === selectedKey.driverId);
        if (!driver) return null;
        const car = cars.find(c => c.assignedDriverId === driver.id) ?? null;
        return computeMonthRow(driver, car, selectedKey.monthKey);
    }, [selectedKey, rows, drivers, cars, computeMonthRow]);

    if (rows.length === 0) return null;

    const totalTarget = rows.reduce((s, r) => s + r.monthlyTarget, 0);
    const totalActual = rows.reduce((s, r) => s + r.actualIncome, 0);
    const totalRemaining = rows.reduce((s, r) => s + r.remaining, 0); // use per-row remaining sum
    const currentMonthKey = months[0] || toMonthKey(new Date());

    return (
        <div className="flex flex-col gap-6">
            {/* Top Summary Banner */}
            <div className={`flex flex-wrap items-center justify-between p-6 rounded-[24px] shadow-sm border ${isDark ? 'bg-surface border-white/[0.07]' : 'bg-white border-slate-100/60'}`}>
                <div className="flex flex-col">
                    <span className={`text-[11px] font-bold uppercase tracking-widest mb-1.5 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                        Jami Reja
                    </span>
                    <span className={`text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>
                        {fmt(totalTarget)}
                    </span>
                </div>
                <div className="flex flex-col">
                    <span className={`text-[11px] font-bold uppercase tracking-widest mb-1.5 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                        Hali Qolgan
                    </span>
                    <div className="flex items-center gap-2">
                        <span className={`text-3xl font-medium tracking-tight ${totalRemaining <= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {totalRemaining <= 0 ? `+${fmt(-totalRemaining)}` : `-${fmt(totalRemaining)}`}
                        </span>
                        {totalRemaining > 0 && <span className="text-3xl font-light text-rose-500">→</span>}
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {rows.map(row => (
                        <div
                            key={`${row.driver.id}-${row.monthKey}`}
                            onClick={() => setSelectedKey({ driverId: row.driver.id, monthKey: row.monthKey })}
                            className={`p-5 sm:p-6 rounded-[24px] transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                                isDark
                                ? 'bg-surface border border-white/[0.07] hover:border-white/[0.14] hover:shadow-lg'
                                : 'bg-white border border-transparent shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]'
                            }`}
                        >
                            {/* Header: Avatar, Name, Car Info */}
                            <div className="flex items-center gap-4">
                                {row.driver.avatar ? (
                                    <img src={row.driver.avatar} alt={row.driver.name} className={`w-[46px] h-[46px] rounded-full object-cover flex-shrink-0 ${isDark ? 'border border-white/10' : ''}`} />
                                ) : (
                                    <div className={`w-[46px] h-[46px] rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${isDark ? 'bg-surface-2 text-gray-300 border border-white/10' : 'bg-slate-100 text-slate-700'}`}>
                                        {row.driver.name.charAt(0)}
                                    </div>
                                )}
                                <div className="flex flex-col min-w-0">
                                    <span className={`text-[15px] font-bold tracking-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                        {row.driver.name}
                                    </span>
                                    {row.car ? (
                                        <span className={`text-[12px] truncate mt-0.5 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                                            {row.car.name} &bull; {row.car.licensePlate}
                                        </span>
                                    ) : (
                                        <span className={`text-[12px] truncate mt-0.5 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                                            Mashina yo'q
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Stats: Oylik Reja & Jami To'ladi */}
                            <div className="grid grid-cols-2 gap-4 mt-6">
                                <div className="flex flex-col">
                                    <span className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                                        Oylik Reja
                                    </span>
                                    <span className={`text-[16px] sm:text-[17px] font-semibold tracking-tight ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
                                        {fmt(row.monthlyTarget)}
                                    </span>
                                </div>
                                <div className="flex flex-col">
                                    <span className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                                        Jami To'ladi
                                    </span>
                                    <span className={`text-[17px] sm:text-[18px] font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                        {fmt(row.actualIncome)}
                                    </span>
                                </div>
                            </div>

                            {/* Progress */}
                            <div className="mt-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`text-[11px] font-bold ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                                        {row.paidPercent}% bajarildi
                                    </span>
                                    <span className={`text-[11px] font-bold ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                                        Qoldi: {fmt(Math.max(0, row.remaining))}
                                    </span>
                                </div>
                                {(() => {
                                    const isLow = row.paidPercent < 60;
                                    const fillStyle = isLow 
                                        ? 'bg-gradient-to-r from-[#1E3A8A] to-[#60A5FA]' 
                                        : 'bg-gradient-to-r from-[#145358] to-[#52D296]';
                                    const trackColor = isDark ? 'bg-[#2C2C2E]' : 'bg-[#E5E5EA]';
                                    
                                    return (
                                        <div className={`w-full h-3.5 sm:h-4 rounded-full p-[2.5px] shadow-inner ${trackColor}`}>
                                            <div 
                                                className={`h-full rounded-full transition-all duration-1000 ease-out ${fillStyle}`}
                                                style={{ width: `${Math.min(100, row.paidPercent)}%` }}
                                            />
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal — liveModalData is re-derived from reactive rows on every tx change */}
            <DriverPlanCalendarModal 
                isOpen={selectedKey !== null}
                onClose={() => setSelectedKey(null)}
                theme={theme}
                monthData={liveModalData as unknown as DriverPlanMonthInfo}
                transactions={transactions}
                onDayClick={onDayClick}
                onMonthChange={(newMonthKey) => setSelectedKey(prev => prev ? { ...prev, monthKey: newMonthKey } : null)}
            />
        </div>
    );
};
