import React from 'react';

interface MetricCardProps {
    title: string;
    value: number;
    type: 'income' | 'expense' | 'profit';
    icon: React.ElementType;
    isDark: boolean;
    showPlusSign?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, type, icon: Icon, isDark, showPlusSign }) => {
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

    const formattedValue = value.toLocaleString();
    const displayValue = showPlusSign && value > 0 ? `+${formattedValue}` : formattedValue;

    return (
        <div className={`relative overflow-hidden isolate rounded-3xl p-6 flex flex-col justify-between min-h-[140px] hover:-translate-y-1 transition-all duration-300 ease-out ${
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
            <div className="mt-4 relative z-10">
                <h3 className={`text-4xl font-bold tracking-tight break-words ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    {displayValue}
                    <span className="text-base font-medium text-slate-400 ml-1.5">UZS</span>
                </h3>
            </div>

            {/* Whimsical Glow Orb */}
            {isDark && (
                <div className={`absolute -bottom-6 -right-6 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none ${config.orbColor}`} />
            )}
        </div>
    );
};
