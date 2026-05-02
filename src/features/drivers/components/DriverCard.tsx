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

    // Right-side value: deposit balance for deposit drivers, salary for salary drivers
    const typeValueLabel = driverType === 'deposit'
        ? driver.depositAmount && driver.depositAmount > 0
            ? fmt(finance.remainingDeposit)
            : null
        : driver.monthlySalary && driver.monthlySalary > 0
            ? fmt(driver.monthlySalary)
            : null;

    // Color for the value — amber when deposit is low, teal otherwise
    const valueColor = driverType === 'deposit' && depositWarning
        ? isDark ? 'text-amber-400' : 'text-amber-600'
        : isDark ? 'text-teal-400' : 'text-teal-600';

    return (
        <div
            onClick={() => onCardClick?.(driver)}
            className={`group relative rounded-[20px] border cursor-pointer transition-all duration-200 overflow-hidden ${
                depositWarning
                    ? isDark
                        ? 'bg-surface border-amber-500/25 hover:shadow-[0_8px_40px_rgba(245,158,11,0.14)]'
                        : 'bg-white border-amber-200 hover:shadow-[0_8px_32px_rgba(245,158,11,0.12)]'
                    : isDark
                        ? 'bg-surface border-white/[0.07] hover:border-white/[0.13] hover:shadow-[0_8px_40px_rgba(0,0,0,0.35)]'
                        : 'bg-white border-gray-200/80 hover:border-gray-300 hover:shadow-[0_8px_32px_rgba(0,0,0,0.07)]'
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
            <div className="p-4">

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

                    {/* Type badge + real financial value */}
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0 pr-1">
                        {/* Driver type badge */}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full leading-tight ${
                            driverType === 'deposit'
                                ? isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-600 border border-amber-200'
                                : isDark ? 'bg-violet-500/15 text-violet-400' : 'bg-violet-50 text-violet-700 border border-violet-200'
                        }`}>
                            {driverType === 'deposit' ? '🏦 Depozit' : '💳 Maosh'}
                        </span>

                        {/* Actual deposit balance OR salary — not the car daily plan */}
                        {typeValueLabel && (
                            <span className={`text-[12px] font-bold tabular-nums ${valueColor}`}>
                                {typeValueLabel}
                            </span>
                        )}

                        {/* Sub-label so admin knows what the number represents */}
                        {typeValueLabel && (
                            <span className={`text-[9px] font-medium leading-none -mt-1 ${
                                isDark ? 'text-gray-600' : 'text-gray-400'
                            }`}>
                                {driverType === 'deposit' ? 'dep. qoldiq' : 'oylik'}
                            </span>
                        )}
                    </div>
                </div>

                {/* Thin divider */}
                <div className={`my-3.5 h-px ${isDark ? 'bg-white/[0.05]' : 'bg-gray-100'}`} />

                {/* Row 2: Car info — iOS table cell style */}
                <div className="flex items-center gap-3">
                    {/* Car thumbnail */}
                    <div className={`w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 ${
                        isDark ? 'bg-[#1a2840] border border-white/[0.06]' : 'bg-gray-100 border border-gray-200'
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

                    {/* Car name + plate */}
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
                        <span className={`flex-1 text-[12px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                            {t('carNotAssigned')}
                        </span>
                    )}

                    {/* Chevron hint */}
                    <ChevronRightIcon className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 ${
                        isDark ? 'text-gray-700' : 'text-gray-300'
                    }`} />
                </div>
            </div>
        </div>
    );
};
