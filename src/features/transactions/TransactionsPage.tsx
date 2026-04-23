import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Transaction, Driver, TransactionType, PaymentStatus, UserRole, AdminUser, Language, Car } from '../../core/types';
import { useFinanceStats } from '../finance/hooks/useFinanceStats';
import * as firestoreService from '../../../services/firestoreService';
import { formatNumberSmart } from '../../../utils/formatNumber';
import DatePicker from '../../../components/DatePicker';
import CustomSelect from '../../../components/CustomSelect';
import DriverFilterModal from '../../../components/DriverFilterModal';
import {
    TrashIcon,
    UsersIcon,
    FilterIcon,
    EditIcon
} from '../../../components/Icons';
import { useToast } from '../../../components/ToastNotification';
import FinancialModal from '../../../components/FinancialModal';

interface TransactionsPageProps {
    transactions: Transaction[];
    drivers: Driver[];
    cars?: Car[];
    userRole: UserRole;
    adminUser: AdminUser | null;
    theme: 'dark' | 'light';
    // language, setLanguage props removed
}

export const TransactionsPage: React.FC<TransactionsPageProps> = ({
    transactions: allTransactions,
    drivers,
    cars = [],
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
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [driverModalOpen, setDriverModalOpen] = useState(false);

    const nonDeletedDrivers = drivers.filter(d => !d.isDeleted);

    const handleDeleteTransaction = async (id: string) => {
        const tx = allTransactions.find(t => t.id === id);
        if (!tx) return;

        if (window.confirm(`${t('delete')} transaction? (${formatNumberSmart(tx.amount, false, language)} UZS)`)) {
            try {
                await firestoreService.deleteTransaction(id, { adminName: adminUser?.username || 'Admin' }, adminUser?.id);
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

    const handleEditSubmit = async (data: Omit<Transaction, 'id'>, id?: string) => {
        if (!id) return;
        try {
            await firestoreService.updateTransaction(id, data);
            addToast('success', 'Transaction updated successfully');
            setEditingTransaction(null);
        } catch (error) {
            console.error('Failed to update transaction:', error);
            addToast('error', 'Failed to update transaction');
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
                        adminName: adminUser?.username || 'Admin',
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
            {/* Header Removed - Managed by DesktopHeader */}

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
                            labelClassName="text-white"
                        />
                    </div>
                    {/* End Date */}
                    <div className="w-full">
                        <DatePicker
                            label={t('toDate') || 'To Date'}
                            value={filters.endDate ? new Date(filters.endDate) : new Date()}
                            onChange={(date) => setFilters(prev => ({ ...prev, endDate: date.toISOString() }))}
                            theme={theme}
                            labelClassName="text-white"
                        />
                    </div>
                    {/* Driver Filter Button */}
                    <div className="w-full">
                        {(() => {
                            const selectedDriver = filters.driverId && filters.driverId !== 'all'
                                ? nonDeletedDrivers.find(d => d.id === filters.driverId)
                                : null;
                            const selectedCar = selectedDriver
                                ? cars.find(c => c.assignedDriverId === selectedDriver.id)
                                : null;
                            return (
                                <>
                                    <div className={`flex items-center gap-2 mb-2 text-white`}>
                                        <UsersIcon className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase tracking-wider">{t('driver')}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setDriverModalOpen(true)}
                                        className={`w-full px-4 py-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
                                            driverModalOpen
                                                ? theme === 'dark'
                                                    ? 'bg-gray-800 border-teal-500 ring-1 ring-teal-500/40'
                                                    : 'bg-white border-teal-500 ring-1 ring-teal-500/20'
                                                : theme === 'dark'
                                                    ? 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                                                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        {selectedDriver ? (
                                            <>
                                                <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0 border border-gray-600">
                                                    {selectedDriver.avatar
                                                        ? <img src={selectedDriver.avatar} alt="" className="w-full h-full object-cover" />
                                                        : <div className={`w-full h-full flex items-center justify-center text-xs font-bold ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>{selectedDriver.name.charAt(0)}</div>
                                                    }
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className={`text-sm font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{selectedDriver.name}</div>
                                                    {selectedCar && <div className={`text-xs truncate ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{selectedCar.name} · {selectedCar.licensePlate}</div>}
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-lg">👥</span>
                                                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{t('allDrivers')}</span>
                                            </>
                                        )}
                                        <svg className={`w-4 h-4 ml-auto flex-shrink-0 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    <DriverFilterModal
                                        isOpen={driverModalOpen}
                                        onClose={() => setDriverModalOpen(false)}
                                        selectedDriverId={filters.driverId || 'all'}
                                        onSelect={(val) => setFilters(prev => ({ ...prev, driverId: val }))}
                                        drivers={nonDeletedDrivers}
                                        cars={cars}
                                        theme={theme}
                                        allLabel={t('allDrivers')}
                                        searchPlaceholder={t('search') || 'Qidirish...'}
                                    />
                                </>
                            );
                        })()}
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
                            labelClassName="text-white"
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
                                                ? 'bg-gray-700 border-gray-600 checked:bg-[#0f766e] checked:border-[#0f766e] hover:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e] focus:ring-offset-0 focus:ring-offset-gray-800'
                                                : 'bg-white border-gray-300 checked:bg-[#0f766e] checked:border-[#0f766e] hover:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e] focus:ring-offset-0'
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
                                    const driver = tx.driverId ? drivers.find(d => d.id === tx.driverId) : undefined;
                                    const car = tx.carId ? cars.find(c => c.id === tx.carId) : undefined;
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
                                                            ? 'bg-gray-700 border-gray-600 checked:bg-[#0f766e] checked:border-[#0f766e] hover:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e] focus:ring-offset-0 focus:ring-offset-gray-800'
                                                            : 'bg-white border-gray-300 checked:bg-[#0f766e] checked:border-[#0f766e] hover:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e] focus:ring-offset-0'
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
                                                    {car ? (
                                                        <>
                                                            <div className={`w-8 h-8 rounded-full overflow-hidden border flex-shrink-0 flex items-center justify-center text-lg ${theme === 'dark' ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-gray-100'}`}>
                                                                🚗
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                                        {car.name}
                                                                    </span>
                                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase ${theme === 'dark' ? 'border-gray-600 bg-gray-800 text-gray-400' : 'border-gray-200 bg-gray-100 text-gray-500'}`}>
                                                                        {t('vehicleLabel')}
                                                                    </span>
                                                                </div>
                                                                <div className={`text-xs font-mono ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                                                                    {car.licensePlate}
                                                                </div>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className={`w-8 h-8 rounded-full overflow-hidden border flex-shrink-0 ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'} ${driver?.isDeleted ? 'opacity-50 grayscale' : ''}`}>
                                                                {driver ? <img src={driver.avatar} className="w-full h-full object-cover" alt={driver.name} /> : <div className={`w-full h-full flex items-center justify-center font-bold text-sm ${theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>{tx.driverName ? tx.driverName.charAt(0) : '?'}</div>}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`text-sm font-bold ${driver?.isDeleted ? (theme === 'dark' ? 'text-red-400' : 'text-red-600') : (theme === 'dark' ? 'text-white' : 'text-gray-900')}`}>
                                                                        {driver?.name || tx.driverName || 'Deleted'}
                                                                    </span>
                                                                    {driver?.isDeleted && (
                                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${theme === 'dark' ? 'border-red-900/50 bg-red-900/20 text-red-400' : 'border-red-200 bg-red-50 text-red-600'}`}>
                                                                            {t('deleted')}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {(driver?.isDeleted || driver) && (
                                                                    <div className={`text-xs flex gap-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                                                                        <span>{driver?.licensePlate}</span>
                                                                        <span>•</span>
                                                                        <span>{driver?.phone}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                            <td className={`px-6 py-4 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-medium">
                                                        {tx.description === 'Salary Refund: Manual Action'
                                                            ? t('salaryRefundDescription')
                                                            : tx.description || '—'}
                                                    </span>
                                                    {(tx.paymentMethod || tx.chequeImage) && (
                                                        <div className="flex items-center gap-2 mt-1">
                                                            {tx.paymentMethod && (
                                                                <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border uppercase font-bold tracking-wider ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>
                                                                    {tx.paymentMethod === 'cash' ? `💵 ${t('paymentCash')}` : tx.paymentMethod === 'card' ? `💳 ${t('paymentCard')}` : `🏦 ${t('paymentTransfer')}`}
                                                                </span>
                                                            )}
                                                            {tx.chequeImage && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setSelectedImage(tx.chequeImage!); }}
                                                                    className={`flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full border shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:outline-none hover:-translate-y-0.5 ${theme === 'dark' ? 'bg-blue-900/30 border-blue-700/50 text-blue-400 hover:bg-blue-800/50 hover:border-blue-600 focus:ring-blue-500 font-medium' : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 font-medium'}`}
                                                                >
                                                                    📄 {t('viewReceipt')}
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className={`px-6 py-4 text-sm font-bold text-right font-mono ${
                                                tx.type === TransactionType.INCOME ? 'text-[#0f766e]'
                                                : tx.type === TransactionType.DAY_OFF ? 'text-blue-400'
                                                : 'text-red-500'
                                            }`}>
                                                {tx.type === TransactionType.DAY_OFF ? (
                                                    <span className="flex items-center justify-end gap-1.5 text-xs font-bold text-blue-400">
                                                        <span>🏝️</span> {t('dayOffLabel')}
                                                    </span>
                                                ) : (
                                                    <>{tx.type === TransactionType.INCOME ? '+' : '-'}{formatNumberSmart(tx.amount, false, language)} <span className="ml-1">UZS</span></>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {userRole === 'admin' && (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={() => setEditingTransaction(tx)} className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-400/10' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}>
                                                            <EditIcon className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => handleDeleteTransaction(tx.id)} className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-red-400 hover:bg-red-400/10' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}>
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
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

            {/* Receipt Viewer Modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    onClick={() => setSelectedImage(null)}
                >
                    <div
                        className={`relative flex flex-col rounded-2xl shadow-2xl overflow-hidden max-w-md w-full max-h-[90vh] ${theme === 'dark' ? 'bg-[#111827] border border-gray-700' : 'bg-white border border-gray-200'}`}
                        onClick={e => e.stopPropagation()}
                        style={{ animation: 'modalPop 0.2s ease-out' }}
                    >
                        {/* Modal Header */}
                        <div className={`flex items-center justify-between px-5 py-4 border-b flex-shrink-0 ${theme === 'dark' ? 'border-gray-700 bg-gray-800/60' : 'border-gray-100 bg-gray-50'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
                                    <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t('viewReceipt')}</p>
                                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{t('paymentCard')}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={selectedImage}
                                    download
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-400/10' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'}`}
                                    title="Download"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                </a>
                                <button
                                    onClick={() => setSelectedImage(null)}
                                    className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Receipt Image */}
                        <div className={`overflow-y-auto flex-1 p-4 ${theme === 'dark' ? 'bg-[#0d1117]' : 'bg-gray-50'}`}>
                            <img
                                src={selectedImage}
                                alt="Receipt"
                                className="w-full rounded-xl object-contain shadow-lg border border-white/5"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Transaction Modal */}
            {editingTransaction && (
                <FinancialModal
                    isOpen={true}
                    onClose={() => setEditingTransaction(null)}
                    onSubmit={handleEditSubmit}
                    drivers={drivers}
                    cars={cars}
                    theme={theme}
                    initialTransaction={editingTransaction}
                />
            )}
        </div>
    );
};
