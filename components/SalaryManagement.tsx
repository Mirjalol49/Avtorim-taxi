import React, { useState, useEffect, useMemo } from 'react';
import { Driver, DriverSalary, Transaction, TransactionType, DriverStatus } from '../types';
import { getDriverSalaryHistory, getAllSalaries } from '../services/salaryService';
import CustomSelect from './CustomSelect';
import { UsersIcon, CalendarIcon, SearchIcon, FilterIcon, DownloadIcon, WalletIcon, TrophyIcon, TrendingUpIcon } from './Icons';
import { formatNumberSmart } from '../utils/formatNumber';
import { TRANSLATIONS } from '../translations';

interface SalaryManagementProps {
    drivers: Driver[];
    transactions: Transaction[];
    theme: 'light' | 'dark';
    userRole: 'admin' | 'viewer';
    language: 'uz' | 'ru' | 'en';
    onPaySalary: (driver: Driver) => void;
}

const SalaryManagement: React.FC<SalaryManagementProps> = ({ drivers, transactions, theme, userRole, language, onPaySalary }) => {
    // Data State
    const [salaryHistory, setSalaryHistory] = useState<DriverSalary[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [viewMode, setViewMode] = useState<'current' | 'history'>('current');

    // Filter State
    const [historyFilterDriverId, setHistoryFilterDriverId] = useState<string>('all');

    // Translations
    const t = TRANSLATIONS[language];

    // Load initial data
    useEffect(() => {
        loadSalaries();
    }, [viewMode, historyFilterDriverId]);

    const loadSalaries = async () => {
        setIsLoadingHistory(true);
        try {
            if (viewMode === 'history' && historyFilterDriverId !== 'all') {
                const history = await getDriverSalaryHistory(historyFilterDriverId);
                setSalaryHistory(history);
            } else {
                const allSalaries = await getAllSalaries();
                setSalaryHistory(allSalaries);
            }
        } catch (error) {
            console.error("Failed to load salaries", error);
        } finally {
            setIsLoadingHistory(false);
        }
    };



    const driverOptions = useMemo(() => {
        return drivers.map(d => ({ id: d.id, name: d.name }));
    }, [drivers]);

    const filterOptions = useMemo(() => {
        return [{ id: 'all', name: 'All Drivers' }, ...driverOptions];
    }, [driverOptions]);

    // Helper to get current salary for a driver from history
    const getCurrentSalary = (driverId: string) => {
        const driverSalaries = salaryHistory
            .filter(s => s.driverId === driverId)
            .sort((a, b) => b.effectiveDate - a.effectiveDate);

        const now = Date.now();
        const current = driverSalaries.find(s => s.effectiveDate <= now);
        return current ? current.amount : 0;
    };

    // Stats Calculations
    const totalSalaries = drivers.filter(d => !d.isDeleted).reduce((sum, d) => sum + (d.monthlySalary || 0), 0);

    // Calculate Net Profit (Income - Expense)
    // Note: This logic duplicates App.tsx slightly but is needed for the self-contained component
    const filteredTx = transactions; // Use all transactions for now, or pass filtered ones if needed
    const totalIncome = filteredTx.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = filteredTx.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
    const netProfit = totalIncome - totalExpense;
    const ownerProfit = netProfit - totalSalaries;

    const handleExportCSV = () => {
        const headers = ['Driver ID', 'Amount', 'Effective Date', 'Created By', 'Created At', 'Notes'];
        const csvContent = [
            headers.join(','),
            ...salaryHistory.map(row => [
                row.driverId,
                row.amount,
                new Date(row.effectiveDate).toISOString().split('T')[0],
                row.createdBy,
                new Date(row.createdAt).toISOString(),
                `"${(row.notes || '').replace(/"/g, '""')}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `salary_history_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {t.salaryManagement}
                    </h2>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {t.manageSalariesDescription}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {viewMode === 'history' && (
                        <button
                            onClick={handleExportCSV}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${theme === 'dark'
                                ? 'border-gray-700 hover:bg-gray-800 text-gray-300'
                                : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                                }`}
                        >
                            <DownloadIcon className="w-4 h-4" />
                            {t.exportCsv}
                        </button>
                    )}

                    {/* View Toggle */}
                    <div className={`flex p-1 rounded-xl border ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'}`}>
                        <button
                            onClick={() => setViewMode('current')}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${viewMode === 'current'
                                ? 'bg-[#2D6A76] text-white shadow-sm'
                                : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            {t.currentSalaries}
                        </button>
                        <button
                            onClick={() => setViewMode('history')}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${viewMode === 'history'
                                ? 'bg-[#2D6A76] text-white shadow-sm'
                                : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            {t.historyLog}
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Overview - Only show in Current View */}
            {viewMode === 'current' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Total Salaries Card */}
                    <div className={`p-6 rounded-2xl border shadow-lg ${theme === 'dark' ? 'bg-gradient-to-br from-[#1F2937] to-gray-800 border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <WalletIcon className={`w-10 h-10 ${theme === 'dark' ? 'text-orange-400' : 'text-orange-500'}`} />
                        </div>
                        <h3 className={`text-sm font-bold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t.totalSalaries}</h3>
                        <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`}>
                            {formatNumberSmart(totalSalaries, false, language)} <span className="text-sm">UZS</span>
                        </p>
                        <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{t.monthlyEstimate}</p>
                    </div>

                    {/* Net Profit Card */}
                    <div className={`p-6 rounded-2xl border shadow-lg ${theme === 'dark' ? 'bg-gradient-to-br from-[#1F2937] to-gray-800 border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <TrendingUpIcon className={`w-10 h-10 ${theme === 'dark' ? 'text-green-400' : 'text-green-500'}`} />
                        </div>
                        <h3 className={`text-sm font-bold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t.netProfit}</h3>
                        <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {formatNumberSmart(netProfit, false, language)} <span className="text-sm">UZS</span>
                        </p>
                        <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{t.beforeSalaries}</p>
                    </div>

                    {/* Owner Profit Card */}
                    <div className={`p-6 rounded-2xl border shadow-lg ${theme === 'dark' ? 'bg-gradient-to-br from-[#2D6A76] to-[#1a4048] border-[#2D6A76]' : 'bg-gradient-to-br from-[#2D6A76] to-[#235560] border-[#2D6A76]'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <TrophyIcon className="w-10 h-10 text-white" />
                        </div>
                        <h3 className="text-sm font-bold uppercase tracking-wider mb-2 text-white/80">{t.ownerProfit}</h3>
                        <p className="text-3xl font-bold text-white">
                            {formatNumberSmart(ownerProfit, false, language)} <span className="text-sm">UZS</span>
                        </p>
                        <p className="text-xs mt-2 text-white/60">{t.netProfitMinusSalaries}</p>
                    </div>
                </div>
            )}

            {/* Admin Form Section Removed as per request */}


            {/* Data Display Section */}
            <div className={`rounded-2xl border overflow-hidden ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'}`}>
                {/* Toolbar */}
                <div className={`p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                    <div className="flex items-center gap-2">
                        <FilterIcon className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                        <span className={`text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t.filterByDriver}</span>
                    </div>
                    <div className="w-full sm:w-64">
                        <CustomSelect
                            label="" // No label for toolbar
                            value={historyFilterDriverId}
                            onChange={setHistoryFilterDriverId}
                            options={filterOptions}
                            theme={theme}
                            placeholder={t.allDrivers}
                            showSearch={true}
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className={`text-xs uppercase tracking-wider ${theme === 'dark' ? 'bg-gray-800/50 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                                <th className="px-6 py-4 font-bold">{t.driver}</th>
                                <th className="px-6 py-4 font-bold">{t.amount} (UZS)</th>
                                {viewMode === 'current' && <th className="px-6 py-4 font-bold">{t.status}</th>}
                                <th className="px-6 py-4 font-bold">{t.effectiveDate}</th>
                                {viewMode === 'history' && (
                                    <>
                                        <th className="px-6 py-4 font-bold">{t.createdBy}</th>
                                        <th className="px-6 py-4 font-bold">{t.notes}</th>
                                    </>
                                )}
                                {viewMode === 'current' && <th className="px-6 py-4 font-bold text-right">{t.actions}</th>}
                            </tr>
                        </thead>
                        <tbody className={`text-sm ${theme === 'dark' ? 'divide-y divide-gray-700' : 'divide-y divide-gray-100'}`}>
                            {viewMode === 'current' ? (
                                // Current Salaries View (using drivers prop)
                                drivers.filter(d => !d.isDeleted && (historyFilterDriverId === 'all' || d.id === historyFilterDriverId)).map(driver => (
                                    <tr key={driver.id} className={`transition-colors ${theme === 'dark' ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'}`}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full overflow-hidden border ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}>
                                                    <img src={driver.avatar} className="w-full h-full object-cover" alt={driver.name} />
                                                </div>
                                                <div>
                                                    <div className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{driver.name}</div>
                                                    <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>{driver.carModel}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-sm font-mono font-bold ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`}>
                                                {formatNumberSmart(driver.monthlySalary || 0, false, language)} UZS
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${driver.status === DriverStatus.ACTIVE
                                                ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                                                : 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
                                                }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${driver.status === DriverStatus.ACTIVE ? 'bg-green-500' : 'bg-gray-500'}`} />
                                                {driver.status === DriverStatus.ACTIVE ? t.active : t.offline}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                            {t.current}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {userRole === 'admin' && (
                                                <button
                                                    onClick={() => onPaySalary(driver)}
                                                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95 ${theme === 'dark'
                                                        ? 'bg-[#2D6A76] hover:bg-[#235560] text-white'
                                                        : 'bg-[#2D6A76] hover:bg-[#235560] text-white'
                                                        }`}
                                                >
                                                    {t.paySalary}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                // History View
                                isLoadingHistory ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">{t.loading}</td>
                                    </tr>
                                ) : salaryHistory.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">{t.noRecordsFound}</td>
                                    </tr>
                                ) : (
                                    salaryHistory.map((record) => {
                                        const driver = drivers.find(d => d.id === record.driverId);
                                        return (
                                            <tr key={record.id} className={`transition-colors ${theme === 'dark' ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'}`}>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        {driver?.avatar ? (
                                                            <img src={driver.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                                                        ) : (
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                                                <UsersIcon className="w-4 h-4 text-gray-500" />
                                                            </div>
                                                        )}
                                                        <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                            {driver?.name || t.unknownDriver}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-mono font-bold text-[#2D6A76]">
                                                        {formatNumberSmart(record.amount, false, language)}
                                                    </span>
                                                </td>
                                                <td className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                                                    {new Date(record.effectiveDate).toLocaleDateString()}
                                                </td>
                                                <td className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    {record.createdBy}
                                                    <div className="text-[10px] opacity-60">
                                                        {new Date(record.createdAt).toLocaleString()}
                                                    </div>
                                                </td>
                                                <td className={`px-6 py-4 max-w-xs truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} title={record.notes}>
                                                    {record.notes || '-'}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SalaryManagement;
