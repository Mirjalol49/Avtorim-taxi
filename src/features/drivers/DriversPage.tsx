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
import { PremiumCard } from '../../components/ui/PremiumCard';
import { GlassButton } from '../../components/ui/GlassButton';

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
    const isDark = theme === 'dark';

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

    if (isDataLoading) {
        return <PageSkeleton theme={theme} variant="drivers" />;
    }

    return (
        <div className="space-y-6">
            {/* ── Toolbar ── */}
            <PremiumCard isDark={isDark} padding="p-4 sm:p-5" hoverLift={false}>
                <div className="flex flex-col xl:flex-row gap-4 xl:items-center">
                    <div className="flex-1 relative">
                        <SearchIcon className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDark ? 'text-white/30' : 'text-gray-400'}`} />
                        <input
                            type="text"
                            className={`w-full pl-11 pr-11 py-3.5 rounded-2xl border text-[14px] font-medium outline-none transition-all duration-300 ${isDark
                                ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder-[rgba(235,235,245,0.4)] focus:border-[#6bd8cb] focus:shadow-[0_0_0_2px_rgba(107,216,203,0.15)]'
                                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#0f766e] focus:shadow-[0_0_0_2px_rgba(15,118,110,0.15)]'
                            }`}
                            placeholder={t('searchDriverPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className={`absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold transition-colors ${isDark ? 'hover:bg-white/10 text-white/50 hover:text-white' : 'hover:bg-gray-200 text-gray-400 hover:text-gray-600'}`}
                            >×</button>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <GlassButton 
                            isDark={isDark} 
                            variant="secondary" 
                            onClick={() => exportDriversToExcel(filteredDrivers, cars, transactions, 'Haydovchilar')}
                            title="Excel"
                        >
                            <DownloadIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Excel</span>
                        </GlassButton>

                        {userRole === 'admin' && (
                            <GlassButton 
                                isDark={isDark} 
                                variant="primary" 
                                onClick={onAddDriver}
                            >
                                <PlusIcon className="w-4 h-4" />
                                <span>{t('add')}</span>
                            </GlassButton>
                        )}

                        <div className={`flex items-center p-1 rounded-2xl border ${isDark ? 'bg-white/[0.04] border-white/[0.08]' : 'bg-slate-100 border-slate-200'}`}>
                            <button
                                onClick={() => setViewMode('grid')}
                                aria-label={t('gridView', 'Grid view')}
                                className={`p-2 rounded-xl transition-all active:scale-[0.96] ${viewMode === 'grid'
                                    ? isDark ? 'bg-[#6bd8cb] text-[#131b2e] shadow-sm' : 'bg-white text-teal-700 shadow-sm'
                                    : isDark ? 'text-white/40 hover:text-white/70' : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <GridIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                aria-label={t('listView', 'List view')}
                                className={`p-2 rounded-xl transition-all active:scale-[0.96] ${viewMode === 'list'
                                    ? isDark ? 'bg-[#6bd8cb] text-[#131b2e] shadow-sm' : 'bg-white text-teal-700 shadow-sm'
                                    : isDark ? 'text-white/40 hover:text-white/70' : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <ListIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-4 flex flex-col 2xl:flex-row 2xl:items-end justify-between gap-4 overflow-hidden">
                    <div className="flex flex-wrap items-end gap-4 w-full">
                        {/* Car Status Filter */}
                        <div className="flex flex-col">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ml-1 mb-2 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                                {t('car', 'Avtomobil')}
                            </span>
                            <div className={`flex items-center p-1.5 rounded-[20px] transition-colors ${isDark ? 'bg-white/[0.03] border border-white/[0.05]' : 'bg-slate-50 border border-slate-200'}`}>
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
                                            className={`flex-shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2 rounded-[14px] text-[13px] font-semibold transition-all active:scale-[0.97] ${
                                                active
                                                    ? isDark ? 'bg-white/10 text-white shadow-sm' : 'bg-white text-black shadow-sm border border-black/[0.04]'
                                                    : isDark ? 'text-white/50 hover:text-white/80' : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                        >
                                            {f.label}
                                            <span className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold ${
                                                active
                                                    ? isDark ? 'bg-white/20 text-white' : 'bg-gray-100 text-black'
                                                    : isDark ? 'bg-white/5 text-white/40' : 'bg-gray-200/60 text-gray-400'
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
                            <span className={`text-[10px] font-bold uppercase tracking-wider ml-1 mb-2 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                                {t('category', 'Toifa')}
                            </span>
                            <div className={`flex items-center p-1.5 rounded-[20px] transition-colors ${isDark ? 'bg-white/[0.03] border border-white/[0.05]' : 'bg-slate-50 border border-slate-200'}`}>
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
                                            className={`flex-shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2 rounded-[14px] text-[13px] font-semibold transition-all active:scale-[0.97] ${
                                                active
                                                    ? isDark ? 'bg-white/10 text-white shadow-sm' : 'bg-white text-black shadow-sm border border-black/[0.04]'
                                                    : isDark ? 'text-white/50 hover:text-white/80' : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                        >
                                            {f.label}
                                            <span className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold ${
                                                active
                                                    ? isDark ? 'bg-white/20 text-white' : 'bg-gray-100 text-black'
                                                    : isDark ? 'bg-white/5 text-white/40' : 'bg-gray-200/60 text-gray-400'
                                            }`}>
                                                {f.count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between gap-4 2xl:justify-end mt-2 2xl:mt-0">
                        {hasActiveFilters && (
                            <GlassButton variant="ghost" size="sm" isDark={isDark} onClick={resetFilters}>
                                {t('clearFilters', 'Tozalash')}
                            </GlassButton>
                        )}
                        <span className={`text-[13px] font-semibold whitespace-nowrap ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                            {filteredDrivers.length} / {drivers.length} {t('driversCount', 'ta haydovchi')}
                        </span>
                    </div>
                </div>
            </PremiumCard>

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
                            <PremiumCard isDark={isDark} padding="p-0" hoverLift={false} className="hidden md:block">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[800px]">
                                        <thead>
                                            <tr className={`${isDark ? 'bg-white/[0.02] text-gray-400' : 'bg-gray-50/50 text-gray-500'} text-[11px] uppercase tracking-wider`}>
                                                <th className={`p-5 font-bold border-b ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`}>{t('driver')}</th>
                                                <th className={`p-5 font-bold border-b ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`}>{t('car')}</th>
                                                <th className={`p-5 font-bold border-b ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`}>{t('documents')}</th>
                                                <th className={`p-5 font-bold border-b ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`}>{t('planDayOff')}</th>
                                                {userRole === 'admin' && <th className={`p-5 font-bold border-b text-center ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`}>{t('actions')}</th>}
                                            </tr>
                                        </thead>
                                        <tbody className={`divide-y ${isDark ? 'divide-white/[0.04]' : 'divide-black/[0.04]'}`}>
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
                            </PremiumCard>
                            
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
                            <GlassButton
                                variant="secondary"
                                isDark={isDark}
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                            >
                                {t('previous')}
                            </GlassButton>
                            
                            <div className={`flex items-center p-1 rounded-xl gap-1 ${isDark ? 'bg-white/[0.03]' : 'bg-gray-100'}`}>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`w-8 h-8 rounded-lg text-[13px] font-bold transition-all active:scale-95 ${currentPage === page
                                            ? isDark ? 'bg-[#6bd8cb] text-[#131b2e] shadow-sm' : 'bg-[#0f766e] text-white shadow-sm'
                                            : isDark ? 'text-white/50 hover:bg-white/5' : 'text-gray-600 hover:bg-white'
                                            }`}
                                    >
                                        {page}
                                    </button>
                                ))}
                            </div>
                            
                            <GlassButton
                                variant="secondary"
                                isDark={isDark}
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                            >
                                {t('next')}
                            </GlassButton>
                        </div>
                    )}
                </>
            ) : (
                <PremiumCard isDark={isDark} padding="py-16 px-6" hoverLift={false}>
                    <div className="text-center flex flex-col items-center">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-5 ${isDark ? 'bg-white/[0.04]' : 'bg-gray-100'}`}>
                            <SearchIcon className={`w-8 h-8 ${isDark ? 'text-white/20' : 'text-gray-400'}`} />
                        </div>
                        <p className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('noDriversFound')}</p>
                        <p className={`text-[14px] ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Try adjusting your search query or filters.</p>
                    </div>
                </PremiumCard>
            )}
        </div>
    );
};

export default DriversPage;
