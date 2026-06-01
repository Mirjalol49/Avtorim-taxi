import React from 'react';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    isDark?: boolean;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    children: React.ReactNode;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
    isDark = false,
    variant = 'secondary',
    size = 'md',
    children,
    className = '',
    ...props
}) => {
    
    // Base classes for tactile feedback and smooth iOS transition
    const baseClasses = `
        relative inline-flex items-center justify-center gap-2 font-semibold tracking-wide 
        transition-all duration-[300ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]
        active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none overflow-hidden
    `;
    
    // Size variants
    const sizeMap = {
        sm: 'px-3 py-1.5 text-[13px] rounded-lg',
        md: 'px-4 py-2 text-[14px] rounded-xl',
        lg: 'px-6 py-3 text-[15px] rounded-2xl',
        icon: 'p-2 rounded-xl',
    };
    
    // Theme and variant colors with deep glassmorphism
    const variantMap = {
        primary: isDark 
            ? 'bg-[#008378]/90 text-white shadow-[0_4px_12px_rgba(0,131,120,0.3)] hover:bg-[#008378] hover:shadow-[0_6px_16px_rgba(0,131,120,0.4)] border border-[#008378]/20'
            : 'bg-[#0f766e]/90 text-white shadow-[0_4px_12px_rgba(15,118,110,0.25)] hover:bg-[#0f766e] hover:shadow-[0_6px_16px_rgba(15,118,110,0.35)] border border-[#0f766e]/20',
        secondary: isDark
            ? 'bg-white/[0.08] text-[rgba(235,235,245,0.8)] hover:bg-white/[0.12] hover:text-white border border-white/[0.05] backdrop-blur-xl'
            : 'bg-black/[0.04] text-[rgba(60,60,67,0.8)] hover:bg-black/[0.08] hover:text-black border border-black/[0.04] backdrop-blur-xl',
        danger: isDark
            ? 'bg-rose-500/90 text-white shadow-[0_4px_12px_rgba(244,63,94,0.3)] hover:bg-rose-500 hover:shadow-[0_6px_16px_rgba(244,63,94,0.4)] border border-rose-500/20'
            : 'bg-rose-600/90 text-white shadow-[0_4px_12px_rgba(225,29,72,0.25)] hover:bg-rose-600 hover:shadow-[0_6px_16px_rgba(225,29,72,0.35)] border border-rose-600/20',
        ghost: isDark
            ? 'bg-transparent text-[rgba(235,235,245,0.6)] hover:bg-white/[0.08] hover:text-white'
            : 'bg-transparent text-[rgba(60,60,67,0.6)] hover:bg-black/[0.06] hover:text-black'
    };

    return (
        <button
            className={`${baseClasses} ${sizeMap[size]} ${variantMap[variant]} ${className}`}
            style={{ isolation: 'isolate' }}
            {...props}
        >
            {/* Subtle inset highlight for primary/danger buttons to make them feel dimensional */}
            {(variant === 'primary' || variant === 'danger') && (
                <div className="absolute inset-0 rounded-inherit border border-white/20 pointer-events-none mix-blend-overlay" />
            )}
            
            {/* The content wrapper ensures text/icons are above absolute layers */}
            <span className="relative z-10 flex items-center justify-center gap-2">
                {children}
            </span>
        </button>
    );
};
