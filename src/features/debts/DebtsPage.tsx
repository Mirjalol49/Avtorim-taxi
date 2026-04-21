import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Driver, Transaction, Car } from '../../core/types';
import { calcDriverDebt } from '../drivers/utils/debtUtils';
import { getDaysOffSet, DayOff } from '../../../services/daysOffService';

interface DebtsPageProps {
    drivers: Driver[];
    cars: Car[];
    transactions: Transaction[];
    daysOff: DayOff[];
    theme: 'dark' | 'light';
    onAddDebt?: (driver: Driver) => void;
    onAddPayment?: (driver: Driver) => void;
}

export const DebtsPage: React.FC<DebtsPageProps> = ({
    drivers,
    cars,
    transactions,
    daysOff,
    theme,
    onAddDebt,
    onAddPayment
}) => {
    const { t } = useTranslation();
    const isDark = theme === 'dark';

    const fmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(Math.abs(n)));

    // Calculate massive stats
    const activeDrivers = drivers.filter(d => !d.isDeleted);
    
    let globalFleetOwed = 0;
    
    const driverStats = activeDrivers.map(d => {
        const car = cars.find(c => c.assignedDriverId === d.id) ?? null;
        const out = calcDriverDebt(d, car, transactions, getDaysOffSet(daysOff, d.id));
        if (out.netDebt > 0) globalFleetOwed += out.netDebt;
        return { driver: d, stats: out };
    });

    // Sort by largest debt first
    driverStats.sort((a, b) => b.stats.netDebt - a.stats.netDebt);

    return (
        <div className="space-y-6 animate-fadeIn pb-10">
            {/* Header Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`p-6 rounded-3xl border shadow-sm ${isDark ? 'bg-[#1E293B]/80 border-[#334155]' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">💰</span>
                        <h2 className={`font-bold uppercase tracking-wider text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Jami Qarzlar
                        </h2>
                    </div>
                    <p className={`text-3xl font-black font-mono ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                        {fmt(globalFleetOwed)} <span className="text-lg opacity-70">UZS</span>
                    </p>
                </div>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {driverStats.map(({ driver, stats }) => {
                    const isCredit = stats.netDebt <= 0;
                    return (
                        <div key={driver.id} className={`p-5 rounded-3xl border shadow-sm transition-all group ${isDark ? 'bg-[#1F2937]/90 border-gray-700 hover:border-gray-500' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                            <div className="flex items-center justify-between mb-4 border-b pb-4 dark:border-gray-700 border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-200 dark:border-gray-600 shrink-0">
                                        {driver.avatar ? (
                                            <img src={driver.avatar} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-lg font-bold bg-gray-100 dark:bg-gray-700 text-gray-500">
                                                {driver.name.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className={`font-bold text-lg leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{driver.name}</h3>
                                        <p className={`text-[11px] font-medium uppercase tracking-wide mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                            Reja: {fmt(stats.dailyPlan)}
                                        </p>
                                    </div>
                                </div>
                                <div className={`text-right ${isCredit ? 'text-green-500' : isDark ? 'text-red-400' : 'text-red-600'}`}>
                                    <p className="text-[10px] uppercase font-bold tracking-widest opacity-80 mb-0.5">Sof Qarz</p>
                                    <p className="text-xl font-black font-mono">
                                        {isCredit && stats.netDebt < 0 ? '+' : ''}{fmt(-stats.netDebt)}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-5">
                                <div className={`p-3 rounded-2xl ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                                    <p className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Avtomat Qarz</p>
                                    <p className={`font-bold font-mono text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{fmt(stats.totalAutoDebt)}</p>
                                </div>
                                <div className={`p-3 rounded-2xl ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                                    <p className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Qo'shimcha Qarz</p>
                                    <p className={`font-bold font-mono text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{fmt(stats.totalExplicitDebt)}</p>
                                </div>
                                <div className={`col-span-2 p-3 rounded-2xl ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                                    <p className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>To'langan</p>
                                    <p className={`font-bold font-mono text-sm ${isDark ? 'text-green-400' : 'text-green-600'}`}>{fmt(stats.totalIncome)}</p>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button 
                                    onClick={() => onAddDebt && onAddDebt(driver)}
                                    className={`flex-1 py-3 justify-center border font-bold text-xs uppercase tracking-wider rounded-xl transition-all ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                                >
                                    + Qarz qoshish
                                </button>
                                <button
                                    onClick={() => onAddPayment && onAddPayment(driver)}
                                    className="flex-1 py-3 justify-center bg-[#0f766e] hover:bg-[#0d645e] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95"
                                >
                                    To'lov
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default DebtsPage;
