import React, { useMemo } from 'react';
import { TimeFilter, Language } from '../types';

interface DateFilterProps {
    currentFilter: TimeFilter;
    onFilterChange: (filter: TimeFilter) => void;
    language: Language;
    theme: 'light' | 'dark';
    labels: {
        today: string;
        week: string;
        month: string;
        year: string;
    };
}

const DateFilter: React.FC<DateFilterProps> = ({
    currentFilter,
    onFilterChange,
    language,
    theme,
    labels
}) => {
    const getDateLabel = (filter: TimeFilter, lang: Language): string => {
        const now = new Date();
        const locale = lang === 'uz' ? 'uz-UZ' : lang === 'ru' ? 'ru-RU' : 'en-US';

        // Helper for month names if Intl is not sufficient or for specific formatting
        const getMonthName = (date: Date) => {
            return date.toLocaleString(locale, { month: 'long' });
        };

        switch (filter) {
            case 'today':
                return `${now.getDate()} ${getMonthName(now)}`;
            case 'week': {
                const start = new Date(now);
                start.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
                const end = new Date(start);
                end.setDate(start.getDate() + 6); // End of week (Saturday)

                // If same month
                if (start.getMonth() === end.getMonth()) {
                    return `${start.getDate()} - ${end.getDate()} ${getMonthName(end)}`;
                }
                // Different months
                return `${start.getDate()} ${getMonthName(start).slice(0, 3)} - ${end.getDate()} ${getMonthName(end).slice(0, 3)}`;
            }
            case 'month':
                return getMonthName(now);
            case 'year':
                return now.getFullYear().toString();
            default:
                return '';
        }
    };

    const filters: TimeFilter[] = ['today', 'week', 'month', 'year'];

    return (
        <div className={`flex items-center p-1 rounded-xl w-full overflow-x-auto border backdrop-blur-sm ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'
            }`}>
            {filters.map((f) => (
                <button
                    key={f}
                    onClick={() => onFilterChange(f)}
                    className={`flex flex-col items-center justify-center px-2.5 sm:px-4 py-2 rounded-lg transition-all duration-200 flex-shrink-0 ${currentFilter === f
                            ? 'bg-[#2D6A76] text-white shadow-md transform scale-[1.02]'
                            : theme === 'dark'
                                ? 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                >
                    <span className={`text-xs sm:text-sm font-bold leading-tight whitespace-nowrap ${currentFilter === f ? 'text-white' : ''}`}>
                        {labels[f]}
                    </span>
                    <span className={`text-[9px] sm:text-[10px] font-medium mt-0.5 whitespace-nowrap ${currentFilter === f ? 'text-teal-100/80' : 'opacity-60'
                        }`}>
                        {getDateLabel(f, language)}
                    </span>
                </button>
            ))}
        </div>
    );
};

export default DateFilter;
