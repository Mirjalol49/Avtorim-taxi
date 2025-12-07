import React from 'react';
import { useTranslation } from 'react-i18next';
import { Driver, DriverStatus } from '../../../core/types';
import { EditIcon, TrashIcon } from '../../../../components/Icons';
import { LockIcon } from '../../../../components/LockIcon';
import { useLock } from '../../shared/hooks/useLock';
import { useToast } from '../../../../components/ToastNotification';

interface DriverCardProps {
    driver: Driver;
    theme: 'light' | 'dark';
    userRole: 'admin' | 'viewer';
    currentUserId: string;
    onEdit: (driver: Driver) => void;
    onDelete: (id: string) => void;
    onUpdateStatus: (id: string, status: DriverStatus) => void;
}

export const DriverCard: React.FC<DriverCardProps> = ({
    driver,
    theme,
    userRole,
    currentUserId,
    // t removed
    onEdit,
    onDelete,
    onUpdateStatus
}) => {
    const { t } = useTranslation();
    const { addToast } = useToast();
    const { isLocked, toggleLock, isLoading: isLockLoading, lockedBy, canEdit } = useLock({
        collectionPath: 'drivers',
        docId: driver.id,
        entity: driver,
        userId: currentUserId
    });

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!canEdit) {
            addToast('error', `Locked by ${lockedBy === currentUserId ? 'you' : 'another admin'}`);
            if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
            return;
        }
        onEdit(driver);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!canEdit) {
            addToast('error', 'Cannot delete locked driver');
            return;
        }
        onDelete(driver.id);
    };

    const handleStatusToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!canEdit) {
            addToast('error', 'Profile is locked');
            return;
        }
        onUpdateStatus(driver.id, driver.status === DriverStatus.ACTIVE ? DriverStatus.OFFLINE : DriverStatus.ACTIVE);
    };

    return (
        <div className={`rounded-2xl p-6 flex flex-col gap-4 transition-all group relative border ${theme === 'dark'
            ? 'bg-[#1F2937] border-gray-700 hover:border-gray-600'
            : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-lg'
            }`}>
            {/* Lock Icon - Absolute Top Right */}
            <div className="absolute top-4 right-4 z-10">
                <LockIcon
                    isLocked={isLocked}
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleLock();
                    }}
                    lockedBy={lockedBy}
                    currentUserId={currentUserId}
                />
            </div>

            <div className="flex items-center gap-4">
                <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full border-2 transition-colors shadow-lg overflow-hidden flex-shrink-0 ${theme === 'dark' ? 'border-gray-600 group-hover:border-[#0d9488]' : 'border-gray-200 group-hover:border-[#0d9488]'
                    }`}>
                    <img src={driver.avatar} className="w-full h-full object-cover" alt={driver.name} />
                </div>
                <div className="min-w-0">
                    <h3 className={`font-bold text-lg truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{driver.name}</h3>
                    <p className={`text-sm truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{driver.carModel}</p>

                    {userRole === 'admin' ? (
                        <>
                            <button
                                onClick={handleStatusToggle}
                                className={`relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 mt-3 ${driver.status === DriverStatus.ACTIVE
                                    ? 'bg-green-500'
                                    : theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
                                    } ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <span
                                    className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform duration-300 ease-in-out ${driver.status === DriverStatus.ACTIVE ? 'translate-x-7' : 'translate-x-0'
                                        }`}
                                />
                            </button>
                            <p className={`text-xs font-semibold tracking-wider mt-1.5 ${driver.status === DriverStatus.ACTIVE ? 'text-green-600 dark:text-green-400' : theme === 'dark' ? 'text-gray-500' : 'text-gray-600'
                                }`}>
                                {driver.status === DriverStatus.ACTIVE ? t('active') : t('offline')}
                            </p>
                        </>
                    ) : (
                        <div className="mt-3">
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${driver.status === DriverStatus.ACTIVE
                                ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
                                : theme === 'dark'
                                    ? 'bg-gray-700 text-gray-400 border border-gray-600'
                                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                                }`}>
                                {driver.status === DriverStatus.ACTIVE ? t('active') : t('offline')}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div className={`grid grid-cols-2 gap-4 pt-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                <div>
                    <p className={`text-xs uppercase font-bold tracking-wider mb-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>License Plate</p>
                    <p className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{driver.licensePlate}</p>
                </div>
                <div>
                    <p className={`text-xs uppercase font-bold tracking-wider mb-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Phone</p>
                    <p className={`font-bold text-sm truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{driver.phone}</p>
                </div>
            </div>

            {userRole === 'admin' && (
                <div className={`flex gap-2 pt-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                    <button
                        onClick={handleEdit}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg transition-all duration-150 active:scale-95 font-medium text-sm ${theme === 'dark'
                            ? 'bg-[#0d9488]/10 text-[#0d9488] hover:bg-[#0d9488]/20 border border-[#0d9488]/20'
                            : 'bg-[#0d9488]/10 text-[#0d9488] hover:bg-[#0d9488]/20 border border-[#0d9488]/20'
                            } ${!canEdit ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                    >
                        <EditIcon className="w-4 h-4" />
                        <span>{t('edit')}</span>
                    </button>
                    <button
                        onClick={handleDelete}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg transition-all duration-150 active:scale-95 font-medium text-sm ${theme === 'dark'
                            ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                            : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                            } ${!canEdit ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                    >
                        <TrashIcon className="w-4 h-4" />
                        <span>{t('delete')}</span>
                    </button>
                </div>
            )}
        </div>
    );
};
