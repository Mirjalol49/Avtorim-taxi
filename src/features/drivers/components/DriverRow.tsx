import React from 'react';
import { useTranslation } from 'react-i18next';
import { Driver, DriverStatus } from '../../../core/types';
import { EditIcon, TrashIcon } from '../../../../components/Icons';
import { LockIcon } from '../../../../components/LockIcon';
import { useLock } from '../../shared/hooks/useLock';
import { useToast } from '../../../../components/ToastNotification';

interface DriverRowProps {
    driver: Driver;
    theme: 'light' | 'dark';
    userRole: 'admin' | 'viewer';
    currentUserId: string;
    onEdit: (driver: Driver) => void;
    onDelete: (id: string) => void;
    onUpdateStatus: (id: string, status: DriverStatus) => void;
}

export const DriverRow: React.FC<DriverRowProps> = ({
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
        <tr className={`group transition-colors ${theme === 'dark' ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'}`}>
            <td className="p-4 relative">
                <div className="flex items-center gap-3">
                    {/* Lock Icon - Left of Avatar */}
                    <div className="z-10">
                        <LockIcon
                            isLocked={isLocked}
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleLock();
                            }}
                            size={16}
                            lockedBy={lockedBy}
                            currentUserId={currentUserId}
                        />
                    </div>

                    <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 dark:border-gray-600">
                        <img src={driver.avatar} alt={driver.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <p className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{driver.name}</p>
                        <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>{driver.phone}</p>
                    </div>
                </div>
            </td>
            <td className="p-4">
                <p className={`font-medium text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{driver.carModel}</p>
                <p className={`text-xs font-mono ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>{driver.licensePlate}</p>
            </td>
            <td className="p-4">
                {userRole === 'admin' ? (
                    <div className="flex flex-col items-start gap-2">
                        <button
                            onClick={handleStatusToggle}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${driver.status === DriverStatus.ACTIVE
                                ? 'bg-green-500'
                                : theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
                                } ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                            role="switch"
                            aria-checked={driver.status === DriverStatus.ACTIVE}
                        >
                            <span
                                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-300 ease-in-out ${driver.status === DriverStatus.ACTIVE ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                            />
                        </button>
                        <span className={`text-xs font-semibold tracking-wider ${driver.status === DriverStatus.ACTIVE ? 'text-green-600 dark:text-green-400' : theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                            {driver.status === DriverStatus.ACTIVE ? t('active') : t('offline')}
                        </span>
                    </div>
                ) : (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${driver.status === DriverStatus.ACTIVE
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                        }`}>
                        {driver.status === DriverStatus.ACTIVE ? t('active') : t('offline')}
                    </span>
                )}
            </td>
            {userRole === 'admin' && (
                <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                        <button
                            onClick={handleEdit}
                            className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-[#0d9488] hover:bg-[#0d9488]/10' : 'text-gray-500 hover:text-[#0d9488] hover:bg-[#0d9488]/10'
                                } ${!canEdit ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                        >
                            <EditIcon className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleDelete}
                            className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                                } ${!canEdit ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                </td>
            )}
        </tr>
    );
};
