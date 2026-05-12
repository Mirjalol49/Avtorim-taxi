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

    const nonDeletedDrivers = drivers.filter(d => !d.isDeleted);

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header Filters */}
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 p-5 rounded-2xl border ${theme === 'dark' ? 'bg-surface border-white/[0.08]' : 'bg-white border-gray-200'}`}>
                <MonthPicker
                    label={t('selectMonth') || 'Oyni tanlang'}
                    value={selectedDate}
                    onChange={(date) => setSelectedDate(date)}
                    theme={theme}
                    labelClassName="text-white"
                />
                {/* Driver Filter via Modal */}
                <div className="w-full relative">
                    {(() => {
                        const selectedDriver = driverId && driverId !== 'all'
                            ? nonDeletedDrivers.find(d => d.id === driverId)
                            : null;
                        const selectedCar = selectedDriver
                            ? cars.find(c => c.assignedDriverId === selectedDriver.id)
                            : null;
                        return (
                            <>
                                <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 ml-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                                    {t('driver') || 'Haydovchi'}
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setDriverModalOpen(true)}
                                    className={`w-full h-[52px] px-4 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                                        driverModalOpen
                                            ? theme === 'dark'
                                                ? 'bg-surface-2 border-teal-500 ring-1 ring-teal-500/40'
                                                : 'bg-white border-teal-500 ring-1 ring-teal-500/20'
                                            : theme === 'dark'
                                                ? 'bg-[#1e2532] border-white/[0.08] hover:border-white/[0.12]'
                                                : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    {selectedDriver ? (
                                        <>
                                            <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0 border border-gray-600">
                                                {selectedDriver.avatar
                                                    ? <img src={selectedDriver.avatar} alt="" className="w-full h-full object-cover" />
                                                    : <div className={`w-full h-full flex items-center justify-center text-xs font-bold ${theme === 'dark' ? 'bg-surface-2 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>{selectedDriver.name.charAt(0)}</div>
                                                }
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className={`text-sm font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{selectedDriver.name}</div>
                                                {selectedCar && <div className={`text-[10px] truncate ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{selectedCar.name}</div>}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <UsersIcon className={`w-5 h-5 flex-shrink-0 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                                            <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{t('allDrivers')}</span>
                                        </>
                                    )}
                                    <svg className={`w-4 h-4 ml-auto flex-shrink-0 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                <DriverFilterModal
                                    isOpen={driverModalOpen}
                                    onClose={() => setDriverModalOpen(false)}
                                    selectedDriverId={driverId}
                                    onSelect={(val) => setDriverId(val)}
                                    drivers={nonDeletedDrivers}
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
