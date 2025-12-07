import React from 'react';

interface StatusBadgeProps {
    status: 'active' | 'disabled';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    const isActive = status === 'active';

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${isActive
                ? 'bg-green-100 text-green-800 border border-green-200'
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}>
            {isActive ? 'Active' : 'Disabled'}
        </span>
    );
};
