import React from 'react';
import { useTranslation } from 'react-i18next';
import { Driver, DriverStatus } from '../../../core/types';
import { Car } from '../../../core/types/car.types';
import { Transaction } from '../../../core/types/transaction.types';
import { EditIcon, TrashIcon, CarIcon, MoreVerticalIcon, ChevronRightIcon } from '../../../../components/Icons';

interface DriverCardProps {
    driver: Driver;
    car?: Car | null;
    transactions: Transaction[];
    fleetId: string;
    theme: 'light' | 'dark';
    userRole: 'admin' | 'viewer';
    currentUserId: string;
    onEdit: (driver: Driver) => void;
    onDelete: (id: string) => void;
    onUpdateStatus: (id: string, status: DriverStatus) => void;
    onCardClick?: (driver: Driver) => void;
}

const fmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n));

export const DriverCard: React.FC<DriverCardProps> = ({
    driver, car, theme, userRole, onEdit, onDelete, onCardClick,
}) => {
    const { t } = useTranslation();
    const isDark = theme === 'dark';

    const dailyPlan = (car && (car.dailyPlan ?? 0) > 0)
        ? (car.dailyPlan as number)
        : ((driver as any).dailyPlan ?? 0);

    const handleEdit = (e: React.MouseEvent) => { e.stopPropagation(); onEdit(driver); };
    const handleDelete = (e: React.MouseEvent) => { e.stopPropagation(); onDelete(driver.id); };
    const handleCardClick = () => onCardClick?.(driver);

    const statusDot: Record<string, string> = {
        ACTIVE:  'bg-emerald-500',
        OFFLINE: 'bg-gray-500',
        BUSY:    'bg-amber-400',
    };

    return (
        <div
            onClick={handleCardClick}
            className={`group relative rounded-2xl border cursor-pointer transition-all duration-200 overflow-hidden ${
                isDark
                    ? 'bg-surface border-white/[0.07] hover:border-white/[0.14] hover:bg-surface-2/60 hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-[0_8px_24px_rgba(0,40,60,0.10)]'
            }`}
        >
            {/* ── Hover action buttons (desktop) ── */}
            {userRole === 'admin' && (
                <div className="absolute top-3 right-3 z-10 hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <button
                        onClick={handleEdit}
                        title={t('edit')}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${isDark ? 'bg-surface text-gray-400 hover:text-teal-400 hover:bg-teal-500/10 border border-white/[0.08]' : 'bg-white text-gray-400 hover:text-teal-600 hover:bg-teal-50 border border-gray-200 shadow-sm'}`}
                    >
                        <EditIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={handleDelete}
                        title={t('delete')}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${isDark ? 'bg-surface text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-white/[0.08]' : 'bg-white text-gray-400 hover:text-red-500 hover:bg-red-50 border border-gray-200 shadow-sm'}`}
                    >
                        <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* ── Body ── */}
            <div className="p-4">
                {/* Top row: avatar + info + plan */}
                <div className="flex items-center gap-3">
                    {/* Avatar with status dot */}
                    <div className="relative flex-shrink-0">
                        <div className={`w-12 h-12 rounded-2xl overflow-hidden border ${isDark ? 'border-white/[0.08]' : 'border-gray-100'}`}>
                            {driver.avatar ? (
                                <img src={driver.avatar} alt={driver.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className={`w-full h-full flex items-center justify-center text-base font-black ${isDark ? 'bg-surface-2 text-gray-300' : 'bg-gray-100 text-gray-500'}`}>
                                    {driver.name.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        {/* Status dot */}
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${isDark ? 'border-surface' : 'border-white'} ${statusDot[driver.status] ?? 'bg-gray-500'}`} />
                    </div>

                    {/* Name & phone */}
                    <div className="flex-1 min-w-0 pr-2">
                        <p className={`text-[14px] font-semibold leading-tight truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {driver.name}
                        </p>
                        <p className={`text-[12px] mt-0.5 font-mono truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            {driver.phone}
                        </p>
                    </div>

                    {/* Mobile kebab + plan pill stacked */}
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        {dailyPlan > 0 && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums ${isDark ? 'bg-teal-500/10 text-teal-400' : 'bg-teal-50 text-teal-700 border border-teal-200'}`}>
                                {fmt(dailyPlan)}
                            </span>
                        )}
                        {/* Kebab visible on mobile, hidden on desktop (desktop uses hover buttons) */}
                        {userRole === 'admin' && (
                            <button
                                onClick={e => { e.stopPropagation(); onCardClick?.(driver); }}
                                className={`sm:hidden w-7 h-7 flex items-center justify-center rounded-lg ${isDark ? 'text-gray-600 hover:text-gray-300' : 'text-gray-300 hover:text-gray-600'}`}
                            >
                                <MoreVerticalIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Car row ── */}
                <div className={`mt-3 flex items-center gap-2.5 px-3 py-2.5 rounded-xl border ${isDark ? 'border-white/[0.05] bg-white/[0.02]' : 'border-gray-100 bg-gray-50/80'}`}>
                    {car ? (
                        <>
                            {/* Thumbnail */}
                            <div className={`w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 border ${isDark ? 'border-white/[0.06] bg-surface' : 'border-gray-200 bg-white'}`}>
                                {car.avatar ? (
                                    <img src={car.avatar} alt={car.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <CarIcon className={`w-4 h-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-[12px] font-semibold truncate leading-tight ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                    {car.name}
                                </p>
                                <span className={`text-[10px] font-mono font-bold tracking-widest ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                                    {car.licensePlate}
                                </span>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-surface' : 'bg-gray-100'}`}>
                                <CarIcon className={`w-4 h-4 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                            </div>
                            <span className={`text-[12px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                                {t('carNotAssigned')}
                            </span>
                        </>
                    )}

                    {/* Drawer hint arrow */}
                    <ChevronRightIcon className={`w-3.5 h-3.5 flex-shrink-0 ml-auto transition-transform duration-200 group-hover:translate-x-0.5 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                </div>
            </div>
        </div>
    );
};
