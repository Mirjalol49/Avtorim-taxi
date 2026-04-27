import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Driver, DriverStatus } from '../../../core/types';
import { Car } from '../../../core/types/car.types';
import { Transaction } from '../../../core/types/transaction.types';
import { EditIcon, TrashIcon, CameraIcon, CarIcon, XIcon } from '../../../../components/Icons';
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

const fmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n));

export const DriverCard: React.FC<DriverCardProps> = ({
    driver, car, transactions, fleetId, theme, userRole, onEdit, onDelete,
}) => {
    const { t } = useTranslation();
    const [viewingDoc, setViewingDoc] = useState<{ name: string; data: string; category?: string } | null>(null);
    const isDark = theme === 'dark';

    const explicitDailyPlan = car && car.dailyPlan > 0
        ? (car.dailyPlan as number)
        : (((driver as any).dailyPlan ?? 0) as number);
    const docs = driver.documents ?? [];

    const handleEdit = (e: React.MouseEvent) => { e.stopPropagation(); onEdit(driver); };
    const handleDelete = (e: React.MouseEvent) => { e.stopPropagation(); onDelete(driver.id); };

    const getFriendlyDocName = (doc: any) => {
        if (doc.category) {
            switch (doc.category) {
                case 'driver_license': return 'Haydovchilik guvohnomasi';
                case 'passport': return 'Pasport';
                case 'car_registration': return 'Texnik pasport';
                case 'car_insurance': return "Sug'urta";
            }
        }
        const filename = doc.name || '';
        const lower = filename.toLowerCase();
        if (lower.includes('id') || lower.includes('pasport') || lower.includes('passport')) return 'ID / Pasport';
        if (lower.includes('prava') || lower.includes('license') || lower.includes('guvohnoma')) return 'Haydovchilik guvohnomasi';
        if (lower.includes('tex') || lower.includes('tech')) return 'Texnik pasport';
        if (lower.includes('sug') || lower.includes('insur')) return "Sug'urta";
        if (lower.includes('rxsat') || lower.includes('licence') || lower.includes('lits')) return 'Litsenziya';
        const nameWithoutExt = filename.split('.').slice(0, -1).join('.') || filename;
        return nameWithoutExt.replace(/[_-]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
    };

    return (<>
        <div className={`rounded-2xl flex flex-col transition-all duration-200 border overflow-hidden ${
            isDark
                ? 'bg-surface border-white/[0.07] hover:border-white/[0.13] hover:shadow-[0_4px_20px_rgba(0,0,0,0.5)]'
                : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-[0_4px_20px_rgba(0,60,80,0.08)]'
        }`}>

            {/* ── Header ── */}
            <div className="p-4 flex items-center gap-3.5">
                {/* Avatar */}
                <div className={`w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 border-2 ${
                    isDark ? 'border-white/[0.08]' : 'border-gray-100'
                }`}>
                    {driver.avatar ? (
                        <img src={driver.avatar} className="w-full h-full object-cover" alt={driver.name} />
                    ) : (
                        <div className={`w-full h-full flex items-center justify-center text-lg font-black ${
                            isDark ? 'bg-surface-2 text-gray-300' : 'bg-gray-100 text-gray-500'
                        }`}>
                            {driver.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <h3 className={`font-bold text-[15px] leading-tight truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {driver.name}
                        </h3>
                        {explicitDailyPlan > 0 && (
                            <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-lg tabular-nums ${
                                isDark ? 'bg-teal-500/10 text-teal-400' : 'bg-teal-50 text-teal-700'
                            }`}>
                                {fmt(explicitDailyPlan)}
                            </span>
                        )}
                    </div>
                    <p className={`text-[13px] mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {driver.phone}
                    </p>
                    {driver.extraPhone && (
                        <p className={`text-[12px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                            {driver.extraPhone}
                        </p>
                    )}
                </div>
            </div>

            {/* ── Car row ── */}
            <div className={`mx-4 mb-3 rounded-xl border flex items-center gap-3 p-2.5 ${
                isDark ? 'bg-surface-2 border-white/[0.06]' : 'bg-gray-50 border-gray-100'
            }`}>
                {car ? (<>
                    {/* Car thumbnail */}
                    <div className={`w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border ${
                        isDark ? 'border-white/[0.08] bg-surface' : 'border-gray-200 bg-white'
                    }`}>
                        {car.avatar ? (
                            <img src={car.avatar} alt={car.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <CarIcon className={`w-5 h-5 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                            </div>
                        )}
                    </div>
                    {/* Car info */}
                    <div className="flex-1 min-w-0">
                        <p className={`text-[13px] font-semibold truncate leading-tight ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                            {car.name}
                        </p>
                        <span className={`inline-block mt-1 text-[10px] font-mono font-bold tracking-widest px-1.5 py-0.5 rounded border ${
                            isDark ? 'bg-surface border-white/[0.08] text-gray-400' : 'bg-white border-gray-200 text-gray-600'
                        }`}>
                            {car.licensePlate}
                        </span>
                    </div>
                </>) : (
                    <>
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-surface' : 'bg-gray-100'}`}>
                            <CarIcon className={`w-4 h-4 opacity-30 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                        </div>
                        <span className={`text-[12px] font-medium ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                            Avtomobil biriktirilmagan
                        </span>
                    </>
                )}
            </div>

            {/* ── Documents as chips ── */}
            {docs.length > 0 && (
                <div className="px-4 mb-3 flex flex-wrap gap-1.5">
                    {docs.map((doc, i) => {
                        const isImage = doc.type && doc.type.startsWith('image/');
                        return (
                            <button
                                key={i}
                                type="button"
                                onClick={e => {
                                    e.stopPropagation();
                                    if (isImage) setViewingDoc({ name: doc.name, data: doc.data, category: doc.category });
                                    else window.open(doc.data, '_blank');
                                }}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                                    isDark
                                        ? 'bg-surface-2 border-white/[0.06] text-gray-400 hover:text-gray-200 hover:border-white/[0.12]'
                                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-white'
                                }`}
                            >
                                <span>{isImage ? '🖼' : '📄'}</span>
                                <span className="truncate max-w-[120px]">{getFriendlyDocName(doc)}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ── Actions ── */}
            {userRole === 'admin' && (
                <div className={`flex gap-2 p-3.5 border-t mt-auto ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                    <button
                        onClick={handleEdit}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[13px] font-semibold transition-all active:scale-95 border ${
                            isDark
                                ? 'bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 border-teal-500/15'
                                : 'bg-teal-50 text-teal-700 hover:bg-teal-100 border-teal-200'
                        }`}
                    >
                        <EditIcon className="w-3.5 h-3.5" />
                        <span>{t('edit')}</span>
                    </button>
                    <button
                        onClick={handleDelete}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[13px] font-semibold transition-all active:scale-95 border ${
                            isDark
                                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/15'
                                : 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200'
                        }`}
                    >
                        <TrashIcon className="w-3.5 h-3.5" />
                        <span>{t('delete')}</span>
                    </button>
                </div>
            )}
        </div>

        {/* Image viewer portal */}
        {viewingDoc && typeof document !== 'undefined' && createPortal(
            <div
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8"
                role="dialog" aria-modal="true"
            >
                <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-xl"
                    onClick={e => { e.stopPropagation(); setViewingDoc(null); }}
                />
                <div className="relative z-10 w-full max-w-5xl h-full flex flex-col items-center justify-center pointer-events-none">
                    <div className="relative p-2 bg-white/5 backdrop-blur-md rounded-2xl shadow-2xl pointer-events-auto max-h-[80vh] flex items-center justify-center overflow-hidden border border-white/10">
                        <img
                            src={viewingDoc.data}
                            alt={getFriendlyDocName(viewingDoc)}
                            className="max-w-full max-h-full object-contain rounded-xl"
                        />
                    </div>
                    <div className="absolute bottom-8 sm:bottom-12 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-4 bg-surface border border-white/10 rounded-full pl-6 pr-2 py-2 shadow-2xl">
                        <span className="text-sm font-medium text-white">{getFriendlyDocName(viewingDoc)}</span>
                        <div className="w-px h-4 bg-white/20 mx-1" />
                        <button
                            onClick={e => { e.stopPropagation(); setViewingDoc(null); }}
                            className="flex items-center gap-2 px-4 py-2 rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <span className="text-sm font-medium">Yopish</span>
                            <div className="bg-white/10 rounded-full p-1 hover:bg-white/20 transition-colors">
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
