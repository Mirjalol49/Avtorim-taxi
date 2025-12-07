import React, { useState } from 'react';
import { formatNumberFull } from '../utils/formatNumber';
import { useTranslation } from 'react-i18next';

interface NumberTooltipProps {
    value: number;
    label?: string;
    children: React.ReactNode;
    theme: 'light' | 'dark';
    // language removed
}

const NumberTooltip: React.FC<NumberTooltipProps> = ({ value, label, children, theme }) => {
    const [isHovered, setIsHovered] = useState(false);
    // useTranslation hook if needed for currency, currently hardcoded UZS
    // const { t } = useTranslation();

    return (
        <div
            className="relative inline-block"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {children}

            {isHovered && (
                <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap z-50 pointer-events-none animate-in fade-in duration-150 ${theme === 'dark'
                    ? 'bg-gray-900 text-white border border-gray-700'
                    : 'bg-white text-gray-900 border border-gray-200 shadow-lg'
                    }`}>
                    {label && <div className="text-[10px] uppercase tracking-wide opacity-70 mb-0.5">{label}</div>}
                    <div className="font-bold font-mono">{formatNumberFull(value)} <span className="ml-1">UZS</span></div>

                    {/* Arrow */}
                    <div className={`absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent ${theme === 'dark' ? 'border-t-gray-900' : 'border-t-white'
                        }`} />
                </div>
            )}
        </div>
    );
};

export default NumberTooltip;
