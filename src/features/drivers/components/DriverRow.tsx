import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Driver, DriverStatus } from '../../../core/types';
import { Car } from '../../../core/types/car.types';
import { Transaction } from '../../../core/types/transaction.types';
import { EditIcon, TrashIcon, CameraIcon, XIcon } from '../../../../components/Icons';
import { createPortal } from 'react-dom';
import { DriverAvatar } from './DriverAvatar';

const fmt = (n: number) => `${new Intl.NumberFormat('uz-UZ').format(Math.round(n))} UZS`;

interface DriverRowProps {
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
}

export const DriverRow: React.FC<DriverRowProps> = ({
    driver, car, transactions, fleetId, theme, userRole, onEdit, onDelete,
}) => {
    const { t } = useTranslation();
    const [viewingDoc, setViewingDoc] = useState<string | null>(null);
    const docs = driver.documents ?? [];
    const explicitDailyPlan = car ? (car.dailyPlan ?? 0) : 0;

    const handleEdit = (e: React.MouseEvent) => { e.stopPropagation(); onEdit(driver); };
    const handleDelete = (e: React.MouseEvent) => { e.stopPropagation(); onDelete(driver.id); };

    return (<>
        <tr className={`group transition-colors ${theme === 'dark' ? 'hover:bg-surface-2' : 'hover:bg-black/[0.03]'}`}>

            {/* Driver */}
            <td className="p-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 dark:border-gray-600 flex-shrink-0">
                        <DriverAvatar
                            src={driver.avatar}
                            name={driver.name}
                            size={40}
                            theme={theme}
                            rounded="full"
                        />
                    </div>
                    <div>
                        <p className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{driver.name}</p>
                        <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>{driver.phone}</p>
                    </div>
                </div>
            </td>

            {/* Attached car */}
            <td className="p-4">
                {car ? (
                    <div className="flex items-center gap-2">
                        <div className={`w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 ${theme === 'dark' ? 'bg-surface-2' : 'bg-gray-100'}`}>
                            {car.avatar ? (
                                <DriverAvatar
                                    src={car.avatar}
                                    name={car.name}
                                    size={36}
                                    theme={theme}
                                    rounded="xl"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <CameraIcon className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} />
                                </div>
                            )}
                        </div>
                        <div>
                            <p className={`font-medium text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>{car.name}</p>
                            <p className={`text-xs font-mono ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>{car.licensePlate}</p>
                        </div>
                    </div>
                ) : (
                    <span className={`text-xs ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`}>—</span>
                )}
            </td>

            {/* Documents */}
            <td className="p-4">
                {docs.length > 0 ? (
                    <div className="flex flex-col gap-1">
                        {docs.map((doc, i) => {
                            const isImage = doc.type && doc.type.startsWith('image/');
                            return (
                                <button key={i} type="button"
                                    onClick={() => {
                                        if (isImage) {
                                            setViewingDoc(doc.data);
                                        } else {
                                            window.open(doc.data, '_blank');
                                        }
                                    }}
                                    className="flex items-center gap-1 text-xs text-[#0f766e] hover:underline truncate max-w-[140px] text-left">
                                    <span>{isImage ? '🖼️' : '📄'}</span>
                                    <span className="truncate">{doc.name}</span>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <span className={`text-xs ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`}>—</span>
                )}
            </td>

            {/* Debt / Day Off */}
            <td className="p-4">
                <div className="space-y-0.5">
                    {/* Day off badge */}
                    {explicitDailyPlan > 0 && (
                        <p className={`text-xs font-mono font-bold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{t('dailyPlan')}: {fmt(explicitDailyPlan)} UZS</p>
                    )}
                    {explicitDailyPlan === 0 && (
                        <span className={`text-xs ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`}>—</span>
                    )}
                </div>
            </td>

            {/* Actions */}
            {userRole === 'admin' && (
                <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                        <button onClick={handleEdit}
                            className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-[#0f766e] hover:bg-[#0f766e]/10' : 'text-gray-500 hover:text-[#0f766e] hover:bg-[#0f766e]/10'}`}>
                            <EditIcon className="w-4 h-4" />
                        </button>
                        <button onClick={handleDelete}
                            className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-500 hover:text-red-600 hover:bg-red-50'}`}>
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                </td>
            )}
        </tr>

        {/* ImageViewer Modal Portal */}
        {viewingDoc && createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div 
                    className={`absolute inset-0 transition-opacity duration-300 bg-black/80 backdrop-blur-md`} 
                    onClick={() => setViewingDoc(null)}
                />
                
                <div className="relative z-10 w-full max-w-4xl h-full max-h-[85vh] flex flex-col items-center justify-center animate-in zoom-in-95 duration-300 pointer-events-none">
                    <img 
                        src={viewingDoc} 
                        alt="Document Viewer" 
                        className="max-w-full max-h-full object-contain rounded-xl shadow-2xl pointer-events-auto"
                    />
                    
                    <button 
                        onClick={() => setViewingDoc(null)} 
                        className="absolute -top-12 right-0 md:-right-12 md:top-0 w-10 h-10 flex items-center justify-center rounded-full transition-colors text-white pointer-events-auto"
                        style={{ background: 'rgba(255,255,255,0.12)' }}>
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>,
            document.body
        )}
    </>);
};
