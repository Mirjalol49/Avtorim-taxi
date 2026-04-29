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
import { DriverDetailsSheet } from './components/DriverDetailsSheet';
import { useAuth } from '../auth/hooks/useAuth';
import { calcDriverDebt } from './utils/debtUtils';

type CarFilter = 'all' | 'with-car' | 'no-car';

const fmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n));

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
    const [sheetDriver, setSheetDriver] = useState<Driver | null>(null);

    const fleetStats = useMemo(() => {
        let totalDebt = 0, totalIncome = 0, todayIncome = 0;
        drivers.filter(d => !d.isDeleted).forEach(d => {
            const car = cars.find(c => c.assignedDriverId === d.id) ?? null;
            const s = calcDriverDebt(d, car, transactions);
            // Only aggregate if netDebt is positive (meaning they owe money)
            // Overpayments (credit balances <= 0) don't offset total fleet owed debt
            totalDebt += s.netDebt > 0 ? s.netDebt : 0;
            totalIncome += s.totalIncome;
            todayIncome += s.todayIncome;
        });
        return { totalDebt, totalIncome, todayIncome };
    }, [drivers, cars, transactions]);

    const {
        searchQuery, setSearchQuery,
        viewMode, setViewMode,
        currentPage, setCurrentPage,
        paginatedDrivers: rawPaginated,
        totalPages: rawTotalPages,
        filteredDrivers: rawFiltered
    } = useDriversList(drivers);

    const filteredDrivers = useMemo(() => {
        if (carFilter === 'all') return rawFiltered;
        if (carFilter === 'with-car') return rawFiltered.filter(d => cars.some(c => c.assignedDriverId === d.id));
        return rawFiltered.filter(d => !cars.some(c => c.assignedDriverId === d.id));
    }, [rawFiltered, carFilter, cars]);

    const ITEMS_PER_PAGE = 12;
    const totalPages = Math.max(1, Math.ceil(filteredDrivers.length / ITEMS_PER_PAGE));
    const safePage = Math.min(currentPage, totalPages);
    const paginatedDrivers = filteredDrivers.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

    const withCarCount = rawFiltered.filter(d => cars.some(c => c.assignedDriverId === d.id)).length;
    const noCarCount = rawFiltered.filter(d => !cars.some(c => c.assignedDriverId === d.id)).length;

    return (
        <div className="space-y-6">
            {/* Fleet debt summary removed per user request - focusing on driver management */}

            {/* Search Bar & View Toggle */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className={`flex-1 p-1.5 rounded-2xl border shadow-sm ${theme === 'dark' ? 'bg-surface border-white/[0.08]' : 'bg-white border-gray-200'}`}>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIcon className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                        </div>
                        <input
                            type="text"
                            className={`block w-full pl-10 pr-3 py-2.5 border rounded-xl leading-5 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0f766e] focus:border-[#0f766e] sm:text-sm transition-colors ${theme === 'dark'
                                ? 'bg-surface-2 border-white/[0.08] text-white placeholder-gray-400'
                                : 'bg-gray-50 border-gray-200 text-gray-900'
                                }`}
                            placeholder={t('searchDriverPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Add Driver Button */}
                {userRole === 'admin' && (
                    <div className={`flex items-center p-1.5 rounded-2xl border shadow-sm ${theme === 'dark' ? 'bg-surface border-white/[0.08]' : 'bg-white border-gray-200'}`}>
                        <button
                            onClick={onAddDriver}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 shadow-lg ${theme === 'dark'
                                ? 'bg-[#0f766e] hover:bg-teal-700 text-white shadow-sm'
                                : 'bg-[#0f766e] hover:bg-teal-700 text-white shadow-sm'
                                }`}
                        >
                            <PlusIcon className="w-5 h-5" />
                            <span>{t('add')}</span>
                        </button>
                    </div>
                )}

                {/* Export Button */}
                <button
                    onClick={() => exportDriversToExcel(filteredDrivers, 'Haydovchilar')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all active:scale-95 ${
                        theme === 'dark'
                            ? 'bg-surface border-white/[0.08] text-gray-300 hover:border-emerald-500/40 hover:text-emerald-400 hover:bg-emerald-500/5'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50'
                    }`}
                >
                    <DownloadIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Excel</span>
                </button>

                {/* View Toggle */}
                <div className={`flex items-center p-1.5 rounded-2xl border shadow-sm ${theme === 'dark' ? 'bg-surface border-white/[0.08]' : 'bg-white border-gray-200'}`}>
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid'
                            ? 'bg-[#0f766e] text-white shadow-md'
                            : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        <GridIcon className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2.5 rounded-xl transition-all ${viewMode === 'list'
                            ? 'bg-[#0f766e] text-white shadow-md'
                            : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        <ListIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Filter chips */}
            <div className="flex items-center gap-2 flex-wrap">
                {([
                    { key: 'all', label: 'Barchasi', count: rawFiltered.length },
                    { key: 'with-car', label: 'Mashina bor', count: withCarCount },
                    { key: 'no-car', label: "Mashina yo'q", count: noCarCount },
                ] as { key: CarFilter; label: string; count: number }[]).map(f => (
                    <button
                        key={f.key}
                        onClick={() => { setCarFilter(f.key); }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold border transition-all ${
                            carFilter === f.key
                                ? theme === 'dark'
                                    ? 'bg-teal-500/15 text-teal-400 border-teal-500/30'
                                    : 'bg-teal-600 text-white border-teal-600'
                                : theme === 'dark'
                                    ? 'bg-surface text-gray-400 border-white/[0.08] hover:border-white/[0.14] hover:text-gray-200'
                                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-800'
                        }`}
                    >
                        {f.label}
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                            carFilter === f.key
                                ? theme === 'dark' ? 'bg-teal-500/20 text-teal-400' : 'bg-white/20 text-white'
                                : theme === 'dark' ? 'bg-white/[0.05] text-gray-500' : 'bg-gray-100 text-gray-500'
                        }`}>{f.count}</span>
                    </button>
                ))}
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
                                    onCardClick={setSheetDriver}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className={`rounded-2xl border overflow-hidden shadow-lg ${theme === 'dark' ? 'bg-surface border-white/[0.08]' : 'bg-white border-gray-200'}`}>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
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
        {/* Driver details drawer */}
        <DriverDetailsSheet
            driver={sheetDriver}
            car={sheetDriver ? (cars.find(c => c.assignedDriverId === sheetDriver.id) ?? null) : null}
            transactions={transactions}
            theme={theme}
            userRole={userRole}
            isOpen={sheetDriver !== null}
            onClose={() => setSheetDriver(null)}
            onEdit={d => { setSheetDriver(null); onEditDriver(d); }}
            onDelete={id => { setSheetDriver(null); onDeleteDriver(id); }}
            onAddTransaction={onAddTransaction}
        />
        </div>
    );
};

export default DriversPage;
