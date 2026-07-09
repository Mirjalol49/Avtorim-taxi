import React from 'react';
import { useTranslation } from 'react-i18next';
import { TimeFilter, Language } from '../types';

interface DateFilterProps {
    currentFilter: TimeFilter;
    onFilterChange: (filter: TimeFilter) => void;
    theme: 'light' | 'dark';
    labels: {
        today: string;
        week: string;
        month: string;
        year: string;
        all?: string;
    };
}

const MONTHS_UZ = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];
const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getMonthName(date: Date, lang: Language): string {
    const i = date.getMonth();
    if (lang === 'ru') return MONTHS_RU[i];
    if (lang === 'en') return MONTHS_EN[i];
    return MONTHS_UZ[i];
}

function getDateLabel(filter: TimeFilter, lang: Language): string {
    const now = new Date();
    switch (filter) {
        case 'today':
            return `${now.getDate()} ${getMonthName(now, lang)}`;
        case 'week': {
            const start = new Date(now);
            start.setDate(now.getDate() - now.getDay());
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            if (start.getMonth() === end.getMonth()) {
                return `${start.getDate()}–${end.getDate()} ${getMonthName(end, lang)}`;
            }
            return `${start.getDate()} ${getMonthName(start, lang).slice(0, 3)} – ${end.getDate()} ${getMonthName(end, lang).slice(0, 3)}`;
        }
        case 'month':
            return `${getMonthName(now, lang)} ${now.getFullYear()}`;
        case 'year':
            return now.getFullYear().toString();
        case 'all':
            return lang === 'ru' ? 'Все время' : lang === 'en' ? 'All time' : 'Barcha vaqt';
        default:
            return '';
    }
}

const CalendarIcon = () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2.5" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

const DateFilter: React.FC<DateFilterProps> = ({
    currentFilter,
    onFilterChange,
    theme,
}) => {
    const { i18n, t } = useTranslation();
    const lang = i18n.language as Language;
    const isDark = theme === 'dark';

    const filters: { key: TimeFilter; label: string }[] = [
        { key: 'today',  label: t('today') },
        { key: 'week',   label: t('week') },
        { key: 'month',  label: t('month') },
        { key: 'year',   label: t('year') },
        { key: 'all',    label: t('allTime') || 'All' },
    ];

    const periodLabel = getDateLabel(currentFilter, lang);

    return (
        <div className="flex items-center justify-between gap-4">
            {/* ── Pill chips ── */}
            <div className="flex items-center gap-1.5 overflow-x-auto flex-1 min-w-0"
                style={{ scrollbarWidth: 'none' }}>
                {filters.map(({ key, label }) => {
                    const isActive = currentFilter === key;
                    return (
                        <button
                            key={key}
                            onClick={() => onFilterChange(key)}
                            className={`
                                flex-shrink-0 px-3.5 py-1.5 rounded-full
                                text-[13px] font-medium
                                transition-all duration-200
                                border
                                ${isActive
                                    ? 'bg-[#0f766e] border-[#0f766e] text-white'
                                    : isDark
                                        ? 'bg-transparent border-white/[0.13] text-[rgba(235,235,245,0.5)] hover:border-white/[0.28] hover:text-[rgba(235,235,245,0.85)]'
                                        : 'bg-transparent border-black/[0.10] text-[rgba(60,60,67,0.5)] hover:border-black/[0.22] hover:text-black'
                                }
                            `}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>

            {/* ── Selected period badge ── */}
            <div className={`
                flex-shrink-0 flex items-center gap-1.5
                px-2.5 py-1.5 rounded-xl
                text-[12px] font-medium
                whitespace-nowrap
                ${isDark
                    ? 'bg-white/[0.06] text-[rgba(235,235,245,0.5)]'
                    : 'bg-black/[0.04] text-[rgba(60,60,67,0.48)]'
                }
            `}>
                <CalendarIcon />
                <span>{periodLabel}</span>
            </div>
        </div>
    );
};

export default DateFilter;
