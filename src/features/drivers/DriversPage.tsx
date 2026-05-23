import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Driver, DriverStatus } from '../../core/types';
import { Car } from '../../core/types/car.types';
import { Transaction } from '../../core/types/transaction.types';
import { useDriversList } from './hooks/useDriversList';
import { SearchIcon, PlusIcon, GridIcon, ListIcon, DownloadIcon } from '../../../components/Icons';
import { exportDriversToExcel } from '../../../utils/exportToExcel';
import { DriverCard } from './components/DriverCard';
import { DriverRow } from './components/DriverRow';
import { useAuth } from '../auth/hooks/useAuth';
import PageSkeleton from '../../../components/PageSkeleton';

type CarFilter = 'all' | 'with-car' | 'no-car';
type DriverTypeFilter = 'all' | 'deposit' | 'salary' | 'lease_to_own';

interface DriversPageProps {
    drivers: Driver[];
    cars: Car[];
    transactions: Transaction[];
    isDataLoading: boolean;
    userRole: 'admin' | 'viewer';
    fleetId?: string;
    onUpdateStatus: (id: string, status: DriverStatus) => void;
    onEditDriver: (driver: Driver) => void;
    onDeleteDriver: (id: string) => void;
    onAddDriver: () => void;
    onAddTransaction?: (data: Omit<Transaction, 'id'>) => void;
    theme: 'light' | 'dark';
}

const DriversPage: React.FC<DriversPageProps> = ({
    drivers, cars, transactions, isDataLoading, userRole, fleetId,
    onUpdateStatus, onEditDriver, onDeleteDriver, onAddDriver, onAddTransaction, theme,
}) => {
    const { t } = useTranslation();
    const { adminUser } = useAuth();
    const currentUserId = adminUser?.id || 'unknown';
    const [carFilter, setCarFilter] = useState<CarFilter>('all');
    const [typeFilter, setTypeFilter] = useState<DriverTypeFilter>('all');

    // ── All hooks MUST be called before any early returns ────────────────────
    const {
        searchQuery, setSearchQuery,
        viewMode, setViewMode,
        currentPage, setCurrentPage,
        filteredDrivers: rawFiltered
    } = useDriversList(drivers);

    const carFilteredList = useMemo(() => {
        if (carFilter === 'with-car') return rawFiltered.filter(d => cars.some(c => c.assignedDriverId === d.id));
        if (carFilter === 'no-car') return rawFiltered.filter(d => !cars.some(c => c.assignedDriverId === d.id));
        return rawFiltered;
    }, [rawFiltered, carFilter, cars]);

    const filteredDrivers = useMemo(() => {
        if (typeFilter === 'all') return carFilteredList;
        return carFilteredList.filter(d => (d.driverType || 'deposit') === typeFilter);
    }, [carFilteredList, typeFilter]);

    const sortedDrivers = useMemo(() => {
        return [...filteredDrivers].sort((a, b) => {
            const aHasCar = cars.some(c => c.assignedDriverId === a.id);
            const bHasCar = cars.some(c => c.assignedDriverId === b.id);
            if (aHasCar && !bHasCar) return -1;
            if (!aHasCar && bHasCar) return 1;
            return 0;
        });
    }, [filteredDrivers, cars]);

    const ITEMS_PER_PAGE = 12;
    const totalPages = Math.max(1, Math.ceil(sortedDrivers.length / ITEMS_PER_PAGE));
    const safePage = Math.min(currentPage, totalPages);
    const paginatedDrivers = sortedDrivers.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

    const withCarCount = rawFiltered.filter(d => cars.some(c => c.assignedDriverId === d.id)).length;
    const noCarCount = rawFiltered.filter(d => !cars.some(c => c.assignedDriverId === d.id)).length;

    const depositCount = carFilteredList.filter(d => (d.driverType || 'deposit') === 'deposit').length;
    const salaryCount = carFilteredList.filter(d => d.driverType === 'salary').length;
    const vikupCount = carFilteredList.filter(d => d.driverType === 'lease_to_own').length;
    const hasActiveFilters = Boolean(searchQuery.trim()) || carFilter !== 'all' || typeFilter !== 'all';
    const resetFilters = () => {
        setSearchQuery('');
        setCarFilter('all');
        setTypeFilter('all');
        setCurrentPage(1);
    };

    // ── Loading skeleton (after all hooks) ──────────────────────────────────
    if (isDataLoading) {
        return <PageSkeleton theme={theme} variant="drivers" />;
    }

    return (
        <div className="space-y-5">
            {/* Fleet debt summary removed per user request - focusing on driver management */}

            {/* ── Toolbar ── */}
            <div className={`rounded-[24px] border p-3 sm:p-4 shadow-sm ${theme === 'dark' ? 'bg-surface border-white/[0.07]' : 'bg-white/90 border-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]'}`}>
                <div className="flex flex-col xl:flex-row gap-3 xl:items-center">
                    <div className="flex-1 relative">
                        <SearchIcon className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${theme === 'dark' ? 'text-white/25' : 'text-gray-400'}`} />
                        <input
                            type="text"
                            className={`w-full pl-10 pr-10 py-3 rounded-2xl border text-[14px] font-medium outline-none transition-all ${theme === 'dark'
                                ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder-white/25 focus:border-teal-500/40'
                                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-teal-500/60'
                            }`}
                            placeholder={t('searchDriverPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-xs transition-colors ${theme === 'dark' ? 'bg-white/10 text-white/40 hover:bg-white/20' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
                            >×</button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => exportDriversToExcel(filteredDrivers, cars, transactions, 'Haydovchilar')}
                            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-[13px] font-bold border transition-all active:scale-95 flex-shrink-0 ${theme === 'dark'
                                ? 'bg-white/[0.04] border-white/[0.08] text-white/45 hover:text-emerald-300 hover:border-emerald-500/25'
                                : 'bg-white border-slate-200 text-slate-500 hover:text-emerald-700 hover:border-emerald-300'
                            }`}
                            title="Excel"
                        >
                            <DownloadIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Excel</span>
                        </button>

                        {userRole === 'admin' && (
                        <button
                            onClick={onAddDriver}
                            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold text-[13px] bg-[#0f766e] hover:bg-[#0a5c56] text-white transition-all active:scale-95 shadow-sm flex-shrink-0"
                        >
                            <PlusIcon className="w-4 h-4" />
                            <span>{t('add')}</span>
                        </button>
                        )}

                        <div className={`flex items-center p-1 rounded-2xl border ${theme === 'dark' ? 'bg-white/[0.04] border-white/[0.08]' : 'bg-slate-100 border-slate-200'}`}>
                            <button
                                onClick={() => setViewMode('grid')}
                                aria-label={t('gridView', 'Grid view')}
                                className={`p-2 rounded-xl transition-all ${viewMode === 'grid'
                                    ? theme === 'dark' ? 'bg-teal-500 text-white shadow-sm' : 'bg-white text-teal-700 shadow-sm'
                                    : theme === 'dark' ? 'text-white/35 hover:text-white/60' : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <GridIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                aria-label={t('listView', 'List view')}
                                className={`p-2 rounded-xl transition-all ${viewMode === 'list'
                                    ? theme === 'dark' ? 'bg-teal-500 text-white shadow-sm' : 'bg-white text-teal-700 shadow-sm'
                                    : theme === 'dark' ? 'text-white/35 hover:text-white/60' : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <ListIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-3 flex flex-col 2xl:flex-row 2xl:items-end justify-between gap-3 overflow-hidden">
                    <div className="flex flex-wrap items-end gap-3 w-full">
                        {/* Car Status Filter */}
                        <div className="flex flex-col">
                            <span className={`text-[10px] font-semibold uppercase tracking-wider ml-2 mb-1.5 ${theme === 'dark' ? 'text-white/40' : 'text-gray-400'}`}>
                                {t('car', 'Avtomobil')}
                            </span>
                            <div className={`flex items-center p-1 rounded-2xl transition-colors ${theme === 'dark' ? 'bg-white/[0.04]' : 'bg-slate-100'}`}>
                                {([
                                    { key: 'all', label: t('all', 'Barchasi'), count: rawFiltered.length },
                                    { key: 'with-car', label: t('withCar', 'Mashina bor'), count: withCarCount },
                                    { key: 'no-car', label: t('noCar', "Mashina yo'q"), count: noCarCount },
                                ] as { key: CarFilter; label: string; count: number }[]).map(f => {
                                    const active = carFilter === f.key;
                                    return (
                                        <button
                                            key={f.key}
                                            onClick={() => { setCarFilter(f.key); setTypeFilter('all'); setCurrentPage(1); }}
                                            className={`flex-shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-[12px] sm:text-[13px] font-semibold transition-all ${
                                                active
                                                    ? theme === 'dark' ? 'bg-[#2c2c2e] text-white shadow-sm' : 'bg-white text-black shadow-sm'
                                                    : theme === 'dark' ? 'text-white/50 hover:text-white/80' : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                        >
                                            {f.label}
                                            <span className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold ${
                                                active
                                                    ? theme === 'dark' ? 'bg-white/10 text-white' : 'bg-gray-100 text-black'
                                                    : theme === 'dark' ? 'bg-white/5 text-white/40' : 'bg-gray-200/60 text-gray-400'
                                            }`}>
                                                {f.count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Driver Type Filter */}
                        <div className="flex flex-col">
                            <span className={`text-[10px] font-semibold uppercase tracking-wider ml-2 mb-1.5 ${theme === 'dark' ? 'text-white/40' : 'text-gray-400'}`}>
                                {t('category', 'Toifa')}
                            </span>
                            <div className={`flex items-center p-1 rounded-2xl transition-colors ${theme === 'dark' ? 'bg-white/[0.04]' : 'bg-slate-100'}`}>
                                {([
                                    { key: 'all', label: t('all', 'Barchasi'), count: carFilteredList.length },
                                    { key: 'deposit', label: t('standard', 'Standart'), count: depositCount },
                                    { key: 'salary', label: t('salary', 'Maosh'), count: salaryCount },
                                    { key: 'lease_to_own', label: t('vikup', 'Vikup'), count: vikupCount },
                                ] as const).map(f => {
                                    const active = typeFilter === f.key;
                                    
                                    return (
                                        <button
                                            key={f.key}
                                            onClick={() => { setTypeFilter(f.key as DriverTypeFilter); setCurrentPage(1); }}
                                            className={`flex-shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-[12px] sm:text-[13px] font-semibold transition-all ${
                                                active
                                                    ? theme === 'dark' ? 'bg-[#2c2c2e] text-white shadow-sm' : 'bg-white text-black shadow-sm'
                                                    : theme === 'dark' ? 'text-white/50 hover:text-white/80' : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                        >
                                            {f.label}
                                            <span className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold ${
                                                active
                                                    ? theme === 'dark' ? 'bg-white/10 text-white' : 'bg-gray-100 text-black'
                                                    : theme === 'dark' ? 'bg-white/5 text-white/40' : 'bg-gray-200/60 text-gray-400'
                                            }`}>
                                                {f.count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between gap-3 2xl:justify-end">
                        {hasActiveFilters && (
                            <button
                                onClick={resetFilters}
                                className={`px-3 py-2 rounded-xl text-[12px] font-bold transition-colors ${theme === 'dark' ? 'bg-white/[0.05] text-white/50 hover:text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-800'}`}
                            >
                                {t('clearFilters', 'Tozalash')}
                            </button>
                        )}
                        <span className={`text-[12px] whitespace-nowrap ${theme === 'dark' ? 'text-white/30' : 'text-slate-500'}`}>
                            {filteredDrivers.length} / {drivers.length} {t('driversCount', 'ta haydovchi')}
                        </span>
                    </div>
                </div>
            </div>

            {filteredDrivers.length > 0 ? (
                <>
                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                            {paginatedDrivers.map(driver => (
                                <DriverCard
                                    key={driver.id}
                                    driver={driver}
                                    car={cars.find(c => c.assignedDriverId === driver.id) ?? null}
                                    transactions={transactions}
                                    fleetId={fleetId || ''}
                                    theme={theme}
                                    userRole={userRole}
                                    currentUserId={currentUserId}
                                    onEdit={onEditDriver}
                                    onDelete={onDeleteDriver}
                                    onUpdateStatus={onUpdateStatus}
                                />
                            ))}
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table View */}
                            <div className={`hidden md:block rounded-2xl border overflow-hidden shadow-lg ${theme === 'dark' ? 'bg-surface border-white/[0.08]' : 'bg-white border-gray-200'}`}>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[800px]">
                                        <thead>
                                            <tr className={`${theme === 'dark' ? 'bg-surface-2 text-gray-400' : 'bg-gray-50 text-gray-500'} text-xs uppercase tracking-wider`}>
                                                <th className="p-4 font-bold border-b border-gray-200 dark:border-white/[0.08]">{t('driver')}</th>
                                                <th className="p-4 font-bold border-b border-gray-200 dark:border-white/[0.08]">{t('car')}</th>
                                                <th className="p-4 font-bold border-b border-gray-200 dark:border-white/[0.08]">{t('documents')}</th>
                                                <th className="p-4 font-bold border-b border-gray-200 dark:border-white/[0.08]">{t('planDayOff')}</th>
                                                {userRole === 'admin' && <th className="p-4 font-bold border-b border-gray-200 dark:border-white/[0.08] text-center">{t('actions')}</th>}
                                            </tr>
                                        </thead>
                                        <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/[0.07]' : 'divide-black/[0.05]'}`}>
                                            {paginatedDrivers.map(driver => (
                                                <DriverRow
                                                    key={driver.id}
                                                    driver={driver}
                                                    car={cars.find(c => c.assignedDriverId === driver.id) ?? null}
                                                    transactions={transactions}
                                                    fleetId={fleetId || ''}
                                                    theme={theme}
                                                    userRole={userRole}
                                                    currentUserId={currentUserId}
                                                    onEdit={onEditDriver}
                                                    onDelete={onDeleteDriver}
                                                    onUpdateStatus={onUpdateStatus}
                                                />
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            
                            {/* Mobile Card View Fallback */}
                            <div className="md:hidden grid grid-cols-1 gap-4">
                                {paginatedDrivers.map(driver => (
                                    <DriverCard
                                        key={driver.id}
                                        driver={driver}
                                        car={cars.find(c => c.assignedDriverId === driver.id) ?? null}
                                        transactions={transactions}
                                        fleetId={fleetId || ''}
                                        theme={theme}
                                        userRole={userRole}
                                        currentUserId={currentUserId}
                                        onEdit={onEditDriver}
                                        onDelete={onDeleteDriver}
                                        onUpdateStatus={onUpdateStatus}
                                    />
                                ))}
                            </div>
                        </>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center mt-8 gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${theme === 'dark'
                                    ? 'bg-surface-2 text-white hover:bg-white/[0.06] disabled:opacity-50 disabled:cursor-not-allowed'
                                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-black/[0.03] disabled:opacity-50 disabled:cursor-not-allowed'
                                    }`}
                            >
                                {t('previous')}
                            </button>
                            <div className="flex items-center gap-2">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === page
                                            ? 'bg-[#0f766e] text-white shadow-sm'
                                            : theme === 'dark'
                                                ? 'bg-surface-2 text-gray-400 hover:bg-white/[0.06]'
                                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-black/[0.03]'
                                            }`}
                                    >
                                        {page}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${theme === 'dark'
                                    ? 'bg-surface-2 text-white hover:bg-white/[0.06] disabled:opacity-50 disabled:cursor-not-allowed'
                                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-black/[0.03] disabled:opacity-50 disabled:cursor-not-allowed'
                                    }`}
                            >
                                {t('next')}
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div className={`text-center py-12 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                    <div className="bg-gray-100 dark:bg-surface-2 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <SearchIcon className="w-8 h-8 opacity-50" />
                    </div>
                    <p className="text-lg font-medium">{t('noDriversFound')}</p>
                    <p className="text-sm mt-1">Try adjusting your search query</p>
                </div>
            )}
        </div>
    );
};

export default DriversPage;
