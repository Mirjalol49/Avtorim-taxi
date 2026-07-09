import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface NumberTooltipProps {
    value: number;
    /** Optional label shown above the number */
    label?: string;
    /** 'center' (default) | 'right' | 'left' — align tooltip relative to trigger */
    align?: 'center' | 'right' | 'left';
    showSign?: boolean;
    children: React.ReactNode;
    theme: 'light' | 'dark';
}

const NumberTooltip: React.FC<NumberTooltipProps> = ({
    value, label, align = 'center', showSign = true, children, theme,
}) => {
    const [visible, setVisible] = useState(false);
    const [position, setPosition] = useState<{ left: number; top: number; arrowLeft: number } | null>(null);
    const triggerRef = useRef<HTMLDivElement | null>(null);
    const showTimer = useRef<number | null>(null);

    const isDark = theme === 'dark';
    const sign   = value >= 0 ? '+' : '−';
    const abs    = Math.abs(value);

    // Full exact number with space thousands separator
    const exact = abs.toLocaleString('uz-UZ');

    useEffect(() => () => {
        if (showTimer.current) window.clearTimeout(showTimer.current);
    }, []);

    const updatePosition = () => {
        const node = triggerRef.current;
        if (!node || typeof window === 'undefined') return;

        const rect = node.getBoundingClientRect();
        const tooltipWidth = 190;
        const viewportPadding = 12;
        const anchorX =
            align === 'right' ? rect.right - 18
            : align === 'left' ? rect.left + 18
            : rect.left + rect.width / 2;

        const preferredLeft =
            align === 'right' ? rect.right - tooltipWidth
            : align === 'left' ? rect.left
            : rect.left + rect.width / 2 - tooltipWidth / 2;

        const maxLeft = Math.max(viewportPadding, window.innerWidth - tooltipWidth - viewportPadding);
        const left = Math.min(Math.max(preferredLeft, viewportPadding), maxLeft);
        const arrowLeft = Math.min(Math.max(anchorX - left, 16), tooltipWidth - 16);

        setPosition({
            left,
            top: Math.max(rect.top - 10, viewportPadding),
            arrowLeft,
        });
    };

    useEffect(() => {
        if (!visible) return undefined;

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [visible, align]);

    const showTooltip = () => {
        if (showTimer.current) window.clearTimeout(showTimer.current);
        showTimer.current = window.setTimeout(() => {
            updatePosition();
            setVisible(true);
        }, 220);
    };

    const hideTooltip = () => {
        if (showTimer.current) window.clearTimeout(showTimer.current);
        showTimer.current = null;
        setVisible(false);
    };

    return (
        <div
            ref={triggerRef}
            className="relative inline-flex justify-end"
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
            onFocus={showTooltip}
            onBlur={hideTooltip}
        >
            {children}

            {visible && position && typeof document !== 'undefined' && createPortal((
                <div
                    role="tooltip"
                    className="pointer-events-none fixed z-[9999]"
                    style={{
                        left: position.left,
                        top: position.top,
                        transform: 'translateY(-100%)',
                    }}
                >
                    <div className={`px-4 py-3 rounded-2xl border shadow-xl text-left min-w-[190px] whitespace-nowrap ${
                        isDark
                            ? 'bg-[#0f1929] border-white/[0.12] text-white'
                            : 'bg-white border-gray-200/90 text-gray-900'
                    }`} style={{
                        animation: 'ttIn 100ms ease-out both',
                        boxShadow: isDark ? '0 16px 40px rgba(0,0,0,0.55)' : '0 18px 40px rgba(15,23,42,0.14)',
                    }}>
                        {label && (
                            <p className={`text-[9px] font-black uppercase tracking-[0.18em] mb-1.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                {label}
                            </p>
                        )}
                        <p className={`inline-flex items-baseline gap-1.5 text-[15px] font-black font-mono tabular-nums tracking-tight ${
                            value >= 0
                                ? isDark ? 'text-teal-300' : 'text-teal-700'
                                : isDark ? 'text-red-400'  : 'text-red-600'
                        }`}>
                            <span>{showSign ? sign : value < 0 ? '−' : ''}{exact}</span>
                            <span className={`text-[10px] font-black tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>UZS</span>
                        </p>
                    </div>

                    {/* Arrow */}
                    <div className="absolute w-0 h-0" style={{
                        top: '100%',
                        left: position.arrowLeft,
                        transform: 'translateX(-50%)',
                        borderLeft: '5px solid transparent',
                        borderRight: '5px solid transparent',
                        borderTop: `5px solid ${isDark ? '#0f1929' : 'white'}`,
                    }} />
                    <div className="absolute w-0 h-0" style={{
                        top: 'calc(100% + 1px)',
                        left: position.arrowLeft,
                        transform: 'translateX(-50%)',
                        borderLeft: '6px solid transparent',
                        borderRight: '6px solid transparent',
                        borderTop: `6px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'}`,
                        zIndex: -1,
                    }} />
                </div>
            ), document.body)}

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
