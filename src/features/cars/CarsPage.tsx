import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Car, CarDocument } from '../../core/types';
import { Driver } from '../../core/types';
import { SearchIcon, PlusIcon, EditIcon, TrashIcon, CameraIcon, DownloadIcon } from '../../../components/Icons';
import { exportCarsToExcel } from '../../../utils/exportToExcel';

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

const ITEMS_PER_PAGE = 12;

const CarsPage: React.FC<CarsPageProps> = ({ cars, drivers = [], isDataLoading, userRole, onAddCar, onEditCar, onDeleteCar, theme }) => {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    const filtered = cars.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.licensePlate.toLowerCase().includes(search.toLowerCase())
    );

    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    const docCount = (car: Car) => (car.documents ?? []).length;
    const assignedDriver = (car: Car) => drivers.find(d => d.id === car.assignedDriverId);

    const card = `rounded-2xl border overflow-hidden transition-all ${theme === 'dark'
        ? 'bg-[#1C1C1E] border-white/[0.08] hover:border-white/[0.12]'
        : 'bg-white border-gray-200 hover:border-gray-300'} shadow-sm`;

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className={`flex-1 p-1.5 rounded-2xl border shadow-sm ${theme === 'dark' ? 'bg-[#1C1C1E] border-white/[0.08]' : 'bg-white border-gray-200'}`}>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIcon className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                        </div>
                        <input
                            type="text"
                            className={`block w-full pl-10 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f766e] transition-colors ${theme === 'dark'
                                ? 'bg-[#2C2C2E] border-white/[0.08] text-white placeholder-gray-400'
                                : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500'}`}
                            placeholder={t('searchPlaceholder')}
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                </div>
                {/* Export button */}
                <button
                    onClick={() => exportCarsToExcel(filtered, drivers, 'Avtomobillar')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all active:scale-95 ${
                        theme === 'dark'
                            ? 'bg-[#1C1C1E] border-white/[0.08] text-gray-300 hover:border-emerald-500/40 hover:text-emerald-400 hover:bg-emerald-500/5'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50'
                    }`}
                >
                    <DownloadIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Excel</span>
                </button>

                {userRole === 'admin' && (
                    <div className={`flex items-center p-1.5 rounded-2xl border shadow-sm ${theme === 'dark' ? 'bg-[#1C1C1E] border-white/[0.08]' : 'bg-white border-gray-200'}`}>
                        <button onClick={onAddCar}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-[#0f766e] hover:bg-[#0a5c56] text-white transition-all active:scale-95">
                            <PlusIcon className="w-5 h-5" />
                            Qo'shish
                        </button>
                    </div>
                )}
            </div>

            {isDataLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className={`${card} h-48 animate-pulse`}>
                            <div className={`h-full ${theme === 'dark' ? 'bg-[#2C2C2E]' : 'bg-gray-100'}`} />
                        </div>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className={`text-center py-16 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${theme === 'dark' ? 'bg-[#2C2C2E]' : 'bg-gray-100'}`}>
                        <SearchIcon className="w-8 h-8 opacity-50" />
                    </div>
                    <p className="text-lg font-medium">Avtomobil topilmadi</p>
                    {userRole === 'admin' && (
                        <button onClick={onAddCar} className="mt-4 px-5 py-2 bg-[#0f766e] text-white rounded-xl text-sm font-bold hover:bg-[#0a5c56]">
                            Birinchi avtomobil qo'shish
                        </button>
                    )}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {paginated.map(car => (
                            <div key={car.id} className={`group relative rounded-[2rem] overflow-hidden transition-all duration-300 ${theme === 'dark'
                                ? 'bg-[#1C1C1E] border border-white/[0.05] hover:border-white/[0.08] hover:shadow-2xl hover:shadow-black/50'
                                : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-xl hover:shadow-gray-200/50'}`}>
                                
                                {/* Image Container */}
                                <div className={`relative aspect-[4/3] sm:aspect-[16/10] overflow-hidden ${theme === 'dark' ? 'bg-black' : 'bg-gray-100'}`}>
                                    {car.avatar ? (
                                        <img src={car.avatar} alt={car.name} className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <CameraIcon className={`w-12 h-12 ${theme === 'dark' ? 'text-gray-700' : 'text-gray-300'}`} />
                                        </div>
                                    )}
                                    
                                    {/* Overlay Gradient for readability (stronger at bottom for text) */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/10 pointer-events-none transition-opacity duration-300 group-hover:opacity-90" />

                                    {/* Top badges (Driver & Docs) */}
                                    <div className="absolute top-5 left-5 flex flex-wrap gap-2 pr-5">
                                        {car.assignedDriverId && assignedDriver(car) && (
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 text-white text-xs font-semibold shadow-sm">
                                                <div className="w-5 h-5 rounded-full overflow-hidden bg-white/20 flex-shrink-0 border border-white/10">
                                                    {assignedDriver(car)!.avatar ? (
                                                        <img src={assignedDriver(car)!.avatar} alt="Driver" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-[10px]">👤</div>
                                                    )}
                                                </div>
                                                <span className="truncate max-w-[120px]">{assignedDriver(car)!.name.split(' ')[0]}</span>
                                            </div>
                                        )}
                                        {docCount(car) > 0 && (
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 text-white text-xs font-semibold shadow-sm">
                                                <span>📄</span>
                                                <span>{docCount(car)}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Bottom Info (Overlaid on image) */}
                                    <div className="absolute bottom-0 left-0 right-0 p-5 flex items-end justify-between">
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-white font-extrabold text-2xl tracking-tight truncate drop-shadow-md mb-2">
                                                {car.name}
                                            </h3>
                                            <div className="inline-flex items-center px-3 py-1.5 rounded-xl bg-white/5 backdrop-blur-lg border border-white/10 shadow-sm">
                                                <span className="text-xs font-mono font-bold text-white tracking-widest drop-shadow-sm">
                                                    {car.licensePlate}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        {userRole === 'admin' && (
                                            <div className="flex items-center gap-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ease-out">
                                                <button onClick={(e) => { e.stopPropagation(); onEditCar(car); }}
                                                    className="p-3 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 text-white hover:bg-white/20 active:scale-95 transition-all shadow-sm">
                                                    <EditIcon className="w-5 h-5" />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); onDeleteCar(car.id); }}
                                                    className="p-3 rounded-2xl bg-red-500/50 backdrop-blur-lg border border-red-500/20 text-white hover:bg-red-500/80 active:scale-95 transition-all shadow-sm">
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Documents list (Below image, clean) */}
                                {(car.documents ?? []).length > 0 && (
                                    <div className={`p-5 pt-4 ${theme === 'dark' ? 'bg-[#1a222e]' : 'bg-white'}`}>
                                        <div className="space-y-2">
                                            {car.documents!.map((doc, i) => (
                                                <a key={i}
                                                    href={doc.data}
                                                    download={doc.type === 'application/pdf' ? doc.name : undefined}
                                                    target={doc.type !== 'application/pdf' ? '_blank' : undefined}
                                                    rel="noreferrer"
                                                    className={`group/doc flex items-center gap-4 p-3 rounded-2xl transition-all ${theme === 'dark' ? 'hover:bg-white/[0.04]' : 'hover:bg-black/[0.03]'}`}>
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors shadow-sm ${theme === 'dark' ? 'bg-[#2C2C2E] group-hover/doc:bg-teal-500/20' : 'bg-gray-100 group-hover/doc:bg-teal-50'}`}>
                                                        <span className="text-base">{doc.type === 'application/pdf' ? '📄' : '🖼️'}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-sm font-semibold truncate transition-colors ${theme === 'dark' ? 'text-gray-200 group-hover/doc:text-teal-400' : 'text-gray-800 group-hover/doc:text-teal-700'}`}>
                                                            {doc.name}
                                                        </p>
                                                        <p className={`text-[10px] font-medium uppercase tracking-wider mt-0.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                                            {doc.type === 'application/pdf' ? 'PDF Hujjat' : 'Rasm'}
                                                        </p>
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center gap-2 mt-6">
                            <button onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${theme === 'dark' ? 'bg-[#2C2C2E] text-white hover:bg-white/[0.06]' : 'bg-white text-gray-700 border border-gray-200 hover:bg-black/[0.03]'}`}>
                                Oldingi
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button key={p} onClick={() => setPage(p)}
                                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${p === page
                                        ? 'bg-[#0f766e] text-white'
                                        : theme === 'dark' ? 'bg-[#2C2C2E] text-gray-400 hover:bg-white/[0.06]' : 'bg-white text-gray-600 border border-gray-200'}`}>
                                    {p}
                                </button>
                            ))}
                            <button onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page === totalPages}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${theme === 'dark' ? 'bg-[#2C2C2E] text-white hover:bg-white/[0.06]' : 'bg-white text-gray-700 border border-gray-200 hover:bg-black/[0.03]'}`}>
                                Keyingi
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default CarsPage;
