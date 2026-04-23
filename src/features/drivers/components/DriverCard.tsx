import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Driver, DriverStatus } from '../../../core/types';
import { Car } from '../../../core/types/car.types';
import { Transaction } from '../../../core/types/transaction.types';
import { EditIcon, TrashIcon, CameraIcon } from '../../../../components/Icons';
import { XIcon } from '../../../../components/Icons';
import { createPortal } from 'react-dom';

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
}

const fmt = (n: number) =>
    new Intl.NumberFormat('uz-UZ').format(Math.round(n));

export const DriverCard: React.FC<DriverCardProps> = ({
    driver, car, transactions, fleetId, theme, userRole, onEdit, onDelete,
}) => {
    const { t } = useTranslation();
    const [viewingDoc, setViewingDoc] = useState<{ name: string; data: string; category?: string } | null>(null);
    // Keep daily plan resolution
    const explicitDailyPlan = car && car.dailyPlan > 0 ? (car.dailyPlan as number) : (((driver as any).dailyPlan ?? 0) as number);
    const docs = driver.documents ?? [];

    const handleEdit = (e: React.MouseEvent) => { e.stopPropagation(); onEdit(driver); };
    const handleDelete = (e: React.MouseEvent) => { e.stopPropagation(); onDelete(driver.id); };

    const getFriendlyDocName = (doc: any) => {
        if (doc.category) {
            switch (doc.category) {
                case 'driver_license': return 'Haydovchilik guvohnomasi';
                case 'passport': return 'Pasport';
                case 'car_registration': return 'Texnik pasport';
                case 'car_insurance': return 'Sug\'urta';
            }
        }
        
        const filename = doc.name || '';
        const lower = filename.toLowerCase();
        if (lower.includes('id') || lower.includes('pasport') || lower.includes('passport')) return 'ID / Pasport';
        if (lower.includes('prava') || lower.includes('license') || lower.includes('guvohnoma')) return 'Haydovchilik guvohnomasi';
        if (lower.includes('tex') || lower.includes('tech')) return 'Texnik pasport';
        if (lower.includes('sug') || lower.includes('insur')) return 'Sug\'urta';
        if (lower.includes('rxsat') || lower.includes('licence') || lower.includes('lits')) return 'Litsenziya';
        
        const nameWithoutExt = filename.split('.').slice(0, -1).join('.') || filename;
        return nameWithoutExt.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

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
            </div>

            {/* Daily plan stats */}
            {explicitDailyPlan > 0 && (
                <div className={`mx-4 mb-3 rounded-xl p-3 flex justify-between items-center ${theme === 'dark' ? 'bg-gray-800/70 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{t('dailyPlan')}</p>
                    <p className={`text-sm font-bold font-mono ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{fmt(explicitDailyPlan)} UZS</p>
                </div>
            )}

            {/* Attached car */}
            {car ? (
                <div className={`group relative mx-4 mb-3 rounded-2xl overflow-hidden transition-all duration-300 ${theme === 'dark'
                    ? 'bg-[#1a222e] border border-gray-800 hover:border-gray-700 hover:shadow-lg hover:shadow-black/40'
                    : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md hover:shadow-gray-200/50'}`}>
                    
                    {/* Image Container */}
                    <div className={`relative h-24 sm:h-28 overflow-hidden ${theme === 'dark' ? 'bg-[#111827]' : 'bg-gray-100'}`}>
                        {car.avatar ? (
                            <img src={car.avatar} alt={car.name} className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <CameraIcon className={`w-8 h-8 ${theme === 'dark' ? 'text-gray-700' : 'text-gray-300'}`} />
                            </div>
                        )}
                        
                        {/* Overlay Gradient for readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/5 pointer-events-none transition-opacity duration-300 group-hover:opacity-90" />

                        {/* Bottom Info (Overlaid on image) */}
                        <div className="absolute bottom-0 left-0 right-0 p-3 flex items-end justify-between">
                            <div className="min-w-0 flex-1">
                                <h3 className="text-white font-extrabold text-lg tracking-tight truncate drop-shadow-md mb-1.5">
                                    {car.name}
                                </h3>
                                <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white/5 backdrop-blur-lg border border-white/10 shadow-sm">
                                    <span className="text-[10px] font-mono font-bold text-white tracking-widest drop-shadow-sm">
                                        {car.licensePlate}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className={`mx-4 mb-3 rounded-xl border overflow-hidden ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                    <div className={`flex items-center gap-2 p-2.5 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`}>
                        <CameraIcon className="w-4 h-4" />
                        <span className="text-xs">Avtomobil biriktirilmagan</span>
                    </div>
                </div>
            )}

            {/* Documents */}
            {docs.length > 0 && (
                <div className={`mx-4 mb-3 rounded-xl border p-3 space-y-2 ${theme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-100 bg-gray-50'}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Hujjatlar</p>
                    <div className="flex flex-col gap-2">
                        {docs.map((doc, i) => {
                            const isImage = doc.type && doc.type.startsWith('image/');
                            const fileExt = doc.name.split('.').pop()?.toUpperCase() || 'FILE';
                            return (
                                <button key={i} type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (isImage) {
                                            setViewingDoc({ name: doc.name, data: doc.data, category: doc.category });
                                        } else {
                                            window.open(doc.data, '_blank');
                                        }
                                    }}
                                    className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all duration-200 active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] ${
                                        theme === 'dark' 
                                            ? 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700/50 hover:border-gray-600' 
                                            : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-md'
                                    }`}>
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500'}`}>
                                        <span className="text-sm">{isImage ? '🖼️' : '📄'}</span>
                                    </div>
                                    <span className="flex-1 text-left text-sm font-medium truncate">
                                        {getFriendlyDocName(doc)}
                                    </span>
                                    <div className={`text-[10px] uppercase font-bold tracking-wider ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                        {fileExt.substring(0, 4)}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
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

        {/* ImageViewer Modal Portal */}
        {viewingDoc && createPortal(
            <div 
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300"
                role="dialog"
                aria-modal="true"
                aria-label="Document viewer"
            >
                {/* Backdrop: frosted glass */}
                <div 
                    className="absolute inset-0 bg-black/60 backdrop-blur-xl transition-opacity"
                    onClick={(e) => { e.stopPropagation(); setViewingDoc(null); }}
                />
                
                {/* Content Container */}
                <div className="relative z-10 w-full max-w-5xl h-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-300 pointer-events-none">
                    {/* The Image */}
                    <div className="relative p-2 bg-white/5 backdrop-blur-md rounded-2xl shadow-2xl pointer-events-auto max-h-[80vh] flex items-center justify-center overflow-hidden border border-white/10 ring-1 ring-black/5">
                        <img 
                            src={viewingDoc.data} 
                            alt={getFriendlyDocName(viewingDoc)} 
                            className="max-w-full max-h-full object-contain rounded-xl"
                        />
                    </div>
                    
                    {/* Floating Toolbar */}
                    <div className="absolute bottom-8 sm:bottom-12 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-4 bg-gray-900/80 hover:bg-gray-900 backdrop-blur-2xl border border-white/10 rounded-full pl-6 pr-2 py-2 shadow-2xl transition-all duration-300">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">{getFriendlyDocName(viewingDoc)}</span>
                        </div>
                        <div className="w-px h-4 bg-white/20 mx-1" />
                        <button 
                            onClick={(e) => { e.stopPropagation(); setViewingDoc(null); }}
                            className="flex items-center gap-2 px-4 py-2 rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-colors group outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                            aria-label="Close viewer"
                        >
                            <span className="text-sm font-medium">Yopish</span>
                            <div className="bg-white/10 rounded-full p-1 group-hover:bg-white/20 transition-colors">
                                <XIcon className="w-3.5 h-3.5" />
                            </div>
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        )}
    </>);
};
