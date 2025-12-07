import React from 'react';
// Removed Lucide import to use SVG directly for zero deps
import { LockState } from '../src/core/types/lock.types';

interface LockIconProps {
    isLocked: boolean;
    onClick?: (e: React.MouseEvent) => void;
    size?: number;
    className?: string;
    lockedBy?: string; // For tooltip
    currentUserId?: string;
}

export const LockIcon: React.FC<LockIconProps> = ({
    isLocked,
    onClick,
    size = 20,
    className = "",
    lockedBy,
    currentUserId
}) => {
    // Determine status for styling
    const canUnlock = !isLocked || lockedBy === currentUserId;

    // Use internal icons or map to project's icon set if available. 
    // Assuming simple Lucide icons for now or could import from project's Icons.tsx if consistent.
    // For this specific lock system, let's use SVG directly or library icons.

    return (
        <button
            onClick={onClick}
            disabled={!onClick}
            className={`
                relative flex items-center justify-center 
                transition-all duration-300 ease-in-out
                ${canUnlock ? 'cursor-pointer hover:scale-110 active:scale-95' : 'cursor-not-allowed opacity-70'}
                ${className}
            `}
            title={isLocked ? `Locked by ${lockedBy === currentUserId ? 'you' : 'another admin'}` : 'Unlocked'}
        >
            <div className={`
                transition-transform duration-300
                ${isLocked ? 'text-red-500' : 'text-gray-400 hover:text-green-500'}
            `}>
                {isLocked ? (
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
            </div>

            {/* Ripple/Glow effect on lock state */}
            {isLocked && (
                <span className="absolute inset-0 rounded-full animate-ping bg-red-400/20 pointer-events-none" />
            )}
        </button>
    );
};
