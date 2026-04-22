import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { XIcon, CalendarIcon } from '../../../../components/Icons';
import { Driver, Transaction, TransactionType } from '../../../core/types';
import { Car } from '../../../core/types/car.types';
import { PaymentStatus } from '../../../core/types/transaction.types';

export interface DriverPlanMonthInfo {
    driver: Driver;
    car: Car | null;
    monthKey: string;      // 'YYYY-MM'
    totalDays: number;
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
    onDayClick?: (driverId: string, date: Date) => void;
}

const fmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(Math.abs(n)));

const MONTHS_UZ = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
];

export const DriverPlanCalendarModal: React.FC<Props> = ({ isOpen, onClose, theme, monthData, transactions, onDayClick }) => {
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

        // Helper: get local date string YYYY-MM-DD for any timestamp
        const toLocalDateStr = (ts: number) => {
            const d = new Date(ts);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        };

        const result = [];
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d);
            const dayStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            
            // Calculate day's income using local date string comparison
            const sumTushum = transactions.filter(tx => 
                tx.driverId === monthData.driver.id &&
                tx.type === TransactionType.INCOME &&
                tx.status !== PaymentStatus.DELETED &&
                (tx as any).status !== 'DELETED' &&
                toLocalDateStr(tx.timestamp) === dayStr
            ).reduce((acc, tx) => acc + Math.abs(tx.amount), 0);

            const isDayOff = transactions.some(tx => 
                tx.driverId === monthData.driver.id &&
                tx.type === 'DAY_OFF' &&
                toLocalDateStr(tx.timestamp) === dayStr
            );

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
                debt: status !== 'FUTURE' ? Math.max(0, monthData.dailyPlan - sumTushum) : 0
            });
        }
        return result;
    }, [monthData, transactions]);

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
            
            <div className={`relative w-full max-w-6xl h-full max-h-[90vh] flex flex-col rounded-3xl shadow-2xl border overflow-hidden animate-in zoom-in-95 duration-300 ${
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
                            <div className="flex items-center gap-2 mb-0.5">
                                <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{monthData.driver.name}</h2>
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-600'}`}>
                                    {MONTHS_UZ[parseInt(mStr, 10) - 1]} {yStr}
                                </span>
                            </div>
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
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 dark:text-gray-400"><span className="w-2 h-2 rounded-full bg-green-500"></span> To'liq to'landi</div>
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 dark:text-gray-400"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Qisman to'landi</div>
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 dark:text-gray-400"><span className="w-2 h-2 rounded-full bg-red-500"></span> Qarz</div>
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 dark:text-gray-400"><span className="w-2 h-2 rounded-full bg-blue-500"></span> 🏝️ Dam olish</div>
                    </div>

                    {/* Calendar Grid */}
                    <div className="mt-4">
                        <div className="grid grid-cols-7 gap-2 sm:gap-3 mb-2">
                            {['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'].map(day => (
                                <div key={day} className={`text-center text-[10px] sm:text-xs font-semibold py-1 uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{day}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-2 sm:gap-3 md:gap-4">
                            {Array(padDays).fill(null).map((_, i) => (
                                <div key={`pad-${i}`} className="w-full min-h-[80px] sm:min-h-[100px] md:min-h-[120px] rounded-2xl bg-transparent" />
                            ))}
                            {days.map((d) => {
                                let styleClass = '';
                                if (d.status === 'FUTURE') styleClass = isDark ? 'bg-[#1C1C1E] text-gray-600' : 'bg-gray-50 text-gray-400';
                                else if (d.status === 'DAY_OFF') styleClass = isDark ? 'bg-[#0f1f3d] text-blue-400 border border-blue-500/30' : 'bg-blue-50 text-blue-600 border border-blue-200';
                                else if (d.status === 'PAID') styleClass = isDark ? 'bg-[#182C1B] text-green-500 border border-green-500/20' : 'bg-green-50 text-green-600 border border-green-200';
                                else if (d.status === 'PARTIAL') styleClass = isDark ? 'bg-[#2E2011] text-orange-500 border border-orange-500/20' : 'bg-orange-50 text-orange-600 border border-orange-200';
                                else if (d.status === 'UNPAID') styleClass = isDark ? 'bg-[#2C181A] text-red-500 border border-red-500/20' : 'bg-red-50 text-red-600 border border-red-200';

                                return (
                                    <div 
                                        key={d.day} 
                                        onClick={() => {
                                            if (onDayClick && d.status !== 'FUTURE') {
                                                const [year, month] = monthData.monthKey.split('-').map(Number);
                                                const date = new Date(year, month - 1, d.day);
                                                onDayClick(monthData.driver.id, date);
                                            }
                                        }}
                                        className={`flex flex-col justify-between p-2 sm:p-3 md:p-4 min-h-[80px] sm:min-h-[100px] md:min-h-[120px] rounded-xl sm:rounded-2xl transition-all hover:scale-[1.02] ${d.status !== 'FUTURE' ? 'cursor-pointer hover:shadow-lg' : 'cursor-default'} ${styleClass}`}
                                    >
                                        <span className={`font-semibold text-xs sm:text-sm md:text-base ${styleClass.includes('FUTURE') ? 'opacity-50' : 'opacity-90'}`}>{d.day}</span>
                                        
                                        {d.status === 'DAY_OFF' ? (
                                            <div className="flex flex-col items-center justify-center h-full w-full py-1 gap-1">
                                                <span className="text-xl sm:text-2xl">🏝️</span>
                                                <span className="text-[9px] sm:text-[10px] font-bold text-blue-400 uppercase tracking-wider">Dam olish</span>
                                                {d.income > 0 && (
                                                    <span className="text-[9px] sm:text-[10px] font-bold text-green-400 mt-0.5">+{fmt(d.income)}</span>
                                                )}
                                            </div>
                                        ) : d.status !== 'FUTURE' && (
                                            <div className="mt-auto space-y-0.5 pt-2 flex flex-col items-start w-full">
                                                {d.income > 0 && (
                                                    <div className="text-[10px] sm:text-xs md:text-sm font-medium tracking-tight opacity-90 truncate w-full">
                                                        {fmt(d.income)}
                                                    </div>
                                                )}
                                                {d.debt > 0 && (
                                                    <div className={`text-[10px] sm:text-xs md:text-sm font-bold tracking-tight opacity-90 truncate w-full ${isDark ? 'text-red-400' : 'text-red-500'}`}>
                                                        -{fmt(d.debt)}
                                                    </div>
                                                )}
                                            </div>
                                        )}
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
