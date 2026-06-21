import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Car, CarDocument, CarDamage } from '../../core/types';
import { Driver } from '../../core/types';
import { SearchIcon, PlusIcon, EditIcon, TrashIcon, CameraIcon, DownloadIcon, AlertTriangleIcon, CheckIcon, FilePdfIcon } from '../../../components/Icons';
import { exportCarsToExcel } from '../../../utils/exportToExcel';
import { formatNumberSmart } from '../../../utils/formatNumber';
import { ShieldAlert as ShieldAlertIcon, Wrench as WrenchIcon, SunDim as SunDimIcon, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { updateCar } from '../../../services/carsService';
import { LicensePlate } from '../../components/ui/LicensePlate';
import { useNavigate } from 'react-router-dom';
import { PremiumCard } from '../../components/ui/PremiumCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { openDocumentInNewTab } from '../documents/pdfPreviewUtils';

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
    const { t } = useTranslation();
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

    const handleDownload = () => {
        const a = document.createElement('a');
        a.href = doc.data;
        a.download = doc.name || 'document';
        a.click();
    };

    const categoryLabel: Record<string, string> = {
        id_card: 'Texpassport',
        insurance: t('insurance'),
        technical_passport: 'Tex.Passport',
        other: t('document'),
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[300] flex flex-col bg-black/60 backdrop-blur-2xl"
            style={{ animation: 'fadeIn 0.2s ease-out' }}
        >
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
                    <GlassButton isDark={true} variant="primary" size="sm" onClick={handleDownload} title={t('download')}>
                        <DownloadIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">{t('download')}</span>
                    </GlassButton>

                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all active:scale-90"
                        title={`${t('close')} (Esc)`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                {isPdf ? (
                    <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.06] p-8 text-center">
                        <FilePdfIcon className="w-14 h-14 text-white/55" />
                        <div>
                            <p className="max-w-[320px] truncate text-white text-[15px] font-black">{doc.name}</p>
                            <p className="mt-1 text-white/45 text-[13px]">{t('documentPreviewUnavailable', "Bu faylni brauzerda ko'rib bo'lmadi. Yuklab oling yoki alohida oynada oching.")}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => openDocumentInNewTab(doc.data)}
                            className="h-10 px-5 rounded-xl bg-[#0f766e] text-white text-[13px] font-bold hover:bg-[#0b665f] transition-colors"
                        >
                            {t('open', 'Ochish')}
                        </button>
                    </div>
                ) : (
                    <img
                        key={idx}
                        src={doc.data}
                        alt={doc.name}
                        className="max-w-full max-h-full object-contain select-none"
                        style={{ animation: 'fadeIn 0.2s ease-out' }}
                        draggable={false}
                    />
                )}

                {total > 1 && (
                    <>
                        <button
                            onClick={prev}
                            disabled={idx === 0}
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 border border-white/15 text-white flex items-center justify-center transition-all active:scale-90 disabled:opacity-20 disabled:cursor-not-allowed backdrop-blur-md"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <button
                            onClick={next}
                            disabled={idx === total - 1}
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 border border-white/15 text-white flex items-center justify-center transition-all active:scale-90 disabled:opacity-20 disabled:cursor-not-allowed backdrop-blur-md"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </>
                )}
            </div>

            {total > 1 && (
                <div className="flex-shrink-0 flex items-center justify-center gap-2 py-3 px-4 border-t border-white/[0.08]">
                    {state.docs.map((d, i) => (
                        <button
                            key={i}
                            onClick={() => setIdx(i)}
                            className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${
                                i === idx ? 'border-[#6bd8cb] scale-110' : 'border-white/20 opacity-50 hover:opacity-100'
                            }`}
                        >
                            {d.type === 'application/pdf' ? (
                                <div className="w-full h-full bg-white/10 flex items-center justify-center text-xl">📄</div>
                            ) : (
                                <img src={d.data} alt={d.name} className="w-full h-full object-cover" />
                            )}
                        </button>
                    ))}
                </div>
            )}
            <style>{`@keyframes fadeIn { from { opacity:0 } to { opacity:1 } }`}</style>
        </div>,
        document.body
    );
}

import ConfirmModal from '../../../components/ConfirmModal';

const CarsPage: React.FC<CarsPageProps> = ({
    cars, drivers = [], isDataLoading, userRole, adminName = 'Admin', onAddCar, onEditCar, onSaveCar, onDeleteCar, theme
}) => {
    const { t } = useTranslation();
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
            
            check(car.insuranceExpiryMs, t('insuranceOsago'), 'insurance');
            check(car.techInspectionExpiryMs, t('technicalInspection'), 'tech');
            check(car.tintingExpiryMs, t('tinting'), 'tinting');
            
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
        { id: 'all',       label: t('all'),          count: totalCount               },
        { id: 'assigned',  label: t('assigned'),     count: assignedCount            },
        { id: 'available', label: t('available'),    count: totalCount - assignedCount },
    ];

    const openDoc = (car: Car, index: number) => {
        const docs = car.documents ?? [];
        if (!docs.length) return;
        setDocViewer({ docs, index, carName: car.name });
    };

    const handleClearWarning = async (e: React.MouseEvent, carId: string, docType: 'insurance' | 'tech' | 'tinting') => {
        e.stopPropagation();
        
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
            setClearedWarnings(prev => {
                const next = new Set(prev);
                next.delete(warningKey);
                return next;
            });
        }
    };

    return (
        <div className="space-y-6">
            {/* ── Expiration Warnings Banner ── */}
            {globalWarnings.length > 0 && (
                <PremiumCard isDark={isDark} padding="p-5" hoverLift={false} className={`border ${isDark ? 'bg-rose-500/[0.04] border-rose-500/20' : 'bg-rose-50/50 border-rose-200/50'}`}>
                    <div className="flex items-center mb-4">
                        <AlertTriangleIcon className="w-5 h-5 text-rose-500 mr-2" />
                        <h3 className={`text-[13px] font-bold tracking-wider uppercase ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>
                            {t('documentsExpiringWarning')}
                        </h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {globalWarnings.map(group => {
                            const car = cars.find(c => c.id === group.id);
                            return (
                                <div 
                                    key={group.id} 
                                    onClick={() => car && onEditCar(car)}
                                    className={`rounded-2xl p-4 border transition-all duration-300 cursor-pointer active:scale-[0.98] relative overflow-hidden group ${isDark ? 'bg-[#222a3d] border-white/[0.05] hover:border-rose-500/50' : 'bg-white border-slate-200 hover:border-rose-300 shadow-sm'}`}
                                >
                                    <div className={`absolute right-3 top-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center w-6 h-6 rounded-full ${isDark ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-50 text-rose-500'}`}>
                                        <ChevronRightIcon className="w-4 h-4" />
                                    </div>

                                    <div className="flex items-center mb-3 pr-8">
                                        <span className={`text-[15px] font-bold truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{group.carName}</span>
                                        <div className="flex-shrink-0 ml-3">
                                            <LicensePlate plate={group.plate} size="sm" />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        {group.docs.map((doc, idx) => {
                                            const Icon = doc.docType === 'insurance' ? ShieldAlertIcon : doc.docType === 'tech' ? WrenchIcon : SunDimIcon;
                                            
                                            const iconColor = doc.days <= 0 
                                                ? `text-rose-500` 
                                                : doc.days === 1 
                                                ? `text-amber-500` 
                                                : isDark ? 'text-gray-400' : 'text-slate-500';

                                            return (
                                                <div key={idx} className="flex items-center justify-between py-1 group/item">
                                                    <div className="flex items-center min-w-0 pr-2">
                                                        <div className={`flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-[8px] mr-2.5 transition-colors ${isDark ? 'bg-white/[0.04] ring-1 ring-white/[0.05]' : 'bg-slate-100 ring-1 ring-slate-200/50'} ${iconColor}`}>
                                                            <Icon size={14} strokeWidth={2.5} />
                                                        </div>
                                                        <span className={`text-[13px] font-semibold truncate transition-colors ${isDark ? 'text-gray-300 group-hover/item:text-white' : 'text-slate-600 group-hover/item:text-slate-900'}`}>
                                                            {doc.docName}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        {doc.days <= 0 ? (
                                                            <div className={`text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 flex-shrink-0 ${isDark ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-700'}`}>
                                                                {doc.days < 0 ? t('expired') : t('today')}
                                                            </div>
                                                        ) : (
                                                            <div className={`text-[11px] font-bold px-2 py-0.5 rounded-md flex-shrink-0 ${isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                                                                {t('daysLeft', { count: doc.days })}
                                                            </div>
                                                        )}
                                                        <button
                                                            onClick={(e) => handleClearWarning(e, group.id, doc.docType)}
                                                            className={`flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-[6px] border hover:shadow-sm hover:scale-110 active:scale-90 transition-all opacity-0 group-hover/item:opacity-100 ml-1 ${isDark ? 'bg-white/[0.05] border-white/[0.1] text-gray-400 hover:bg-[#34C759] hover:border-[#34C759] hover:text-white' : 'bg-white border-slate-200 text-slate-400 hover:bg-[#34C759] hover:border-[#34C759] hover:text-white'}`}
                                                            title={t('clearWarningDone')}
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
                </PremiumCard>
            )}

            {/* ── Toolbar ── */}
            <PremiumCard isDark={isDark} padding="p-4 sm:p-5" hoverLift={false}>
                <div className="flex flex-col gap-4">
                    <div className="flex gap-3 xl:items-center">
                        <div className="flex-1 relative">
                            <SearchIcon className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDark ? 'text-white/30' : 'text-gray-400'}`} />
                            <input
                                type="text"
                                className={`w-full pl-11 pr-11 py-3.5 rounded-2xl border text-[14px] font-medium outline-none transition-all duration-300 ${isDark
                                    ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder-[rgba(235,235,245,0.4)] focus:border-[#6bd8cb] focus:shadow-[0_0_0_2px_rgba(107,216,203,0.15)]'
                                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#0f766e] focus:shadow-[0_0_0_2px_rgba(15,118,110,0.15)]'
                                }`}
                                placeholder={t('searchVehiclePlaceholder')}
                                value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }}
                            />
                            {search && (
                                <button
                                    onClick={() => setSearch('')}
                                    className={`absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold transition-colors ${isDark ? 'hover:bg-white/10 text-white/50 hover:text-white' : 'hover:bg-gray-200 text-gray-400 hover:text-gray-600'}`}
                                >×</button>
                            )}
                        </div>

                        <GlassButton 
                            isDark={isDark} 
                            variant="secondary" 
                            onClick={() => exportCarsToExcel(filtered, drivers, 'Avtomobillar')}
                            title="Excel"
                        >
                            <DownloadIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Excel</span>
                        </GlassButton>

                        {userRole === 'admin' && (
                            <GlassButton 
                                isDark={isDark} 
                                variant="primary" 
                                onClick={onAddCar}
                            >
                                <PlusIcon className="w-4 h-4" />
                                <span>{t('add')}</span>
                            </GlassButton>
                        )}
                    </div>

                    <div className="flex items-center justify-between mt-1">
                        <div className={`flex items-center gap-1 p-1.5 rounded-[20px] border transition-colors ${isDark ? 'bg-white/[0.03] border-white/[0.05]' : 'bg-slate-50 border-slate-200'}`}>
                            {filterTabs.map(tab => {
                                const active = filterTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => { setFilterTab(tab.id); setPage(1); }}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-[14px] text-[13px] font-semibold transition-all active:scale-[0.97] ${
                                            active
                                                ? isDark ? 'bg-white/10 text-white shadow-sm' : 'bg-white text-black shadow-sm border border-black/[0.04]'
                                                : isDark ? 'text-white/50 hover:text-white/80' : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        {tab.label}
                                        <span className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold ${
                                            active
                                                ? isDark ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-800'
                                                : isDark ? 'bg-white/5 text-white/40' : 'bg-gray-200/60 text-gray-500'
                                        }`}>{tab.count}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <span className={`text-[13px] font-semibold ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                            {filtered.length} ta avtomobil
                        </span>
                    </div>
                </div>
            </PremiumCard>

            {/* ── Loading skeleton ── */}
            {isDataLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {[...Array(6)].map((_, i) => (
                        <PremiumCard key={i} isDark={isDark} padding="p-0" hoverLift={false} className="overflow-hidden">
                            <div className={`aspect-[16/10] animate-pulse ${isDark ? 'bg-white/[0.02]' : 'bg-gray-100'}`} />
                            <div className="p-5 space-y-3">
                                <div className={`h-4 rounded-full w-2/3 animate-pulse ${isDark ? 'bg-white/[0.05]' : 'bg-gray-200'}`} />
                                <div className={`h-3 rounded-full w-1/3 animate-pulse ${isDark ? 'bg-white/[0.05]' : 'bg-gray-200'}`} />
                            </div>
                        </PremiumCard>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <PremiumCard isDark={isDark} padding="py-20 px-6" hoverLift={false}>
                    <div className="text-center flex flex-col items-center">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-5 ${isDark ? 'bg-white/[0.04]' : 'bg-gray-100'}`}>
                            <CameraIcon className={`w-8 h-8 ${isDark ? 'text-white/20' : 'text-gray-400'}`} />
                        </div>
                        <p className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {search ? 'Topilmadi' : "Avtomobil yo'q"}
                        </p>
                        <p className={`text-[14px] mb-6 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                            {search ? `"${search}" bo'yicha natija yo'q` : "Birinchi avtomobilingizni qo'shing"}
                        </p>
                        {userRole === 'admin' && !search && (
                            <GlassButton variant="primary" isDark={isDark} onClick={onAddCar}>
                                <PlusIcon className="w-4 h-4" /> Avtomobil qo'shish
                            </GlassButton>
                        )}
                    </div>
                </PremiumCard>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
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
                        <div className="flex justify-center mt-8 gap-2">
                            <GlassButton
                                variant="secondary"
                                isDark={isDark}
                                size="sm"
                                onClick={() => setPage(p => Math.max(p - 1, 1))}
                                disabled={page === 1}
                            >
                                {t('previous')}
                            </GlassButton>
                            
                            <div className={`flex items-center p-1 rounded-xl gap-1 ${isDark ? 'bg-white/[0.03]' : 'bg-gray-100'}`}>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setPage(p)}
                                        className={`w-8 h-8 rounded-lg text-[13px] font-bold transition-all active:scale-95 ${page === p
                                            ? isDark ? 'bg-[#6bd8cb] text-[#131b2e] shadow-sm' : 'bg-[#0f766e] text-white shadow-sm'
                                            : isDark ? 'text-white/50 hover:bg-white/5' : 'text-gray-600 hover:bg-white'
                                            }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                            
                            <GlassButton
                                variant="secondary"
                                isDark={isDark}
                                size="sm"
                                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                                disabled={page === totalPages}
                            >
                                {t('next')}
                            </GlassButton>
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
                title={repairConfirm.targetRepairState ? t('sendToRepair') : t('returnFromRepair')}
                message={repairConfirm.targetRepairState ? t('confirmSendToRepair') : t('confirmReturnFromRepair')}
                confirmLabel={t('confirm')}
                cancelLabel={t('cancel')}
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
    const { t } = useTranslation();
    const docs        = car.documents ?? [];
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
        check(car.insuranceExpiryMs, t('insurance'));
        check(car.techInspectionExpiryMs, t('technicalInspectionShort'));
        check(car.tintingExpiryMs, t('tinting'));
        return warnings;
    }, [car.insuranceExpiryMs, car.techInspectionExpiryMs, car.tintingExpiryMs]);

    return (
        <PremiumCard 
            isDark={isDark} 
            interactive={true} 
            padding="p-0"
            className="group flex flex-col h-full"
            onClick={onClick}
        >
            {/* ── Image Zone ── */}
            <div className={`relative w-full h-[230px] flex-shrink-0 overflow-hidden ${isDark ? 'bg-[#1a2332]' : 'bg-slate-100'}`}>
                {car.avatar ? (
                    <img
                        src={car.avatar}
                        alt={car.name}
                        className="w-full h-full object-cover object-center transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                    />
                ) : (
                    <div className={`w-full h-full flex flex-col items-center justify-center gap-2 ${isDark ? 'bg-[#151d2a]' : 'bg-slate-50'}`}>
                        <CameraIcon className={`w-12 h-12 ${isDark ? 'text-white/10' : 'text-slate-200'}`} />
                    </div>
                )}
                
                {/* Status Badge */}
                <div className="absolute top-4 right-4 z-20">
                    {car.inRepair ? (
                        <span className="px-3 py-1.5 rounded-xl bg-red-500/90 backdrop-blur-md text-white text-[11px] font-black tracking-widest shadow-lg">
                            {t('inRepair')}
                        </span>
                    ) : isAssigned ? (
                        <span className="px-3 py-1.5 rounded-xl bg-emerald-500/90 backdrop-blur-md text-white text-[11px] font-black tracking-widest shadow-lg">
                            {t('assigned')}
                        </span>
                    ) : (
                        <span className="px-3 py-1.5 rounded-xl bg-slate-800/80 backdrop-blur-md text-white text-[11px] font-black tracking-widest shadow-lg border border-white/10">
                            {t('available')}
                        </span>
                    )}
                </div>

                {/* Docs count badge */}
                {docs.length > 0 && (
                    <button
                        onClick={e => { e.stopPropagation(); onDocClick(0); }}
                        className={`absolute top-4 left-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-xl backdrop-blur-md shadow-lg transition-all active:scale-90 ${
                            expiryWarnings.length > 0 
                                ? 'bg-rose-500/90 hover:bg-rose-600/90 border border-rose-400/50 animate-pulse' 
                                : isDark ? 'bg-black/50 hover:bg-black/70 border border-white/10' : 'bg-white/90 hover:bg-white border border-slate-200/60'
                        }`}
                        title={expiryWarnings.length > 0 ? `${t('warning')}: ${expiryWarnings.join(', ')}` : t('viewDocuments')}
                    >
                        <span className="text-[12px]">{expiryWarnings.length > 0 ? '⚠️' : '📄'}</span>
                        <span className={`text-[12px] font-black leading-none ${expiryWarnings.length > 0 ? 'text-white' : isDark ? 'text-white' : 'text-slate-800'}`}>
                            {docs.length}
                        </span>
                    </button>
                )}

                {/* Admin actions overlay */}
                {userRole === 'admin' && (
                    <div className="absolute inset-0 m-auto flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30 pointer-events-none">
                        <div className="pointer-events-auto flex gap-3">
                            <button
                                onClick={e => { e.stopPropagation(); onEdit(car); }}
                                className={`w-12 h-12 rounded-full shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all ${isDark ? 'bg-white/10 text-white backdrop-blur-xl border border-white/20 hover:bg-white/20' : 'bg-white/90 text-slate-700 backdrop-blur-xl border border-slate-200 hover:bg-white'}`}
                                title={t('edit')}
                            >
                                <EditIcon className="w-5 h-5" />
                            </button>
                            <button
                                onClick={e => { e.stopPropagation(); onDelete(car.id); }}
                                className="w-12 h-12 rounded-full bg-rose-500/90 shadow-xl text-white flex items-center justify-center hover:bg-rose-500 hover:scale-110 active:scale-95 transition-all backdrop-blur-xl border border-rose-400/30"
                                title={t('delete')}
                            >
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Metadata Zone ── */}
            <div className="px-5 pt-5 pb-2 flex items-end justify-between z-20">
                {/* License Plate & Model */}
                <div className="flex flex-col items-start gap-1.5">
                    <LicensePlate plate={car.licensePlate} size="lg" />
                    <span className={`text-[13px] font-bold leading-none ml-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                        {car.name}
                    </span>
                </div>

                {/* Driver Profile */}
                <div className="flex items-center gap-2.5 mb-1">
                    {isAssigned ? (
                        <>
                            <span className={`text-[13px] font-black ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                                {driver!.name.split(' ')[0]}
                            </span>
                            <div className={`w-8 h-8 rounded-full overflow-hidden flex-shrink-0 shadow-sm border-2 ${isDark ? 'border-white/[0.05] bg-[#2d3449]' : 'border-slate-100 bg-slate-50'}`}>
                                {driver!.avatar ? (
                                    <img src={driver!.avatar} alt={driver!.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className={`w-full h-full flex items-center justify-center text-[11px] font-bold ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
                                        {driver!.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-2 opacity-60">
                            <span className={`text-[12px] font-bold ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                                Biriktirilmagan
                            </span>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                                <PlusIcon className={`w-3.5 h-3.5 ${isDark ? 'text-gray-400' : 'text-slate-500'}`} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Separator line */}
            <div className={`mx-5 border-t ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`} />

            {/* Financial Footer */}
            <div className="px-5 py-4 flex items-center justify-between mt-auto">
                <span className={`text-[12px] font-bold tracking-wide uppercase ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                    Kunlik Reja
                </span>
                <span className={`text-[15px] font-black ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    {car.dailyPlan && car.dailyPlan > 0 ? `${formatNumberSmart(car.dailyPlan)} UZS` : '0 UZS'}
                </span>
            </div>
        </PremiumCard>
    );
}

export default CarsPage;
