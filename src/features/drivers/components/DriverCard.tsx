import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Driver, DriverStatus } from '../../../core/types';
import { Car } from '../../../core/types/car.types';
import { Transaction } from '../../../core/types/transaction.types';
import { EditIcon, TrashIcon, CarIcon, ChevronRightIcon } from '../../../../components/Icons';
import { calcDriverFinance } from '../utils/debtUtils';
import { DriverAvatar } from './DriverAvatar';

interface DriverCardProps {
    driver: Driver;
    car?: Car | null;
    transactions: Transaction[];
    fleetId: string;
    theme: 'light' | 'dark';
    userRole: 'admin' | 'viewer';
    currentUserId: string;
    onEdit: (driver: Driver) => void;
    onDelete: (id: string) => void;
    onUpdateStatus: (id: string, status: DriverStatus) => void;
    onCardClick?: (driver: Driver) => void;
}

const fmt = (n: number) => `${new Intl.NumberFormat('uz-UZ').format(Math.round(n))} UZS`;

export const DriverCard: React.FC<DriverCardProps> = ({
    driver, car, transactions, theme, userRole, onEdit, onDelete, onCardClick,
}) => {
    const { t } = useTranslation();
    const isDark = theme === 'dark';
    const driverType = driver.driverType ?? 'deposit';

    // Always compute finance so we can display the real deposit balance
    const finance = useMemo(
        () => calcDriverFinance(driver, car ?? null, transactions),
        [driver, car, transactions]
    );

    const depositWarning = useMemo(() => {
        if (driverType !== 'deposit') return null;
        // Only warn if a deposit was actually configured
        if (!driver.depositAmount || driver.depositAmount <= 0) return null;
        const threshold = driver.depositWarningThreshold ?? 1_000_000;
        if (finance.remainingDeposit <= threshold) {
            return { remaining: finance.remainingDeposit };
        }
        return null;
    }, [driverType, driver.depositAmount, driver.depositWarningThreshold, finance.remainingDeposit]);

    const handleEdit   = (e: React.MouseEvent) => { e.stopPropagation(); onEdit(driver); };
    const handleDelete = (e: React.MouseEvent) => { e.stopPropagation(); onDelete(driver.id); };

    // Right-side value: deposit balance for deposit drivers, salary for salary drivers, remaining contract for lease_to_own
    const typeValueLabel = driverType === 'deposit'
        ? driver.depositAmount && driver.depositAmount > 0
            ? fmt(finance.remainingDeposit)
            : null
        : driverType === 'salary'
            ? driver.monthlySalary && driver.monthlySalary > 0
                ? fmt(driver.monthlySalary)
                : null
            : driver.totalContractAmount && driver.totalContractAmount > 0
                ? fmt(finance.contractRemaining ?? 0)
                : null;

    // Color for the value — amber when deposit is low, teal otherwise
    const valueColor = driverType === 'deposit' && depositWarning
        ? isDark ? 'text-amber-400' : 'text-amber-600'
        : isDark ? 'text-teal-400' : 'text-teal-600';

    return (
        <div
            onClick={() => onCardClick?.(driver)}
            className={`group relative rounded-[20px] border cursor-pointer transition-all duration-200 overflow-hidden hover:-translate-y-1 hover:shadow-md ${
                depositWarning
                    ? isDark
                        ? 'bg-surface border-amber-500/25 hover:shadow-[0_8px_40px_rgba(245,158,11,0.14)]'
                        : 'bg-white border-amber-200 hover:shadow-[0_8px_32px_rgba(245,158,11,0.12)]'
                    : isDark
                        ? 'bg-surface border-white/[0.07] hover:border-white/[0.13] hover:shadow-[0_8px_40px_rgba(0,0,0,0.35)]'
                        : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-[0_8px_32px_rgba(0,0,0,0.07)]'
            }`}
        >
            {/* ── Low-deposit warning banner ── */}
            {depositWarning && (
                <div className={`flex items-center gap-2 px-4 py-2 text-[11px] font-semibold border-b ${
                    isDark
                        ? 'bg-amber-500/[0.08] border-amber-500/15 text-amber-400'
                        : 'bg-amber-50 border-amber-100 text-amber-600'
                }`}>
                    <span>⚠️</span>
                    <span>Depozit past: {fmt(depositWarning.remaining)} UZS qoldi</span>
                </div>
            )}

            {/* ── Admin hover actions ── */}
            {userRole === 'admin' && (
                <div className="absolute top-3.5 right-3.5 z-10 hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 translate-y-[-3px] group-hover:translate-y-0 transition-all duration-150">
                    <button
                        onClick={handleEdit}
                        className={`w-7 h-7 flex items-center justify-center rounded-xl transition-all active:scale-90 ${
                            isDark
                                ? 'bg-[#1a2840] text-gray-500 hover:text-teal-400 border border-white/[0.08]'
                                : 'bg-white text-gray-400 hover:text-teal-600 border border-gray-200 shadow-sm'
                        }`}
                    >
                        <EditIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={handleDelete}
                        className={`w-7 h-7 flex items-center justify-center rounded-xl transition-all active:scale-90 ${
                            isDark
                                ? 'bg-[#1a2840] text-gray-500 hover:text-red-400 border border-white/[0.08]'
                                : 'bg-white text-gray-400 hover:text-red-500 border border-gray-200 shadow-sm'
                        }`}
                    >
                        <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* ── Card body ── */}
            <div className={`p-4 ${isDark ? 'bg-surface' : 'bg-white'}`}>
                {/* Row 1: Avatar · Name/Phone · Type badge + real balance */}
                <div className="flex items-center gap-3.5">
                    {/* Round avatar */}
                    <DriverAvatar
                        src={driver.avatar}
                        name={driver.name}
                        size={54}
                        theme={theme}
                        rounded="full"
                        className={`ring-2 ${isDark ? 'ring-white/[0.07]' : 'ring-black/[0.05]'}`}
                    />

                    {/* Name + phone */}
                    <div className="flex-1 min-w-0">
                        <p className={`text-[15px] font-semibold leading-snug truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {driver.name}
                        </p>
                        <p className={`text-[12px] mt-0.5 font-mono truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            {driver.phone || '—'}
                        </p>
                    </div>

                    {/* Clean textual financial metric */}
                    <div className="flex flex-col items-end justify-center pr-1">
                        {driverType === 'deposit' ? (
                            <span className={`text-[11px] font-medium tracking-wide ${!finance.remainingDeposit || finance.remainingDeposit <= 0 ? (isDark ? 'text-gray-500' : 'text-gray-400') : (isDark ? 'text-emerald-400' : 'text-emerald-600')}`}>
                                Depozit: {finance.remainingDeposit > 0 ? fmt(finance.remainingDeposit) : '0 UZS'}
                            </span>
                        ) : driverType === 'salary' ? (
                            <span className={`text-[11px] font-medium tracking-wide ${!driver.monthlySalary || driver.monthlySalary <= 0 ? (isDark ? 'text-gray-500' : 'text-gray-400') : (isDark ? 'text-violet-400' : 'text-violet-600')}`}>
                                Maosh: {driver.monthlySalary > 0 ? fmt(driver.monthlySalary) : '0 UZS'}
                            </span>
                        ) : (
                            <span className={`text-[11px] font-medium tracking-wide ${!finance.contractRemaining || finance.contractRemaining <= 0 ? (isDark ? 'text-gray-500' : 'text-gray-400') : (isDark ? 'text-teal-400' : 'text-teal-600')}`}>
                                Qarz: {finance.contractRemaining && finance.contractRemaining > 0 ? fmt(finance.contractRemaining) : '0 UZS'}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Car info section (Inset) ── */}
            <div className={`px-4 py-3 flex items-center gap-3 ${isDark ? 'bg-white/[0.02]' : 'bg-slate-50'}`}>
                {/* Car thumbnail */}
                <div className={`w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 ${
                    isDark ? 'bg-[#1a2840] border border-white/[0.06]' : 'bg-white border border-gray-200/60 shadow-sm'
                }`}>
                    {car?.avatar ? (
                        <DriverAvatar
                            src={car.avatar}
                            name={car.name}
                            size={36}
                            theme={theme}
                            rounded="xl"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <CarIcon className={`w-4 h-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                        </div>
                    )}
                </div>

                {/* Car name + plate or subtle action button */}
                {car ? (
                    <div className="flex-1 min-w-0">
                        <p className={`text-[12px] font-semibold truncate leading-tight ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            {car.name}
                        </p>
                        <p className={`text-[10px] font-mono tracking-widest mt-0.5 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                            {car.licensePlate}
                        </p>
                    </div>
                ) : (
                    <div className="flex-1">
                        <button onClick={(e) => { e.stopPropagation(); onEdit(driver); }} className={`px-3 py-1 rounded-full border border-dashed text-[11px] font-semibold transition-colors ${isDark ? 'border-teal-500/30 text-teal-400 hover:bg-teal-500/10' : 'border-teal-200 text-teal-600 hover:bg-teal-50'}`}>
                            + Biriktirish
                        </button>
                    </div>
                )}

                {/* Chevron hint */}
                <ChevronRightIcon className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 ${
                    isDark ? 'text-gray-700' : 'text-gray-300'
                }`} />
            </div>
        </div>
    );
};
