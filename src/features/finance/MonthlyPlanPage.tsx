import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Transaction, Driver } from '../../core/types';
import { Car } from '../../core/types/car.types';
import MonthPicker from '../../../components/MonthPicker';
import DriverFilterModal from '../../../components/DriverFilterModal';
import CustomSelect from '../../../components/CustomSelect';
import { UsersIcon } from '../../../components/Icons';
import { DriverPlanSummary } from './DriverPlanSummary';

interface MonthlyPlanPageProps {
    transactions: Transaction[];
    drivers: Driver[];
    cars: Car[];
    theme: 'dark' | 'light';
    isMobile?: boolean;
    onDayClick?: (driverId: string, date: Date) => void;
}

export const MonthlyPlanPage: React.FC<MonthlyPlanPageProps> = ({
    transactions,
    drivers,
    cars,
    theme,
    isMobile = false,
    onDayClick
}) => {
    const { t } = useTranslation();
    
    // Default filters
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    const [selectedDate, setSelectedDate] = useState<Date>(new Date(currentYear, currentMonth, 1));
    const [driverId, setDriverId] = useState<string>('all');
    const [driverModalOpen, setDriverModalOpen] = useState(false);

    const startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

    const activeDriversWithCars = drivers.filter(d => {
        if (d.isDeleted) return false;
        const car = cars.find(c => c.assignedDriverId === d.id && !c.isDeleted);
        return !!car;
    });

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header Filters */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
                <div className="w-full sm:w-auto min-w-[160px]">
                    <MonthPicker
                        label={t('selectMonth') || 'Oyni tanlang'}
                        value={selectedDate}
                        onChange={(date) => setSelectedDate(date)}
                        theme={theme}
                        labelClassName="hidden"
                    />
                </div>
                {/* Driver Filter via Modal */}
                <div className="w-full sm:w-auto min-w-[260px] relative">
                    {(() => {
                        const selectedDriver = driverId && driverId !== 'all'
                            ? activeDriversWithCars.find(d => d.id === driverId)
                            : null;
                        const selectedCar = selectedDriver
                            ? cars.find(c => c.assignedDriverId === selectedDriver.id)
                            : null;
                        return (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setDriverModalOpen(true)}
                                    className={`w-full h-[52px] px-3 sm:px-4 rounded-[10px] border text-left transition-all flex items-center justify-between gap-3 ${
                                        driverModalOpen
                                            ? theme === 'dark'
                                                ? 'bg-surface-2 border-teal-500 ring-1 ring-teal-500/40'
                                                : 'bg-white border-teal-500 ring-1 ring-teal-500/20 shadow-md'
                                            : theme === 'dark'
                                                ? 'bg-surface-2/50 border-white/[0.08] hover:border-white/[0.12]'
                                                : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        {selectedDriver ? (
                                            <>
                                                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-slate-200 dark:border-surface-3">
                                                    {selectedDriver.avatar
                                                        ? <img src={selectedDriver.avatar} alt="" className="w-full h-full object-cover" />
                                                        : <div className={`w-full h-full flex items-center justify-center text-xs font-bold ${theme === 'dark' ? 'bg-surface-2 text-gray-300' : 'bg-slate-100 text-slate-600'}`}>{selectedDriver.name.charAt(0)}</div>
                                                    }
                                                </div>
                                                <div className="flex-1 min-w-0 pr-2">
                                                    <div className={`text-[13px] sm:text-[14px] font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{selectedDriver.name}</div>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex items-center -space-x-2.5 flex-shrink-0">
                                                    {activeDriversWithCars.slice(0, 2).map((d, i) => (
                                                        <div key={d.id} className="w-8 h-8 rounded-full overflow-hidden border-2 border-white dark:border-surface bg-slate-100 shadow-sm" style={{ zIndex: 2 - i }}>
                                                            {d.avatar ? (
                                                                <img src={d.avatar} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-600">
                                                                    {d.name.charAt(0).toUpperCase()}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                                <span className={`text-[13px] sm:text-[14px] font-medium truncate ${theme === 'dark' ? 'text-gray-300' : 'text-slate-700'}`}>
                                                    {t('allDrivers') || 'Barcha Haydovchilar'}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                    <svg className={`w-4 h-4 flex-shrink-0 transition-transform duration-300 ${driverModalOpen ? 'transform rotate-180 text-teal-600' : theme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                <DriverFilterModal
                                    isOpen={driverModalOpen}
                                    onClose={() => setDriverModalOpen(false)}
                                    selectedDriverId={driverId}
                                    onSelect={(val) => setDriverId(val)}
                                    drivers={activeDriversWithCars}
                                    cars={cars}
                                    theme={theme}
                                    allLabel={t('allDrivers') || 'Barcha Haydovchilar'}
                                    searchPlaceholder={t('search') || 'Qidirish...'}
                                />
                            </>
                        );
                    })()}
                </div>
            </div>

            {/* Driver Monthly Plan Summary */}
            <DriverPlanSummary
                drivers={drivers}
                cars={cars}
                transactions={transactions}
                startDate={startDate}
                endDate={endDate}
                filterDriverId={driverId}
                theme={theme}
                onDayClick={onDayClick}
            />
        </div>
    );
};
