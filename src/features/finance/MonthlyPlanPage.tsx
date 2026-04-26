import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Transaction, Driver } from '../../core/types';
import { Car } from '../../core/types/car.types';
import MonthPicker from '../../../components/MonthPicker';
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

    const startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

    const nonDeletedDrivers = drivers.filter(d => !d.isDeleted);

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header Filters */}
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 p-5 rounded-2xl border ${theme === 'dark' ? 'bg-[#1C1C1E] border-white/[0.08]' : 'bg-white border-gray-200'}`}>
                <MonthPicker
                    label={t('selectMonth') || 'Oyni tanlang'}
                    value={selectedDate}
                    onChange={(date) => setSelectedDate(date)}
                    theme={theme}
                    labelClassName="text-white"
                />
                <CustomSelect
                    label={t('driver') || 'Haydovchi'}
                    value={driverId}
                    onChange={(val) => setDriverId(val)}
                    options={[
                        { id: 'all', name: t('allDrivers') || 'Barcha Haydovchilar' },
                        ...nonDeletedDrivers.map(d => ({ id: d.id, name: d.name }))
                    ]}
                    theme={theme}
                    showSearch={true}
                    icon={UsersIcon}
                    labelClassName="text-white"
                />
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
