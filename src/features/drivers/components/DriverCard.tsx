import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Driver, DriverStatus } from '../../../core/types';
import { Car } from '../../../core/types/car.types';
import { Transaction } from '../../../core/types/transaction.types';
import { useNavigate } from 'react-router-dom';
import { EditIcon, TrashIcon, CarIcon, ChevronRightIcon } from '../../../../components/Icons';
import { calcDriverFinance } from '../utils/debtUtils';
import { DriverAvatar } from './DriverAvatar';
import { LicensePlate } from '../../../components/ui/LicensePlate';

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
}

const fmt = (n: number) => `${new Intl.NumberFormat('uz-UZ').format(Math.round(n))} UZS`;

export const DriverCard: React.FC<DriverCardProps> = ({
    driver, car, transactions, theme, userRole, onEdit, onDelete,
}) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
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
            onClick={() => navigate(`/drivers/${driver.id}`)}
            className={`group relative rounded-[28px] border cursor-pointer transition-all duration-200 overflow-hidden hover:-translate-y-1 hover:shadow-md ${
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
                        ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                        : 'bg-[#fff8e1] border-amber-200 text-amber-700'
                }`}>
                    <span className="opacity-80">⚠️</span>
                    <span>{t('lowDepositWarning', { amount: fmt(depositWarning.remaining), defaultValue: `Low Deposit Warning: ${fmt(depositWarning.remaining)} remaining` })}</span>
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
            <div className="p-4 bg-transparent">
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
                    <div className="flex flex-col items-end justify-center">
                        {driverType === 'deposit' ? (
                            <div className={`flex flex-col items-start px-3 py-1.5 rounded-[10px] min-w-[125px] ${!finance.remainingDeposit || finance.remainingDeposit <= 0 ? (isDark ? 'bg-white/5' : 'bg-gray-100') : depositWarning ? (isDark ? 'bg-amber-500/10' : 'bg-amber-50') : (isDark ? 'bg-emerald-500/10' : 'bg-emerald-50')}`}>
                                <div className="flex items-center justify-between w-full">
                                    <span className={`text-[11px] font-medium ${!finance.remainingDeposit || finance.remainingDeposit <= 0 ? (isDark ? 'text-gray-500' : 'text-gray-500') : depositWarning ? (isDark ? 'text-amber-400' : 'text-amber-700') : (isDark ? 'text-emerald-400' : 'text-emerald-700')}`}>
                                        Depozit:
                                    </span>
                                    {finance.remainingDeposit > 0 && !depositWarning && (
                                        <svg className={`w-3 h-3 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H9M17 7v8" />
                                        </svg>
                                    )}
                                </div>
                                <span className={`text-[14px] font-bold mt-0.5 leading-none ${!finance.remainingDeposit || finance.remainingDeposit <= 0 ? (isDark ? 'text-gray-400' : 'text-gray-600') : depositWarning ? (isDark ? 'text-amber-400' : 'text-amber-700') : (isDark ? 'text-emerald-400' : 'text-emerald-700')}`}>
                                    {finance.remainingDeposit > 0 ? fmt(finance.remainingDeposit) : '0 UZS'}
                                </span>
                            </div>
                        ) : driverType === 'salary' ? (
                            <div className={`flex flex-col items-start px-3 py-1.5 rounded-[10px] min-w-[125px] ${!driver.monthlySalary || driver.monthlySalary <= 0 ? (isDark ? 'bg-white/5' : 'bg-gray-100') : (isDark ? 'bg-violet-500/15' : 'bg-violet-100')}`}>
                                <span className={`text-[11px] font-medium ${!driver.monthlySalary || driver.monthlySalary <= 0 ? (isDark ? 'text-gray-500' : 'text-gray-500') : (isDark ? 'text-violet-400' : 'text-violet-700')}`}>
                                    Maosh:
                                </span>
                                <span className={`text-[14px] font-bold mt-0.5 leading-none ${!driver.monthlySalary || driver.monthlySalary <= 0 ? (isDark ? 'text-gray-400' : 'text-gray-600') : (isDark ? 'text-violet-400' : 'text-violet-700')}`}>
                                    {driver.monthlySalary > 0 ? fmt(driver.monthlySalary) : '0 UZS'}
                                </span>
                            </div>
                        ) : (
                            <div className={`flex flex-col w-[145px] px-3 py-2 rounded-[12px] border ${isDark ? 'bg-[#1e1b4b]/40 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'}`}>
                                <div className="flex items-center justify-between w-full mb-1.5">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                        Vikup
                                    </span>
                                    <span className={`text-[10px] font-black ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>
                                        {Math.round(((finance.contractPaid ?? 0) / (driver.totalContractAmount || 1)) * 100)}%
                                    </span>
                                </div>
                                
                                {/* Sleek Progress Bar */}
                                <div className={`w-full h-1.5 rounded-full overflow-hidden mb-1.5 ${isDark ? 'bg-indigo-950' : 'bg-indigo-200/60'}`}>
                                    <div 
                                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                                        style={{ width: `${Math.min(100, ((finance.contractPaid ?? 0) / (driver.totalContractAmount || 1)) * 100)}%` }}
                                    />
                                </div>

                                <div className="flex items-center justify-between w-full">
                                    <span className={`text-[9px] font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Qoldi</span>
                                    <span className={`text-[11px] font-bold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                                        {fmt(finance.contractRemaining ?? 0).replace(' UZS', '')}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Car info section (Inset) ── */}
            <div className={`px-4 py-3.5 flex items-center gap-3.5 border-t bg-transparent ${isDark ? 'border-white/[0.05]' : 'border-gray-100'}`}>
                {/* Car thumbnail */}
                <div className={`w-[44px] h-[44px] rounded-[10px] overflow-hidden flex-shrink-0 ${
                    isDark ? 'bg-[#1a2840] border border-[#2a3850]' : 'bg-[#f4f7fa] border border-[#e2e8f0]'
                }`}>
                    {car?.avatar ? (
                        <DriverAvatar
                            src={car.avatar}
                            name={car.name}
                            size={44}
                            theme={theme}
                            rounded="10px"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <CarIcon className={`w-5 h-5 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                        </div>
                    )}
                </div>

                {/* Car name + plate or subtle action button */}
                {car ? (
                    <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5">
                        <p className={`text-[14px] font-bold truncate leading-none mb-1.5 ${isDark ? 'text-gray-200' : 'text-[#1e293b]'}`}>
                            {car.name}
                        </p>
                        <div>
                            <LicensePlate plate={car.licensePlate} size="sm" />
                        </div>
                    </div>
                ) : (
                    <div className="flex-1">
                        <button onClick={(e) => { e.stopPropagation(); onEdit(driver); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-semibold transition-colors ${isDark ? 'bg-[#1a2840] border-white/[0.08] text-gray-300 hover:text-white' : 'bg-white border-gray-200 text-gray-700 hover:text-gray-900 shadow-sm'}`}>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                            {t('assignCar', { defaultValue: 'Biriktirish' })}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
