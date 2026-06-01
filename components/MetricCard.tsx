import React from 'react';
import { useTranslation } from 'react-i18next';
import NumberTooltip from './NumberTooltip';
import { formatNumberSmart } from '../utils/formatNumber';
import { PremiumCard } from '../src/components/ui/PremiumCard';
import { useBoop } from '../src/core/hooks/useBoop';
import { animated } from 'react-spring';

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
            titleColor: isDark ? 'text-teal-400' : 'text-teal-600',
            orbColor: 'bg-teal-400',
            iconColor: isDark ? 'text-teal-400' : 'text-teal-600'
        },
        expense: {
            titleColor: isDark ? 'text-rose-400' : 'text-rose-600',
            orbColor: 'bg-rose-400',
            iconColor: isDark ? 'text-rose-400' : 'text-rose-600'
        },
        profit: {
            titleColor: isDark ? 'text-emerald-400' : 'text-emerald-600',
            orbColor: 'bg-emerald-400',
            iconColor: isDark ? 'text-emerald-400' : 'text-emerald-600'
        }
    }[type];

    const compactValue = formatNumberSmart(Math.abs(value), false, language).replace(' UZS', '');
    const displayValue = `${showPlusSign && value > 0 ? '+' : value < 0 ? '-' : ''}${compactValue}`;

    const [boopStyle, triggerBoop] = useBoop({ y: -4, scale: 1.1, rotation: type === 'profit' ? 10 : 0 });

    return (
        <PremiumCard 
            isDark={isDark} 
            interactive={true} 
            padding="p-6"
            className="flex flex-col justify-between min-h-[140px]"
            onMouseEnter={triggerBoop}
        >
            {/* Header Row */}
            <div className="flex items-center justify-between relative z-10">
                <p className={`text-[13px] font-bold tracking-wide uppercase ${config.titleColor}`}>
                    {title}
                </p>
                <animated.div style={boopStyle}>
                    <Icon className={`w-5 h-5 opacity-80 ${config.iconColor}`} />
                </animated.div>
            </div>

            {/* Value (Hero) */}
            <div className="mt-4 relative z-10 min-w-0">
                <NumberTooltip value={value} label={title} theme={isDark ? 'dark' : 'light'} align="left" showSign={!!showPlusSign}>
                    <h3 className={`inline-flex max-w-full items-baseline gap-2 whitespace-nowrap font-black tracking-tight tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        <span className="min-w-0 text-[clamp(28px,2.8vw,42px)] leading-none">
                            {displayValue}
                        </span>
                        <span className={`shrink-0 text-[15px] font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>UZS</span>
                    </h3>
                </NumberTooltip>
            </div>

            {/* Whimsical Glow Orb */}
            {isDark && (
                <div className={`absolute -bottom-8 -right-8 w-40 h-40 rounded-full blur-[40px] opacity-[0.15] pointer-events-none transition-all duration-500 group-hover:scale-110 ${config.orbColor}`} />
            )}
        </PremiumCard>
    );
};
