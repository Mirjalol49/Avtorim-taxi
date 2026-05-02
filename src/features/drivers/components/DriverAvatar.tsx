'use client';
import React, { useState, useEffect } from 'react';

interface DriverAvatarProps {
    src?: string | null;
    name: string;
    size?: number;          // pixel size, default 40
    className?: string;
    theme?: 'light' | 'dark';
    rounded?: 'full' | 'xl' | '2xl';
}

/**
 * Resilient avatar that:
 * 1. Shows the image when src is available and loads successfully.
 * 2. Falls back to initials when src is missing, empty, or the image fails to load.
 * 3. Resets the error state when `src` changes (e.g. after a refresh/re-fetch).
 */
export const DriverAvatar: React.FC<DriverAvatarProps> = ({
    src,
    name,
    size = 40,
    className = '',
    theme = 'light',
    rounded = 'full',
}) => {
    const [imgError, setImgError] = useState(false);

    // Reset error flag whenever the source URL changes so a fresh URL is retried
    useEffect(() => {
        setImgError(false);
    }, [src]);

    const roundedClass = rounded === 'full' ? 'rounded-full' : rounded === 'xl' ? 'rounded-xl' : 'rounded-2xl';
    const showImage = src && !imgError;

    return (
        <div
            className={`overflow-hidden flex-shrink-0 ${roundedClass} ${className}`}
            style={{ width: size, height: size }}
        >
            {showImage ? (
                <img
                    src={src}
                    alt={name}
                    className="w-full h-full object-cover"
                    onError={() => setImgError(true)}
                />
            ) : (
                <div
                    className={`w-full h-full flex items-center justify-center font-black select-none ${
                        theme === 'dark'
                            ? 'bg-[#1a2840] text-gray-400'
                            : 'bg-gray-100 text-gray-500'
                    }`}
                    style={{ fontSize: Math.round(size * 0.38) }}
                >
                    {name ? name.charAt(0).toUpperCase() : '?'}
                </div>
            )}
        </div>
    );
};
