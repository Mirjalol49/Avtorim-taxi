import React, { useState } from 'react';

interface NumberTooltipProps {
    value: number;
    /** Optional label shown above the number */
    label?: string;
    /** 'center' (default) | 'right' | 'left' — align tooltip relative to trigger */
    align?: 'center' | 'right' | 'left';
    children: React.ReactNode;
    theme: 'light' | 'dark';
}

const NumberTooltip: React.FC<NumberTooltipProps> = ({
    value, label, align = 'center', children, theme,
}) => {
    const [visible, setVisible] = useState(false);

    const isDark = theme === 'dark';
    const sign   = value >= 0 ? '+' : '−';
    const abs    = Math.abs(value);

    // Full exact number with space thousands separator
    const exact = abs.toLocaleString('uz-UZ');

    const posX =
        align === 'right'  ? 'right-0'
        : align === 'left' ? 'left-0'
        : 'left-1/2 -translate-x-1/2';

    const arrowRight = align === 'right' ? '14px' : undefined;
    const arrowLeft  = align === 'left'  ? '14px' : align === 'center' ? '50%' : undefined;
    const arrowXform = align === 'center' ? 'translateX(-50%)' : undefined;

    return (
        <div
            className="relative inline-flex justify-end"
            onMouseEnter={() => setVisible(true)}
            onMouseLeave={() => setVisible(false)}
            onFocus={() => setVisible(true)}
            onBlur={() => setVisible(false)}
        >
            {children}

            {visible && (
                <div
                    role="tooltip"
                    className={`absolute bottom-full mb-2.5 z-50 pointer-events-none ${posX}`}
                    style={{ animation: 'ttIn 120ms ease-out both' }}
                >
                    <div className={`px-3.5 py-2.5 rounded-xl border shadow-xl text-right min-w-[148px] ${
                        isDark
                            ? 'bg-[#0f1929] border-white/[0.10] text-white'
                            : 'bg-white border-gray-200/80 text-gray-900'
                    }`} style={{ boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.6)' : '0 8px 32px rgba(0,0,0,0.12)' }}>
                        {label && (
                            <p className={`text-[9px] font-bold uppercase tracking-widest mb-1.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                {label}
                            </p>
                        )}
                        <p className={`text-sm font-black font-mono tabular-nums tracking-tight ${
                            value >= 0
                                ? isDark ? 'text-teal-300' : 'text-teal-700'
                                : isDark ? 'text-red-400'  : 'text-red-600'
                        }`}>
                            {sign}{exact}
                            <span className={`ml-1.5 text-[10px] font-bold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>UZS</span>
                        </p>
                    </div>

                    {/* Arrow */}
                    <div className="absolute w-0 h-0" style={{
                        top: '100%',
                        right: arrowRight,
                        left: arrowLeft,
                        transform: arrowXform,
                        borderLeft: '5px solid transparent',
                        borderRight: '5px solid transparent',
                        borderTop: `5px solid ${isDark ? '#0f1929' : 'white'}`,
                    }} />
                    <div className="absolute w-0 h-0" style={{
                        top: 'calc(100% + 1px)',
                        right: arrowRight ? `calc(${arrowRight} - 1px)` : undefined,
                        left: arrowLeft,
                        transform: arrowXform,
                        borderLeft: '6px solid transparent',
                        borderRight: '6px solid transparent',
                        borderTop: `6px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
                        zIndex: -1,
                    }} />
                </div>
            )}

            <style>{`
                @keyframes ttIn {
                    from { opacity:0; transform: translateY(5px); }
                    to   { opacity:1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default NumberTooltip;
