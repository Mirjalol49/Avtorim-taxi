import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Transaction, Driver, TransactionType, PaymentStatus, UserRole, AdminUser, Language, Car } from '../../core/types';
import { useFinanceStats } from '../finance/hooks/useFinanceStats';
import * as firestoreService from '../../../services/firestoreService';
import { useDataContext } from '../../core/context/DataContext';
import { formatNumberSmart } from '../../../utils/formatNumber';
import NumberTooltip from '../../../components/NumberTooltip';
import DatePicker from '../../../components/DatePicker';
import CustomSelect from '../../../components/CustomSelect';
import DriverFilterModal from '../../../components/DriverFilterModal';
import {
    TrashIcon,
    UsersIcon,
    FilterIcon,
    EditIcon,
    CarIcon,
    DownloadIcon,
} from '../../../components/Icons';
import { useToast } from '../../../components/ToastNotification';
import { useConfirm } from '../../../components/ConfirmContext';
import FinancialModal from '../../../components/FinancialModal';
import BalanceCheckModal from '../../../components/BalanceCheckModal';
import { exportTransactionsToExcel } from '../../../utils/exportToExcel';

const EXPENSE_CATEGORIES = [
    { icon: '⛽', label: 'Benzin' },
    { icon: '🔧', label: 'Ehtiyot qism' },
    { icon: '🔩', label: 'Ta\'mirlash' },
    { icon: '🚨', label: 'Jarima' },
    { icon: '💡', label: 'Kommunal' },
    { icon: '🏢', label: 'Ijara' },
    { icon: '🛒', label: 'Xarid' },
    { icon: '📝', label: 'Boshqa' },
];

const detectCategory = (desc: string | undefined) => {
    if (!desc) return null;
    return EXPENSE_CATEGORIES.find(cat =>
        desc === cat.label ||
        desc.startsWith(cat.label + ' ') ||
        desc.startsWith(cat.label + ',') ||
        desc.startsWith(cat.label + ':')
    ) ?? null;
};

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
    const confirm = useConfirm();
    const { setTransactions } = useDataContext();

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
    const [balanceCheckOpen, setBalanceCheckOpen] = useState(false);

    const nonDeletedDrivers = drivers.filter(d => !d.isDeleted);

    const handleDeleteTransaction = async (id: string) => {
        const tx = allTransactions.find(t => t.id === id);
        if (!tx) return;

        const ok = await confirm({
            title: t('confirmDeleteTitle'),
            message: t('deleteConfirmTx'),
            isDanger: true,
        });
        if (!ok) return;

        // Optimistic: remove immediately
        setTransactions(prev => prev.filter(t => t.id !== id));
        setSelectedTransactions(prev => prev.filter(tid => tid !== id));

        try {
            await firestoreService.deleteTransaction(id, { adminName: adminUser?.username || 'Admin' }, adminUser?.id);
            addToast('success', t('transactionDeleted'));
        } catch {
            setTransactions(prev => {
                if (prev.find(t => t.id === id)) return prev;
                return [...prev, tx].sort((a, b) => b.timestamp - a.timestamp);
            });
            addToast('error', t('transactionDeleteFailed'));
        }
    };

    const handleEditSubmit = async (data: Omit<Transaction, 'id'>, id?: string) => {
        if (!id) return;
        const original = allTransactions.find(t => t.id === id);

        // Optimistic: update immediately and close modal
        setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
        setEditingTransaction(null);

        try {
            await firestoreService.updateTransaction(id, data);
            addToast('success', t('transactionUpdated'));
        } catch {
            if (original) setTransactions(prev => prev.map(t => t.id === id ? original : t));
            setEditingTransaction(original ?? null);
            addToast('error', t('transactionUpdateFailed'));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedTransactions.length === 0) return;

        const toDelete = new Set(selectedTransactions);
        const removed = allTransactions.filter(t => toDelete.has(t.id));
        const totalAmount = removed.reduce((sum, t) => sum + t.amount, 0);
        const n = selectedTransactions.length;

        const ok = await confirm({
            title: t('confirmDeleteTitle'),
            message: t('deleteConfirmBulkTx')
                .replace('{n}', String(n))
                .replace('{amount}', formatNumberSmart(totalAmount, false, language)),
            isDanger: true,
        });
        if (!ok) return;

        // Optimistic: remove all immediately
        setTransactions(prev => prev.filter(t => !toDelete.has(t.id)));
        setSelectedTransactions([]);

        try {
            await firestoreService.deleteTransactionsBatch(
                selectedTransactions,
                { adminName: adminUser?.username || 'Admin', count: n, totalAmount },
                adminUser?.id
            );
            addToast('success', t('bulkDeleteSuccess', { n }));
        } catch {
            setTransactions(prev => {
                const existingIds = new Set(prev.map(t => t.id));
                const reverted = removed.filter(t => !existingIds.has(t.id));
                return [...prev, ...reverted].sort((a, b) => b.timestamp - a.timestamp);
            });
            addToast('error', t('bulkDeleteFailed'));
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header Removed - Managed by DesktopHeader */}

            {/* Balance Check button row */}
            <div className="flex justify-end">
                <button
                    onClick={() => setBalanceCheckOpen(true)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] font-bold transition-all active:scale-95 shadow-sm ${
                        theme === 'dark'
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/50'
                            : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-300'
                    }`}
                >
                    <span className="text-base">💳</span>
                    Balans tekshirish
                </button>
            </div>

            {/* Filters */}
            <div className={`p-4 rounded-2xl border shadow-lg ${theme === 'dark' ? 'bg-surface border-white/[0.08]' : 'bg-white border-gray-200'}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                    {/* Start Date */}
                    <div className="w-full">
                        <DatePicker
                            label={t('fromDate') || 'From Date'}
                            value={new Date(filters.startDate)}
                            onChange={(date) => { date.setHours(0, 0, 0, 0); setFilters(prev => ({ ...prev, startDate: date.toISOString() })); }}
                            theme={theme}
                            labelClassName="text-white"
                        />
                    </div>
                    {/* End Date */}
                    <div className="w-full">
                        <DatePicker
                            label={t('toDate') || 'To Date'}
                            value={new Date(filters.endDate)}
                            onChange={(date) => { date.setHours(23, 59, 59, 999); setFilters(prev => ({ ...prev, endDate: date.toISOString() })); }}
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
                                                    ? 'bg-surface-2 border-teal-500 ring-1 ring-teal-500/40'
                                                    : 'bg-white border-teal-500 ring-1 ring-teal-500/20'
                                                : theme === 'dark'
                                                    ? 'bg-surface-2 border-white/[0.08] hover:border-white/[0.12]'
                                                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        {selectedDriver ? (
                                            <>
                                                <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0 border border-gray-600">
                                                    {selectedDriver.avatar
                                                        ? <img src={selectedDriver.avatar} alt="" className="w-full h-full object-cover" />
                                                        : <div className={`w-full h-full flex items-center justify-center text-xs font-bold ${theme === 'dark' ? 'bg-surface-2 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>{selectedDriver.name.charAt(0)}</div>
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
                                { id: 'all',                      name: t('transactions') },
                                { id: TransactionType.INCOME,     name: t('income') },
                                { id: TransactionType.EXPENSE,    name: t('expense') },
                                { id: TransactionType.DAY_OFF,    name: `🏝️ ${t('legendDayOff') || 'Dam olish kuni'}` },
                            ]}
                            theme={theme}
                            icon={FilterIcon}
                            showSearch={false}
                            labelClassName="text-white"
                        />
                    </div>
                </div>
            </div>

            {/* Toolbar: Bulk Delete + Export */}
            <div className="flex items-center justify-between gap-3">
                {userRole === 'admin' && selectedTransactions.length > 0 ? (
                    <button
                        onClick={handleBulkDelete}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-all shadow-md"
                    >
                        <TrashIcon className="w-4 h-4" />
                        {t('delete')} {selectedTransactions.length} {t('selected')}
                    </button>
                ) : (
                    <div />
                )}
                <button
                    onClick={() => {
                        const dateTag = filters.startDate
                            ? `_${filters.startDate.slice(0, 10)}`
                            : '';
                        exportTransactionsToExcel(
                            filteredTransactions,
                            `O'tkazmalar${dateTag}`
                        );
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all active:scale-95 ${
                        theme === 'dark'
                            ? 'bg-surface border-white/[0.08] text-gray-300 hover:border-emerald-500/40 hover:text-emerald-400 hover:bg-emerald-500/5'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50'
                    }`}
                >
                    <DownloadIcon className="w-4 h-4" />
                    Excel ({filteredTransactionsCount})
                </button>
            </div>

            {/* Transactions Table */}
            <div className={`rounded-3xl border shadow-xl ${theme === 'dark' ? 'bg-surface border-white/[0.08]' : 'bg-white border-gray-200'}`}>
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left min-w-[800px]">
                        <thead className={`border-b ${theme === 'dark' ? 'bg-surface-2 border-white/[0.08]' : 'bg-gray-50 border-gray-200'}`}>
                            <tr className={`${theme === 'dark' ? 'bg-surface-2' : 'bg-surface-2'}`}>
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
                                                ? 'bg-surface-2 border-white/[0.08] checked:bg-[#0f766e] checked:border-[#0f766e] hover:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e] focus:ring-offset-0 focus:ring-offset-[#111111]'
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
                        <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/[0.07]' : 'divide-black/[0.05]'}`}>
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
                                    // For "other" expenses (no driver, no car) — extract category from description
                                    const expenseCat = tx.type === TransactionType.EXPENSE && !driver && !car
                                        ? detectCategory(tx.description)
                                        : null;
                                    return (
                                        <tr key={tx.id} className={`transition-colors group ${theme === 'dark' ? 'hover:bg-surface-2' : 'hover:bg-black/[0.03]'} ${isDeleted ? 'opacity-50 grayscale' : ''}`}>
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
                                                            ? 'bg-surface-2 border-white/[0.08] checked:bg-[#0f766e] checked:border-[#0f766e] hover:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e] focus:ring-offset-0 focus:ring-offset-[#111111]'
                                                            : 'bg-white border-gray-300 checked:bg-[#0f766e] checked:border-[#0f766e] hover:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e] focus:ring-offset-0'
                                                            }`}
                                                    />
                                                </td>
                                            )}
                                            <td className="px-6 py-4">
                                                <div className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>{new Date(tx.timestamp).toLocaleDateString('en-GB')}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {car ? (
                                                        /* ── Car expense ── */
                                                        <>
                                                            <div className={`w-8 h-8 rounded-full overflow-hidden border flex-shrink-0 flex items-center justify-center ${theme === 'dark' ? 'border-white/[0.08] bg-surface-2' : 'border-gray-200 bg-gray-100'}`}>
                                                                <CarIcon className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                                        {car.name}
                                                                    </span>
                                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase ${theme === 'dark' ? 'border-white/[0.08] bg-surface-2 text-gray-400' : 'border-gray-200 bg-gray-100 text-gray-500'}`}>
                                                                        {t('vehicleLabel')}
                                                                    </span>
                                                                </div>
                                                                <div className={`text-xs font-mono ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                                                                    {car.licensePlate}
                                                                </div>
                                                            </div>
                                                        </>
                                                    ) : expenseCat ? (
                                                        /* ── "Other" expense with detected category ── */
                                                        <>
                                                            <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-lg border ${theme === 'dark' ? 'border-red-500/20 bg-red-500/10' : 'border-red-200 bg-red-50'}`}>
                                                                {expenseCat.icon}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className={`text-sm font-bold ${theme === 'dark' ? 'text-red-300' : 'text-red-700'}`}>
                                                                    {expenseCat.label}
                                                                </span>
                                                                <span className={`text-[10px] font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>
                                                                    {t('generalExpense') ?? 'Umumiy xarajat'}
                                                                </span>
                                                            </div>
                                                        </>
                                                    ) : tx.type === TransactionType.EXPENSE && !driver ? (
                                                        /* ── "Other" expense without detected category ── */
                                                        <>
                                                            <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-lg border ${theme === 'dark' ? 'border-orange-500/20 bg-orange-500/10' : 'border-orange-200 bg-orange-50'}`}>
                                                                📦
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className={`text-sm font-bold ${theme === 'dark' ? 'text-orange-300' : 'text-orange-700'}`}>
                                                                    {t('generalExpense') ?? 'Umumiy xarajat'}
                                                                </span>
                                                                <span className={`text-[10px] font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>
                                                                    {t('expense')}
                                                                </span>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        /* ── Driver (or no entity) ── */
                                                        <>
                                                            <div className={`w-8 h-8 rounded-full overflow-hidden border flex-shrink-0 ${theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-200'} ${driver?.isDeleted ? 'opacity-50 grayscale' : ''}`}>
                                                                {driver ? <img src={driver.avatar} className="w-full h-full object-cover" alt={driver.name} /> : <div className={`w-full h-full flex items-center justify-center font-bold text-sm ${theme === 'dark' ? 'bg-surface-2 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>{tx.driverName ? tx.driverName.charAt(0) : '?'}</div>}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`text-sm font-bold ${driver?.isDeleted ? (theme === 'dark' ? 'text-red-400' : 'text-red-600') : (theme === 'dark' ? 'text-white' : 'text-gray-900')}`}>
                                                                        {driver?.name || tx.driverName || '—'}
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
                                                {(() => {
                                                    const cat = tx.type === TransactionType.EXPENSE ? detectCategory(tx.description) : null;
                                                    const descText = tx.description === 'Salary Refund: Manual Action'
                                                        ? t('salaryRefundDescription')
                                                        : tx.description || '—';
                                                    return (
                                                        <div className="flex flex-col gap-1">
                                                            {cat ? (
                                                                <div className="flex flex-col gap-1">
                                                                    <span className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-lg border font-bold w-fit ${theme === 'dark' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}>
                                                                        <span>{cat.icon}</span> {cat.label}
                                                                    </span>
                                                                    {descText !== cat.label && (
                                                                        <span className="font-medium text-xs opacity-70">{descText}</span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="font-medium">{descText}</span>
                                                            )}
                                                            {tx.type !== TransactionType.DAY_OFF && (tx.paymentMethod || tx.chequeImage) && (
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    {tx.paymentMethod && (
                                                                        <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border uppercase font-bold tracking-wider ${theme === 'dark' ? 'bg-surface-2 border-white/[0.08] text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>
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
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {tx.type === TransactionType.DAY_OFF ? (
                                                    <span className="flex items-center justify-end gap-1.5 text-xs font-bold text-blue-400">
                                                        <span>🏝️</span> {t('dayOffLabel')}
                                                    </span>
                                                ) : (
                                                    <NumberTooltip
                                                        value={tx.type === TransactionType.INCOME ? Math.abs(tx.amount) : -Math.abs(tx.amount)}
                                                        align="right"
                                                        theme={theme}
                                                    >
                                                        <span className={`text-sm font-bold font-mono tabular-nums cursor-default select-none ${
                                                            tx.type === TransactionType.INCOME ? 'text-[#0f766e]' : 'text-red-500'
                                                        }`}>
                                                            {tx.type === TransactionType.INCOME ? '+' : '−'}
                                                            {formatNumberSmart(tx.amount, false, language)}
                                                            <span className={`ml-1 text-xs font-semibold ${
                                                                tx.type === TransactionType.INCOME
                                                                    ? theme === 'dark' ? 'text-teal-700' : 'text-teal-400'
                                                                    : theme === 'dark' ? 'text-red-800'  : 'text-red-300'
                                                            }`}>UZS</span>
                                                        </span>
                                                    </NumberTooltip>
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

                {/* Mobile Cards View */}
                <div className={`md:hidden flex flex-col divide-y ${theme === 'dark' ? 'divide-white/[0.07] bg-surface' : 'divide-gray-100 bg-white'}`}>
                    {paginatedTransactions.length === 0 ? (
                        <div className={`p-8 text-center text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                            {t('noTransactions')}
                        </div>
                    ) : (
                        paginatedTransactions.map(tx => {
                            const driver = tx.driverId ? drivers.find(d => d.id === tx.driverId) : undefined;
                            const car = tx.carId ? cars.find(c => c.id === tx.carId) : undefined;
                            const isDeleted = tx.status === PaymentStatus.DELETED;
                            const expenseCat = tx.type === TransactionType.EXPENSE && !driver && !car
                                ? detectCategory(tx.description)
                                : null;
                            const descText = tx.description === 'Salary Refund: Manual Action'
                                ? t('salaryRefundDescription')
                                : tx.description || '—';

                            return (
                                <div key={tx.id} className={`p-4 flex flex-col gap-3 relative ${isDeleted ? 'opacity-50 grayscale' : ''} ${theme === 'dark' ? 'hover:bg-surface-2' : 'hover:bg-gray-50'}`}>
                                    {/* Header row: Driver/Car/Cat + Amount */}
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            {car ? (
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border flex-shrink-0 ${theme === 'dark' ? 'border-white/[0.08] bg-surface-2' : 'border-gray-200 bg-gray-100'}`}>
                                                    <CarIcon className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                                                </div>
                                            ) : expenseCat ? (
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl border flex-shrink-0 ${theme === 'dark' ? 'border-red-500/20 bg-red-500/10' : 'border-red-200 bg-red-50'}`}>
                                                    {expenseCat.icon}
                                                </div>
                                            ) : tx.type === TransactionType.EXPENSE && !driver ? (
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl border flex-shrink-0 ${theme === 'dark' ? 'border-orange-500/20 bg-orange-500/10' : 'border-orange-200 bg-orange-50'}`}>
                                                    📦
                                                </div>
                                            ) : (
                                                <div className={`w-10 h-10 rounded-full overflow-hidden border flex-shrink-0 ${theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-200'} ${driver?.isDeleted ? 'opacity-50 grayscale' : ''}`}>
                                                    {driver ? <img src={driver.avatar} className="w-full h-full object-cover" alt={driver.name} /> : <div className={`w-full h-full flex items-center justify-center font-bold text-lg ${theme === 'dark' ? 'bg-surface-2 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>{tx.driverName ? tx.driverName.charAt(0) : '?'}</div>}
                                                </div>
                                            )}

                                            <div className="flex flex-col">
                                                <span className={`text-[15px] font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                    {car ? car.name : expenseCat ? expenseCat.label : driver ? driver.name : tx.driverName || t('generalExpense')}
                                                </span>
                                                <span className={`text-[11px] font-medium ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                                                    {car ? car.licensePlate : driver ? driver.licensePlate : t('expense')}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="text-right flex-shrink-0 pl-3">
                                            {tx.type === TransactionType.DAY_OFF ? (
                                                <span className="flex items-center justify-end gap-1 text-sm font-bold text-blue-400">
                                                    <span>🏝️</span> {t('dayOffLabel')}
                                                </span>
                                            ) : (
                                                <span className={`text-[15px] font-bold font-mono tabular-nums leading-tight ${
                                                    tx.type === TransactionType.INCOME ? 'text-[#0f766e]' : 'text-red-500'
                                                }`}>
                                                    {tx.type === TransactionType.INCOME ? '+' : '−'}{formatNumberSmart(tx.amount, false, language)}
                                                    <span className={`block text-[10px] uppercase font-semibold mt-0.5 ${
                                                        tx.type === TransactionType.INCOME
                                                            ? theme === 'dark' ? 'text-teal-700' : 'text-teal-400'
                                                            : theme === 'dark' ? 'text-red-800'  : 'text-red-300'
                                                    }`}>UZS</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Description and Date row */}
                                    <div className="flex flex-col gap-2 mt-1">
                                        <span className={`text-[13px] ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                            {descText}
                                        </span>
                                        <div className="flex items-center justify-between">
                                            <div className={`text-[11px] font-medium ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                                {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(tx.timestamp).toLocaleDateString('en-GB')}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {tx.paymentMethod && (
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase font-bold tracking-wider ${theme === 'dark' ? 'bg-surface-2 border-white/[0.08] text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>
                                                        {tx.paymentMethod === 'cash' ? `💵 ${t('paymentCash')}` : tx.paymentMethod === 'card' ? `💳 ${t('paymentCard')}` : `🏦 ${t('paymentTransfer')}`}
                                                    </span>
                                                )}
                                                {tx.chequeImage && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setSelectedImage(tx.chequeImage!); }}
                                                        className={`text-[10px] px-2 py-0.5 rounded border shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:outline-none hover:-translate-y-0.5 ${theme === 'dark' ? 'bg-blue-900/30 border-blue-700/50 text-blue-400 hover:bg-blue-800/50 hover:border-blue-600' : 'bg-blue-50 border-blue-200 text-blue-700'}`}
                                                    >
                                                        📄 {t('viewReceipt')}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    {userRole === 'admin' && (
                                        <div className={`flex items-center gap-3 pt-3 mt-1 border-t ${theme === 'dark' ? 'border-white/[0.05]' : 'border-gray-100'}`}>
                                            <label className="flex items-center gap-2 flex-1 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedTransactions.includes(tx.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedTransactions(prev => [...prev, tx.id]);
                                                        else setSelectedTransactions(prev => prev.filter(tid => tid !== tx.id));
                                                    }}
                                                    className={`w-5 h-5 rounded-md transition-all duration-200 ${theme === 'dark' ? 'bg-surface-2 border-white/[0.08] checked:bg-[#0f766e]' : 'bg-white border-gray-300 checked:bg-[#0f766e]'}`}
                                                />
                                                <span className={`text-[12px] font-medium ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                                                    Tanlash
                                                </span>
                                            </label>
                                            <button onClick={() => setEditingTransaction(tx)} className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-400/10' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'}`}>
                                                <EditIcon className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDeleteTransaction(tx.id)} className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-red-400 hover:bg-red-400/10' : 'text-gray-500 hover:text-red-600 hover:bg-red-50'}`}>
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Pagination */}
                {filteredTransactionsCount > itemsPerPage && (
                    <div className={`flex items-center justify-center gap-2 p-4 border-t ${theme === 'dark' ? 'border-white/[0.08] bg-surface-2' : 'border-gray-100 bg-gray-50/50'}`}>
                        <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${currentPage === 1
                                ? theme === 'dark'
                                    ? 'text-gray-600 cursor-not-allowed'
                                    : 'text-gray-300 cursor-not-allowed'
                                : theme === 'dark'
                                    ? 'text-white hover:bg-white/[0.06] active:scale-95'
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
                                            ? 'bg-surface-2 text-gray-400 hover:bg-white/[0.06]'
                                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-black/[0.03]'
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
                                    ? 'text-white hover:bg-white/[0.06] active:scale-95'
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
                    role="dialog"
                    aria-modal="true"
                    aria-label={t('viewReceipt')}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
                    onClick={() => setSelectedImage(null)}
                    onKeyDown={e => { if (e.key === 'Escape') setSelectedImage(null); }}
                >
                    <div
                        className={`relative flex flex-col rounded-2xl shadow-2xl overflow-hidden max-w-md w-full max-h-[90vh] ${theme === 'dark' ? 'bg-surface border border-white/[0.08]' : 'bg-white border border-gray-200'}`}
                        onClick={e => e.stopPropagation()}
                        style={{ animation: 'modalPop 0.2s ease-out' }}
                    >
                        {/* Modal Header */}
                        <div className={`flex items-center justify-between px-5 py-3 border-b flex-shrink-0 ${theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-100 bg-gray-50'}`}
                            style={theme === 'dark' ? { background: '#222a3d' } : undefined}>
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
                            <div className="flex items-center gap-1">
                                <a
                                    href={selectedImage}
                                    download
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-400/10' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'}`}
                                    title="Download receipt"
                                    aria-label="Download receipt"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                </a>
                                <button
                                    autoFocus
                                    onClick={() => setSelectedImage(null)}
                                    aria-label="Close receipt viewer"
                                    className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50 ${theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-white/[0.08]' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Receipt Image */}
                        <div className={`overflow-y-auto flex-1 p-4 ${theme === 'dark' ? 'bg-surface-3' : 'bg-surface-2'}`}>
                            <img
                                src={selectedImage}
                                alt="Payment receipt"
                                className="w-full rounded-xl object-contain shadow-lg"
                            />
                        </div>

                        {/* Footer hint */}
                        <div className={`px-5 py-3 border-t flex items-center justify-between flex-shrink-0 ${theme === 'dark' ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                            <span className={`text-[11px] ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>
                                Press <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono mx-0.5 ${theme === 'dark' ? 'bg-white/[0.06] border border-white/[0.08]' : 'bg-gray-100 border border-gray-200'}`}>Esc</kbd> to close
                            </span>
                            <button
                                onClick={() => setSelectedImage(null)}
                                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-white/[0.06]' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}`}
                            >
                                Close
                            </button>
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

            {/* Balance Check Modal */}
            <BalanceCheckModal
                isOpen={balanceCheckOpen}
                onClose={() => setBalanceCheckOpen(false)}
                transactions={allTransactions}
                drivers={drivers}
                theme={theme}
            />
        </div>
    );
};
