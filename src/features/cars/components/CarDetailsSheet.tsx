import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Car, CarDocument, CAR_PARTS, CarDamage } from '../../../core/types/car.types';
import { Driver } from '../../../core/types/driver.types';
import { XIcon, EditIcon, TrashIcon, PhoneIcon, CameraIcon } from '../../../../components/Icons';
import { Wrench as WrenchIcon } from 'lucide-react';
import { supabase } from '../../../../supabase';
import { forceDownload } from '../../../../utils/downloadHelper';
import CarDamageTab from './CarDamageTab';
import ConfirmModal from '../../../../components/ConfirmModal';
import { LicensePlate } from '../../../components/ui/LicensePlate';

interface Props {
    car: Car | null;
    driver: Driver | undefined;
    theme: 'light' | 'dark';
    userRole: 'admin' | 'viewer';
    adminName?: string;
    isOpen: boolean;
    onClose: () => void;
    onEdit: (car: Car) => void;
    onSaveCar: (car: Car) => void;
    onDelete: (id: string) => void;
    onUpdated: (updatedDamage: CarDamage[]) => void;
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

export const CarDetailsSheet: React.FC<Props> = ({
    car, driver, theme, userRole, adminName, isOpen, onClose, onEdit, onSaveCar, onDelete, onUpdated
}) => {
    const isDark = theme === 'dark';

    const [visible, setVisible] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);
    const [internalCar, setInternalCar] = useState<Car | null>(null);
    const [internalDriver, setInternalDriver] = useState<Driver | undefined>(undefined);
    const [viewingDoc, setViewingDoc] = useState<{ name: string; data: string } | null>(null);
    const [docs, setDocs] = useState<CarDocument[]>([]);
    const [activeTab, setActiveTab] = useState<'general' | 'damages'>('general');
    const [repairConfirm, setRepairConfirm] = useState<{ isOpen: boolean; targetStatus: boolean }>({ isOpen: false, targetStatus: false });

    useEffect(() => {
        if (car) setInternalCar(car);
        if (driver !== undefined) setInternalDriver(driver);
    }, [car, driver]);

    const activeCar = car || internalCar;
    const activeDriver = driver !== undefined ? driver : internalDriver;

    // Fetch documents on demand
    useEffect(() => {
        if (isOpen && activeCar?.id) {
            setActiveTab('general'); // Reset tab when opened
            supabase.from('cars').select('documents').eq('id', activeCar.id).single()
                .then(({ data, error }) => {
                    if (!error && data?.documents) {
                        setDocs(data.documents);
                    } else {
                        setDocs([]);
                    }
                });
        } else if (!isOpen && !shouldRender) {
            setDocs([]);
        }
    }, [isOpen, activeCar?.id, shouldRender]);

    // Animate open/close
    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            document.body.style.overflow = 'hidden';
            const timer = setTimeout(() => setVisible(true), 10);
            return () => clearTimeout(timer);
        } else if (shouldRender) {
            setVisible(false);
            const timer = setTimeout(() => {
                setShouldRender(false);
                document.body.style.overflow = '';
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen, shouldRender]);

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', h);
        return () => document.removeEventListener('keydown', h);
    }, [onClose]);

    if (!shouldRender || !activeCar) return null;

    // Theme utility classes
    const bg   = isDark ? 'bg-surface border-l border-white/[0.08]' : 'bg-gray-50 border-l border-gray-200';
    const bg2  = isDark ? 'bg-[#151e2e]' : 'bg-white';
    const txt  = isDark ? 'text-white' : 'text-gray-900';
    const sub  = isDark ? 'text-gray-300' : 'text-gray-600';
    const muted= isDark ? 'text-gray-500' : 'text-gray-400';
    const bdr  = isDark ? 'border-white/[0.08]' : 'border-gray-200';

    const damages = activeCar?.damage || [];
    const isAssigned = !!activeDriver;

    return createPortal(
        <div className="fixed inset-0 z-[200] flex justify-end" style={{ pointerEvents: isOpen ? 'auto' : 'none' }}>
            {/* Backdrop */}
            <div 
                className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
            />

            {/* Sheet */}
            <div 
                className={`relative w-full max-w-md h-full shadow-2xl flex flex-col transition-transform duration-300 ease-out will-change-transform ${bg} ${visible ? 'translate-x-0' : 'translate-x-full'}`}
                style={{ zIndex: 201 }}
            >
                {/* ── HEADER ── */}
                <div className={`relative flex-shrink-0 border-b ${bdr}`}>
                    {/* Cover image area */}
                    <div className={`h-40 w-full relative overflow-hidden ${isDark ? 'bg-[#0d1829]' : 'bg-gray-100'}`}>
                        {activeCar?.avatar ? (
                            <img src={activeCar.avatar} alt={activeCar.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                                <CameraIcon className={`w-10 h-10 ${isDark ? 'text-white/10' : 'text-gray-200'}`} />
                                <span className={`text-xs ${isDark ? 'text-white/15' : 'text-gray-300'}`}>Rasm yo'q</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />

                        {/* Top action buttons */}
                        <div className="absolute top-4 right-4 flex gap-2">
                            {userRole === 'admin' && activeCar && (
                                <>
                                    <button 
                                        onClick={() => onEdit(activeCar)}
                                        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-colors border border-white/10"
                                        title="Tahrirlash"
                                    >
                                        <EditIcon className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => onDelete(activeCar.id)}
                                        className="w-9 h-9 rounded-full bg-red-500/20 hover:bg-red-500/40 backdrop-blur-md flex items-center justify-center text-red-100 transition-colors border border-red-500/30"
                                        title="O'chirish"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </>
                            )}
                            <button 
                                onClick={onClose}
                                className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white transition-colors border border-white/10"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Car Name & Plate */}
                        <div className="absolute bottom-4 left-5 right-5">
                            <h2 className="text-white text-2xl font-black tracking-tight drop-shadow-md leading-none">
                                {activeCar?.name}
                            </h2>
                            <div className="flex items-center gap-2 mt-2">
                                <div>
                                    <LicensePlate plate={activeCar?.licensePlate || ''} size="md" />
                                </div>
                                {activeCar?.inRepair ? (
                                    <button
                                        onClick={() => {
                                            if (userRole === 'admin' && activeCar) {
                                                setRepairConfirm({ isOpen: true, targetStatus: false });
                                            }
                                        }}
                                        disabled={userRole !== 'admin'}
                                        className={`px-2.5 py-1.5 rounded-lg bg-red-500/80 hover:bg-red-500/90 active:scale-95 transition-all backdrop-blur-sm border border-red-500/50 text-white text-[12px] font-semibold leading-none flex items-center gap-1.5 shadow-sm ${userRole !== 'admin' ? 'cursor-default active:scale-100' : ''}`}
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                        Ta'mirda
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            if (userRole === 'admin' && activeCar) {
                                                setRepairConfirm({ isOpen: true, targetStatus: true });
                                            }
                                        }}
                                        disabled={userRole !== 'admin'}
                                        className={`px-2.5 py-1.5 rounded-lg transition-all active:scale-95 text-[12px] font-semibold leading-none flex items-center gap-1.5 border shadow-sm ${
                                            isDark ? 'bg-black/40 hover:bg-black/60 border-white/10 text-gray-300 backdrop-blur-sm' : 'bg-white/80 hover:bg-white border-gray-200/50 text-gray-700 backdrop-blur-sm'
                                        } ${userRole !== 'admin' ? 'cursor-default active:scale-100 hidden' : ''}`}
                                    >
                                        <WrenchIcon className="w-3 h-3" />
                                        Ta'mirga yuborish
                                    </button>
                                )}
                                {!isAssigned && (
                                    <span className="px-2.5 py-1 rounded-lg bg-black/40 backdrop-blur-sm border border-white/15 text-white/80 text-[12px] font-semibold leading-none">
                                        Bo'sh avtomobil
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── TABS NAVIGATION ── */}
                <div className={`flex items-center px-5 pt-3 flex-shrink-0 border-b ${bdr} ${bg}`}>
                    <div className="flex gap-6 w-full">
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`relative pb-3 text-[13px] font-bold transition-colors ${activeTab === 'general' ? (isDark ? 'text-teal-400' : 'text-teal-600') : muted}`}
                        >
                            Umumiy
                            {activeTab === 'general' && (
                                <div className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full ${isDark ? 'bg-teal-400' : 'bg-teal-600'}`} />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('damages')}
                            className={`relative pb-3 text-[13px] font-bold transition-colors flex items-center gap-1.5 ${activeTab === 'damages' ? (isDark ? 'text-teal-400' : 'text-teal-600') : muted}`}
                        >
                            Shikastlar
                            {damages.length > 0 && (
                                <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black leading-none ${activeTab === 'damages' ? (isDark ? 'bg-teal-500/20 text-teal-300' : 'bg-teal-100 text-teal-700') : (isDark ? 'bg-white/10 text-white/50' : 'bg-gray-200 text-gray-500')}`}>
                                    {damages.length}
                                </span>
                            )}
                            {activeTab === 'damages' && (
                                <div className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full ${isDark ? 'bg-teal-400' : 'bg-teal-600'}`} />
                            )}
                        </button>
                    </div>
                </div>

                {/* ── SCROLLABLE BODY ── */}
                <div className={`flex-1 overflow-y-auto ${bg2}`}>
                    {activeTab === 'general' ? (
                        <div className="p-5 space-y-4 animate-in fade-in duration-300">
                            
                            {/* Daily Plan & Status Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                {/* Kunlik reja */}
                                <div className={`rounded-2xl border px-4 py-3 ${isDark ? 'border-teal-500/15 bg-teal-500/[0.06]' : 'border-teal-200 bg-teal-50'}`}>
                                    <p className={`text-[10px] font-black uppercase tracking-wider mb-1 ${isDark ? 'text-teal-500/70' : 'text-teal-600/70'}`}>Kunlik reja</p>
                                    {activeCar?.dailyPlan && activeCar.dailyPlan > 0 ? (
                                        <>
                                            <p className={`text-[18px] font-black font-mono tabular-nums ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>{fmt(activeCar.dailyPlan)}</p>
                                            <p className={`text-[10px] ${muted}`}>UZS / kun</p>
                                        </>
                                    ) : (
                                        <p className={`text-[14px] font-bold ${isDark ? 'text-teal-400/50' : 'text-teal-600/50'}`}>Belgilanmagan</p>
                                    )}
                                </div>

                                {/* Driver Assignment */}
                                <div className={`rounded-2xl border px-4 py-3 flex flex-col justify-between ${isDark ? 'border-white/[0.07] bg-white/[0.03]' : 'border-gray-200 bg-gray-50'}`}>
                                    <p className={`text-[10px] font-black uppercase tracking-wider mb-1 ${muted}`}>Haydovchi</p>
                                    {isAssigned ? (
                                        <>
                                            <div className="flex flex-col gap-1.5 mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full overflow-hidden border border-white/20 bg-black/20 flex-shrink-0">
                                                        {activeDriver!.avatar ? (
                                                            <img src={activeDriver!.avatar} alt={activeDriver!.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-[10px] text-white font-bold">{activeDriver!.name.charAt(0)}</div>
                                                        )}
                                                    </div>
                                                    <p className={`text-[13px] font-bold truncate ${txt}`}>{activeDriver!.name.split(' ')[0]}</p>
                                                </div>
                                                {activeDriver!.phone && (
                                                    <p className={`text-[11px] font-mono font-medium pl-8 ${sub}`}>{activeDriver!.phone}</p>
                                                )}
                                            </div>
                                            {activeDriver!.phone && (
                                                <a href={`tel:${activeDriver!.phone}`} className={`text-[11px] font-bold px-3 py-1 rounded-lg self-start transition-colors ${isDark ? 'bg-white/[0.05] text-white/40 hover:text-white' : 'bg-gray-200 text-gray-500 hover:text-gray-700'}`}>
                                                    Qo'ng'iroq
                                                </a>
                                            )}
                                        </>
                                    ) : (
                                        <p className={`text-[12px] font-semibold mt-1 ${muted}`}>Biriktirilmagan</p>
                                    )}
                                </div>
                            </div>

                        {/* Documents Section */}
                        <div className={`rounded-2xl border overflow-hidden ${isDark ? 'border-white/[0.07]' : 'border-gray-200'}`}>
                            <div className={`px-4 py-2.5 border-b ${bdr} ${bg2}`}>
                                <p className={`text-[10px] font-black uppercase tracking-wider ${muted}`}>📄 Hujjatlar</p>
                            </div>
                            <div className={`px-4 py-3 space-y-4 ${bg}`}>
                                {docs.length > 0 ? (
                                    Array.from(new Set(docs.map(d => d.category))).map(cat => {
                                        const catDocs = docs.filter(d => d.category === cat);
                                        return (
                                            <div key={cat}>
                                                <p className={`text-[10px] font-semibold uppercase tracking-wide mb-2 ${muted}`}>{getFriendlyDocName(catDocs[0])}</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {catDocs.map((doc, idx) => {
                                                        const isImage = doc.type?.startsWith('image/');
                                                        return isImage ? (
                                                            <button key={idx} type="button"
                                                                onClick={() => setViewingDoc({ name: doc.name, data: doc.data })}
                                                                className={`relative group overflow-hidden rounded-xl flex-shrink-0 border ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`}
                                                            >
                                                                <img src={doc.data} alt={doc.name} className="w-20 h-20 object-cover" />
                                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                                                    <span className="text-white text-[10px] font-bold px-2 py-1 rounded border border-white/20 bg-white/10">Ko'rish</span>
                                                                </div>
                                                                {catDocs.length > 1 && (
                                                                    <span className={`absolute bottom-0 left-0 right-0 text-[9px] font-bold text-center py-0.5 bg-black/60 text-white`}>{idx+1}-rasm</span>
                                                                )}
                                                            </button>
                                                        ) : (
                                                            <button key={idx} onClick={(e) => { e.stopPropagation(); forceDownload(doc.data, doc.name); }}
                                                                className={`w-20 h-20 rounded-xl border flex flex-col items-center justify-center gap-1 transition-colors ${isDark ? 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}`}
                                                            >
                                                                <span className="text-2xl">📄</span>
                                                                <span className="text-[9px] font-bold text-red-500">PDF</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="py-2 flex flex-col items-center justify-center gap-2">
                                        <span className={`text-2xl ${isDark ? 'text-white/10' : 'text-gray-200'}`}>📁</span>
                                        <p className={`text-[12px] font-medium ${muted}`}>Hujjatlar biriktirilmagan</p>
                                    </div>
                                )}
                            </div>
                            </div>
                        </div>
                    ) : activeCar ? (
                        <CarDamageTab
                            car={activeCar}
                            isDark={isDark}
                            userRole={userRole}
                            adminName={adminName || 'Admin'}
                            onUpdated={onUpdated}
                        />
                    ) : null}
                </div>
            </div>

            {/* Document Viewer Modal (Simple full-screen image preview) */}
            {viewingDoc && (
                <div 
                    className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-xl flex items-center justify-center p-4 transition-opacity animate-in fade-in duration-200"
                    onClick={() => setViewingDoc(null)}
                >
                    <button 
                        onClick={() => setViewingDoc(null)}
                        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors backdrop-blur-md border border-white/10"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                    <img 
                        src={viewingDoc.data} 
                        alt={viewingDoc.name} 
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                        onClick={e => e.stopPropagation()} 
                    />
                </div>
            )}

            <ConfirmModal
                isOpen={repairConfirm.isOpen}
                title={repairConfirm.targetStatus ? "Ta'mirga yuborish" : "Ta'mirdan chiqarish"}
                message={repairConfirm.targetStatus ? "Haqiqatan ham avtomobilni ta'mirga yubormoqchimisiz? Haydovchi uchun kunlik reja to'xtatiladi." : "Haqiqatan ham avtomobilni ta'mirdan chiqarmoqchimisiz? Kunlik reja hisoblanishi davom etadi."}
                confirmLabel="Tasdiqlash"
                cancelLabel="Bekor qilish"
                theme={theme}
                isDanger={repairConfirm.targetStatus}
                onConfirm={() => {
                    if (activeCar) {
                        onSaveCar({ ...activeCar, inRepair: repairConfirm.targetStatus });
                    }
                    setRepairConfirm({ isOpen: false, targetStatus: false });
                }}
                onCancel={() => setRepairConfirm({ isOpen: false, targetStatus: false })}
            />
        </div>,
        document.body
    );
};
