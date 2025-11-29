import React, { useState } from 'react';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons';

interface DatePickerProps {
    label: string;
    value: Date;
    onChange: (date: Date) => void;
    theme: 'light' | 'dark';
}

const DatePicker: React.FC<DatePickerProps> = ({ label, value, onChange, theme }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date(value.getFullYear(), value.getMonth(), 1));

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthNamesFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = (firstDay.getDay() + 6) % 7; // Adjust to Monday start

        const days: (number | null)[] = [];

        // Add empty slots for days before month starts
        for (let i = 0; i < startingDayOfWeek; i++) {
            const prevMonthDay = new Date(year, month, 0 - (startingDayOfWeek - i - 1));
            days.push(-prevMonthDay.getDate()); // Negative for prev month
        }

        // Add days of current month
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i);
        }

        // Add empty slots to complete the grid
        const remainingDays = 7 - (days.length % 7);
        if (remainingDays < 7) {
            for (let i = 1; i <= remainingDays; i++) {
                days.push(-(100 + i)); // Negative for next month
            }
        }

        return days;
    };

    const formatDate = (date: Date) => {
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const handleDayClick = (day: number) => {
        if (day > 0) {
            const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            onChange(newDate);
            setIsOpen(false);
        }
    };

    const handlePrevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const isToday = (day: number) => {
        const today = new Date();
        return day > 0 &&
            day === today.getDate() &&
            currentMonth.getMonth() === today.getMonth() &&
            currentMonth.getFullYear() === today.getFullYear();
    };

    const isSelected = (day: number) => {
        return day > 0 &&
            day === value.getDate() &&
            currentMonth.getMonth() === value.getMonth() &&
            currentMonth.getFullYear() === value.getFullYear();
    };

    const days = getDaysInMonth(currentMonth);

    return (
        <div className="relative w-full">
            {/* Label */}
            <div className={`flex items-center gap-2 mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                <CalendarIcon className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
            </div>

            {/* Date Display */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-4 py-3 rounded-xl border text-left transition-all ${theme === 'dark'
                    ? 'bg-gray-800/50 border-gray-700 hover:border-gray-600 text-white'
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300 text-gray-900'
                    }`}
            >
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{formatDate(value)}</span>
                    <CalendarIcon className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                </div>
            </button>

            {/* Calendar Dropdown */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

                    {/* Calendar */}
                    <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-3 rounded-xl border shadow-xl z-50 ${theme === 'dark'
                        ? 'bg-[#1F2937] border-gray-700'
                        : 'bg-white border-gray-200'
                        }`}>
                        {/* Month/Year Header */}
                        <div className="flex items-center justify-between mb-2">
                            <h3 className={`text-xs font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {monthNamesFull[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                            </h3>
                            <div className="flex gap-1">
                                <button
                                    type="button"
                                    onClick={handlePrevMonth}
                                    className={`p-1 rounded-lg transition-colors ${theme === 'dark'
                                        ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                                        : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
                                        }`}
                                >
                                    <ChevronLeftIcon className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleNextMonth}
                                    className={`p-1 rounded-lg transition-colors ${theme === 'dark'
                                        ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                                        : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
                                        }`}
                                >
                                    <ChevronRightIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Day Names */}
                        <div className="grid grid-cols-7 gap-1 mb-1">
                            {dayNames.map(day => (
                                <div
                                    key={day}
                                    className={`text-center text-[10px] font-bold py-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                                        }`}
                                >
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-1">
                            {days.map((day, index) => {
                                const isCurrentMonth = day > 0;
                                const actualDay = Math.abs(day);

                                return (
                                    <button
                                        type="button"
                                        key={index}
                                        onClick={() => handleDayClick(day)}
                                        disabled={!isCurrentMonth}
                                        className={`h-7 w-7 flex items-center justify-center text-[10px] rounded-md transition-all mx-auto ${isSelected(day)
                                            ? 'bg-[#2D6A76] text-white font-bold shadow-sm'
                                            : isToday(day)
                                                ? theme === 'dark'
                                                    ? 'bg-blue-500/20 text-blue-400 font-bold'
                                                    : 'bg-blue-50 text-blue-600 font-bold'
                                                : isCurrentMonth
                                                    ? theme === 'dark'
                                                        ? 'text-white hover:bg-gray-700'
                                                        : 'text-gray-900 hover:bg-gray-100'
                                                    : theme === 'dark'
                                                        ? 'text-gray-600'
                                                        : 'text-gray-300'
                                            } ${!isCurrentMonth ? 'cursor-default' : 'cursor-pointer'}`}
                                    >
                                        {actualDay > 100 ? actualDay - 100 : actualDay}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default DatePicker;
