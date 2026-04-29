import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Car } from '../../core/types';
import { Driver } from '../../core/types';
import { SearchIcon, PlusIcon, EditIcon, TrashIcon, CameraIcon, DownloadIcon } from '../../../components/Icons';
import { exportCarsToExcel } from '../../../utils/exportToExcel';
import { formatNumberSmart } from '../../../utils/formatNumber';

interface CarsPageProps {
    cars: Car[];
    drivers?: Driver[];
    isDataLoading: boolean;
    userRole: 'admin' | 'viewer';
    onAddCar: () => void;
    onEditCar: (car: Car) => void;
    onDeleteCar: (id: string) => void;
    theme: 'light' | 'dark';
}

type FilterTab = 'all' | 'assigned' | 'available';

const ITEMS_PER_PAGE = 12;

const CarsPage: React.FC<CarsPageProps> = ({
    cars, drivers = [], isDataLoading, userRole, onAddCar, onEditCar, onDeleteCar, theme
}) => {
    const { t } = useTranslation();
    const isDark = theme === 'dark';
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [filterTab, setFilterTab] = useState<FilterTab>('all');

    const assignedDriver = (car: Car) => drivers.find(d => d.id === car.assignedDriverId);

    const filtered = useMemo(() => {
        let list = cars.filter(c =>
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.licensePlate.toLowerCase().includes(search.toLowerCase())
        );
        if (filterTab === 'assigned') list = list.filter(c => !!c.assignedDriverId && !!assignedDriver(c));
        if (filterTab === 'available') list = list.filter(c => !c.assignedDriverId || !assignedDriver(c));
        return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cars, search, filterTab, drivers]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    const assignedCount  = cars.filter(c => !!c.assignedDriverId && !!assignedDriver(c)).length;
    const availableCount = cars.length - assignedCount;

    const filterTabs: { id: FilterTab; label: string; count: number; color: string }[] = [
        { id: 'all',       label: t('all') ?? 'Barchasi',      count: cars.length,    color: 'teal'  },
        { id: 'assigned',  label: t('assigned') ?? "Biriktirilgan", count: assignedCount,  color: 'blue'  },
        { id: 'available', label: t('available') ?? "Bo'sh",    count: availableCount, color: 'amber' },
    ];

    const tabActive = (tab: FilterTab) =>
        filterTab === tab
            ? tab === 'all'      ? isDark ? 'bg-teal-500/20 text-teal-300 border-teal-500/30'   : 'bg-teal-50 text-teal-700 border-teal-300'
            : tab === 'assigned' ? isDark ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'   : 'bg-blue-50 text-blue-700 border-blue-300'
            :                      isDark ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-300'
            : isDark ? 'border-white/[0.08] text-gray-400 hover:text-gray-200 hover:border-white/[0.14]'
                     : 'border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300';

    return (
        <div className="space-y-6">
            {/* ── Toolbar ── */}
            <div className="flex flex-col gap-4">
                {/* Search + Actions row */}
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search */}
                    <div className={`flex-1 relative group`}>
                        <SearchIcon className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors pointer-events-none ${isDark ? 'text-gray-500 group-focus-within:text-teal-400' : 'text-gray-400 group-focus-within:text-teal-600'}`} />
                        <input
                            type="text"
                            className={`w-full pl-11 pr-4 py-3 rounded-2xl border text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-teal-500/30 ${isDark
                                ? 'bg-surface border-white/[0.08] text-white placeholder-gray-500 focus:border-teal-500/40'
                                : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-teal-500'
                            }`}
                            placeholder={t('searchPlaceholder')}
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center transition-colors text-xs ${isDark ? 'bg-white/10 text-gray-400 hover:bg-white/20' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
                            >×</button>
                        )}
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                        {/* Excel */}
                        <button
                            onClick={() => exportCarsToExcel(filtered, drivers, 'Avtomobillar')}
                            className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold border transition-all active:scale-95 ${isDark
                                ? 'bg-surface border-white/[0.08] text-gray-300 hover:border-emerald-500/40 hover:text-emerald-400 hover:bg-emerald-500/5'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title="Export to Excel"
                        >
                            <DownloadIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Excel</span>
                        </button>

                        {/* Add car */}
                        {userRole === 'admin' && (
                            <button
                                onClick={onAddCar}
                                className="flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm bg-[#0f766e] hover:bg-[#0a5c56] text-white transition-all active:scale-95 shadow-sm shadow-teal-900/30"
                            >
                                <PlusIcon className="w-4 h-4" />
                                <span>{t('add') ?? "Qo'shish"}</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Filter tabs + summary */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex gap-2 flex-wrap">
                        {filterTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => { setFilterTab(tab.id); setPage(1); }}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${tabActive(tab.id)}`}
                            >
                                {tab.label}
                                <span className={`min-w-[18px] h-[18px] rounded-full text-[10px] flex items-center justify-center font-black ${
                                    filterTab === tab.id
                                        ? 'bg-current/20 opacity-70'
                                        : isDark ? 'bg-white/[0.06] text-gray-500' : 'bg-gray-100 text-gray-500'
                                }`}>{tab.count}</span>
                            </button>
                        ))}
                    </div>
                    {filtered.length > 0 && (
                        <span className={`text-xs font-medium ml-auto ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            {filtered.length} {t('vehicles') ?? 'avtomobil'}
                        </span>
                    )}
                </div>
            </div>

            {/* ── Loading skeletons ── */}
            {isDataLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className={`rounded-3xl overflow-hidden animate-pulse ${isDark ? 'bg-surface border border-white/[0.05]' : 'bg-white border border-gray-200'}`}>
                            <div className={`aspect-[16/10] ${isDark ? 'bg-surface-3' : 'bg-gray-100'}`} />
                            <div className="p-4 space-y-3">
                                <div className={`h-4 rounded-full w-2/3 ${isDark ? 'bg-surface-2' : 'bg-gray-100'}`} />
                                <div className={`h-3 rounded-full w-1/2 ${isDark ? 'bg-surface-2' : 'bg-gray-100'}`} />
                            </div>
                        </div>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                /* ── Empty state ── */
                <div className={`flex flex-col items-center justify-center py-24 rounded-3xl border ${isDark ? 'border-white/[0.05] bg-surface' : 'border-gray-200 bg-white'}`}>
                    <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-5 ${isDark ? 'bg-surface-2' : 'bg-gray-100'}`}>
                        <CameraIcon className={`w-10 h-10 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                    </div>
                    <p className={`text-lg font-bold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {search ? t('searchNoResults') ?? 'Topilmadi' : t('noCarsYet') ?? 'Avtomobil topilmadi'}
                    </p>
                    <p className={`text-sm mb-6 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                        {search ? `"${search}" bo'yicha natija yo'q` : "Birinchi avtomobilingizni qo'shing"}
                    </p>
                    {userRole === 'admin' && !search && (
                        <button
                            onClick={onAddCar}
                            className="flex items-center gap-2 px-6 py-3 bg-[#0f766e] hover:bg-[#0a5c56] text-white rounded-2xl text-sm font-bold transition-all active:scale-95 shadow-sm"
                        >
                            <PlusIcon className="w-4 h-4" />
                            {t('addFirstCar') ?? "Avtomobil qo'shish"}
                        </button>
                    )}
                </div>
            ) : (
                <>
                    {/* ── Car Grid ── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {paginated.map(car => {
                            const driver = assignedDriver(car);
                            const docs = car.documents ?? [];
                            const isAssigned = !!driver;

                            return (
                                <article
                                    key={car.id}
                                    className={`group relative rounded-3xl overflow-hidden transition-all duration-300 flex flex-col ${isDark
                                        ? 'bg-surface border border-white/[0.06] hover:border-white/[0.12] hover:shadow-2xl hover:shadow-black/40'
                                        : 'bg-white border border-gray-200/80 hover:border-gray-300 hover:shadow-xl hover:shadow-gray-200/60'
                                    }`}
                                >
                                    {/* ── Image ── */}
                                    <div className={`relative aspect-[16/10] overflow-hidden flex-shrink-0 ${isDark ? 'bg-[#0d1829]' : 'bg-gray-100'}`}>
                                        {car.avatar ? (
                                            <img
                                                src={car.avatar}
                                                alt={car.name}
                                                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDark ? 'bg-surface-2' : 'bg-gray-200'}`}>
                                                    <CameraIcon className={`w-8 h-8 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                                                </div>
                                                <span className={`text-xs font-medium ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Rasm yo'q</span>
                                            </div>
                                        )}

                                        {/* Gradient overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20 pointer-events-none" />

                                        {/* ── Top badges ── */}
                                        <div className="absolute top-3.5 left-3.5 right-3.5 flex items-start justify-between gap-2">
                                            {/* Driver badge */}
                                            {isAssigned ? (
                                                <div className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/15 shadow-sm max-w-[180px]">
                                                    <div className="w-6 h-6 rounded-full overflow-hidden border border-white/25 flex-shrink-0 bg-white/10">
                                                        {driver!.avatar
                                                            ? <img src={driver!.avatar} alt={driver!.name} className="w-full h-full object-cover" />
                                                            : <div className="w-full h-full flex items-center justify-center text-[10px] text-white font-bold">{driver!.name.charAt(0)}</div>
                                                        }
                                                    </div>
                                                    <span className="text-white text-xs font-semibold truncate leading-none">{driver!.name.split(' ')[0]}</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-amber-500/30 backdrop-blur-md border border-amber-400/30 shadow-sm">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
                                                    <span className="text-amber-200 text-xs font-bold">{t('available') ?? "Bo'sh"}</span>
                                                </div>
                                            )}

                                            {/* Docs badge */}
                                            {docs.length > 0 && (
                                                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/15 shadow-sm flex-shrink-0">
                                                    <span className="text-[11px]">📄</span>
                                                    <span className="text-white text-xs font-bold">{docs.length}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* ── Admin action buttons (hover) ── */}
                                        {userRole === 'admin' && (
                                            <div className="absolute top-3.5 right-3.5 flex gap-2 translate-y-[-4px] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-250 ease-out">
                                                <button
                                                    onClick={e => { e.stopPropagation(); onEditCar(car); }}
                                                    aria-label={`Edit ${car.name}`}
                                                    className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/25 active:scale-90 transition-all flex items-center justify-center shadow-sm"
                                                >
                                                    <EditIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={e => { e.stopPropagation(); onDeleteCar(car.id); }}
                                                    aria-label={`Delete ${car.name}`}
                                                    className="w-9 h-9 rounded-xl bg-red-500/40 backdrop-blur-md border border-red-400/30 text-white hover:bg-red-500/70 active:scale-90 transition-all flex items-center justify-center shadow-sm"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}

                                        {/* ── Bottom info (name + plate) ── */}
                                        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-8">
                                            <h3 className="text-white font-extrabold text-xl tracking-tight truncate drop-shadow-md leading-tight mb-2">
                                                {car.name}
                                            </h3>
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="inline-flex items-center px-3 py-1 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-white text-xs font-mono font-bold tracking-widest shadow-sm">
                                                    {car.licensePlate}
                                                </span>
                                                {car.dailyPlan && car.dailyPlan > 0 ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-500/25 backdrop-blur-sm border border-teal-400/25 text-teal-200 text-[11px] font-bold shadow-sm">
                                                        📅 {formatNumberSmart(car.dailyPlan)}
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── Card Footer: driver detail + docs ── */}
                                    <div className={`flex-1 ${isDark ? 'bg-[#111c2d]' : 'bg-white'}`}>
                                        {/* Driver row */}
                                        {isAssigned && (
                                            <div className={`flex items-center gap-3 px-4 py-3 border-b ${isDark ? 'border-white/[0.05]' : 'border-gray-100'}`}>
                                                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-teal-500/20">
                                                    {driver!.avatar
                                                        ? <img src={driver!.avatar} alt={driver!.name} className="w-full h-full object-cover" />
                                                        : <div className={`w-full h-full flex items-center justify-center text-xs font-bold ${isDark ? 'bg-surface-2 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>{driver!.name.charAt(0)}</div>
                                                    }
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-semibold truncate ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{driver!.name}</p>
                                                    {driver!.phone && (
                                                        <p className={`text-[11px] font-mono truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{driver!.phone}</p>
                                                    )}
                                                </div>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0 ${isDark ? 'bg-teal-500/15 text-teal-400' : 'bg-teal-50 text-teal-700'}`}>
                                                    {t('activeDriver') ?? 'Faol'}
                                                </span>
                                            </div>
                                        )}

                                        {/* Documents */}
                                        {docs.length > 0 ? (
                                            <div className="px-4 py-3 space-y-1.5">
                                                {docs.map((doc, i) => (
                                                    <a
                                                        key={i}
                                                        href={doc.data}
                                                        download={doc.type === 'application/pdf' ? doc.name : undefined}
                                                        target={doc.type !== 'application/pdf' ? '_blank' : undefined}
                                                        rel="noreferrer"
                                                        className={`group/doc flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all ${isDark
                                                            ? 'hover:bg-white/[0.04] focus-visible:bg-white/[0.04]'
                                                            : 'hover:bg-gray-50 focus-visible:bg-gray-50'
                                                        }`}
                                                        aria-label={`Download ${doc.name}`}
                                                    >
                                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${isDark
                                                            ? 'bg-surface-2 group-hover/doc:bg-teal-500/15'
                                                            : 'bg-gray-100 group-hover/doc:bg-teal-50'
                                                        }`}>
                                                            <span className="text-base leading-none">
                                                                {doc.type === 'application/pdf' ? '📄' : '🖼️'}
                                                            </span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-xs font-semibold truncate transition-colors ${isDark
                                                                ? 'text-gray-300 group-hover/doc:text-teal-300'
                                                                : 'text-gray-700 group-hover/doc:text-teal-700'
                                                            }`}>
                                                                {doc.name}
                                                            </p>
                                                            <p className={`text-[10px] font-medium uppercase tracking-wider mt-0.5 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                                                                {doc.type === 'application/pdf' ? 'PDF' : t('imageLabel') ?? 'Rasm'}
                                                            </p>
                                                        </div>
                                                        <svg className={`w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover/doc:opacity-100 transition-opacity ${isDark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                    </a>
                                                ))}
                                            </div>
                                        ) : (
                                            /* No docs placeholder — only shown if no driver row either, to avoid empty cards */
                                            !isAssigned && (
                                                <div className={`px-4 py-4 flex items-center gap-2 ${isDark ? 'text-gray-700' : 'text-gray-300'}`}>
                                                    <span className="text-sm">—</span>
                                                    <span className={`text-xs font-medium ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>{t('noDocuments') ?? 'Hujjat yo\'q'}</span>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>

                    {/* ── Pagination ── */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-1.5 mt-4">
                            <button
                                onClick={() => setPage(p => Math.max(p - 1, 1))}
                                disabled={page === 1}
                                aria-label="Previous page"
                                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${isDark
                                    ? 'border-white/[0.08] bg-surface text-gray-300 hover:bg-white/[0.06]'
                                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                ← {t('prev') ?? 'Oldingi'}
                            </button>

                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    aria-label={`Page ${p}`}
                                    aria-current={p === page ? 'page' : undefined}
                                    className={`w-9 h-9 rounded-xl text-sm font-bold transition-all active:scale-95 ${p === page
                                        ? 'bg-[#0f766e] text-white shadow-sm shadow-teal-900/30'
                                        : isDark ? 'bg-surface border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.06]'
                                               : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300'
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}

                            <button
                                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                                disabled={page === totalPages}
                                aria-label="Next page"
                                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${isDark
                                    ? 'border-white/[0.08] bg-surface text-gray-300 hover:bg-white/[0.06]'
                                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                {t('next') ?? 'Keyingi'} →
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default CarsPage;
