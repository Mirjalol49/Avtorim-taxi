import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Transaction, Driver, TransactionType, PaymentStatus, UserRole, AdminUser, Language } from '../../core/types';
import { useFinanceStats } from '../finance/hooks/useFinanceStats';
import * as firestoreService from '../../../services/firestoreService';
import { formatNumberSmart } from '../../../utils/formatNumber';
import DatePicker from '../../../components/DatePicker';
import CustomSelect from '../../../components/CustomSelect';
import {
    TrashIcon,
    UsersIcon,
    FilterIcon
} from '../../../components/Icons';
import { useToast } from '../../../components/ToastNotification';

interface TransactionsPageProps {
    transactions: Transaction[];
    drivers: Driver[];
    userRole: UserRole;
    adminUser: AdminUser | null;
    theme: 'dark' | 'light';
    // language, setLanguage props removed
}

export const TransactionsPage: React.FC<TransactionsPageProps> = ({
    transactions: allTransactions,
    drivers,
    userRole,
    adminUser,
    theme
}) => {
    const { t, i18n } = useTranslation();
    const language = (['uz', 'en', 'ru'].includes(i18n.language) ? i18n.language : 'uz') as Language;
    const { addToast } = useToast();

    // useFinanceStats now manages language internally
    const {
        filters, setFilters,
        paginatedTransactions,
        totalPages,
        currentPage,
        setCurrentPage,
        filteredTransactionsCount,
        filteredTransactions,
        itemsPerPage
    } = useFinanceStats(allTransactions);

    const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);

    const nonDeletedDrivers = drivers.filter(d => !d.isDeleted);

    const handleDeleteTransaction = async (id: string) => {
        const tx = allTransactions.find(t => t.id === id);
        if (!tx) return;

        if (window.confirm(`${t('delete')} transaction? (${formatNumberSmart(tx.amount, false, language)} UZS)`)) {
            try {
                await firestoreService.deleteTransaction(id, { adminName: adminUser?.username || 'Admin' });
                addToast('success', 'Transaction deleted');
                if (selectedTransactions.includes(id)) {
                    setSelectedTransactions(prev => prev.filter(tid => tid !== id));
                }
            } catch (error) {
                console.error('Failed to delete transaction:', error);
                addToast('error', 'Failed to delete transaction');
            }
        }
    };

    const handleBulkDelete = async () => {
        if (selectedTransactions.length === 0) return;

        const totalAmount = allTransactions
            .filter(t => selectedTransactions.includes(t.id))
            .reduce((sum, t) => sum + t.amount, 0);

        if (window.confirm(`Are you sure you want to delete ${selectedTransactions.length} transaction(s)?\nTotal Amount: ${formatNumberSmart(totalAmount, false, language)} UZS`)) {
            try {
                await firestoreService.deleteTransactionsBatch(
                    selectedTransactions,
                    {
                        adminName: adminUser?.name || 'Admin',
                        count: selectedTransactions.length,
                        totalAmount: totalAmount
                    },
                    adminUser?.id
                );
                addToast('success', `${selectedTransactions.length} transactions deleted`);
                setSelectedTransactions([]);
            } catch (error) {
                console.error('Failed to delete transactions:', error);
                addToast('error', 'Failed to delete transactions');
            }
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <h1 className={`text-2xl font-bold px-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {t('transactions')}
            </h1>

            {/* Filters */}
            <div className={`p-4 rounded-2xl border shadow-lg ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                    {/* Start Date */}
                    <div className="w-full">
                        <DatePicker
                            label={t('fromDate') || 'From Date'}
                            value={filters.startDate ? new Date(filters.startDate) : new Date()}
                            onChange={(date) => setFilters(prev => ({ ...prev, startDate: date.toISOString() }))}
                            theme={theme}
                        />
                    </div>
                    {/* End Date */}
                    <div className="w-full">
                        <DatePicker
                            label={t('toDate') || 'To Date'}
                            value={filters.endDate ? new Date(filters.endDate) : new Date()}
                            onChange={(date) => setFilters(prev => ({ ...prev, endDate: date.toISOString() }))}
                            theme={theme}
                        />
                    </div>
                    {/* Driver Select */}
                    <div className="w-full">
                        <CustomSelect
                            label={t('driver')}
                            value={filters.driverId}
                            onChange={(val) => setFilters(prev => ({ ...prev, driverId: val }))}
                            options={[
                                { id: 'all', name: t('allDrivers') },
                                ...nonDeletedDrivers.map(d => ({ id: d.id, name: d.name }))
                            ]}
                            theme={theme}
                            icon={UsersIcon}
                        />
                    </div>
                    {/* Type Select */}
                    <div className="w-full">
                        <CustomSelect
                            label={t('filters')}
                            value={filters.type}
                            onChange={(val) => setFilters(prev => ({ ...prev, type: val }))}
                            options={[
                                { id: 'all', name: t('transactions') },
                                { id: TransactionType.INCOME, name: t('income') },
                                { id: TransactionType.EXPENSE, name: t('expense') }
                            ]}
                            theme={theme}
                            icon={FilterIcon}
                            showSearch={false}
                        />
                    </div>
                </div>
            </div>

            {/* Bulk Delete Button */}
            {userRole === 'admin' && selectedTransactions.length > 0 && (
                <div className="animate-fadeSlideUp">
                    <button
                        onClick={handleBulkDelete}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-all shadow-md"
                    >
                        <TrashIcon className="w-5 h-5" />
                        {t('delete')} {selectedTransactions.length} {t('selected')}
                    </button>
                </div>
            )}

            {/* Transactions Table */}
            <div className={`rounded-3xl border overflow-hidden shadow-xl ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[800px]">
                        <thead className={`border-b ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                            <tr className={`${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                                {userRole === 'admin' && (
                                    <th className={`px-6 py-4 font-bold text-xs uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                        <input
                                            type="checkbox"
                                            checked={selectedTransactions.length > 0 && selectedTransactions.length === filteredTransactionsCount}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedTransactions(filteredTransactions.map(t => t.id));
                                                } else {
                                                    setSelectedTransactions([]);
                                                }
                                            }}
                                            className={`w-5 h-5 rounded-md transition-all duration-200 cursor-pointer ${theme === 'dark'
                                                ? 'bg-gray-700 border-gray-600 checked:bg-[#0d9488] checked:border-[#0d9488] hover:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488] focus:ring-offset-0 focus:ring-offset-gray-800'
                                                : 'bg-white border-gray-300 checked:bg-[#0d9488] checked:border-[#0d9488] hover:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488] focus:ring-offset-0'
                                                }`}
                                        />
                                    </th>
                                )}
                                <th className={`px-6 py-4 font-bold text-xs uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t('time')}</th>
                                <th className={`px-6 py-4 font-bold text-xs uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t('driver')}</th>
                                <th className={`px-6 py-4 font-bold text-xs uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t('comment')}</th>
                                <th className={`px-6 py-4 font-bold text-xs uppercase tracking-wider text-right ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t('amount')}</th>
                                <th className={`px-6 py-4 font-bold text-xs uppercase tracking-wider text-right ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-100'}`}>
                            {paginatedTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className={`px-6 py-12 text-center text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                        {t('noTransactions')}
                                    </td>
                                </tr>
                            ) : (
                                paginatedTransactions.map(tx => {
                                    const driver = drivers.find(d => d.id === tx.driverId);
                                    const isDeleted = tx.status === PaymentStatus.DELETED;
                                    return (
                                        <tr key={tx.id} className={`transition-colors group ${theme === 'dark' ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'} ${isDeleted ? 'opacity-50 grayscale' : ''}`}>
                                            {userRole === 'admin' && (
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedTransactions.includes(tx.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedTransactions(prev => [...prev, tx.id]);
                                                            } else {
                                                                setSelectedTransactions(prev => prev.filter(tid => tid !== tx.id));
                                                            }
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className={`w-5 h-5 rounded-md transition-all duration-200 cursor-pointer ${theme === 'dark'
                                                            ? 'bg-gray-700 border-gray-600 checked:bg-[#0d9488] checked:border-[#0d9488] hover:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488] focus:ring-offset-0 focus:ring-offset-gray-800'
                                                            : 'bg-white border-gray-300 checked:bg-[#0d9488] checked:border-[#0d9488] hover:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488] focus:ring-offset-0'
                                                            }`}
                                                    />
                                                </td>
                                            )}
                                            <td className="px-6 py-4">
                                                <div className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>{new Date(tx.timestamp).toLocaleDateString()}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full overflow-hidden border flex-shrink-0 ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'} ${driver?.isDeleted ? 'opacity-50 grayscale' : ''}`}>
                                                        {driver ? <img src={driver.avatar} className="w-full h-full object-cover" alt={driver.name} /> : <div className="w-full h-full bg-gray-300" />}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-sm font-bold ${driver?.isDeleted ? (theme === 'dark' ? 'text-red-400' : 'text-red-600') : (theme === 'dark' ? 'text-white' : 'text-gray-900')}`}>
                                                                {driver?.name || 'Deleted'}
                                                            </span>
                                                            {driver?.isDeleted && (
                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${theme === 'dark' ? 'border-red-900/50 bg-red-900/20 text-red-400' : 'border-red-200 bg-red-50 text-red-600'}`}>
                                                                    {t('deleted')}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {driver?.isDeleted && (
                                                            <div className={`text-xs flex gap-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                                                                <span>{driver.licensePlate}</span>
                                                                <span>•</span>
                                                                <span>{driver.phone}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className={`px-6 py-4 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                                                {tx.description === 'Salary Refund: Manual Action'
                                                    ? t('salaryRefundDescription')
                                                    : tx.description}
                                            </td>
                                            <td className={`px-6 py-4 text-sm font-bold text-right font-mono ${tx.type === TransactionType.INCOME ? 'text-[#0d9488]' : 'text-red-500'}`}>
                                                {tx.type === TransactionType.INCOME ? '+' : '-'}{tx.amount.toLocaleString()} <span className="ml-1">UZS</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {userRole === 'admin' && (
                                                    <button onClick={() => handleDeleteTransaction(tx.id)} className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-red-400 hover:bg-red-400/10' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}>
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {filteredTransactionsCount > itemsPerPage && (
                    <div className={`flex items-center justify-center gap-2 p-4 border-t ${theme === 'dark' ? 'border-gray-700 bg-gray-800/30' : 'border-gray-100 bg-gray-50/50'}`}>
                        <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${currentPage === 1
                                ? theme === 'dark'
                                    ? 'text-gray-600 cursor-not-allowed'
                                    : 'text-gray-300 cursor-not-allowed'
                                : theme === 'dark'
                                    ? 'text-white hover:bg-gray-700 active:scale-95'
                                    : 'text-gray-900 hover:bg-gray-100 active:scale-95'
                                }`}
                        >
                            ← {t('previous')}
                        </button>

                        <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            {t('page') || 'Page'} {currentPage} / {totalPages}
                        </span>

                        <div className="flex gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === page
                                        ? 'bg-teal-500 text-white'
                                        : theme === 'dark'
                                            ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    {page}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${currentPage === totalPages
                                ? theme === 'dark'
                                    ? 'text-gray-600 cursor-not-allowed'
                                    : 'text-gray-300 cursor-not-allowed'
                                : theme === 'dark'
                                    ? 'text-white hover:bg-gray-700 active:scale-95'
                                    : 'text-gray-900 hover:bg-gray-100 active:scale-95'
                                }`}
                        >
                            {t('next')} →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
