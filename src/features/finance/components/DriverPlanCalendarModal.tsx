import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { XIcon, CalendarIcon } from '../../../../components/Icons';
import { Driver, Transaction, TransactionType } from '../../../core/types';
import { Car } from '../../../core/types/car.types';
import { PaymentStatus } from '../../../core/types/transaction.types';
import { DayOff } from '../../../../services/daysOffService';

export interface DriverPlanMonthInfo {
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

interface Props {
    isOpen: boolean;
    onClose: () => void;
    theme: 'dark' | 'light';
    monthData: DriverPlanMonthInfo | null;
    transactions: Transaction[]; // Only needs to be driver's transactions or all
    daysOff: DayOff[];
}

const fmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(Math.abs(n)));

export const DriverPlanCalendarModal: React.FC<Props> = ({ isOpen, onClose, theme, monthData, transactions, daysOff }) => {
    const isDark = theme === 'dark';

    // Disable body scroll when modal open
    React.useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    const days = useMemo(() => {
        if (!monthData) return [];
        const [yStr, mStr] = monthData.monthKey.split('-');
        const year = parseInt(yStr, 10);
        const month = parseInt(mStr, 10) - 1; // 0-indexed for Date
        const daysInMonth = monthData.totalDays;

        const result = [];
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d);
            
            // Check day off using dateKey (YYYY-MM-DD)
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isDayOff = daysOff.some(off => off.driverId === monthData.driver.id && off.dateKey === dateStr);

            // Calculate day's income
            const todaysStartObj = new Date(year, month, d, 0, 0, 0).getTime();
            const todaysEndObj = new Date(year, month, d, 23, 59, 59, 999).getTime();

            const sumTushum = transactions.filter(tx => 
                tx.driverId === monthData.driver.id &&
                tx.type === TransactionType.INCOME &&
                tx.status !== PaymentStatus.DELETED &&
                (tx as any).status !== 'DELETED' &&
                tx.timestamp >= todaysStartObj &&
                tx.timestamp <= todaysEndObj
            ).reduce((acc, tx) => acc + Math.abs(tx.amount), 0);

            let status: 'PAID' | 'PARTIAL' | 'UNPAID' | 'DAY_OFF' | 'FUTURE' = 'UNPAID';
            
            if (isDayOff) {
                status = 'DAY_OFF';
            } else if (date.getTime() > new Date().getTime()) {
                status = 'FUTURE'; // Can't owe for tomorrow yet
            } else if (sumTushum >= monthData.dailyPlan) {
                status = 'PAID';
            } else if (sumTushum > 0) {
                status = 'PARTIAL';
            }

            result.push({
                day: d,
                date,
                status,
                income: sumTushum,
                debt: status !== 'DAY_OFF' && status !== 'FUTURE' ? Math.max(0, monthData.dailyPlan - sumTushum) : 0
            });
        }
        return result;
    }, [monthData, transactions, daysOff]);

    if (!isOpen || !monthData) return null;

    // Pad the calendar so it starts on the right day of the week
    const [yStr, mStr] = monthData.monthKey.split('-');
    const firstDayIndex = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, 1).getDay(); // 0(Sun)-6(Sat)
    // Map 0 to 6 (Sunday to Saturday) to 0 to 6 (Monday to Sunday offset) - Wait, JS Date: 0=Sun. Let's make Mon=0.
    const padDays = firstDayIndex === 0 ? 6 : firstDayIndex - 1; 

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
                className={`absolute inset-0 transition-opacity duration-300 ${isDark ? 'bg-black/70 backdrop-blur-md' : 'bg-gray-900/40 backdrop-blur-sm'}`} 
                onClick={onClose}
            />
            
            <div className={`relative w-full max-w-4xl h-full max-h-[90vh] flex flex-col rounded-3xl shadow-2xl border overflow-hidden animate-in zoom-in-95 duration-300 ${
                isDark ? 'bg-[#111827] border-gray-700' : 'bg-white border-gray-200'
            }`}>
                
                {/* Header */}
                <div className={`flex items-center justify-between p-5 sm:p-6 border-b ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex items-center gap-4">
                        {monthData.driver.avatar ? (
                            <img src={monthData.driver.avatar} alt="Avatar" className="w-12 h-12 rounded-full border-2 border-gray-600 object-cover" />
                        ) : (
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                                {monthData.driver.name.charAt(0)}
                            </div>
                        )}
                        <div>
                            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{monthData.driver.name}</h2>
                            <p className="text-sm text-gray-400 font-medium">Reja: {fmt(monthData.dailyPlan)} UZS / kun</p>
                        </div>
                    </div>
                    <button onClick={onClose} className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${isDark ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-200'}`}>
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
                    {/* Top Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className={`p-4 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-gray-50 border border-gray-100'}`}>
                            <p className="text-xs font-bold text-gray-400 uppercase">Oylik Reja</p>
                            <p className={`text-lg font-black font-mono mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{fmt(monthData.monthlyTarget)}</p>
                        </div>
                        <div className={`p-4 rounded-2xl ${isDark ? 'bg-[#0f766e]/10 border border-[#0f766e]/20' : 'bg-teal-50 border border-teal-200'}`}>
                            <p className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase">Jami Kiritildi</p>
                            <p className="text-lg font-black font-mono text-teal-600 dark:text-teal-400 mt-1">{fmt(monthData.actualIncome)}</p>
                        </div>
                        <div className={`p-4 rounded-2xl ${
                            monthData.remaining <= 0 
                            ? isDark ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-200'
                            : isDark ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-orange-50 border border-orange-200'
                        }`}>
                            <p className={`text-xs font-bold uppercase ${monthData.remaining <= 0 ? 'text-green-500' : 'text-orange-500'}`}>Hozirgi Qarz</p>
                            <p className={`text-lg font-black font-mono mt-1 ${monthData.remaining <= 0 ? 'text-green-500' : 'text-orange-500'}`}>
                                {monthData.remaining > 0 ? fmt(monthData.remaining) : '+ ' + fmt(-monthData.remaining)}
                            </p>
                        </div>
                        <div className={`p-4 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-gray-50 border border-gray-100'}`}>
                            <p className="text-xs font-bold text-gray-400 uppercase">Ish Kunlari</p>
                            <p className={`text-lg font-black mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{monthData.workingDays} <span className="text-sm font-normal text-gray-500">/ {monthData.totalDays}</span></p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                        <div className="flex justify-between text-xs font-bold mb-2">
                            <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Tushum progressi</span>
                            <span className={isDark ? 'text-white' : 'text-gray-900'}>{monthData.paidPercent}%</span>
                        </div>
                        <div className={`w-full h-3 rounded-full overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
                            <div 
                                className={`h-full rounded-full transition-all duration-700 ease-out ${monthData.paidPercent >= 100 ? 'bg-green-500' : monthData.paidPercent >= 60 ? 'bg-amber-400' : 'bg-orange-500'}`}
                                style={{ width: `${monthData.paidPercent}%` }}
                            />
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                        <div className="flex items-center gap-2 text-xs font-bold"><span className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500"></span> To'liq to'landi</div>
                        <div className="flex items-center gap-2 text-xs font-bold"><span className="w-3 h-3 rounded-full bg-orange-500/20 border border-orange-500"></span> Qisman to'landi</div>
                        <div className="flex items-center gap-2 text-xs font-bold"><span className="w-3 h-3 rounded-full bg-red-500/10 border border-red-500/50"></span> To'lanmagan (Qarz)</div>
                        <div className="flex items-center gap-2 text-xs font-bold"><span className="w-3 h-3 rounded-full bg-teal-500/20 border border-teal-500"></span> Dam olish kuni</div>
                    </div>

                    {/* Calendar Grid */}
                    <div className="mt-4">
                        <div className="grid grid-cols-7 gap-2 sm:gap-3 mb-2">
                            {['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'].map(day => (
                                <div key={day} className={`text-center text-xs font-bold py-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{day}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-2 sm:gap-3">
                            {Array(padDays).fill(null).map((_, i) => (
                                <div key={`pad-${i}`} className="w-full pt-[100%] rounded-2xl bg-transparent" />
                            ))}
                            {days.map((d) => {
                                let styleClass = '';
                                if (d.status === 'FUTURE') styleClass = isDark ? 'bg-gray-800/30 border-gray-800 text-gray-500' : 'bg-gray-50/50 border-gray-100 text-gray-400';
                                else if (d.status === 'DAY_OFF') styleClass = isDark ? 'bg-teal-500/10 border-teal-500 text-teal-400 shadow-[0_0_10px_rgba(20,184,166,0.1)]' : 'bg-teal-50 border-teal-400 text-teal-700 shadow-sm';
                                else if (d.status === 'PAID') styleClass = isDark ? 'bg-green-500/10 border-green-500/80 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.1)]' : 'bg-green-50 border-green-400 text-green-700 shadow-sm';
                                else if (d.status === 'PARTIAL') styleClass = isDark ? 'bg-orange-500/10 border-orange-500/80 text-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.1)]' : 'bg-orange-50 border-orange-400 text-orange-700 shadow-sm';
                                else if (d.status === 'UNPAID') styleClass = isDark ? 'bg-red-500/5 border-red-500/30 text-gray-300' : 'bg-red-50/50 border-red-200 text-gray-700';

                                return (
                                    <div key={d.day} className={`relative pt-[100%] rounded-xl sm:rounded-2xl border transition-all ${styleClass}`}>
                                        <div className="absolute inset-0 p-1.5 sm:p-2 flex flex-col justify-between overflow-hidden">
                                            <span className="font-bold text-sm sm:text-base opacity-90">{d.day}</span>
                                            
                                            {/* Details inside grid square */}
                                            {d.status !== 'FUTURE' && d.status !== 'DAY_OFF' && (
                                                <div className="mt-auto space-y-0.5">
                                                    {d.income > 0 && (
                                                        <div className="text-[9px] sm:text-[10px] font-mono leading-none truncate font-bold opacity-90">
                                                            +{fmt(d.income)}
                                                        </div>
                                                    )}
                                                    {d.debt > 0 && (
                                                        <div className={`text-[9px] sm:text-[10px] font-mono leading-none truncate font-medium ${isDark ? 'text-red-400' : 'text-red-500'}`}>
                                                            -{fmt(d.debt)}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
