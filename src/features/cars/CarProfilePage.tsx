import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Car, CarDocument } from '../../core/types/car.types';
import { Driver } from '../../core/types/driver.types';
import { ChevronLeftIcon, EditIcon, TrashIcon, CameraIcon } from '../../../components/Icons';
import { Wrench as WrenchIcon } from 'lucide-react';
import { forceDownload } from '../../../utils/downloadHelper';
import CarDamageTab from './components/CarDamageTab';
import ConfirmModal from '../../../components/ConfirmModal';
import { LicensePlate } from '../../components/ui/LicensePlate';

interface Props {
    cars: Car[];
    drivers: Driver[];
    theme: 'light' | 'dark';
    userRole: 'admin' | 'viewer';
    adminName?: string;
    onEditCar?: (car: Car) => void;
    onDeleteCar?: (id: string) => void;
    onSaveCar?: (car: Car) => void;
}

const fmt = (n: number) => `${new Intl.NumberFormat('uz-UZ').format(Math.round(n))} UZS`;

function getFriendlyDocName(doc: CarDocument): string {
    switch (doc.category) {
        case 'id_card':            return 'Avtomobil texpassporti (ID karta)';
        case 'technical_passport': return "Texnik ko'rik";
        case 'insurance':          return "Sug'urta polisi";
        case 'other':              return 'Boshqa hujjat';
        default:                   return doc.name || 'Hujjat';
    }
}

export const CarProfilePage: React.FC<Props> = ({
    cars, drivers, theme, userRole, adminName, onEditCar, onDeleteCar, onSaveCar
}) => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isDark = theme === 'dark';
    
    const car = cars.find(c => c.id === id);
    const driver = car ? drivers.find(d => d.id === car.assignedDriverId && !d.isDeleted) : undefined;
    
    const [viewingDoc, setViewingDoc] = useState<{ name: string; data: string } | null>(null);
    const [repairConfirm, setRepairConfirm] = useState<{ isOpen: boolean; targetStatus: boolean }>({ isOpen: false, targetStatus: false });

    if (!car) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center h-full">
                <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Avtomobil topilmadi</p>
                <button onClick={() => navigate('/cars')} className="mt-4 px-4 py-2 bg-[#0f766e] text-white rounded-xl font-bold">Ortga qaytish</button>
            </div>
        );
    }

    const docs = car.documents || [];
    const bg = isDark ? 'bg-surface border-white/[0.07]' : 'bg-white border-gray-200';
    const bdr = isDark ? 'border-white/[0.07]' : 'border-gray-200';
    const txt = isDark ? 'text-white' : 'text-gray-900';
    const muted = isDark ? 'text-white/40' : 'text-gray-500';
    const isAssigned = !!driver;

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12">
            {/* Header Area */}
            <div className={`relative overflow-hidden rounded-3xl border shadow-sm ${bg} h-64 md:h-72`}>
                {car.avatar ? (
                    <img src={car.avatar} alt={car.name} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                    <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2 ${isDark ? 'bg-[#0d1829]' : 'bg-slate-100'}`}>
                        <CameraIcon className={`w-12 h-12 ${isDark ? 'text-white/10' : 'text-slate-300'}`} />
                        <span className={`text-sm font-semibold ${isDark ? 'text-white/20' : 'text-slate-400'}`}>Rasm yo'q</span>
                    </div>
                )}
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/40" />

                {/* Top Bar Navigation & Controls */}
                <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                    <button 
                        onClick={() => navigate('/cars')}
                        className="w-10 h-10 flex items-center justify-center rounded-2xl bg-black/40 hover:bg-black/60 backdrop-blur-md text-white transition-colors border border-white/20"
                    >
                        <ChevronLeftIcon className="w-5 h-5" />
                    </button>

                    {userRole === 'admin' && (
                        <div className="flex gap-2">
                            <button 
                                onClick={() => onEditCar?.(car)}
                                className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white transition-colors border border-white/20"
                                title="Tahrirlash"
                            >
                                <EditIcon className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => {
                                    if (window.confirm("Rostdan ham bu avtomobilni o'chirmoqchimisiz?")) {
                                        onDeleteCar?.(car.id);
                                        navigate('/cars');
                                    }
                                }}
                                className="w-10 h-10 flex items-center justify-center rounded-2xl bg-red-500/30 hover:bg-red-500/50 backdrop-blur-md text-red-100 transition-colors border border-red-500/40"
                                title="O'chirish"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Bottom Left Info */}
                <div className="absolute bottom-5 left-5 right-5 md:bottom-6 md:left-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-white text-3xl md:text-4xl font-black tracking-tight drop-shadow-lg leading-none mb-3">
                            {car.name}
                        </h1>
                        <div className="flex flex-wrap items-center gap-3">
                            <div>
                                <LicensePlate plate={car.licensePlate} size="md" />
                            </div>
                            
                            {/* Badges */}
                            {car.inRepair ? (
                                <button
                                    onClick={() => {
                                        if (userRole === 'admin') setRepairConfirm({ isOpen: true, targetStatus: false });
                                    }}
                                    disabled={userRole !== 'admin'}
                                    className={`px-3 py-1.5 rounded-xl bg-red-500/90 hover:bg-red-500 active:scale-95 transition-all backdrop-blur-md border border-red-400 text-white text-[12px] font-bold shadow-sm flex items-center gap-2 ${userRole !== 'admin' ? 'cursor-default active:scale-100' : ''}`}
                                >
                                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                    Ta'mirda
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        if (userRole === 'admin') setRepairConfirm({ isOpen: true, targetStatus: true });
                                    }}
                                    disabled={userRole !== 'admin'}
                                    className={`px-3 py-1.5 rounded-xl transition-all active:scale-95 text-[12px] font-bold flex items-center gap-1.5 shadow-sm border ${
                                        isDark ? 'bg-black/50 hover:bg-black/70 border-white/20 text-gray-200 backdrop-blur-md' : 'bg-white/90 hover:bg-white border-white/50 text-gray-800 backdrop-blur-md'
                                    } ${userRole !== 'admin' ? 'cursor-default active:scale-100 hidden' : ''}`}
                                >
                                    <WrenchIcon className="w-3.5 h-3.5" />
                                    Ta'mirga yuborish
                                </button>
                            )}

                            {!isAssigned && !car.inRepair && (
                                <span className="px-3 py-1.5 rounded-xl bg-black/50 backdrop-blur-md border border-white/20 text-white text-[12px] font-bold shadow-sm">
                                    Bo'sh avtomobil
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Grid Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column: Plan & Driver & Docs */}
                <div className="space-y-6 lg:col-span-1">
                    
                    {/* Kunlik Reja */}
                    <div className={`p-6 rounded-3xl border shadow-sm ${isDark ? 'border-teal-500/30 bg-teal-500/[0.04]' : 'border-teal-200 bg-teal-50'}`}>
                        <p className={`text-[11px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-teal-500/80' : 'text-teal-700/80'}`}>Kunlik Reja</p>
                        {car.dailyPlan && car.dailyPlan > 0 ? (
                            <p className={`text-[36px] font-black font-mono leading-none tracking-tight ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                                {fmt(car.dailyPlan)}
                            </p>
                        ) : (
                            <p className={`text-[24px] font-bold ${isDark ? 'text-teal-400/50' : 'text-teal-600/50'}`}>Belgilanmagan</p>
                        )}
                    </div>

                    {/* Assigned Driver */}
                    <div className={`p-5 rounded-3xl border ${bg}`}>
                        <p className={`text-[11px] font-black uppercase tracking-wider mb-4 ${muted}`}>👤 Haydovchi</p>
                        {isAssigned ? (
                            <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 border ${bdr}`}>
                                    {driver!.avatar ? (
                                        <img src={driver!.avatar} alt={driver!.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className={`w-full h-full flex items-center justify-center font-bold text-[18px] ${isDark ? 'bg-surface-2 text-white/50' : 'bg-gray-100 text-gray-400'}`}>
                                            {driver!.name.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-[16px] font-bold truncate ${txt}`}>{driver!.name}</p>
                                    <p className={`text-[13px] font-medium font-mono mt-0.5 ${muted}`}>{driver!.phone}</p>
                                </div>
                            </div>
                        ) : (
                            <div className={`py-4 flex flex-col items-center justify-center text-center ${muted}`}>
                                <span className="text-3xl mb-2 opacity-50">🚶‍♂️</span>
                                <p className="text-[14px] font-bold">Hech kim biriktirilmagan</p>
                            </div>
                        )}
                    </div>

                    {/* Documents */}
                    <div className={`p-5 rounded-3xl border ${bg}`}>
                        <p className={`text-[11px] font-black uppercase tracking-wider mb-4 ${muted}`}>📄 Hujjatlar</p>
                        {docs.length > 0 ? (
                            <div className="space-y-4">
                                {Array.from(new Set(docs.map(d => d.category))).map(cat => {
                                    const catDocs = docs.filter(d => d.category === cat);
                                    return (
                                        <div key={cat}>
                                            <p className={`text-[11px] font-semibold uppercase tracking-wide mb-2 ${muted}`}>{getFriendlyDocName(catDocs[0])}</p>
                                            <div className="flex flex-wrap gap-2">
                                                {catDocs.map((doc, idx) => {
                                                    const isImage = doc.type?.startsWith('image/');
                                                    return isImage ? (
                                                        <button key={idx} type="button"
                                                            onClick={() => setViewingDoc({ name: doc.name, data: doc.data })}
                                                            className={`relative group overflow-hidden rounded-xl flex-shrink-0 border ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`}
                                                        >
                                                            <img src={doc.data} alt={doc.name} className="w-16 h-16 object-cover" />
                                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                                                <span className="text-white text-[10px] font-bold px-2 py-1 rounded border border-white/20 bg-white/10">Ko'rish</span>
                                                            </div>
                                                        </button>
                                                    ) : (
                                                        <button key={idx} onClick={() => forceDownload(doc.data, doc.name)}
                                                            className={`w-16 h-16 rounded-xl border flex flex-col items-center justify-center gap-1 transition-colors ${isDark ? 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}`}
                                                        >
                                                            <span className="text-xl">📄</span>
                                                            <span className="text-[9px] font-bold text-red-500">PDF</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-4 flex flex-col items-center justify-center text-center">
                                <span className={`text-2xl mb-2 ${isDark ? 'text-white/10' : 'text-gray-200'}`}>📁</span>
                                <p className={`text-[13px] font-medium ${muted}`}>Hujjatlar yuklanmagan</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Damages (Shikastlar) */}
                <div className="lg:col-span-2">
                    <div className={`rounded-3xl border overflow-hidden flex flex-col h-full ${bg}`}>
                        <div className={`px-5 py-4 border-b ${bdr} ${isDark ? 'bg-surface-2/50' : 'bg-gray-50'}`}>
                            <p className={`text-[12px] font-black uppercase tracking-wider ${muted}`}>🔧 Avtomobil shikastlari (Damages)</p>
                        </div>
                        <div className="flex-1 p-5">
                            <CarDamageTab
                                car={car}
                                isDark={isDark}
                                userRole={userRole}
                                adminName={adminName || 'Admin'}
                                onUpdated={(updatedDamage) => {
                                    if (onSaveCar) onSaveCar({ ...car, damage: updatedDamage });
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Document Viewer Modal */}
            {viewingDoc && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-8 bg-black/80 backdrop-blur-sm" onClick={() => setViewingDoc(null)}>
                    <div className="relative w-full max-w-4xl bg-black/50 rounded-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="absolute top-4 right-4 flex gap-2 z-10">
                            <button onClick={() => forceDownload(viewingDoc.data, viewingDoc.name)} className="px-4 py-2 bg-[#0f766e]/80 hover:bg-[#0f766e] text-white text-[12px] font-bold rounded-xl backdrop-blur-md transition-colors">Yuklab olish</button>
                            <button onClick={() => setViewingDoc(null)} className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md transition-colors border border-white/20">✕</button>
                        </div>
                        <img src={viewingDoc.data} alt={viewingDoc.name} className="w-full h-auto max-h-[85vh] object-contain" />
                    </div>
                </div>
            )}

            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={repairConfirm.isOpen}
                title={repairConfirm.targetStatus ? "Ta'mirga yuborish" : "Ta'mirdan chiqarish"}
                message={repairConfirm.targetStatus ? "Haqiqatan ham avtomobilni ta'mirga yubormoqchimisiz? Haydovchi uchun kunlik reja to'xtatiladi." : "Haqiqatan ham avtomobilni ta'mirdan chiqarmoqchimisiz? Kunlik reja hisoblanishi davom etadi."}
                confirmLabel="Tasdiqlash"
                cancelLabel="Bekor qilish"
                theme={theme}
                isDanger={repairConfirm.targetStatus}
                onConfirm={() => {
                    if (onSaveCar) onSaveCar({ ...car, inRepair: repairConfirm.targetStatus });
                    setRepairConfirm({ isOpen: false, targetStatus: false });
                }}
                onCancel={() => setRepairConfirm({ isOpen: false, targetStatus: false })}
            />
        </div>
    );
};
