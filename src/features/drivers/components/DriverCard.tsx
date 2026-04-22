import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Driver, DriverStatus } from '../../../core/types';
import { Car } from '../../../core/types/car.types';
import { Transaction } from '../../../core/types/transaction.types';
import { EditIcon, TrashIcon, CameraIcon } from '../../../../components/Icons';
import { DayOff, getDaysOffSet, countUsedThisMonth, MONTHLY_ALLOWANCE } from '../../../../services/daysOffService';
import { DayOffPanel } from './DayOffPanel';
import { XIcon } from '../../../../components/Icons';
import { createPortal } from 'react-dom';

interface DriverCardProps {
    driver: Driver;
    car?: Car | null;
    transactions: Transaction[];
    daysOff: DayOff[];
    fleetId: string;
    theme: 'light' | 'dark';
    userRole: 'admin' | 'viewer';
    currentUserId: string;
    onEdit: (driver: Driver) => void;
    onDelete: (id: string) => void;
    onUpdateStatus: (id: string, status: DriverStatus) => void;
}

const fmt = (n: number) =>
    new Intl.NumberFormat('uz-UZ').format(Math.round(n));

export const DriverCard: React.FC<DriverCardProps> = ({
    driver, car, transactions, daysOff, fleetId, theme, userRole, onEdit, onDelete,
}) => {
    const { t } = useTranslation();
    const [showDayOff, setShowDayOff] = useState(false);
    const [viewingDoc, setViewingDoc] = useState<string | null>(null);
    const daysOffSet = getDaysOffSet(daysOff, driver.id);
    const usedThisMonth = countUsedThisMonth(daysOff, driver.id);
    // Keep daily plan resolution
    const explicitDailyPlan = car && car.dailyPlan > 0 ? (car.dailyPlan as number) : (((driver as any).dailyPlan ?? 0) as number);
    const docs = driver.documents ?? [];

    const handleEdit = (e: React.MouseEvent) => { e.stopPropagation(); onEdit(driver); };
    const handleDelete = (e: React.MouseEvent) => { e.stopPropagation(); onDelete(driver.id); };

    return (<>
        <div className={`rounded-2xl flex flex-col transition-all group relative border overflow-hidden ${theme === 'dark'
            ? 'bg-[#1F2937] border-gray-700 hover:border-gray-600'
            : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-lg'
        }`}>

            {/* Header: avatar + name + phone */}
            <div className="flex items-center gap-4 p-5 pb-3">
                <div className={`w-16 h-16 rounded-full border-2 overflow-hidden flex-shrink-0 transition-colors ${theme === 'dark' ? 'border-gray-600 group-hover:border-[#0f766e]' : 'border-gray-200 group-hover:border-[#0f766e]'}`}>
                    {driver.avatar ? (
                        <img src={driver.avatar} className="w-full h-full object-cover" alt={driver.name} />
                    ) : (
                        <div className={`w-full h-full flex items-center justify-center text-xl font-bold ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                            {driver.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className={`font-bold text-base truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{driver.name}</h3>
                    <div className="flex flex-col mt-0.5 gap-0.5">
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{driver.phone}</p>
                        {driver.extraPhone && (
                            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{driver.extraPhone}</p>
                        )}
                    </div>
                </div>
                {/* Right side badges */}
                <div className="flex-shrink-0 flex flex-col items-end gap-1">
                    {/* Day off badge */}
                    <button
                        onClick={e => { e.stopPropagation(); if (userRole === 'admin') setShowDayOff(true); }}
                        title="Dam olish kunlari"
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                            usedThisMonth >= MONTHLY_ALLOWANCE
                                ? 'bg-red-500/10 text-red-400'
                                : 'bg-teal-500/10 text-teal-500 hover:bg-teal-500/20'
                        }`}
                    >
                        🏖️ {usedThisMonth}/{MONTHLY_ALLOWANCE}
                    </button>
                </div>
            </div>

            {/* Today is day off banner */}
            {daysOffSet.has(new Date().toISOString().split('T')[0]) && (
                <div className={`mx-4 mb-2 rounded-xl px-3 py-2 flex items-center gap-2 ${
                    theme === 'dark' ? 'bg-teal-500/10 border border-teal-500/20' : 'bg-teal-50 border border-teal-200'
                }`}>
                    <span>🏖️</span>
                    <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-teal-400' : 'text-teal-600'}`}>Bugun dam olish kuni</span>
                </div>
            )}

            {/* Daily plan stats */}
            {explicitDailyPlan > 0 && (
                <div className={`mx-4 mb-3 rounded-xl p-3 flex justify-between items-center ${theme === 'dark' ? 'bg-gray-800/70 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Kunlik reja</p>
                    <p className={`text-sm font-bold font-mono ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{fmt(explicitDailyPlan)} UZS</p>
                </div>
            )}

            {/* Attached car */}
            <div className={`mx-4 mb-3 rounded-xl border overflow-hidden ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                {car ? (
                    <div className="flex items-center gap-3 p-2.5">
                        <div className={`w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
                            {car.avatar ? (
                                <img src={car.avatar} alt={car.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <CameraIcon className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} />
                                </div>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Avtomobil</p>
                            <p className={`text-sm font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{car.name}</p>
                            <span className={`inline-block text-xs font-mono px-1.5 py-0.5 rounded mt-0.5 ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>{car.licensePlate}</span>
                        </div>
                    </div>
                ) : (
                    <div className={`flex items-center gap-2 p-2.5 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`}>
                        <CameraIcon className="w-4 h-4" />
                        <span className="text-xs">Avtomobil biriktirilmagan</span>
                    </div>
                )}
            </div>

            {/* Documents */}
            {docs.length > 0 && (
                <div className={`mx-4 mb-3 rounded-xl border p-2.5 space-y-1 ${theme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-100 bg-gray-50'}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Hujjatlar</p>
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
                                className="w-full flex items-center gap-2 text-xs text-[#0f766e] hover:underline truncate">
                                <span>{isImage ? '🖼️' : '📄'}</span>
                                <span className="truncate">{doc.name}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Actions */}
            {userRole === 'admin' && (
                <div className={`flex gap-2 p-4 border-t mt-auto ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                    <button onClick={handleEdit}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg transition-all active:scale-95 font-medium text-sm ${theme === 'dark'
                            ? 'bg-[#0f766e]/10 text-[#0f766e] hover:bg-[#0f766e]/20 border border-[#0f766e]/20'
                            : 'bg-[#0f766e]/10 text-[#0f766e] hover:bg-[#0f766e]/20 border border-[#0f766e]/20'}`}>
                        <EditIcon className="w-4 h-4" /><span>{t('edit')}</span>
                    </button>
                    <button onClick={handleDelete}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg transition-all active:scale-95 font-medium text-sm ${theme === 'dark'
                            ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                            : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'}`}>
                        <TrashIcon className="w-4 h-4" /><span>{t('delete')}</span>
                    </button>
                </div>
            )}
        </div>

        {/* Day Off Panel */}
        {showDayOff && (
            <DayOffPanel
                driver={{ id: driver.id, name: driver.name, fleetId }}
                daysOff={daysOff}
                theme={theme}
                onClose={() => setShowDayOff(false)}
            />
        )}

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
                        className={`absolute -top-12 right-0 md:-right-12 md:top-0 w-10 h-10 flex items-center justify-center rounded-full transition-colors bg-gray-800 text-white hover:bg-gray-700 pointer-events-auto`}>
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>,
            document.body
        )}
    </>);
};
