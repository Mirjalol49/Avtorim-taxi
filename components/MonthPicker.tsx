import React, { useState } from 'react';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons';

interface MonthPickerProps {
    label: string;
    value: Date;
    onChange: (date: Date) => void;
    theme: 'light' | 'dark';
    labelClassName?: string;
}

const MonthPicker: React.FC<MonthPickerProps> = ({ label, value, onChange, theme, labelClassName }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentYear, setCurrentYear] = useState(value.getFullYear());

    const monthNamesFull = [
        'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 
        'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
    ];

    const formatMonthYear = (date: Date) => {
        const month = monthNamesFull[date.getMonth()];
        const year = date.getFullYear();
        return `${month} ${year}`;
    };

    const handleMonthClick = (monthIndex: number) => {
        const newDate = new Date(currentYear, monthIndex, 1);
        onChange(newDate);
        setIsOpen(false);
    };

    const handlePrevYear = () => {
        setCurrentYear(prev => prev - 1);
    };

    const handleNextYear = () => {
        setCurrentYear(prev => prev + 1);
    };

    const isCurrentMonth = (monthIndex: number) => {
        const today = new Date();
        return monthIndex === today.getMonth() && currentYear === today.getFullYear();
    };

    const isSelected = (monthIndex: number) => {
        return monthIndex === value.getMonth() && currentYear === value.getFullYear();
    };

    return (
        <div className="relative w-full">
            {/* Label */}
            <div className={`flex items-center gap-2 mb-3 ${labelClassName || (theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}`}>
                <CalendarIcon className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
            </div>

            {/* Date Display */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-4 py-3 rounded-xl border text-left transition-all ${theme === 'dark'
                    ? 'bg-[#111111]/50 border-white/[0.08] hover:border-white/[0.12] text-white'
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300 text-gray-900'
                    }`}
            >
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{formatMonthYear(value)}</span>
                    <CalendarIcon className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                </div>
            </button>

            {/* Calendar Dropdown */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

                    {/* Month Grid */}
                    <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-3 rounded-xl border shadow-xl z-50 ${theme === 'dark'
                        ? 'bg-[#181818] border-white/[0.08]'
                        : 'bg-white border-gray-200'
                        }`}>
                        {/* Year Header */}
                        <div className="flex items-center justify-between mb-4">
                            <button
                                type="button"
                                onClick={handlePrevYear}
                                className={`p-1 rounded-lg transition-colors ${theme === 'dark'
                                    ? 'hover:bg-white/[0.06] text-gray-400 hover:text-white'
                                    : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
                                    }`}
                            >
                                <ChevronLeftIcon className="w-5 h-5" />
                            </button>
                            <h3 className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {currentYear}
                            </h3>
                            <button
                                type="button"
                                onClick={handleNextYear}
                                className={`p-1 rounded-lg transition-colors ${theme === 'dark'
                                    ? 'hover:bg-white/[0.06] text-gray-400 hover:text-white'
                                    : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
                                    }`}
                            >
                                <ChevronRightIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Months Grid */}
                        <div className="grid grid-cols-3 gap-2">
                            {monthNamesFull.map((month, index) => (
                                <button
                                    type="button"
                                    key={month}
                                    onClick={() => handleMonthClick(index)}
                                    className={`py-2 px-1 text-xs rounded-lg transition-all text-center ${isSelected(index)
                                        ? 'bg-[#0f766e] text-white font-bold shadow-sm'
                                        : isCurrentMonth(index)
                                            ? theme === 'dark'
                                                ? 'bg-blue-500/20 text-blue-400 font-bold'
                                                : 'bg-blue-50 text-blue-600 font-bold'
                                            : theme === 'dark'
                                                ? 'text-gray-300 hover:bg-white/[0.06] hover:text-white'
                                                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                                        }`}
                                >
                                    {month.substring(0, 3)}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default MonthPicker;
