import React, { useMemo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Driver, DriverStatus } from '../../core/types';
import { Car } from '../../core/types/car.types';
import { Transaction } from '../../core/types/transaction.types';
import { useDriversList } from './hooks/useDriversList';
import { SearchIcon, PlusIcon, GridIcon, ListIcon } from '../../../components/Icons';
import { DriverCard } from './components/DriverCard';
import { DriverRow } from './components/DriverRow';
import { useAuth } from '../auth/hooks/useAuth';
import { calcDriverDebt } from './utils/debtUtils';
import { DayOff, getDaysOffSet, subscribeToDaysOff } from '../../../services/daysOffService';

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
    theme: 'light' | 'dark';
}

const DriversPage: React.FC<DriversPageProps> = ({
    drivers, cars, transactions, isDataLoading, userRole, fleetId,
    onUpdateStatus, onEditDriver, onDeleteDriver, onAddDriver, theme,
}) => {
    const { t } = useTranslation();
    const { adminUser } = useAuth();
    const currentUserId = adminUser?.id || 'unknown';

    // Subscribe to days off for the entire fleet
    const [allDaysOff, setAllDaysOff] = useState<DayOff[]>([]);
    useEffect(() => {
        const unsub = subscribeToDaysOff(setAllDaysOff, fleetId);
        return unsub;
    }, [fleetId]);

    const fleetStats = useMemo(() => {
        let totalDebt = 0, totalIncome = 0, todayIncome = 0;
        drivers.filter(d => !d.isDeleted).forEach(d => {
            const car = cars.find(c => c.assignedDriverId === d.id) ?? null;
            const daysOffSet = getDaysOffSet(allDaysOff, d.id);
            const s = calcDriverDebt(d, car, transactions, daysOffSet);
            totalDebt += s.totalDebt;
            totalIncome += s.totalIncome;
            todayIncome += s.todayIncome;
        });
        return { totalDebt, totalIncome, todayIncome };
    }, [drivers, cars, transactions, allDaysOff]);

    const {
        searchQuery, setSearchQuery,
        viewMode, setViewMode,
        currentPage, setCurrentPage,
        paginatedDrivers,
        totalPages,
        filteredDrivers
    } = useDriversList(drivers);

    return (
        <div className="space-y-6">
            {/* Fleet debt summary */}
            {(fleetStats.totalDebt > 0 || fleetStats.todayIncome > 0) && (
                <div className={`grid grid-cols-3 gap-4`}>
                    <div className={`rounded-2xl p-4 border ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'}`}>
                        <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Bugungi tushum</p>
                        <p className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{fmt(fleetStats.todayIncome)} <span className="text-xs font-normal text-gray-500">UZS</span></p>
                    </div>
                    <div className={`rounded-2xl p-4 border ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'}`}>
                        <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Jami tushum</p>
                        <p className={`text-lg font-bold text-green-400`}>{fmt(fleetStats.totalIncome)} <span className="text-xs font-normal text-gray-500">UZS</span></p>
                    </div>
                    <div className={`rounded-2xl p-4 border ${fleetStats.totalDebt > 0 ? 'border-red-500/30 bg-red-500/5' : theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'}`}>
                        <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${fleetStats.totalDebt > 0 ? 'text-red-400' : theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Jami qarz</p>
                        <p className={`text-lg font-bold ${fleetStats.totalDebt > 0 ? 'text-red-400' : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {fleetStats.totalDebt > 0 ? `−${fmt(fleetStats.totalDebt)}` : '0'} <span className="text-xs font-normal text-gray-500">UZS</span>
                        </p>
                    </div>
                </div>
            )}

            {/* Search Bar & View Toggle */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className={`flex-1 p-1.5 rounded-2xl border shadow-sm ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIcon className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                        </div>
                        <input
                            type="text"
                            className={`block w-full pl-10 pr-3 py-2.5 border rounded-xl leading-5 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0f766e] focus:border-[#0f766e] sm:text-sm transition-colors ${theme === 'dark'
                                ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
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
                    <div className={`flex items-center p-1.5 rounded-2xl border shadow-sm ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'}`}>
                        <button
                            onClick={onAddDriver}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 shadow-lg ${theme === 'dark'
                                ? 'bg-gradient-to-r from-[#0f766e] to-[#0f766e] hover:from-[#0f766e] hover:to-[#1a4048] text-white shadow-sm'
                                : 'bg-gradient-to-r from-[#0f766e] to-[#0f766e] hover:from-[#0f766e] hover:to-[#1a4048] text-white shadow-sm'
                                }`}
                        >
                            <PlusIcon className="w-5 h-5" />
                            <span>{t('add')}</span>
                        </button>
                    </div>
                )}

                {/* View Toggle */}
                <div className={`flex items-center p-1.5 rounded-2xl border shadow-sm ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'}`}>
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
                                    daysOff={allDaysOff}
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
                        <div className={`rounded-2xl border overflow-hidden shadow-lg ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'}`}>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className={`${theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-500'} text-xs uppercase tracking-wider`}>
                                            <th className="p-4 font-bold border-b border-gray-200 dark:border-gray-700">{t('driver')}</th>
                                            <th className="p-4 font-bold border-b border-gray-200 dark:border-gray-700">Avtomobil</th>
                                            <th className="p-4 font-bold border-b border-gray-200 dark:border-gray-700">Hujjatlar</th>
                                            <th className="p-4 font-bold border-b border-gray-200 dark:border-gray-700">Reja / Qarz</th>
                                            {userRole === 'admin' && <th className="p-4 font-bold border-b border-gray-200 dark:border-gray-700 text-center">{t('actions')}</th>}
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-100'}`}>
                                        {paginatedDrivers.map(driver => (
                                            <DriverRow
                                                key={driver.id}
                                                driver={driver}
                                                car={cars.find(c => c.assignedDriverId === driver.id) ?? null}
                                                transactions={transactions}
                                                daysOff={allDaysOff}
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
                                    ? 'bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
                                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
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
                                            ? 'bg-[#0f766e] text-white shadow-lg shadow-[#0f766e]/30'
                                            : theme === 'dark'
                                                ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
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
                                    ? 'bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
                                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                                    }`}
                            >
                                {t('next')}
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div className={`text-center py-12 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                    <div className="bg-gray-100 dark:bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
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
