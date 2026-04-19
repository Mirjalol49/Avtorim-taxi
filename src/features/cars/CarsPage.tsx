import React, { useState } from 'react';
import { Car, CarDocument } from '../../core/types';
import { SearchIcon, PlusIcon, EditIcon, TrashIcon, CameraIcon } from '../../../components/Icons';

interface CarsPageProps {
    cars: Car[];
    isDataLoading: boolean;
    userRole: 'admin' | 'viewer';
    onAddCar: () => void;
    onEditCar: (car: Car) => void;
    onDeleteCar: (id: string) => void;
    theme: 'light' | 'dark';
}

const ITEMS_PER_PAGE = 12;

const CarsPage: React.FC<CarsPageProps> = ({ cars, isDataLoading, userRole, onAddCar, onEditCar, onDeleteCar, theme }) => {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    const filtered = cars.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.licensePlate.toLowerCase().includes(search.toLowerCase())
    );

    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    const docCount = (car: Car) => (car.documents ?? []).length;

    const card = `rounded-2xl border overflow-hidden transition-all ${theme === 'dark'
        ? 'bg-[#1F2937] border-gray-700 hover:border-gray-600'
        : 'bg-white border-gray-200 hover:border-gray-300'} shadow-sm`;

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className={`flex-1 p-1.5 rounded-2xl border shadow-sm ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIcon className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                        </div>
                        <input
                            type="text"
                            className={`block w-full pl-10 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f766e] transition-colors ${theme === 'dark'
                                ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                                : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500'}`}
                            placeholder="Avtomobil nomi yoki raqami..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                </div>
                {userRole === 'admin' && (
                    <div className={`flex items-center p-1.5 rounded-2xl border shadow-sm ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'}`}>
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
                            <div className={`h-full ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`} />
                        </div>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className={`text-center py-16 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
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
                            <div key={car.id} className={card}>
                                {/* Car image */}
                                <div className={`h-40 relative ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                    {car.avatar ? (
                                        <img src={car.avatar} alt={car.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <CameraIcon className={`w-12 h-12 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} />
                                        </div>
                                    )}
                                    {/* Doc badge */}
                                    {docCount(car) > 0 && (
                                        <span className="absolute top-2 right-2 bg-[#0f766e] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                            {docCount(car)} hujjat
                                        </span>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="p-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className={`font-bold text-base truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                {car.name}
                                            </p>
                                            <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-lg text-xs font-mono font-semibold ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                                                {car.licensePlate}
                                            </span>
                                        </div>
                                        {userRole === 'admin' && (
                                            <div className="flex gap-1 flex-shrink-0">
                                                <button onClick={() => onEditCar(car)}
                                                    className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}>
                                                    <EditIcon className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => onDeleteCar(car.id)}
                                                    className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}>
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Documents list */}
                                    {(car.documents ?? []).length > 0 && (
                                        <div className={`mt-3 pt-3 border-t space-y-1 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                                            {car.documents!.map((doc, i) => (
                                                <a key={i}
                                                    href={doc.data}
                                                    download={doc.type === 'application/pdf' ? doc.name : undefined}
                                                    target={doc.type !== 'application/pdf' ? '_blank' : undefined}
                                                    rel="noreferrer"
                                                    className="flex items-center gap-2 text-xs text-[#0f766e] hover:underline truncate">
                                                    <span>{doc.type === 'application/pdf' ? '📄' : '🖼️'}</span>
                                                    <span className="truncate">{doc.name}</span>
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center gap-2 mt-6">
                            <button onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${theme === 'dark' ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}>
                                Oldingi
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button key={p} onClick={() => setPage(p)}
                                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${p === page
                                        ? 'bg-[#0f766e] text-white'
                                        : theme === 'dark' ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-white text-gray-600 border border-gray-200'}`}>
                                    {p}
                                </button>
                            ))}
                            <button onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page === totalPages}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${theme === 'dark' ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}>
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
