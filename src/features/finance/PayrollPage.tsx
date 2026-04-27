import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Driver } from '../../core/types';
import { Car } from '../../core/types/car.types';
import { CarIcon, XIcon } from '../../../components/Icons';

interface PayrollPageProps {
    drivers: Driver[];
    cars: Car[];
    theme: 'light' | 'dark';
    userRole: 'admin' | 'viewer';
    onPaySalary: (driver: Driver) => Promise<void>;
}

const fmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n));

function isPayedThisMonth(ts?: number): boolean {
    if (!ts) return false;
    const d = new Date(ts);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function formatLastPaid(ts?: number, neverLabel = 'Hech qachon'): string {
    if (!ts) return neverLabel;
    return new Intl.DateTimeFormat('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(ts));
}

const ConfirmPayModal: React.FC<{
    driver: Driver;
    theme: 'light' | 'dark';
    onConfirm: () => void;
    onCancel: () => void;
    loading: boolean;
}> = ({ driver, theme, onConfirm, onCancel, loading }) => {
    const { t } = useTranslation();
    const isDark = theme === 'dark';

    React.useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onCancel]);

    return createPortal(
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div
                className={`absolute inset-0 backdrop-blur-sm transition-opacity ${isDark ? 'bg-black/70' : 'bg-gray-900/40'}`}
                onClick={onCancel}
            />
            <div className={`relative z-10 w-full max-w-sm rounded-3xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 ${
                isDark ? 'bg-[#171f33] border-white/[0.08]' : 'bg-white border-gray-200'
            }`}>
                {/* Header */}
                <div className={`px-6 pt-6 pb-4 border-b ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                    <div className="flex items-center justify-between mb-1">
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
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4">
                    {/* Driver info */}
                    <div className={`flex items-center gap-3 p-3 rounded-2xl ${isDark ? 'bg-white/[0.04]' : 'bg-gray-50'}`}>
                        {driver.avatar ? (
                            <img src={driver.avatar} alt={driver.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                        ) : (
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base font-black flex-shrink-0 ${isDark ? 'bg-surface-2 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                                {driver.name.charAt(0)}
                            </div>
                        )}
                        <div>
                            <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{driver.name}</p>
                            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{driver.phone}</p>
                        </div>
                    </div>

                    {/* Amount */}
                    <div className={`flex items-center justify-between px-4 py-3.5 rounded-2xl border ${isDark ? 'bg-emerald-500/[0.07] border-emerald-500/[0.18]' : 'bg-emerald-50 border-emerald-200'}`}>
                        <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                            {t('monthlySalary')}
                        </span>
                        <span className={`text-lg font-black font-mono tabular-nums ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                            {fmt(driver.monthlySalary)} UZS
                        </span>
                    </div>

                    <p className={`text-xs text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        Bu to'lov xarajat sifatida qayd etiladi
                    </p>
                </div>

                {/* Footer */}
                <div className={`flex gap-3 px-6 pb-6`}>
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className={`flex-1 py-3 rounded-2xl text-sm font-semibold border transition-all ${isDark ? 'border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.04]' : 'border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                    >
                        {t('cancel')}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        ) : null}
                        {loading ? "To'lanmoqda..." : t('paySalary')}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export const PayrollPage: React.FC<PayrollPageProps> = ({ drivers, cars, theme, userRole, onPaySalary }) => {
    const { t } = useTranslation();
    const isDark = theme === 'dark';
    const [confirmDriver, setConfirmDriver] = useState<Driver | null>(null);
    const [payingId, setPayingId] = useState<string | null>(null);

    const salaryDrivers = useMemo(
        () => drivers.filter(d => !d.isDeleted && (d.monthlySalary ?? 0) > 0),
        [drivers]
    );

    const totalMonthly = salaryDrivers.reduce((s, d) => s + (d.monthlySalary ?? 0), 0);
    const paidCount = salaryDrivers.filter(d => isPayedThisMonth(d.lastSalaryPaidAt)).length;
    const dueCount = salaryDrivers.length - paidCount;

    const handleConfirmPay = async () => {
        if (!confirmDriver) return;
        setPayingId(confirmDriver.id);
        try {
            await onPaySalary(confirmDriver);
        } finally {
            setPayingId(null);
            setConfirmDriver(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={`p-5 rounded-2xl border ${isDark ? 'bg-surface border-white/[0.07]' : 'bg-white border-gray-200'}`}
                    style={{ boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {t('totalSalaries')}
                    </p>
                    <p className={`text-2xl font-black font-mono tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {fmt(totalMonthly)}
                    </p>
                    <p className={`text-[10px] mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>UZS / oy</p>
                </div>
                <div className={`p-5 rounded-2xl border ${isDark ? 'bg-emerald-500/[0.07] border-emerald-500/[0.15]' : 'bg-emerald-50 border-emerald-200'}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                        {t('paidThisMonth')}
                    </p>
                    <p className={`text-2xl font-black tabular-nums ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>{paidCount}</p>
                    <p className={`text-[10px] mt-1 ${isDark ? 'text-emerald-600' : 'text-emerald-600'}`}>haydovchi</p>
                </div>
                <div className={`p-5 rounded-2xl border ${dueCount > 0 ? isDark ? 'bg-red-500/[0.07] border-red-500/[0.15]' : 'bg-red-50 border-red-200' : isDark ? 'bg-surface border-white/[0.07]' : 'bg-white border-gray-200'}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${dueCount > 0 ? isDark ? 'text-red-400' : 'text-red-600' : isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {t('salaryDue')}
                    </p>
                    <p className={`text-2xl font-black tabular-nums ${dueCount > 0 ? isDark ? 'text-red-400' : 'text-red-600' : isDark ? 'text-white' : 'text-gray-900'}`}>{dueCount}</p>
                    <p className={`text-[10px] mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>haydovchi</p>
                </div>
            </div>

            {/* Driver list */}
            {salaryDrivers.length === 0 ? (
                <div className={`text-center py-20 rounded-3xl border ${isDark ? 'bg-surface border-white/[0.06]' : 'bg-white border-gray-200'}`}>
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-surface-2' : 'bg-gray-100'}`}>
                        <svg className={`w-8 h-8 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75" />
                        </svg>
                    </div>
                    <p className={`text-base font-semibold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t('noSalaryDrivers')}</p>
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                        Haydovchi tahrirlash orqali oylik maosh qo'shing
                    </p>
                </div>
            ) : (
                <div className={`rounded-3xl border overflow-hidden ${isDark ? 'bg-surface border-white/[0.07]' : 'bg-white border-gray-200'}`}
                    style={{ boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.06)' }}>
                    {/* Table header */}
                    <div className={`grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 border-b text-[10px] font-bold uppercase tracking-widest ${isDark ? 'border-white/[0.06] text-gray-500' : 'border-gray-100 text-gray-400'}`}>
                        <span>Haydovchi</span>
                        <span className="text-right">{t('monthlySalary')}</span>
                        <span className="text-right">{t('lastSalaryPaid')}</span>
                        {userRole === 'admin' && <span className="text-right">Amal</span>}
                    </div>

                    {/* Rows */}
                    <div className={`divide-y ${isDark ? 'divide-white/[0.05]' : 'divide-gray-50'}`}>
                        {salaryDrivers.map(driver => {
                            const isPaid = isPayedThisMonth(driver.lastSalaryPaidAt);
                            const car = cars.find(c => c.assignedDriverId === driver.id) ?? null;

                            return (
                                <div
                                    key={driver.id}
                                    className={`grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-4 transition-colors ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50/60'}`}
                                >
                                    {/* Driver info */}
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="relative flex-shrink-0">
                                            {driver.avatar ? (
                                                <img src={driver.avatar} alt={driver.name} className="w-10 h-10 rounded-xl object-cover" />
                                            ) : (
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black ${isDark ? 'bg-surface-2 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                                                    {driver.name.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{driver.name}</p>
                                            {car ? (
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <CarIcon className={`w-3 h-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                                                    <span className={`text-[11px] font-mono truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{car.licensePlate}</span>
                                                </div>
                                            ) : (
                                                <span className={`text-[11px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Mashina yo'q</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Salary */}
                                    <div className="text-right">
                                        <span className={`text-sm font-bold font-mono tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {fmt(driver.monthlySalary)}
                                        </span>
                                        <span className={`text-[10px] ml-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>UZS</span>
                                    </div>

                                    {/* Last paid + status */}
                                    <div className="text-right space-y-1">
                                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                            isPaid
                                                ? isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
                                                : isDark ? 'bg-red-500/15 text-red-400' : 'bg-red-50 text-red-600'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                            {isPaid ? t('paidThisMonth') : t('salaryDue')}
                                        </span>
                                        <p className={`text-[10px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                                            {formatLastPaid(driver.lastSalaryPaidAt, t('neverPaid'))}
                                        </p>
                                    </div>

                                    {/* Pay button */}
                                    {userRole === 'admin' && (
                                        <div>
                                            <button
                                                onClick={() => setConfirmDriver(driver)}
                                                disabled={payingId === driver.id}
                                                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 border whitespace-nowrap ${
                                                    isPaid
                                                        ? isDark
                                                            ? 'border-white/[0.08] text-gray-500 hover:text-white hover:border-white/[0.15] hover:bg-white/[0.04]'
                                                            : 'border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300'
                                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent'
                                                }`}
                                            >
                                                {t('paySalary')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Confirm modal */}
            {confirmDriver && (
                <ConfirmPayModal
                    driver={confirmDriver}
                    theme={theme}
                    loading={payingId === confirmDriver.id}
                    onConfirm={handleConfirmPay}
                    onCancel={() => setConfirmDriver(null)}
                />
            )}
        </div>
    );
};
