import React from 'react';
import { PaymentStatus } from '../types';
import { CheckCircleIcon, ArrowLeftCircleIcon } from './Icons';
import { TRANSLATIONS } from '../translations';

interface StatusBadgeProps {
    status?: PaymentStatus;
    theme: 'light' | 'dark';
    size?: 'sm' | 'md' | 'lg';
    language?: 'uz' | 'ru' | 'en';
    showIcon?: boolean;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status = PaymentStatus.COMPLETED, theme, size = 'sm', language = 'uz', showIcon = false }) => {
    const t = TRANSLATIONS[language];

    const getStatusConfig = () => {
        switch (status) {
            case PaymentStatus.COMPLETED:
                return {
                    bgColor: 'bg-green-500/10',
                    textColor: 'text-green-600 dark:text-green-400',
                    dotColor: 'bg-green-500',
                    icon: CheckCircleIcon,
                    label: t.statusCompleted || 'Completed'
                };
            case PaymentStatus.REVERSED:
            case PaymentStatus.REFUNDED:
                return {
                    bgColor: 'bg-orange-500/10',
                    textColor: 'text-orange-600 dark:text-orange-400',
                    dotColor: 'bg-orange-500',
                    icon: ArrowLeftCircleIcon,
                    label: status === PaymentStatus.REFUNDED ? (t.statusRefunded || 'Refunded') : (t.statusReversed || 'Reversed')
                };
            case PaymentStatus.PENDING:
                return {
                    bgColor: 'bg-yellow-500/10',
                    textColor: 'text-yellow-600 dark:text-yellow-400',
                    dotColor: 'bg-yellow-500',
                    icon: null,
                    label: t.statusPending || 'Pending'
                };
            default:
                return {
                    bgColor: 'bg-gray-500/10',
                    textColor: 'text-gray-600 dark:text-gray-400',
                    dotColor: 'bg-gray-500',
                    icon: null,
                    label: 'Unknown'
                };
        }
    };

    const config = getStatusConfig();
    const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : size === 'md' ? 'px-2.5 py-1 text-sm' : 'px-3 py-1.5 text-sm';
    const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : size === 'md' ? 'w-2 h-2' : 'w-4 h-4';
    const IconComponent = config.icon;

    return (
        <span className={`inline-flex items-center gap-1.5 ${sizeClass} rounded-lg font-semibold ${config.bgColor} ${config.textColor}`}>
            {showIcon && IconComponent ? (
                <IconComponent className={dotSize} />
            ) : (
                <div className={`${dotSize} rounded-full ${config.dotColor}`} />
            )}
            {config.label}
        </span>
    );
};

export default StatusBadge;
