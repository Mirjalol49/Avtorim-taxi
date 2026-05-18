import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Car, CarDocument, CarDamage } from '../../core/types';
import { Driver } from '../../core/types';
import { SearchIcon, PlusIcon, EditIcon, TrashIcon, CameraIcon, DownloadIcon, AlertTriangleIcon, CheckIcon } from '../../../components/Icons';
import { exportCarsToExcel } from '../../../utils/exportToExcel';
import { formatNumberSmart } from '../../../utils/formatNumber';
import { ShieldAlert as ShieldAlertIcon, Wrench as WrenchIcon, SunDim as SunDimIcon, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { updateCar } from '../../../services/carsService';
import { LicensePlate } from '../../components/ui/LicensePlate';
import { useNavigate } from 'react-router-dom';

interface CarsPageProps {
    cars: Car[];
    drivers?: Driver[];
    isDataLoading: boolean;
    userRole: 'admin' | 'viewer';
    adminName?: string;
    onAddCar: () => void;
    onEditCar: (car: Car) => void;
    onSaveCar: (car: Car) => void;
    onDeleteCar: (id: string) => void;
    theme: 'light' | 'dark';
}

type FilterTab = 'all' | 'assigned' | 'available';

const ITEMS_PER_PAGE = 12;

// ─── Document Viewer Modal ─────────────────────────────────────────────────────

interface DocViewerState {
    docs: CarDocument[];
    index: number;
    carName: string;
}

function DocViewerModal({
    state,
    onClose,
}: {
    state: DocViewerState;
    onClose: () => void;
}) {
    const [idx, setIdx] = useState(state.index);
    const doc = state.docs[idx];
    const isPdf = doc.type === 'application/pdf';
    const total = state.docs.length;

    const prev = useCallback(() => setIdx(i => Math.max(0, i - 1)), []);
    const next = useCallback(() => setIdx(i => Math.min(total - 1, i + 1)), [total]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft')  prev();
            if (e.key === 'ArrowRight') next();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose, prev, next]);

    // Trigger browser download
    const handleDownload = () => {
        const a = document.createElement('a');
        a.href = doc.data;
        a.download = doc.name || 'document';
        a.click();
    };

    const categoryLabel: Record<string, string> = {
        id_card: 'Texpassport',
        insurance: 'Sug\'urta',
        technical_passport: 'Tex.Passport',
        other: 'Hujjat',
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[300] flex flex-col bg-black/60 backdrop-blur-xl"
            style={{ animation: 'fadeIn 0.15s ease-out' }}
        >
            {/* ── Top bar ── */}
            <div className="flex items-center justify-between px-4 py-3 flex-shrink-0 border-b border-white/[0.08]">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/10 flex-shrink-0">
                        <span className="text-base">{isPdf ? '📄' : '🖼️'}</span>
                    </div>
                    <div className="min-w-0">
                        <p className="text-white font-semibold text-[14px] truncate leading-tight">
                            {doc.name}
                        </p>
                        <p className="text-white/40 text-[11px] truncate">
                            {state.carName} · {categoryLabel[doc.category] ?? 'Hujjat'}
                            {total > 1 && ` · ${idx + 1} / ${total}`}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    {/* Download */}
                    <button
                        onClick={handleDownload}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-[12px] bg-teal-500 hover:bg-teal-400 active:scale-95 transition-all text-white text-[13px] font-bold shadow-lg"
                        title="Yuklab olish"
                    >
                        <DownloadIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Yuklab olish</span>
                    </button>

                    {/* Close */}
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all active:scale-90"
                        title="Yopish (Esc)"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* ── Content area ── */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                {isPdf ? (
                    <iframe
                        src={doc.data}
                        className="w-full h-full border-0"
                        title={doc.name}
                    />
                ) : (
                    <img
                        key={idx}
                        src={doc.data}
                        alt={doc.name}
                        className="max-w-full max-h-full object-contain select-none"
                        style={{ animation: 'fadeIn 0.18s ease-out' }}
                        draggable={false}
                    />
                )}

                {/* Prev / Next arrows */}
                {total > 1 && (
                    <>
                        <button
                            onClick={prev}
                            disabled={idx === 0}
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 hover:bg-black/70 border border-white/15 text-white flex items-center justify-center transition-all active:scale-90 disabled:opacity-20 disabled:cursor-not-allowed backdrop-blur-sm"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <button
                            onClick={next}
                            disabled={idx === total - 1}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 hover:bg-black/70 border border-white/15 text-white flex items-center justify-center transition-all active:scale-90 disabled:opacity-20 disabled:cursor-not-allowed backdrop-blur-sm"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </>
                )}
            </div>

            {/* ── Thumbnail strip (if multiple docs) ── */}
            {total > 1 && (
                <div className="flex-shrink-0 flex items-center justify-center gap-2 py-3 px-4 border-t border-white/[0.08]">
                    {state.docs.map((d, i) => (
                        <button
                            key={i}
                            onClick={() => setIdx(i)}
                            className={`w-10 h-10 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${
                                i === idx ? 'border-teal-400 scale-110' : 'border-white/20 opacity-50 hover:opacity-80'
                            }`}
                        >
                            {d.type === 'application/pdf' ? (
                                <div className="w-full h-full bg-white/10 flex items-center justify-center text-base">📄</div>
                            ) : (
                                <img src={d.data} alt={d.name} className="w-full h-full object-cover" />
                            )}
                        </button>
                    ))}
                </div>
            )}

            {/* ── Backdrop click to close ── */}
            <style>{`@keyframes fadeIn { from { opacity:0 } to { opacity:1 } }`}</style>
        </div>,
        document.body
    );
}

import ConfirmModal from '../../../components/ConfirmModal';

const CarsPage: React.FC<CarsPageProps> = ({
    cars, drivers = [], isDataLoading, userRole, adminName = 'Admin', onAddCar, onEditCar, onSaveCar, onDeleteCar, theme
}) => {
    const isDark = theme === 'dark';
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [filterTab, setFilterTab] = useState<FilterTab>('all');
    const [docViewer, setDocViewer] = useState<DocViewerState | null>(null);
    const [clearedWarnings, setClearedWarnings] = useState<Set<string>>(new Set());
    const [repairConfirm, setRepairConfirm] = useState<{ isOpen: boolean; car: Car | null; targetRepairState: boolean }>({ isOpen: false, car: null, targetRepairState: false });

    const getDriver = (car: Car) => drivers.find(d => d.id === car.assignedDriverId && !d.isDeleted);

    const filtered = useMemo(() => {
        let list = cars.filter(c => !c.isDeleted &&
            (c.name.toLowerCase().includes(search.toLowerCase()) ||
             c.licensePlate.toLowerCase().includes(search.toLowerCase()))
        );
        if (filterTab === 'assigned')  list = list.filter(c => !!getDriver(c));
        if (filterTab === 'available') list = list.filter(c => !getDriver(c));
        return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cars, search, filterTab, drivers]);

    const globalWarnings = useMemo(() => {
        const MS_IN_DAY = 1000 * 60 * 60 * 24;
        const now = Date.now();
        
        type ExpiryDoc = { docName: string; docType: 'insurance' | 'tech' | 'tinting'; days: number };
        const grouped: { id: string; carName: string; plate: string; docs: ExpiryDoc[] }[] = [];

        cars.forEach(car => {
            if (car.isDeleted) return;
            const docs: ExpiryDoc[] = [];

            const check = (ms: number | undefined, name: string, type: 'insurance' | 'tech' | 'tinting') => {
                if (!ms) return;
                const days = Math.ceil((ms - now) / MS_IN_DAY);
                if (days <= 3) {
                    if (!clearedWarnings.has(`${car.id}-${type}`)) {
                        docs.push({ docName: name, docType: type, days });
                    }
                }
            };
            
            check(car.insuranceExpiryMs, "Sug'urta (OSAGO)", 'insurance');
            check(car.techInspectionExpiryMs, "Texnik ko'rik", 'tech');
            check(car.tintingExpiryMs, "Tanirovka", 'tinting');
            
            if (docs.length > 0) {
                docs.sort((a, b) => a.days - b.days);
                grouped.push({ id: car.id, carName: car.name, plate: car.licensePlate, docs });
            }
        });
        
        return grouped.sort((a, b) => a.docs[0].days - b.docs[0].days);
    }, [cars, clearedWarnings]);

    const totalPages    = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const paginated     = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
    const assignedCount = cars.filter(c => !c.isDeleted && !!getDriver(c)).length;
    const totalCount    = cars.filter(c => !c.isDeleted).length;

    const filterTabs: { id: FilterTab; label: string; count: number }[] = [
        { id: 'all',       label: 'Barchasi',      count: totalCount               },
        { id: 'assigned',  label: 'Biriktirilgan', count: assignedCount            },
        { id: 'available', label: "Bo'sh",          count: totalCount - assignedCount },
    ];

    const openDoc = (car: Car, index: number) => {
        const docs = car.documents ?? [];
        if (!docs.length) return;
        setDocViewer({ docs, index, carName: car.name });
    };

    const handleClearWarning = async (e: React.MouseEvent, carId: string, docType: 'insurance' | 'tech' | 'tinting') => {
        e.stopPropagation(); // prevent modal opening
        
        // Optimistic UI Update: instantly hide it
        const warningKey = `${carId}-${docType}`;
        setClearedWarnings(prev => new Set(prev).add(warningKey));
        
        try {
            const updates: any = {};
            if (docType === 'insurance') updates.insuranceExpiryMs = null;
            if (docType === 'tech') updates.techInspectionExpiryMs = null;
            if (docType === 'tinting') updates.tintingExpiryMs = null;
            
            await updateCar(carId, updates);
        } catch (err) {
            console.error('Error clearing warning:', err);
            // Revert optimistic update on failure
            setClearedWarnings(prev => {
                const next = new Set(prev);
                next.delete(warningKey);
                return next;
            });
        }
    };

    return (
        <div className="space-y-5">
        
            {/* ── Expiration Warnings Banner ── */}
            {globalWarnings.length > 0 && (
                <div className="bg-rose-50/40 border border-rose-100/60 dark:bg-rose-500/10 dark:border-rose-500/20 rounded-2xl p-5 mb-6 backdrop-blur-sm shadow-sm animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center mb-4">
                        <AlertTriangleIcon className="w-[18px] h-[18px] text-rose-500 mr-2" />
                        <h3 className="text-[13px] font-semibold text-rose-800 dark:text-rose-400 tracking-wide uppercase">
                            Diqqat: Hujjatlar muddati tugamoqda!
                        </h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {globalWarnings.map(group => {
                            const car = cars.find(c => c.id === group.id);
                            return (
                                <div 
                                    key={group.id} 
                                    onClick={() => car && onEditCar(car)}
                                    className="bg-white dark:bg-surface-2 rounded-xl p-4 border border-slate-100 dark:border-white/[0.05] shadow-sm hover:shadow-md hover:border-rose-300 dark:hover:border-rose-500/50 transition-all duration-200 flex flex-col group cursor-pointer active:scale-[0.98] relative overflow-hidden"
                                >
                                    {/* Action Hint Overlay */}
                                    <div className="absolute right-3 top-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center w-6 h-6 rounded-full bg-rose-50 text-rose-500">
                                        <ChevronRightIcon className="w-4 h-4" />
                                    </div>

                                    <div className="flex items-center mb-3 pr-8">
                                        <span className="text-[15px] font-bold text-slate-800 dark:text-gray-100 truncate">{group.carName}</span>
                                        <div className="flex-shrink-0 ml-3">
                                            <LicensePlate plate={group.plate} size="sm" />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        {group.docs.map((doc, idx) => {
                                            const Icon = doc.docType === 'insurance' ? ShieldAlertIcon : doc.docType === 'tech' ? WrenchIcon : SunDimIcon;
                                            
                                            // Dynamic Icon Colors
                                            const iconColor = doc.days <= 0 
                                                ? 'text-rose-400 group-hover:text-rose-500 dark:text-rose-400' 
                                                : doc.days === 1 
                                                ? 'text-amber-500 group-hover:text-amber-600 dark:text-amber-400' 
                                                : 'text-slate-500 group-hover:text-slate-700 dark:text-gray-400 dark:group-hover:text-gray-200';

                                            return (
                                                <div key={idx} className="flex items-center justify-between py-1.5 group/item">
                                                    <div className="flex items-center min-w-0 pr-2">
                                                        <div className={`flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-md bg-slate-100/70 dark:bg-white/[0.04] ring-1 ring-slate-200/50 dark:ring-white/[0.05] mr-2.5 transition-colors duration-200 group-hover/item:bg-white dark:group-hover/item:bg-white/[0.08] ${iconColor}`}>
                                                            <Icon size={14} strokeWidth={2.5} />
                                                        </div>
                                                        <span className="text-[13px] font-medium text-slate-600 dark:text-gray-300 truncate transition-colors duration-200 group-hover/item:text-slate-800 dark:group-hover/item:text-white">
                                                            {doc.docName}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {doc.days <= 0 ? (
                                                            <div className="bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                                                                {doc.days < 0 ? "O'tgan" : "Bugun"}
                                                            </div>
                                                        ) : (
                                                            <div className="bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                                                                {doc.days} kun qoldi
                                                            </div>
                                                        )}
                                                        {/* Quick Dismiss Checkmark */}
                                                        <button
                                                            onClick={(e) => handleClearWarning(e, group.id, doc.docType)}
                                                            className="flex-shrink-0 flex items-center justify-center w-[22px] h-[22px] rounded-[6px] bg-white dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.1] text-slate-400 dark:text-gray-500 hover:bg-[#34C759] hover:border-[#34C759] hover:text-white hover:shadow-sm hover:scale-110 active:scale-90 transition-all duration-200 opacity-0 group-hover/item:opacity-100 ml-1.5"
                                                            title="Ogohlantirishni o'chirish (Bajarildi)"
                                                        >
                                                            <CheckIcon size={14} strokeWidth={3.5} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Toolbar ── */}
            <div className="flex flex-col gap-3">
                <div className="flex gap-2.5">
                    <div className="flex-1 relative">
                        <SearchIcon className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDark ? 'text-white/25' : 'text-gray-400'}`} />
                        <input
                            type="text"
                            className={`w-full pl-10 pr-4 py-2.5 rounded-[14px] border text-[13px] font-medium outline-none transition-all ${isDark
                                ? 'bg-surface border-white/[0.07] text-white placeholder-white/25 focus:border-teal-500/40'
                                : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-teal-500/60'
                            }`}
                            placeholder="Avtomobil qidirish…"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-xs transition-colors ${isDark ? 'bg-white/10 text-white/40 hover:bg-white/20' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
                            >×</button>
                        )}
                    </div>

                    <button
                        onClick={() => exportCarsToExcel(filtered, drivers, 'Avtomobillar')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-[14px] text-[13px] font-semibold border transition-all active:scale-95 flex-shrink-0 ${isDark
                            ? 'bg-surface border-white/[0.07] text-white/40 hover:text-emerald-400 hover:border-emerald-500/25'
                            : 'bg-white border-gray-200 text-gray-400 hover:text-emerald-600 hover:border-emerald-300'
                        }`}
                        title="Excel"
                    >
                        <DownloadIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Excel</span>
                    </button>

                    {userRole === 'admin' && (
                        <button
                            onClick={onAddCar}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-[14px] font-bold text-[13px] bg-[#0f766e] hover:bg-[#0a5c56] text-white transition-all active:scale-95 shadow-sm flex-shrink-0"
                        >
                            <PlusIcon className="w-4 h-4" />
                            <span>Qo'shish</span>
                        </button>
                    )}
                </div>

                <div className="flex items-center justify-between">
                    <div className={`flex items-center gap-1 p-1 rounded-[14px] border ${isDark ? 'bg-surface border-white/[0.07]' : 'bg-gray-100/70 border-gray-200'}`}>
                        {filterTabs.map(tab => {
                            const active = filterTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => { setFilterTab(tab.id); setPage(1); }}
                                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[10px] text-[12px] font-bold transition-all ${
                                        active
                                            ? isDark ? 'bg-teal-500 text-white shadow-sm' : 'bg-white text-teal-700 shadow-sm border border-teal-100'
                                            : isDark ? 'text-white/35 hover:text-white/60' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    {tab.label}
                                    <span className={`min-w-[18px] h-[18px] px-1 rounded-md text-[10px] font-black flex items-center justify-center ${
                                        active
                                            ? isDark ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-700'
                                            : isDark ? 'bg-white/[0.05] text-white/25' : 'bg-gray-200 text-gray-400'
                                    }`}>{tab.count}</span>
                                </button>
                            );
                        })}
                    </div>
                    <span className={`text-[12px] ${isDark ? 'text-white/25' : 'text-gray-400'}`}>
                        {filtered.length} ta avtomobil
                    </span>
                </div>
            </div>

            {/* ── Loading skeleton ── */}
            {isDataLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className={`rounded-[20px] overflow-hidden animate-pulse ${isDark ? 'bg-surface border border-white/[0.05]' : 'bg-white border border-gray-100'}`}>
                            <div className={`aspect-[16/10] ${isDark ? 'bg-surface-3' : 'bg-gray-100'}`} />
                            <div className="p-4 space-y-2">
                                <div className={`h-3.5 rounded-full w-2/3 ${isDark ? 'bg-surface-2' : 'bg-gray-100'}`} />
                                <div className={`h-3 rounded-full w-1/3 ${isDark ? 'bg-surface-2' : 'bg-gray-100'}`} />
                            </div>
                        </div>
                    ))}
                </div>

            ) : filtered.length === 0 ? (
                <div className={`flex flex-col items-center justify-center py-20 rounded-[20px] border ${isDark ? 'border-white/[0.05] bg-surface' : 'border-gray-200 bg-white'}`}>
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${isDark ? 'bg-surface-2' : 'bg-gray-100'}`}>
                        <CameraIcon className={`w-8 h-8 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                    </div>
                    <p className={`text-base font-bold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {search ? 'Topilmadi' : "Avtomobil yo'q"}
                    </p>
                    <p className={`text-sm mb-5 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                        {search ? `"${search}" bo'yicha natija yo'q` : "Birinchi avtomobilingizni qo'shing"}
                    </p>
                    {userRole === 'admin' && !search && (
                        <button onClick={onAddCar} className="flex items-center gap-2 px-5 py-2.5 bg-[#0f766e] hover:bg-[#0a5c56] text-white rounded-[14px] text-sm font-bold transition-all active:scale-95">
                            <PlusIcon className="w-4 h-4" /> Avtomobil qo'shish
                        </button>
                    )}
                </div>

            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {paginated.map(car => (
                            <CarCard
                                key={car.id}
                                car={car}
                                driver={getDriver(car)}
                                userRole={userRole}
                                isDark={isDark}
                                onClick={() => navigate(`/cars/${car.id}`)}
                                onEdit={onEditCar}
                                onRepairConfirm={(car, targetStatus) => setRepairConfirm({ isOpen: true, car, targetRepairState: targetStatus })}
                                onDelete={onDeleteCar}
                                onDocClick={(index) => openDoc(car, index)}
                                onDamageClick={() => navigate(`/cars/${car.id}`)}
                            />
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-1.5">
                            <button
                                onClick={() => setPage(p => Math.max(p - 1, 1))}
                                disabled={page === 1}
                                className={`px-3.5 py-2 rounded-[12px] text-[13px] font-semibold border transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${isDark ? 'border-white/[0.07] bg-surface text-white/50 hover:bg-white/[0.05]' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                            >← Oldingi</button>

                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    className={`w-9 h-9 rounded-[12px] text-[13px] font-bold transition-all active:scale-95 ${p === page
                                        ? 'bg-[#0f766e] text-white shadow-sm'
                                        : isDark ? 'border border-white/[0.07] bg-surface text-white/35 hover:text-white' : 'border border-gray-200 bg-white text-gray-500 hover:text-gray-800'
                                    }`}
                                >{p}</button>
                            ))}

                            <button
                                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                                disabled={page === totalPages}
                                className={`px-3.5 py-2 rounded-[12px] text-[13px] font-semibold border transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${isDark ? 'border-white/[0.07] bg-surface text-white/50 hover:bg-white/[0.05]' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                            >Keyingi →</button>
                        </div>
                    )}
                </>
            )}

            {/* ── Document viewer modal ── */}
            {docViewer && (
                <DocViewerModal
                    state={docViewer}
                    onClose={() => setDocViewer(null)}
                />
            )}

            {/* ── Confirm Modal for Grid Actions ── */}
            <ConfirmModal
                isOpen={repairConfirm.isOpen}
                title={repairConfirm.targetRepairState ? "Ta'mirga yuborish" : "Ta'mirdan chiqarish"}
                message={repairConfirm.targetRepairState ? "Haqiqatan ham avtomobilni ta'mirga yubormoqchimisiz? Haydovchi uchun kunlik reja to'xtatiladi." : "Haqiqatan ham avtomobilni ta'mirdan chiqarmoqchimisiz? Kunlik reja hisoblanishi davom etadi."}
                confirmLabel="Tasdiqlash"
                cancelLabel="Bekor qilish"
                theme={theme}
                isDanger={repairConfirm.targetRepairState}
                onConfirm={() => {
                    if (repairConfirm.car) {
                        onSaveCar({ ...repairConfirm.car, inRepair: repairConfirm.targetRepairState });
                    }
                    setRepairConfirm({ isOpen: false, car: null, targetRepairState: false });
                }}
                onCancel={() => setRepairConfirm({ isOpen: false, car: null, targetRepairState: false })}
            />
        </div>
    );
};

// ─── Car Card ─────────────────────────────────────────────────────────────────

interface CardProps {
    car: Car;
    driver: Driver | undefined;
    userRole: 'admin' | 'viewer';
    isDark: boolean;
    onClick: () => void;
    onEdit: (car: Car) => void;
    onRepairConfirm: (car: Car, targetStatus: boolean) => void;
    onDelete: (id: string) => void;
    onDocClick: (index: number) => void;
    onDamageClick: () => void;
}

function CarCard({ car, driver, userRole, isDark, onClick, onEdit, onRepairConfirm, onDelete, onDocClick, onDamageClick }: CardProps) {
    const docs        = car.documents ?? [];
    const damages     = car.damage ?? [];
    const isAssigned  = !!driver;

    const expiryWarnings = useMemo(() => {
        const MS_IN_DAY = 1000 * 60 * 60 * 24;
        const now = Date.now();
        const warnings: string[] = [];
        const check = (ms: number | undefined, name: string) => {
            if (!ms) return;
            const days = Math.ceil((ms - now) / MS_IN_DAY);
            if (days <= 3) warnings.push(name);
        };
        check(car.insuranceExpiryMs, "Sug'urta");
        check(car.techInspectionExpiryMs, "Tex. ko'rik");
        check(car.tintingExpiryMs, "Tanirovka");
        return warnings;
    }, [car.insuranceExpiryMs, car.techInspectionExpiryMs, car.tintingExpiryMs]);

    return (
        <article 
            onClick={onClick}
            className={`group rounded-[24px] overflow-hidden flex flex-col transition-all duration-300 cursor-pointer ${
            isDark
                ? 'bg-surface border border-white/[0.07] hover:border-white/[0.15] hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)]'
                : 'bg-white border border-slate-100/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_40px_-10px_rgba(0,0,0,0.12)] hover:border-slate-200'
        }`}>

            {/* ── Image Zone ── */}
            <div className={`relative w-full h-[230px] flex-shrink-0 overflow-hidden ${isDark ? 'bg-surface/30' : 'bg-slate-100'}`}>
                {car.avatar ? (
                    <img
                        src={car.avatar}
                        alt={car.name}
                        className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                    />
                ) : (
                    <div className={`w-full h-full flex flex-col items-center justify-center gap-2 ${isDark ? 'bg-[#0d1829]' : 'bg-slate-50'}`}>
                        <CameraIcon className={`w-12 h-12 ${isDark ? 'text-white/10' : 'text-slate-200'}`} />
                    </div>
                )}
                
                {/* Status Badge (Top Right) */}
                <div className="absolute top-4 right-4 z-20">
                    {car.inRepair ? (
                        <span className="px-2.5 py-1 rounded-[8px] bg-red-500 text-white text-[9px] font-black tracking-widest shadow-sm">
                            TA'MIRDA
                        </span>
                    ) : isAssigned ? (
                        <span className="px-2.5 py-1 rounded-[8px] bg-emerald-500 text-white text-[9px] font-black tracking-widest shadow-sm">
                            BIRIKTIRILGAN
                        </span>
                    ) : (
                        <span className="px-2.5 py-1 rounded-[8px] bg-slate-500 text-white text-[9px] font-black tracking-widest shadow-sm">
                            BO'SH
                        </span>
                    )}
                </div>

                {/* Docs count badge (Top Left) */}
                {docs.length > 0 && (
                    <button
                        onClick={e => { e.stopPropagation(); onDocClick(0); }}
                        className={`absolute top-4 left-4 z-20 flex items-center gap-1 px-2 py-1.5 rounded-[10px] backdrop-blur-md border shadow-sm transition-all active:scale-90 ${
                            expiryWarnings.length > 0 
                                ? 'bg-rose-500/90 hover:bg-rose-600/90 border-rose-400/50 animate-pulse' 
                                : isDark ? 'bg-black/50 hover:bg-black/70 border-white/20' : 'bg-white/80 hover:bg-white border-slate-200/60 text-slate-800'
                        }`}
                        title={expiryWarnings.length > 0 ? `Ogohlantirish: ${expiryWarnings.join(', ')}` : "Hujjatlarni ko'rish"}
                    >
                        <span className="text-[11px]">{expiryWarnings.length > 0 ? '⚠️' : '📄'}</span>
                        <span className={`text-[11px] font-bold leading-none ${expiryWarnings.length > 0 ? 'text-white' : isDark ? 'text-white' : 'text-slate-800'}`}>
                            {docs.length}
                        </span>
                    </button>
                )}

                {/* Admin actions overlay (Hover in center) */}
                {userRole === 'admin' && (
                    <div className="absolute inset-0 m-auto flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30 pointer-events-none">
                        <div className="pointer-events-auto flex gap-3">
                            <button
                                onClick={e => { e.stopPropagation(); onEdit(car); }}
                                className={`w-10 h-10 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform ${isDark ? 'bg-white/10 text-white backdrop-blur-md border border-white/20 hover:bg-white/20' : 'bg-white text-slate-700 border border-slate-100 hover:bg-slate-50'}`}
                                title="Tahrirlash"
                            >
                                <EditIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={e => { e.stopPropagation(); onDelete(car.id); }}
                                className="w-10 h-10 rounded-full bg-rose-500/90 shadow-lg text-white flex items-center justify-center hover:bg-rose-500 hover:scale-110 transition-transform backdrop-blur-md"
                                title="O'chirish"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Metadata Zone ── */}
            <div className="px-5 pt-4 pb-1 w-full flex items-end justify-between z-20">
                {/* License Plate & Model */}
                <div className="flex flex-col items-start gap-1.5">
                    <LicensePlate plate={car.licensePlate} size="lg" />
                    <span className={`text-[12px] font-semibold leading-none ml-0.5 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                        {car.name}
                    </span>
                </div>

                {/* Driver Profile */}
                <div className="flex items-center gap-2.5 mb-1">
                    {isAssigned ? (
                        <>
                            <span className={`text-[12px] font-bold ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                                {driver!.name.split(' ')[0]}
                            </span>
                            <div className={`w-7 h-7 rounded-full overflow-hidden flex-shrink-0 shadow-sm border-2 ${isDark ? 'border-surface-2 bg-surface-3' : 'border-white bg-slate-100'}`}>
                                {driver!.avatar ? (
                                    <img src={driver!.avatar} alt={driver!.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className={`w-full h-full flex items-center justify-center text-[10px] font-bold ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
                                        {driver!.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-1.5 opacity-60">
                            <span className={`text-[11px] font-semibold ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                                Biriktirilmagan
                            </span>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                                <PlusIcon className={`w-3 h-3 ${isDark ? 'text-gray-400' : 'text-slate-500'}`} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Separator line */}
            <div className={`mx-5 border-t ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`} />

            {/* Financial Footer */}
            <div className="px-5 py-4 flex items-center justify-between mt-auto">
                <span className={`text-[12px] font-medium tracking-wide ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                    Kunlik Reja
                </span>
                <span className={`text-[14px] font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {car.dailyPlan && car.dailyPlan > 0 ? `${formatNumberSmart(car.dailyPlan)} UZS` : '0 UZS'}
                </span>
            </div>
        </article>
    );
}

export default CarsPage;
