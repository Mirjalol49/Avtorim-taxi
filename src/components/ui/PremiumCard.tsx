import React from 'react';

interface PremiumCardProps extends React.HTMLAttributes<HTMLDivElement> {
    isDark: boolean;
    children: React.ReactNode;
    hoverLift?: boolean;
    interactive?: boolean;
    padding?: string;
    className?: string;
}

/**
 * A highly polished, Apple-inspired card container.
 * Features:
 * - Subtle, diffused shadows
 * - Smooth spring-based hover lift (if hoverLift is true)
 * - Tactile active scale down (if interactive is true)
 * - Perfect border radiuses and isolated backgrounds
 */
export const PremiumCard: React.FC<PremiumCardProps> = ({
    isDark,
    children,
    hoverLift = true,
    interactive = false,
    padding = 'p-5 sm:p-6',
    className = '',
    ...props
}) => {
    return (
        <div
            className={`
                relative rounded-2xl sm:rounded-3xl border overflow-hidden
                transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)]
                ${isDark 
                    ? 'bg-surface border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.2)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)]' 
                    : 'bg-white border-black/[0.06] shadow-[0_4px_20px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_30px_rgba(15,23,42,0.08)]'
                }
                ${hoverLift ? 'hover:-translate-y-[2px]' : ''}
                ${interactive ? 'cursor-pointer active:scale-[0.985]' : ''}
                ${padding}
                ${className}
            `}
            style={{ isolation: 'isolate' }}
            {...props}
        >
            {/* Optional inner subtle glow layer for extreme premium feel on dark mode */}
            {isDark && (
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
            )}
            
            {/* Content must be relative to stay above the absolute background layers if any */}
            <div className="relative z-10 w-full h-full">
                {children}
            </div>
        </div>
    );
};
