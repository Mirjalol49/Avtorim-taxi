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

    const ITEMS_PER_PAGE = 12;
    const totalPages = Math.max(1, Math.ceil(filteredDrivers.length / ITEMS_PER_PAGE));
    const safePage = Math.min(currentPage, totalPages);
    const paginatedDrivers = filteredDrivers.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

    const withCarCount = rawFiltered.filter(d => cars.some(c => c.assignedDriverId === d.id)).length;
    const noCarCount = rawFiltered.filter(d => !cars.some(c => c.assignedDriverId === d.id)).length;

    const depositCount = carFilteredList.filter(d => (d.driverType || 'deposit') === 'deposit').length;
    const salaryCount = carFilteredList.filter(d => d.driverType === 'salary').length;
    const vikupCount = carFilteredList.filter(d => d.driverType === 'lease_to_own').length;

    // ── Loading skeleton (after all hooks) ──────────────────────────────────
    if (isDataLoading) {
        return <PageSkeleton theme={theme} variant="drivers" />;
    }

    return (
        <div className="space-y-6">
            {/* Fleet debt summary removed per user request - focusing on driver management */}

            {/* ── Toolbar ── */}
            <div className="flex flex-col gap-3 mb-6">
                <div className="flex gap-2.5">
                    <div className="flex-1 relative">
                        <SearchIcon className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${theme === 'dark' ? 'text-white/25' : 'text-gray-400'}`} />
                        <input
                            type="text"
                            className={`w-full pl-10 pr-4 py-2.5 rounded-[14px] border text-[13px] font-medium outline-none transition-all ${theme === 'dark'
                                ? 'bg-surface border-white/[0.07] text-white placeholder-white/25 focus:border-teal-500/40'
                                : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-teal-500/60'
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

                    <button
                        onClick={() => exportDriversToExcel(filteredDrivers, 'Haydovchilar')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-[14px] text-[13px] font-semibold border transition-all active:scale-95 flex-shrink-0 ${theme === 'dark'
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
                            onClick={onAddDriver}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-[14px] font-bold text-[13px] bg-[#0f766e] hover:bg-[#0a5c56] text-white transition-all active:scale-95 shadow-sm flex-shrink-0"
                        >
                            <PlusIcon className="w-4 h-4" />
                            <span>{t('add')}</span>
                        </button>
                    )}

                    {/* View Toggle */}
                    <div className={`flex items-center p-1 rounded-[14px] border ${theme === 'dark' ? 'bg-surface border-white/[0.07]' : 'bg-gray-100/70 border-gray-200'}`}>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-[10px] transition-all ${viewMode === 'grid'
                                ? theme === 'dark' ? 'bg-teal-500 text-white shadow-sm' : 'bg-white text-teal-700 shadow-sm border border-teal-100'
                                : theme === 'dark' ? 'text-white/35 hover:text-white/60' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <GridIcon className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-[10px] transition-all ${viewMode === 'list'
                                ? theme === 'dark' ? 'bg-teal-500 text-white shadow-sm' : 'bg-white text-teal-700 shadow-sm border border-teal-100'
                                : theme === 'dark' ? 'text-white/35 hover:text-white/60' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <ListIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="flex flex-wrap items-end gap-4">
                        {/* Car Status Filter */}
                        <div className="flex flex-col gap-1.5">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ml-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                Avtomobil
                            </span>
                            <div className={`flex items-center gap-1 p-1 rounded-[14px] border ${theme === 'dark' ? 'bg-surface border-white/[0.07]' : 'bg-gray-100/70 border-gray-200'}`}>
                                {([
                                    { key: 'all', label: 'Barchasi', count: rawFiltered.length },
                                    { key: 'with-car', label: 'Mashina bor', count: withCarCount },
                                    { key: 'no-car', label: "Mashina yo'q", count: noCarCount },
                                ] as { key: CarFilter; label: string; count: number }[]).map(f => {
                                    const active = carFilter === f.key;
                                    return (
                                        <button
                                            key={f.key}
                                            onClick={() => { setCarFilter(f.key); setTypeFilter('all'); setCurrentPage(1); }}
                                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[10px] text-[12px] font-bold transition-all ${
                                                active
                                                    ? theme === 'dark' ? 'bg-teal-500 text-white shadow-sm' : 'bg-white text-teal-700 shadow-sm border border-teal-100'
                                                    : theme === 'dark' ? 'text-white/35 hover:text-white/60' : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                        >
                                            {f.label}
                                            <span className={`min-w-[18px] h-[18px] px-1 rounded-md text-[10px] font-black flex items-center justify-center ${
                                                active
                                                    ? theme === 'dark' ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-700'
                                                    : theme === 'dark' ? 'bg-white/[0.05] text-white/25' : 'bg-gray-200 text-gray-400'
                                            }`}>
                                                {f.count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Driver Type Filter */}
                        <div className="flex flex-col gap-1.5">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ml-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                Toifa
                            </span>
                            <div className={`flex items-center gap-1 p-1 rounded-[14px] border ${theme === 'dark' ? 'bg-surface border-white/[0.07]' : 'bg-gray-100/70 border-gray-200'}`}>
                                {([
                                    { key: 'all', label: 'Barchasi', count: carFilteredList.length, color: 'gray' },
                                    { key: 'deposit', label: 'Standart', count: depositCount, color: 'emerald' },
                                    { key: 'salary', label: 'Maosh', count: salaryCount, color: 'violet' },
                                    { key: 'lease_to_own', label: 'Vikup', count: vikupCount, color: 'indigo' },
                                ] as const).map(f => {
                                    const active = typeFilter === f.key;
                                    
                                    const activeClasses = {
                                        gray: theme === 'dark' ? 'bg-white/10 text-white shadow-sm' : 'bg-white text-gray-800 shadow-sm border border-gray-200',
                                        emerald: theme === 'dark' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white text-emerald-700 shadow-sm border border-emerald-100',
                                        violet: theme === 'dark' ? 'bg-violet-500 text-white shadow-sm' : 'bg-white text-violet-700 shadow-sm border border-violet-100',
                                        indigo: theme === 'dark' ? 'bg-indigo-500 text-white shadow-sm' : 'bg-white text-indigo-700 shadow-sm border border-indigo-100',
                                    }[f.color];

                                    const badgeActiveClasses = {
                                        gray: theme === 'dark' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700',
                                        emerald: theme === 'dark' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700',
                                        violet: theme === 'dark' ? 'bg-white/20 text-white' : 'bg-violet-50 text-violet-700',
                                        indigo: theme === 'dark' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700',
                                    }[f.color];

                                    const dotColor = {
                                        gray: theme === 'dark' ? 'bg-gray-600' : 'bg-gray-400',
                                        emerald: theme === 'dark' ? 'bg-emerald-500/50' : 'bg-emerald-400',
                                        violet: theme === 'dark' ? 'bg-violet-500/50' : 'bg-violet-400',
                                        indigo: theme === 'dark' ? 'bg-indigo-500/50' : 'bg-indigo-400',
                                    }[f.color];

                                    return (
                                        <button
                                            key={f.key}
                                            onClick={() => { setTypeFilter(f.key as DriverTypeFilter); setCurrentPage(1); }}
                                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[10px] text-[12px] font-bold transition-all ${
                                                active
                                                    ? activeClasses
                                                    : theme === 'dark' ? 'text-white/40 hover:text-white/70' : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                        >
                                            {!active && f.key !== 'all' && (
                                                <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                                            )}
                                            {f.label}
                                            <span className={`min-w-[18px] h-[18px] px-1 rounded-md text-[10px] font-black flex items-center justify-center ${
                                                active
                                                    ? badgeActiveClasses
                                                    : theme === 'dark' ? 'bg-white/[0.05] text-white/30' : 'bg-gray-100 text-gray-400'
                                            }`}>
                                                {f.count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    
                    <span className={`text-[12px] whitespace-nowrap ${theme === 'dark' ? 'text-white/25' : 'text-gray-400'}`}>
                        {filteredDrivers.length} ta haydovchi
                    </span>
                </div>
            </div>

            {filteredDrivers.length > 0 ? (
                <>
                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                            <div className="md:hidden grid grid-cols-1 gap-6">
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
