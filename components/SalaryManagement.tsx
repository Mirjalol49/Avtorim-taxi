import React, { useState, useEffect, useMemo } from 'react';
import { Driver, DriverSalary, Transaction, TransactionType, DriverStatus, PaymentStatus } from '../types';
import { getDriverSalaryHistory, getAllSalaries } from '../services/salaryService';
import { refundSalaryPayment } from '../services/reversalService';
import { canReversePayment } from '../utils/PaymentGuards';
import CustomSelect from './CustomSelect';
import StatusBadge from './StatusBadge';
import { UsersIcon, CalendarIcon, SearchIcon, FilterIcon, DownloadIcon, WalletIcon, TrendingUpIcon, CheckCircleIcon, AlertCircleIcon, CalculatorIcon, ArrowLeftCircleIcon } from './Icons';
import { formatNumberSmart } from '../utils/formatNumber';
import { TRANSLATIONS } from '../translations';
import ConfirmModal from './ConfirmModal';
import { useToast } from './ToastNotification';

interface SalaryManagementProps {
    drivers: Driver[];
    transactions: Transaction[];
    theme: 'light' | 'dark';
    userRole: 'admin' | 'viewer';
    language: 'uz' | 'ru' | 'en';
    onPaySalary: (driver: Driver, date?: Date) => void;
    salaryHistory: DriverSalary[];
    adminName?: string;
}

const SalaryManagement: React.FC<SalaryManagementProps> = ({ drivers, transactions, theme, userRole, language, onPaySalary, salaryHistory, adminName = 'Admin' }) => {
    // Data State
    const [viewMode, setViewMode] = useState<'current' | 'history'>('current');
    const [showReversed, setShowReversed] = useState(true);
    const [salaryHistoryState, setSalaryHistory] = useState<DriverSalary[]>(salaryHistory);

    // Update local state when prop changes
    useEffect(() => {
        setSalaryHistory(salaryHistory);
    }, [salaryHistory]);

    // Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    // Translations
    const t = TRANSLATIONS[language];

    // Options
    const monthOptions = useMemo(() => {
        return t.months.map((m, i) => ({ id: i.toString(), name: m }));
    }, [t.months]);

    const yearOptions = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let i = currentYear - 5; i <= currentYear + 5; i++) {
            years.push({ id: i.toString(), name: i.toString() });
        }
        return years;
    }, []);

    // Load Salaries Effect REMOVED - Data passed via props

    // Filter Logic
    const filteredData = useMemo(() => {
        let data: (Driver | DriverSalary)[] = viewMode === 'current' ? drivers : salaryHistoryState;

        // Filter deleted drivers (Current View Only)
        if (viewMode === 'current') {
            data = (data as Driver[]).filter(d => !d.isDeleted);
        }

        // Filter by search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            if (viewMode === 'current') {
                data = (data as Driver[]).filter(d =>
                    d.name.toLowerCase().includes(query) ||
                    d.licensePlate.toLowerCase().includes(query) ||
                    d.carModel.toLowerCase().includes(query)
                );
            } else {
                data = (data as DriverSalary[]).filter(s => {
                    const driver = drivers.find(d => d.id === s.driverId);
                    return driver && driver.name.toLowerCase().includes(query);
                });
            }
        }

        // Filter reversed payments if needed
        if (viewMode === 'history' && !showReversed) {
            data = (data as DriverSalary[]).filter(s => s.status !== PaymentStatus.REVERSED && s.status !== PaymentStatus.REFUNDED);
        }

        // Filter by month/year (for history view)
        if (viewMode === 'history') {
            data = (data as DriverSalary[]).filter(s => {
                const d = new Date(s.effectiveDate);
                return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
            });
        }

        return data;
    }, [drivers, salaryHistoryState, viewMode, searchQuery, selectedMonth, selectedYear, showReversed]);

    // Loading states for reverse operations
    const [reversingMap, setReversingMap] = useState<Record<string, boolean>>({});
    const { addToast } = useToast();

    // Confirm Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        isDanger: boolean;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        isDanger: false
    });

    const closeConfirmModal = () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
    };

    // Refund Handler
    const handleRefundPayment = async (salary: DriverSalary) => {
        const driver = drivers.find(d => d.id === salary.driverId);
        const driverName = driver?.name || 'Unknown Driver';

        // Check if refund is allowed (admin only)
        if (userRole !== 'admin') {
            alert('Only admins can refund payments');
            return;
        }

        setConfirmModal({
            isOpen: true,
            title: t.confirmActionTitle || 'Confirm Action',
            message: `Haqiqatan ham ushbu to'lovni qaytarishni xohlaysizmi?\n\nHaydovchi: ${driverName}\nSumma: ${formatNumberSmart(salary.amount, false, language)} UZS\n\nBu amal ortga qaytarib bo'lmaydi va summa kompaniya balansiga qaytariladi.`,
            isDanger: true,
            onConfirm: async () => {
                closeConfirmModal();
                try {
                    setReversingMap(prev => ({ ...prev, [salary.id]: true }));

                    // Find the corresponding transaction
                    // We widen the search window to 5 minutes (300000ms) to be safer
                    const correspondingTx = transactions.find(t =>
                        t.driverId === salary.driverId &&
                        Math.abs(t.timestamp - salary.createdAt) < 300000 &&
                        t.amount === salary.amount &&
                        t.type === TransactionType.EXPENSE &&
                        t.status !== PaymentStatus.REVERSED &&
                        t.status !== PaymentStatus.REFUNDED
                    );

                    console.log('Refunding salary:', salary.id, 'Found transaction:', correspondingTx?.id);

                    await refundSalaryPayment(
                        salary.id,
                        correspondingTx?.id || null,
                        salary.amount,
                        salary.driverId,
                        userRole === 'admin' ? adminName : 'User'
                    );

                    // Optimistic update
                    setSalaryHistory(prev => prev.map(s =>
                        s.id === salary.id
                            ? { ...s, status: PaymentStatus.REFUNDED, reversedAt: Date.now() }
                            : s
                    ));

                    addToast('success', "To'lov qaytarildi va balans tiklandi");

                } catch (error) {
                    console.error('Refund failed:', error);
                    addToast('error', 'Xatolik yuz berdi: ' + (error as Error).message);
                } finally {
                    setReversingMap(prev => ({ ...prev, [salary.id]: false }));
                }
            }
        });
    };


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

    // Filter transactions by selected month/year for accurate period stats
    const periodTransactions = useMemo(() => {
        return transactions.filter(t => {
            const d = new Date(t.timestamp);
            const matchesPeriod = d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
            const isActive = t.status !== PaymentStatus.REVERSED; // Exclude reversed payments
            return matchesPeriod && isActive;
        });
    }, [transactions, selectedMonth, selectedYear]);

    // Calculate Financials for the period
    const periodIncome = periodTransactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
    const periodExpense = periodTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);

    // Calculate Paid Salaries for the period (from history)
    const periodPaidSalaries = salaryHistory.filter(s => {
        const d = new Date(s.effectiveDate);
        const matchesPeriod = d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
        const isActive = s.status !== PaymentStatus.REVERSED && s.status !== PaymentStatus.REFUNDED; // Exclude reversed and refunded payments
        return matchesPeriod && isActive;
    }).reduce((sum, s) => sum + s.amount, 0);

    const driversPaidCount = new Set(
        salaryHistory.filter(s => {
            const d = new Date(s.effectiveDate);
            return d.getMonth() === selectedMonth &&
                d.getFullYear() === selectedYear &&
                s.status !== PaymentStatus.REVERSED &&
                s.status !== PaymentStatus.REFUNDED;
        }).map(s => s.driverId)
    ).size;

    const pendingSalaries = Math.max(0, totalSalaries - periodPaidSalaries);

    // Derived Metrics
    // Gross Profit = Income - (Expenses - PaidSalaries) -> Income - NonSalaryExpenses
    // We assume periodExpense includes the paid salaries.
    const nonSalaryExpenses = periodExpense - periodPaidSalaries;
    const grossProfit = periodIncome - nonSalaryExpenses;

    // Owner Profit (Projected) = Gross Profit - Total Projected Salaries
    // This shows "What if I pay everyone full salary this month?"
    const ownerProfit = grossProfit - totalSalaries;

    const handleExportCSV = () => {
        const headers = ['Driver ID', 'Amount', 'Effective Date', 'Created By', 'Created At', 'Notes'];
        const csvContent = [
            headers.join(','),
            ...(filteredData as DriverSalary[]).map(row => [ // Export filtered history data
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
                    <button
                        onClick={() => setViewMode('current')}
                        className={`px-5 py-2.5 rounded-lg transition ${viewMode === 'current' ? 'bg-[#0D9488] text-white hover:bg-[#0D9488]/90' : 'bg-white/10 hover:bg-white/20'}`}
                    >
                        {t.currentSalaries}
                    </button>
                    <button
                        onClick={() => setViewMode('history')}
                        className={`px-5 py-2.5 rounded-lg transition ${viewMode === 'history' ? 'bg-[#0D9488] text-white hover:bg-[#0D9488]/90' : 'bg-white/10 hover:bg-white/20'}`}
                    >
                        {t.historyLog}
                    </button>
                    <button
                        onClick={handleExportCSV}
                        className="px-5 py-2.5 bg-white/10 rounded-lg hover:bg-white/20 flex items-center gap-2 transition"
                    >
                        <DownloadIcon className="w-4 h-4" /> CSV Yuklash
                    </button>
                </div>
            </div>


            {/* Stats Overview - Only show in Current View */}
            {
                viewMode === 'current' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                        {/* Card 1 - Paid */}
                        <div className={`rounded-xl p-6 border ${theme === 'dark' ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-gray-200'}`}>
                            <div className="flex items-start justify-between">
                                <div className="p-3 bg-green-500/10 rounded-lg">
                                    <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                            <p className={`text-sm mt-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t.paidThisMonth}</p>
                            <p className="text-3xl font-bold text-green-500 mt-1">
                                {formatNumberSmart(periodPaidSalaries, false, language)} UZS
                            </p>
                            <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                {driversPaidCount} {t.driversPaid}
                            </p>
                        </div>

                        {/* Card 2 - Unpaid (Most Important) */}
                        <div className={`rounded-xl p-6 border ring-1 ${pendingSalaries === 0
                            ? theme === 'dark' ? 'bg-[#1E293B] border-green-500/30 ring-green-500/20' : 'bg-white border-green-200 ring-green-100'
                            : theme === 'dark' ? 'bg-[#1E293B] border-orange-500/30 ring-orange-500/20' : 'bg-white border-orange-200 ring-orange-100'
                            }`}>
                            <div className="flex items-start justify-between">
                                <div className={`p-3 rounded-lg ${pendingSalaries === 0 ? 'bg-green-500/10' : 'bg-orange-500/10'}`}>
                                    {pendingSalaries === 0 ? (
                                        <CheckCircleIcon className="w-6 h-6 text-green-500" />
                                    ) : (
                                        <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    )}
                                </div>
                            </div>
                            <p className={`text-sm mt-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t.pendingSalaries}</p>
                            <p className={`text-3xl font-bold mt-1 ${pendingSalaries === 0 ? 'text-green-500' : 'text-orange-500'}`}>
                                {formatNumberSmart(pendingSalaries, false, language)} UZS
                            </p>
                            <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                {pendingSalaries === 0 ? (
                                    <span className="text-green-500 font-medium">
                                        Congrats, you paid all your employees!
                                    </span>
                                ) : (
                                    t.mustBePaid
                                )}
                            </p>
                        </div>

                        {/* Card 3 - Total */}
                        <div className={`rounded-xl p-6 border ${theme === 'dark' ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-gray-200'}`}>
                            <div className="flex items-start justify-between">
                                <div className="p-3 bg-cyan-500/10 rounded-lg">
                                    <svg className="w-6 h-6 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                </div>
                            </div>
                            <p className={`text-sm mt-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t.totalPayroll}</p>
                            <p className={`text-3xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {formatNumberSmart(totalSalaries, false, language)} UZS
                            </p>
                            <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                {t.months[selectedMonth]} {selectedYear} {t.estimate}
                            </p>
                        </div>
                    </div>
                )
            }


            {/* Data Display Section */}
            <div className={`rounded-2xl border overflow-hidden ${viewMode === 'current' || viewMode === 'history' ? 'mt-10' : ''} ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'}`}>
                {/* Toolbar */}
                <div className={`p-4 border-b flex flex-col md:flex-row md:items-center gap-4 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                    {/* Search Bar */}
                    <div className="flex-1">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <SearchIcon className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                            </div>
                            <input
                                type="text"
                                className={`block w-full pl-10 pr-3 py-2.5 border rounded-xl leading-5 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488] sm:text-sm transition-colors ${theme === 'dark'
                                    ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                                    : 'bg-gray-50 border-gray-200 text-gray-900'
                                    }`}
                                placeholder={t.search || 'Search...'}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Filters (Visible in both views) */}
                    <div className="flex gap-3 w-full md:w-auto">
                        <div className="w-40">
                            <CustomSelect
                                label=""
                                value={selectedMonth.toString()}
                                onChange={(val) => setSelectedMonth(parseInt(val))}
                                options={monthOptions}
                                theme={theme}
                                placeholder="Month"
                                showSearch={false}
                            />
                        </div>
                        <div className="w-28">
                            <CustomSelect
                                label=""
                                value={selectedYear.toString()}
                                onChange={(val) => setSelectedYear(parseInt(val))}
                                options={yearOptions}
                                theme={theme}
                                placeholder="Year"
                                showSearch={false}
                            />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto mt-6">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className={`text-xs uppercase tracking-wider ${theme === 'dark' ? 'bg-gray-800/50 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                                <th className="px-6 py-4 font-bold">{t.driver}</th>
                                <th className="px-6 py-4 font-bold">{t.amount} (UZS)</th>
                                {viewMode === 'current' && <th className="px-6 py-4 font-bold">{t.status}</th>}
                                <th className="px-6 py-4 font-bold">{t.effectiveDate}</th>
                                {viewMode === 'history' && (
                                    <>
                                        <th className="px-6 py-4 font-bold">{t.status}</th>
                                        <th className="px-6 py-4 font-bold text-right">{t.actions}</th>
                                    </>
                                )}
                                {viewMode === 'current' && <th className="px-6 py-4 font-bold text-right">{t.actions}</th>}
                            </tr>
                        </thead>
                        <tbody className={`text-sm ${theme === 'dark' ? 'divide-y divide-gray-700' : 'divide-y divide-gray-100'}`}>
                            {viewMode === 'current' ? (
                                // Current Salaries View (using filteredData)
                                (filteredData as Driver[]).length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-16 text-center">
                                            <div className={`flex flex-col items-center justify-center ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                                <CalculatorIcon className="w-12 h-12 mb-3 opacity-50" />
                                                <p className="text-lg font-medium mb-1">{t.noRecordsFound}</p>
                                                <p className="text-sm">No salaries calculated for {t.months[selectedMonth]} {selectedYear} yet</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    (filteredData as Driver[]).map(driver => {
                                        const hasNoSalary = !driver.monthlySalary || driver.monthlySalary === 0;

                                        // Check if already paid for the selected month/year
                                        const salaryRecord = salaryHistoryState.find(s => {
                                            const d = new Date(s.effectiveDate);
                                            return s.driverId === driver.id &&
                                                d.getMonth() === selectedMonth &&
                                                d.getFullYear() === selectedYear &&
                                                s.status !== PaymentStatus.REVERSED &&
                                                s.status !== PaymentStatus.REFUNDED;
                                        });

                                        const isPaid = !!salaryRecord;
                                        const effectiveDate = isPaid
                                            ? new Date(salaryRecord.effectiveDate)
                                            : new Date(selectedYear, selectedMonth, 1);

                                        return (
                                            <tr key={driver.id} className={`transition-colors ${theme === 'dark' ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'}`}>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-full overflow-hidden border ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}>
                                                            <img src={driver.avatar} className="w-full h-full object-cover" alt={driver.name} />
                                                        </div>
                                                        <div>
                                                            <div className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{driver.name}</div>
                                                            <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>{driver.carModel}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {hasNoSalary ? (
                                                        <span className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                                            Not calculated
                                                        </span>
                                                    ) : (
                                                        <span className={`text-sm font-mono font-bold ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`}>
                                                            {formatNumberSmart(driver.monthlySalary, false, language)} UZS
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {hasNoSalary ? (
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${theme === 'dark' ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-500'}`}>
                                                            Not Calculated
                                                        </span>
                                                    ) : isPaid ? (
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${theme === 'dark' ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600'}`}>
                                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                            {t.paid}
                                                        </span>
                                                    ) : (
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${theme === 'dark' ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600'}`}>
                                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                                            {t.unpaid}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    {hasNoSalary ? '—' : effectiveDate.toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {userRole === 'admin' && (
                                                        hasNoSalary ? (
                                                            <button
                                                                disabled
                                                                className={`px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed opacity-50 ${theme === 'dark' ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-400'}`}
                                                            >
                                                                {t.paySalary}
                                                            </button>
                                                        ) : isPaid ? (
                                                            <button
                                                                disabled
                                                                className={`px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed border ${theme === 'dark' ? 'bg-green-900/10 text-green-500 border-green-800/30' : 'bg-green-50 text-green-600 border-green-200'}`}
                                                            >
                                                                {t.paid}
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => {
                                                                    const effectiveDate = new Date(selectedYear, selectedMonth, 1);
                                                                    onPaySalary(driver, effectiveDate);
                                                                }}
                                                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95 ${theme === 'dark'
                                                                    ? 'bg-[#0d9488] hover:bg-[#0f766e] text-white'
                                                                    : 'bg-[#0d9488] hover:bg-[#0f766e] text-white'
                                                                    }`}
                                                            >
                                                                {t.paySalary}
                                                            </button>
                                                        )
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )
                            ) : (
                                // History View
                                (filteredData as DriverSalary[]).length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">{t.noRecordsFound}</td>
                                    </tr>
                                ) : (
                                    (filteredData as DriverSalary[]).map((record) => {
                                        const driver = drivers.find(d => d.id === record.driverId);
                                        const isRefunded = record.status === PaymentStatus.REFUNDED || record.status === PaymentStatus.REVERSED;
                                        const canRefund = userRole === 'admin' && !isRefunded;

                                        return (
                                            <tr key={record.id} className={`h-[72px] transition-colors ${theme === 'dark' ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'} ${isRefunded ? 'opacity-60' : ''}`}>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        {driver?.avatar ? (
                                                            <img src={driver.avatar} alt="" className={`w-10 h-10 rounded-full object-cover ${driver?.isDeleted ? 'grayscale opacity-70' : ''} ${isRefunded ? 'grayscale' : ''}`} />
                                                        ) : (
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                                                <UsersIcon className="w-5 h-5 text-gray-500" />
                                                            </div>
                                                        )}
                                                        <div className="flex flex-col">
                                                            <span className={`text-base font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} ${driver?.isDeleted || isRefunded ? 'opacity-70' : ''} ${isRefunded ? 'line-through' : ''}`}>
                                                                {driver?.name || t.unknownDriver}
                                                            </span>
                                                            {driver?.isDeleted && (
                                                                <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider">
                                                                    {t.deleted || 'Deleted'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`text-lg font-bold font-mono ${isRefunded ? 'line-through text-gray-500' : 'text-[#0d9488]'}`}>
                                                        {formatNumberSmart(record.amount, false, language)} UZS
                                                    </span>
                                                </td>
                                                <td className={`px-6 py-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    {new Date(record.effectiveDate).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <StatusBadge status={record.status || PaymentStatus.COMPLETED} theme={theme} language={language} size="lg" showIcon={true} />
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {isRefunded ? (
                                                        <button
                                                            disabled
                                                            className={`px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed border ${theme === 'dark' ? 'bg-gray-700 text-gray-400 border-gray-600' : 'bg-gray-200 text-gray-500 border-gray-300'}`}
                                                        >
                                                            {t.statusRefunded}
                                                        </button>
                                                    ) : (
                                                        userRole === 'admin' && (
                                                            <button
                                                                onClick={() => handleRefundPayment(record)}
                                                                disabled={!!reversingMap[record.id]}
                                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all text-white ${reversingMap[record.id]
                                                                    ? 'bg-gray-400 cursor-not-allowed'
                                                                    : 'bg-red-500 hover:bg-red-600 active:scale-95 shadow-sm hover:shadow'
                                                                    }`}
                                                            >
                                                                {reversingMap[record.id] ? (
                                                                    <span className="inline-flex items-center gap-2">
                                                                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                                                        </svg>
                                                                        {t.reverseAction}...
                                                                    </span>
                                                                ) : (
                                                                    t.reverseAction
                                                                )}
                                                            </button>
                                                        )
                                                    )}
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

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onCancel={closeConfirmModal}
                lang={language}
                isDanger={confirmModal.isDanger}
                theme={theme}
                showIcon={false}
                align="left"
                confirmLabel={t.confirm}
                cancelLabel={t.cancel}
            />
        </div >
    );
};

export default SalaryManagement;
