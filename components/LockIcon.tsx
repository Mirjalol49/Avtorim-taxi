import React from 'react';

// Interfaces
interface LockIconProps {
    isLocked: boolean;
    onClick?: (e: React.MouseEvent) => void;
    size?: number;
    className?: string;
    lockedBy?: string;
    currentUserId?: string;
    isLoading?: boolean; // Added loading state prop
    disabled?: boolean;
}

export const LockIcon: React.FC<LockIconProps> = ({
    isLocked,
    onClick,
    size = 20,
    className = "",
    lockedBy,
    currentUserId,
    isLoading = false,
    disabled = false
}) => {
    // Determine status for styling
    const canUnlock = !isLocked || lockedBy === currentUserId;
    const isActionable = !disabled && (canUnlock || !isLocked);

    // Tooltip text
    let tooltipText = "Unlocked - Click to Lock";
    if (isLocked) {
        if (canUnlock) tooltipText = "Locked by you - Click to Unlock";
        else tooltipText = `Locked by ${lockedBy || 'Admin'}`;
    }
    if (isLoading) tooltipText = "Processing...";

    return (
        <div className="relative group/lock">
            <button
                onClick={onClick}
                disabled={disabled || isLoading || (!canUnlock && isLocked)}
                className={`
                    flex items-center justify-center 
                    p-2 rounded-full
                    transition-all duration-300 ease-in-out
                    border
                    ${isLocked
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-200'}
                    ${!canUnlock && isLocked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:shadow-md active:scale-95'}
                    ${isLoading ? 'cursor-wait opacity-80' : ''}
                    ${className}
                `}
                aria-label={tooltipText}
            >
                {isLoading ? (
                    // Loading Spinner
                    <svg
                        className="animate-spin"
                        width={size}
                        height={size}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                    >
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                ) : isLocked ? (
                    // Locked Icon
                    <svg
                        width={size}
                        height={size}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                ) : (
                    // Unlocked Icon
                    <svg
                        width={size}
                        height={size}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                    </svg>
                )}
            </button>

            {/* Custom Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover/lock:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 font-medium tracking-wide">
                {tooltipText}
                {/* Arrow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
            </div>
        </div>
    );
};
