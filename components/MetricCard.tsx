import React from 'react';
import { useTranslation } from 'react-i18next';
import NumberTooltip from './NumberTooltip';
import { formatNumberSmart } from '../utils/formatNumber';

interface MetricCardProps {
    title: string;
    value: number;
    type: 'income' | 'expense' | 'profit';
    icon: React.ElementType;
    isDark: boolean;
    showPlusSign?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, type, icon: Icon, isDark, showPlusSign }) => {
    const { i18n } = useTranslation();
    const language = ['uz', 'ru', 'en'].includes(i18n.language) ? i18n.language : 'uz';
    const config = {
        income: {
            titleColor: isDark ? 'text-blue-500' : 'text-blue-600',
            orbColor: 'bg-blue-400',
            iconColor: isDark ? 'text-blue-500' : 'text-blue-600'
        },
        expense: {
            titleColor: isDark ? 'text-rose-500' : 'text-rose-600',
            orbColor: 'bg-rose-400',
            iconColor: isDark ? 'text-rose-500' : 'text-rose-600'
        },
        profit: {
            titleColor: isDark ? 'text-emerald-500' : 'text-emerald-600',
            orbColor: 'bg-emerald-400',
            iconColor: isDark ? 'text-emerald-500' : 'text-emerald-600'
        }
    }[type];

    const compactValue = formatNumberSmart(Math.abs(value), false, language).replace(' UZS', '');
    const displayValue = `${showPlusSign && value > 0 ? '+' : value < 0 ? '-' : ''}${compactValue}`;

    return (
        <div className={`relative overflow-visible isolate rounded-3xl p-6 flex flex-col justify-between min-h-[140px] hover:-translate-y-1 transition-all duration-300 ease-out ${
            isDark 
                ? 'bg-[#141519] border border-white/5 hover:shadow-2xl hover:shadow-black/50' 
                : 'bg-white border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] hover:shadow-lg'
        }`}>
            {/* Header Row */}
            <div className="flex items-center justify-between relative z-10">
                <p className={`text-[13px] font-semibold tracking-wide uppercase ${config.titleColor}`}>
                    {title}
                </p>
                <Icon className={`w-5 h-5 opacity-70 ${config.iconColor}`} />
            </div>

            {/* Value (Hero) */}
            <div className="mt-4 relative z-10 min-w-0">
                <NumberTooltip value={value} label={title} theme={isDark ? 'dark' : 'light'} align="left" showSign={!!showPlusSign}>
                    <h3 className={`inline-flex max-w-full items-baseline gap-2 whitespace-nowrap font-black tracking-tight tabular-nums ${isDark ? 'text-white' : 'text-slate-800'}`}>
                        <span className="min-w-0 text-[clamp(28px,2.8vw,42px)] leading-none">
                            {displayValue}
                        </span>
                        <span className="shrink-0 text-[15px] font-bold text-slate-400">UZS</span>
                    </h3>
                </NumberTooltip>
            </div>

            {/* Whimsical Glow Orb */}
            {isDark && (
                <div className={`absolute -bottom-6 -right-6 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none ${config.orbColor}`} />
            )}
        </div>
    );
};
