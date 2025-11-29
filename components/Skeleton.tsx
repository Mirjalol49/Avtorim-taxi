import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular';
    width?: string | number;
    height?: string | number;
    theme?: 'light' | 'dark';
}

const Skeleton: React.FC<SkeletonProps> = ({
    className = '',
    variant = 'text',
    width,
    height,
    theme = 'dark'
}) => {
    const baseClass = `animate-pulse ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`;

    const variantClass = {
        text: 'rounded',
        circular: 'rounded-full',
        rectangular: 'rounded-lg'
    }[variant];

    const style: React.CSSProperties = {};
    if (width) style.width = typeof width === 'number' ? `${width}px` : width;
    if (height) style.height = typeof height === 'number' ? `${height}px` : height;

    return (
        <div
            className={`${baseClass} ${variantClass} ${className}`}
            style={style}
            aria-busy="true"
            aria-live="polite"
        />
    );
};

export default Skeleton;
