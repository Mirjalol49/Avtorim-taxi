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

// safe t() wrapper — falls back to Uzbek if key comes back unchanged
const safe = (val: string, fallback: string) =>
    val === fallback.toUpperCase().replace(/\s/g, '') || val === fallback ? fallback : val;

const CarsPage: React.FC<CarsPageProps> = ({
    cars, drivers = [], isDataLoading, userRole, onAddCar, onEditCar, onDeleteCar, theme
}) => {
    const { t } = useTranslation();
    const isDark = theme === 'dark';
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [filterTab, setFilterTab] = useState<FilterTab>('all');

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

    const totalPages    = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const paginated     = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
    const assignedCount = cars.filter(c => !c.isDeleted && !!getDriver(c)).length;
    const totalCount    = cars.filter(c => !c.isDeleted).length;

    const filterTabs: { id: FilterTab; label: string; count: number }[] = [
        { id: 'all',       label: "Barchasi",       count: totalCount              },
        { id: 'assigned',  label: "Biriktirilgan",  count: assignedCount           },
        { id: 'available', label: "Bo'sh",           count: totalCount - assignedCount },
    ];

    return (
        <div className="space-y-5">

            {/* ── Toolbar ── */}
            <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <SearchIcon className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDark ? 'text-white/30' : 'text-gray-400'}`} />
                        <input
                            type="text"
                            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-[13px] font-medium outline-none transition-all ${isDark
                                ? 'bg-surface border-white/[0.08] text-white placeholder-white/25 focus:border-teal-500/50'
                                : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-teal-500'
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
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold border transition-all active:scale-95 flex-shrink-0 ${isDark
                            ? 'bg-surface border-white/[0.08] text-white/50 hover:text-emerald-400 hover:border-emerald-500/30'
                            : 'bg-white border-gray-200 text-gray-500 hover:text-emerald-600 hover:border-emerald-400'
                        }`}
                        title="Excel"
                    >
                        <DownloadIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Excel</span>
                    </button>

                    {userRole === 'admin' && (
                        <button
                            onClick={onAddCar}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[13px] bg-[#0f766e] hover:bg-[#0a5c56] text-white transition-all active:scale-95 shadow-sm flex-shrink-0"
                        >
                            <PlusIcon className="w-4 h-4" />
                            <span>Qo'shish</span>
                        </button>
                    )}
                </div>

                {/* Filter tabs */}
                <div className="flex items-center justify-between">
                    <div className={`flex items-center gap-1 p-1 rounded-xl border ${isDark ? 'bg-surface border-white/[0.08]' : 'bg-gray-100/80 border-gray-200'}`}>
                        {filterTabs.map(tab => {
                            const active = filterTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => { setFilterTab(tab.id); setPage(1); }}
                                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
                                        active
                                            ? isDark ? 'bg-teal-500 text-white shadow-sm' : 'bg-white text-teal-700 shadow-sm border border-teal-200'
                                            : isDark ? 'text-white/40 hover:text-white/70' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    {tab.label}
                                    <span className={`min-w-[18px] h-[18px] px-1 rounded-md text-[10px] font-black flex items-center justify-center ${
                                        active
                                            ? isDark ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-700'
                                            : isDark ? 'bg-white/[0.06] text-white/30' : 'bg-gray-200 text-gray-400'
                                    }`}>{tab.count}</span>
                                </button>
                            );
                        })}
                    </div>
                    <span className={`text-[12px] ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                        {filtered.length} ta avtomobil
                    </span>
                </div>
            </div>

            {/* ── Loading ── */}
            {isDataLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className={`rounded-2xl overflow-hidden animate-pulse ${isDark ? 'bg-surface border border-white/[0.05]' : 'bg-white border border-gray-100'}`}>
                            <div className={`aspect-[16/10] ${isDark ? 'bg-surface-3' : 'bg-gray-100'}`} />
                            <div className="p-4 space-y-2">
                                <div className={`h-3.5 rounded-full w-2/3 ${isDark ? 'bg-surface-2' : 'bg-gray-100'}`} />
                                <div className={`h-3 rounded-full w-1/3 ${isDark ? 'bg-surface-2' : 'bg-gray-100'}`} />
                            </div>
                        </div>
                    ))}
                </div>

            ) : filtered.length === 0 ? (
                <div className={`flex flex-col items-center justify-center py-20 rounded-2xl border ${isDark ? 'border-white/[0.05] bg-surface' : 'border-gray-200 bg-white'}`}>
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${isDark ? 'bg-surface-2' : 'bg-gray-100'}`}>
                        <CameraIcon className={`w-8 h-8 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                    </div>
                    <p className={`text-base font-bold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {search ? 'Topilmadi' : 'Avtomobil yo\'q'}
                    </p>
                    <p className={`text-sm mb-5 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                        {search ? `"${search}" bo'yicha natija yo'q` : "Birinchi avtomobilingizni qo'shing"}
                    </p>
                    {userRole === 'admin' && !search && (
                        <button onClick={onAddCar} className="flex items-center gap-2 px-5 py-2.5 bg-[#0f766e] hover:bg-[#0a5c56] text-white rounded-xl text-sm font-bold transition-all active:scale-95">
                            <PlusIcon className="w-4 h-4" /> Avtomobil qo'shish
                        </button>
                    )}
                </div>

            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {paginated.map(car => <CarCard key={car.id} car={car} driver={getDriver(car)} userRole={userRole} isDark={isDark} onEdit={onEditCar} onDelete={onDeleteCar} />)}
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-1.5">
                            <button
                                onClick={() => setPage(p => Math.max(p - 1, 1))}
                                disabled={page === 1}
                                className={`px-3.5 py-2 rounded-xl text-[13px] font-semibold border transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${isDark ? 'border-white/[0.08] bg-surface text-white/60 hover:bg-white/[0.06]' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                            >← Oldingi</button>

                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    className={`w-9 h-9 rounded-xl text-[13px] font-bold transition-all active:scale-95 ${p === page
                                        ? 'bg-[#0f766e] text-white shadow-sm'
                                        : isDark ? 'border border-white/[0.08] bg-surface text-white/40 hover:text-white' : 'border border-gray-200 bg-white text-gray-500 hover:text-gray-800'
                                    }`}
                                >{p}</button>
                            ))}

                            <button
                                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                                disabled={page === totalPages}
                                className={`px-3.5 py-2 rounded-xl text-[13px] font-semibold border transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${isDark ? 'border-white/[0.08] bg-surface text-white/60 hover:bg-white/[0.06]' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                            >Keyingi →</button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

// ─── Car Card ──────────────────────────────────────────────────────────────────

interface CardProps {
    car: Car;
    driver: Driver | undefined;
    userRole: 'admin' | 'viewer';
    isDark: boolean;
    onEdit: (car: Car) => void;
    onDelete: (id: string) => void;
}

function CarCard({ car, driver, userRole, isDark, onEdit, onDelete }: CardProps) {
    const docs      = car.documents ?? [];
    const isAssigned = !!driver;

    return (
        <article className={`group rounded-2xl overflow-hidden flex flex-col transition-all duration-200 ${
            isDark
                ? 'bg-surface border border-white/[0.07] hover:border-white/[0.14] hover:shadow-xl hover:shadow-black/30'
                : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-lg hover:shadow-gray-100'
        }`}>

            {/* ── Image zone ── */}
            <div className={`relative aspect-[16/10] overflow-hidden ${isDark ? 'bg-[#0d1829]' : 'bg-gray-100'}`}>
                {car.avatar ? (
                    <img
                        src={car.avatar}
                        alt={car.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                        <CameraIcon className={`w-10 h-10 ${isDark ? 'text-white/10' : 'text-gray-200'}`} />
                        <span className={`text-xs ${isDark ? 'text-white/20' : 'text-gray-300'}`}>Rasm yo'q</span>
                    </div>
                )}

                {/* Gradient — heavier bottom, light top for badges */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/20 pointer-events-none" />

                {/* ── Top-left: driver OR available ── */}
                <div className="absolute top-3 left-3">
                    {isAssigned ? (
                        <div className="flex items-center gap-1.5 pl-1.5 pr-3 py-1.5 rounded-2xl bg-black/50 backdrop-blur-md border border-white/15 shadow-sm max-w-[160px]">
                            <div className="w-5 h-5 rounded-full overflow-hidden border border-white/25 flex-shrink-0 bg-white/10">
                                {driver!.avatar
                                    ? <img src={driver!.avatar} alt={driver!.name} className="w-full h-full object-cover" />
                                    : <div className="w-full h-full flex items-center justify-center text-[9px] text-white font-bold">{driver!.name.charAt(0)}</div>
                                }
                            </div>
                            <span className="text-white text-[12px] font-semibold truncate leading-none">{driver!.name.split(' ')[0]}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl bg-amber-500/25 backdrop-blur-md border border-amber-400/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
                            <span className="text-amber-200 text-[12px] font-bold">Bo'sh</span>
                        </div>
                    )}
                </div>

                {/* ── Top-right: docs count (always visible, clean) ── */}
                {docs.length > 0 && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1.5 rounded-xl bg-black/45 backdrop-blur-md border border-white/12 shadow-sm">
                        <span className="text-[11px]">📄</span>
                        <span className="text-white text-[11px] font-bold leading-none">{docs.length}</span>
                    </div>
                )}

                {/* ── Admin actions — appear on hover (top-right, below docs badge) ── */}
                {userRole === 'admin' && (
                    <div className={`absolute top-3 right-3 flex gap-1.5 transition-all duration-200 ${docs.length > 0 ? 'top-11' : 'top-3'} opacity-0 translate-y-[-4px] group-hover:opacity-100 group-hover:translate-y-0`}>
                        <button
                            onClick={e => { e.stopPropagation(); onEdit(car); }}
                            className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 text-white hover:bg-white/30 active:scale-90 transition-all flex items-center justify-center shadow-sm"
                            title="Tahrirlash"
                        >
                            <EditIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={e => { e.stopPropagation(); onDelete(car.id); }}
                            className="w-8 h-8 rounded-xl bg-red-500/40 backdrop-blur-md border border-red-400/30 text-white hover:bg-red-500/75 active:scale-90 transition-all flex items-center justify-center shadow-sm"
                            title="O'chirish"
                        >
                            <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}

                {/* ── Bottom: name + plate + plan ── */}
                <div className="absolute bottom-0 left-0 right-0 px-4 pb-3.5 pt-10">
                    <h3 className="text-white font-extrabold text-[18px] tracking-tight truncate leading-tight drop-shadow-sm">
                        {car.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5">
                        <span className="px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-white text-[11px] font-mono font-bold tracking-widest">
                            {car.licensePlate}
                        </span>
                        {car.dailyPlan && car.dailyPlan > 0 ? (
                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-500/25 backdrop-blur-sm border border-teal-400/20 text-teal-200 text-[11px] font-bold">
                                📅 {formatNumberSmart(car.dailyPlan)} so'm
                            </span>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* ── Footer — only meaningful content, no redundancy ── */}
            <div className={`px-4 py-3 ${isDark ? 'bg-[#111c2d]' : 'bg-white'}`}>

                {/* Driver phone row — name already on image, just show phone + status */}
                {isAssigned ? (
                    <div className="flex items-center justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className={`text-[13px] ${isDark ? 'text-white/30' : 'text-gray-300'}`}>📞</span>
                            {driver!.phone ? (
                                <a
                                    href={`tel:${driver!.phone}`}
                                    className={`text-[13px] font-mono font-medium truncate hover:underline transition-colors ${isDark ? 'text-white/65 hover:text-teal-400' : 'text-gray-600 hover:text-teal-600'}`}
                                >
                                    {driver!.phone}
                                </a>
                            ) : (
                                <span className={`text-[13px] ${isDark ? 'text-white/25' : 'text-gray-300'}`}>—</span>
                            )}
                        </div>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${isDark ? 'bg-teal-500/15 text-teal-400' : 'bg-teal-50 text-teal-700 border border-teal-200'}`}>
                            ✓ Faol
                        </span>
                    </div>
                ) : (
                    <div className={`flex items-center gap-2 mb-2.5 ${isDark ? 'text-white/25' : 'text-gray-300'}`}>
                        <span className="text-[13px]">👤</span>
                        <span className={`text-[13px] italic ${isDark ? 'text-white/30' : 'text-gray-400'}`}>Haydovchi biriktirilmagan</span>
                    </div>
                )}

                {/* Documents — compact chips */}
                {docs.length > 0 ? (
                    <div className={`flex flex-wrap gap-1.5 pt-2.5 border-t ${isDark ? 'border-white/[0.05]' : 'border-gray-100'}`}>
                        {docs.map((doc, i) => (
                            <a
                                key={i}
                                href={doc.data}
                                download={doc.type === 'application/pdf' ? doc.name : undefined}
                                target={doc.type !== 'application/pdf' ? '_blank' : undefined}
                                rel="noreferrer"
                                title={doc.name}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all active:scale-95 max-w-[140px] truncate ${
                                    isDark
                                        ? 'bg-surface-2 border-white/[0.07] text-white/45 hover:text-teal-400 hover:border-teal-500/30'
                                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:text-teal-600 hover:border-teal-300 hover:bg-teal-50'
                                }`}
                            >
                                <span className="flex-shrink-0">{doc.type === 'application/pdf' ? '📄' : '🖼️'}</span>
                                <span className="truncate">{doc.name}</span>
                            </a>
                        ))}
                    </div>
                ) : (
                    <div className={`pt-2.5 border-t text-[12px] ${isDark ? 'border-white/[0.05] text-white/20' : 'border-gray-100 text-gray-300'}`}>
                        Hujjat qo'shilmagan
                    </div>
                )}
            </div>
        </article>
    );
}

export default CarsPage;
