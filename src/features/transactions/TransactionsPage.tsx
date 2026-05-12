import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Transaction, Driver, TransactionType, PaymentStatus, UserRole, AdminUser, Language, Car } from '../../core/types';
import { TxPageFilters } from '../../../services/firestoreService';
import { useTransactionsPaginated } from './hooks/useTransactionsPaginated';
import { useAuthContext } from '../auth/context/AuthContext';
import { useDataContext } from '../../core/context/DataContext';
import * as firestoreService from '../../../services/firestoreService';
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

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// ── Skeleton ──────────────────────────────────────────────────────────────────
// Rows that perfectly mirror the height/layout of a real transaction row so
// there is zero layout shift when real data arrives.

const SkeletonRows: React.FC<{ theme: 'dark' | 'light'; count?: number; isAdmin: boolean }> = ({
    theme, count = 12, isAdmin,
}) => {
    const pulse = theme === 'dark'
        ? 'bg-white/[0.07] animate-pulse rounded'
        : 'bg-black/[0.07] animate-pulse rounded';

    return (
        <>
            {Array.from({ length: count }, (_, i) => (
                <tr key={i} className="border-b border-transparent">
                    {isAdmin && (
                        <td className="px-6 py-4">
                            <div className={`w-5 h-5 rounded-md ${pulse}`} />
                        </td>
                    )}
                    {/* Time */}
                    <td className="px-6 py-4">
                        <div className={`h-4 w-14 mb-1.5 ${pulse}`} />
                        <div className={`h-3 w-20 ${pulse}`} />
                    </td>
                    {/* Driver/entity */}
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex-shrink-0 ${pulse}`} />
                            <div>
                                <div className={`h-4 w-24 mb-1.5 ${pulse}`} />
                                <div className={`h-3 w-16 ${pulse}`} />
                            </div>
                        </div>
                    </td>
                    {/* Description */}
                    <td className="px-6 py-4">
                        <div className={`h-4 w-32 ${pulse}`} />
                    </td>
                    {/* Amount */}
                    <td className="px-6 py-4 text-right">
                        <div className={`h-4 w-20 ml-auto ${pulse}`} />
                    </td>
                    {/* Actions */}
                    <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                            <div className={`w-8 h-8 rounded-lg ${pulse}`} />
                            <div className={`w-8 h-8 rounded-lg ${pulse}`} />
                        </div>
                    </td>
                </tr>
            ))}
        </>
    );
};

const MobileSkeletonCards: React.FC<{ theme: 'dark' | 'light'; count?: number }> = ({
    theme, count = 10,
}) => {
    const pulse = theme === 'dark'
        ? 'bg-white/[0.07] animate-pulse rounded'
        : 'bg-black/[0.07] animate-pulse rounded';

    return (
        <>
            {Array.from({ length: count }, (_, i) => (
                <div key={i} className={`p-4 flex flex-col gap-3 border-b ${theme === 'dark' ? 'border-white/[0.07]' : 'border-gray-100'}`}>
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex-shrink-0 ${pulse}`} />
                            <div>
                                <div className={`h-4 w-28 mb-1.5 ${pulse}`} />
                                <div className={`h-3 w-20 ${pulse}`} />
                            </div>
                        </div>
                        <div className={`h-5 w-20 ${pulse}`} />
                    </div>
                    <div className={`h-3 w-40 ${pulse}`} />
                    <div className={`h-3 w-28 ${pulse}`} />
                </div>
            ))}
        </>
    );
};

// Small inline spinner shown while fetching the next page (not initial load)
const FetchMoreSpinner: React.FC<{ theme: 'dark' | 'light' }> = ({ theme }) => (
    <div className="flex items-center justify-center py-6">
        <div className={`w-5 h-5 rounded-full border-2 border-t-transparent animate-spin ${
            theme === 'dark' ? 'border-teal-600' : 'border-teal-500'
        }`} />
    </div>
);

// ── Props ─────────────────────────────────────────────────────────────────────

interface TransactionsPageProps {
    drivers: Driver[];
    cars?: Car[];
    userRole: UserRole;
    adminUser: AdminUser | null;
    theme: 'dark' | 'light';
}

// ── Component ─────────────────────────────────────────────────────────────────

export const TransactionsPage: React.FC<TransactionsPageProps> = ({
    drivers,
    cars = [],
    userRole,
    adminUser,
    theme,
}) => {
    const { t, i18n } = useTranslation();
    const language = (['uz', 'en', 'ru'].includes(i18n.language) ? i18n.language : 'uz') as Language;
    const { addToast } = useToast();
    const confirm = useConfirm();

    // fleetId derived from auth — identical logic used across all other pages
    const { adminUser: authAdmin, userRole: authRole, adminProfile } = useAuthContext();
    const fleetId = authRole === 'viewer'
        ? ((adminProfile as any)?.fleet_id || (adminProfile as any)?.created_by)
        : authAdmin?.id;

    // DataContext transactions: used only for BalanceCheckModal (needs full history)
    const { transactions: allTransactionsForBalance } = useDataContext();

    // ── Filter state ──────────────────────────────────────────────────────────
    const defaultStart = (() => {
        const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d;
    })();
    const defaultEnd = (() => {
        const d = new Date(); d.setHours(23, 59, 59, 999); return d;
    })();

    const [startDate, setStartDate] = useState<Date>(defaultStart);
    const [endDate, setEndDate] = useState<Date>(defaultEnd);
    const [driverId, setDriverId] = useState('all');
    const [type, setType] = useState('all');

    const filters: TxPageFilters = useMemo(() => ({
        startMs: startDate.getTime(),
        endMs: endDate.getTime(),
        driverId: driverId !== 'all' ? driverId : undefined,
        type: type !== 'all' ? type : undefined,
    }), [startDate, endDate, driverId, type]);

    // ── Paginated data ────────────────────────────────────────────────────────
    const {
        transactions,
        loading,
        isFetchingMore,
        hasMore,
        nextCursor,
        fetchMore,
        removeRows,
        restoreRows,
        patchRow,
    } = useTransactionsPaginated(fleetId, filters);

    // ── IntersectionObserver sentinel at list bottom ──────────────────────────
    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel || !hasMore) return;

        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) fetchMore(); },
            { threshold: 0.1, rootMargin: '120px' },
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [hasMore, fetchMore]);

    // ── UI state ──────────────────────────────────────────────────────────────
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [chequeLoading, setChequeLoading] = useState<string | null>(null); // tx.id being loaded
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [driverModalOpen, setDriverModalOpen] = useState(false);
    const [balanceCheckOpen, setBalanceCheckOpen] = useState(false);

    // Lazy-load cheque image for a single transaction on demand
    const handleViewCheque = useCallback(async (e: React.MouseEvent, tx: Transaction) => {
        e.stopPropagation();
        // If already loaded in the tx object, show it immediately
        if (tx.chequeImage) {
            // Old Telegram temp URLs expire after 24h — don't open a broken modal
            if (tx.chequeImage.includes('api.telegram.org')) {
                addToast('error', '⏰ Bu chek muddati o\'tgan (Telegram 24 soatdan keyin o\'chiradi)');
                return;
            }
            setSelectedImage(tx.chequeImage);
            return;
        }
        setChequeLoading(tx.id);
        try {
            const url = await firestoreService.fetchTransactionCheque(tx.id);
            if (url) {
                // Old Telegram temp URLs expire after 24h — don't open a broken modal
                if (url.includes('api.telegram.org')) {
                    addToast('error', '⏰ Bu chek muddati o\'tgan (Telegram 24 soatdan keyin o\'chiradi)');
                    return;
                }
                // Fix for old migrated cheques that might be raw base64 without prefix
                if (!url.startsWith('http') && !url.startsWith('data:image/')) {
                    setSelectedImage(`data:image/jpeg;base64,${url}`);
                } else {
                    setSelectedImage(url);
                }
            } else {
                addToast('error', 'Chek topilmadi');
            }
        } catch {
            addToast('error', 'Chekni yuklashda xato');
        } finally {
            setChequeLoading(null);
        }
    }, [addToast]);

    // Clear selection when data reloads (filter change)
    useEffect(() => { setSelectedIds([]); }, [filters]);

    const nonDeletedDrivers = useMemo(() => drivers.filter(d => !d.isDeleted), [drivers]);
    const isAdmin = userRole === 'admin';

    // ── CRUD handlers ─────────────────────────────────────────────────────────

    const handleDeleteTransaction = useCallback(async (id: string) => {
        const tx = transactions.find(t => t.id === id);
        if (!tx) return;

        const ok = await confirm({ title: t('confirmDeleteTitle'), message: t('deleteConfirmTx'), isDanger: true });
        if (!ok) return;

        removeRows(new Set([id]));
        setSelectedIds(prev => prev.filter(tid => tid !== id));

        try {
            await firestoreService.deleteTransaction(id, { adminName: adminUser?.username || 'Admin' }, adminUser?.id);
            addToast('success', t('transactionDeleted'));
        } catch {
            restoreRows([tx]);
            addToast('error', t('transactionDeleteFailed'));
        }
    }, [transactions, confirm, t, removeRows, restoreRows, addToast, adminUser]);

    const handleEditSubmit = useCallback(async (data: Omit<Transaction, 'id'>, id?: string) => {
        if (!id) return;
        const original = transactions.find(t => t.id === id);

        patchRow(id, data);
        setEditingTransaction(null);

        try {
            await firestoreService.updateTransaction(id, data);
            addToast('success', t('transactionUpdated'));
        } catch {
            if (original) patchRow(id, original);
            setEditingTransaction(original ?? null);
            addToast('error', t('transactionUpdateFailed'));
        }
    }, [transactions, patchRow, addToast, t]);

    const handleBulkDelete = useCallback(async () => {
        if (selectedIds.length === 0) return;

        const toDelete = new Set(selectedIds);
        const removed = transactions.filter(t => toDelete.has(t.id));
        const totalAmount = removed.reduce((sum, t) => sum + t.amount, 0);
        const n = selectedIds.length;

        const ok = await confirm({
            title: t('confirmDeleteTitle'),
            message: t('deleteConfirmBulkTx')
                .replace('{n}', String(n))
                .replace('{amount}', formatNumberSmart(totalAmount, false, language)),
            isDanger: true,
        });
        if (!ok) return;

        removeRows(toDelete);
        setSelectedIds([]);

        try {
            await firestoreService.deleteTransactionsBatch(
                selectedIds,
                { adminName: adminUser?.username || 'Admin', count: n, totalAmount },
                adminUser?.id,
            );
            addToast('success', t('bulkDeleteSuccess', { n }));
        } catch {
            restoreRows(removed);
            addToast('error', t('bulkDeleteFailed'));
        }
    }, [selectedIds, transactions, confirm, t, language, removeRows, restoreRows, addToast, adminUser]);

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6 animate-fadeIn">

            {/* Balance Check */}
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
                    <div className="w-full">
                        <DatePicker
                            label={t('fromDate') || 'From Date'}
                            value={startDate}
                            onChange={(date) => { date.setHours(0, 0, 0, 0); setStartDate(new Date(date)); }}
                            theme={theme}
                            labelClassName="text-white"
                        />
                    </div>
                    <div className="w-full">
                        <DatePicker
                            label={t('toDate') || 'To Date'}
                            value={endDate}
                            onChange={(date) => { date.setHours(23, 59, 59, 999); setEndDate(new Date(date)); }}
                            theme={theme}
                            labelClassName="text-white"
                        />
                    </div>
                    <div className="w-full">
                        {(() => {
                            const selectedDriver = driverId !== 'all'
                                ? nonDeletedDrivers.find(d => d.id === driverId)
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
                                        selectedDriverId={driverId}
                                        onSelect={(val) => setDriverId(val)}
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
                    <div className="w-full">
                        <CustomSelect
                            label={t('filters')}
                            value={type}
                            onChange={(val) => setType(val)}
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

            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3">
                {isAdmin && selectedIds.length > 0 ? (
                    <button
                        onClick={handleBulkDelete}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-all shadow-md"
                    >
                        <TrashIcon className="w-4 h-4" />
                        {t('delete')} {selectedIds.length} {t('selected')}
                    </button>
                ) : (
                    <div />
                )}
                <button
                    onClick={() => exportTransactionsToExcel(
                        transactions,
                        `O'tkazmalar_${startDate.toISOString().slice(0, 10)}`,
                    )}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all active:scale-95 ${
                        theme === 'dark'
                            ? 'bg-surface border-white/[0.08] text-gray-300 hover:border-emerald-500/40 hover:text-emerald-400 hover:bg-emerald-500/5'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50'
                    }`}
                >
                    <DownloadIcon className="w-4 h-4" />
                    Excel ({transactions.length}{hasMore ? '+' : ''})
                </button>
            </div>

            {/* Table */}
            <div className={`rounded-3xl border shadow-xl ${theme === 'dark' ? 'bg-surface border-white/[0.08]' : 'bg-white border-gray-200'}`}>

                {/* ── Desktop ──────────────────────────────────────────────── */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left min-w-[800px]">
                        <thead className={`border-b ${theme === 'dark' ? 'bg-surface-2 border-white/[0.08]' : 'bg-gray-50 border-gray-200'}`}>
                            <tr>
                                {isAdmin && (
                                    <th className={`px-6 py-4 font-bold text-xs uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.length > 0 && selectedIds.length === transactions.length}
                                            onChange={(e) => {
                                                setSelectedIds(e.target.checked ? transactions.map(t => t.id) : []);
                                            }}
                                            className={`w-5 h-5 rounded-md cursor-pointer ${theme === 'dark' ? 'bg-surface-2 border-white/[0.08] checked:bg-[#0f766e]' : 'bg-white border-gray-300 checked:bg-[#0f766e]'}`}
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
                            {loading ? (
                                <SkeletonRows theme={theme} count={12} isAdmin={isAdmin} />
                            ) : transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className={`px-6 py-12 text-center text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                        {t('noTransactions')}
                                    </td>
                                </tr>
                            ) : (
                                transactions.map(tx => {
                                    const driver = tx.driverId ? drivers.find(d => d.id === tx.driverId) : undefined;
                                    const car = tx.carId ? cars.find(c => c.id === tx.carId) : undefined;
                                    const isDeleted = tx.status === PaymentStatus.DELETED;
                                    const expenseCat = tx.type === TransactionType.EXPENSE && !driver && !car
                                        ? detectCategory(tx.description) : null;
                                    return (
                                        <tr key={tx.id} className={`transition-colors group ${theme === 'dark' ? 'hover:bg-surface-2' : 'hover:bg-black/[0.03]'} ${isDeleted ? 'opacity-50 grayscale' : ''}`}>
                                            {isAdmin && (
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.includes(tx.id)}
                                                        onChange={(e) => {
                                                            setSelectedIds(prev => e.target.checked ? [...prev, tx.id] : prev.filter(id => id !== tx.id));
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className={`w-5 h-5 rounded-md cursor-pointer ${theme === 'dark' ? 'bg-surface-2 border-white/[0.08] checked:bg-[#0f766e]' : 'bg-white border-gray-300 checked:bg-[#0f766e]'}`}
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
                                                        <>
                                                            <div className={`w-8 h-8 rounded-full overflow-hidden border flex-shrink-0 flex items-center justify-center ${theme === 'dark' ? 'border-white/[0.08] bg-surface-2' : 'border-gray-200 bg-gray-100'}`}>
                                                                {car.avatar ? (
                                                                    <img src={car.avatar} className="w-full h-full object-cover" alt={car.name} />
                                                                ) : (
                                                                    <CarIcon className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{car.name}</span>
                                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase ${theme === 'dark' ? 'border-white/[0.08] bg-surface-2 text-gray-400' : 'border-gray-200 bg-gray-100 text-gray-500'}`}>{t('vehicleLabel')}</span>
                                                                </div>
                                                                <div className={`text-xs font-mono ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>{car.licensePlate}</div>
                                                            </div>
                                                        </>
                                                    ) : expenseCat ? (
                                                        <>
                                                            <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-lg border ${theme === 'dark' ? 'border-red-500/20 bg-red-500/10' : 'border-red-200 bg-red-50'}`}>{expenseCat.icon}</div>
                                                            <div className="flex flex-col">
                                                                <span className={`text-sm font-bold ${theme === 'dark' ? 'text-red-300' : 'text-red-700'}`}>{expenseCat.label}</span>
                                                                <span className={`text-[10px] font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>{t('generalExpense') ?? 'Umumiy xarajat'}</span>
                                                            </div>
                                                        </>
                                                    ) : tx.type === TransactionType.EXPENSE && !driver ? (
                                                        <>
                                                            <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-lg border ${theme === 'dark' ? 'border-orange-500/20 bg-orange-500/10' : 'border-orange-200 bg-orange-50'}`}>📦</div>
                                                            <div className="flex flex-col">
                                                                <span className={`text-sm font-bold ${theme === 'dark' ? 'text-orange-300' : 'text-orange-700'}`}>{t('generalExpense') ?? 'Umumiy xarajat'}</span>
                                                                <span className={`text-[10px] font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>{t('expense')}</span>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className={`w-8 h-8 rounded-full overflow-hidden border flex-shrink-0 ${theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-200'} ${driver?.isDeleted ? 'opacity-50 grayscale' : ''}`}>
                                                                {driver ? <img src={driver.avatar} className="w-full h-full object-cover" alt={driver.name} /> : <div className={`w-full h-full flex items-center justify-center font-bold text-sm ${theme === 'dark' ? 'bg-surface-2 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>{tx.driverName ? tx.driverName.charAt(0) : '?'}</div>}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`text-sm font-bold ${driver?.isDeleted ? (theme === 'dark' ? 'text-red-400' : 'text-red-600') : (theme === 'dark' ? 'text-white' : 'text-gray-900')}`}>{driver?.name || tx.driverName || '—'}</span>
                                                                    {driver?.isDeleted && <span className={`text-[10px] px-1.5 py-0.5 rounded border ${theme === 'dark' ? 'border-red-900/50 bg-red-900/20 text-red-400' : 'border-red-200 bg-red-50 text-red-600'}`}>{t('deleted')}</span>}
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
                                                    const descText = tx.description === 'Salary Refund: Manual Action' ? t('salaryRefundDescription') : tx.description || '—';
                                                    return (
                                                        <div className="flex flex-col gap-1">
                                                            {cat ? (
                                                                <div className="flex flex-col gap-1">
                                                                    <span className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-lg border font-bold w-fit ${theme === 'dark' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}><span>{cat.icon}</span> {cat.label}</span>
                                                                    {descText !== cat.label && <span className="font-medium text-xs opacity-70">{descText}</span>}
                                                                </div>
                                                            ) : (
                                                                <span className="font-medium">{descText}</span>
                                                            )}
                                                            {tx.type !== TransactionType.DAY_OFF && tx.paymentMethod && (
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border uppercase font-bold tracking-wider ${theme === 'dark' ? 'bg-surface-2 border-white/[0.08] text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>
                                                                        {tx.paymentMethod === 'cash' ? `💵 ${t('paymentCash')}` : tx.paymentMethod === 'card' ? `💳 ${t('paymentCard')}` : `🏦 ${t('paymentTransfer')}`}
                                                                    </span>
                                                                    {tx.paymentMethod === 'card' && (
                                                                        <button
                                                                            onClick={(e) => handleViewCheque(e, tx)}
                                                                            disabled={chequeLoading === tx.id}
                                                                            className={`flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full border shadow-sm transition-all hover:-translate-y-0.5 disabled:opacity-50 ${theme === 'dark' ? 'bg-blue-900/30 border-blue-700/50 text-blue-400 hover:bg-blue-800/50' : 'bg-blue-50 border-blue-200 text-blue-700'}`}
                                                                        >
                                                                            {chequeLoading === tx.id ? '⏳' : '📄'} {t('viewReceipt')}
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
                                                    <span className="flex items-center justify-end gap-1.5 text-xs font-bold text-blue-400"><span>🏝️</span> {t('dayOffLabel')}</span>
                                                ) : (
                                                    <NumberTooltip value={tx.type === TransactionType.INCOME ? Math.abs(tx.amount) : -Math.abs(tx.amount)} align="right" theme={theme}>
                                                        <span className={`text-sm font-bold font-mono tabular-nums cursor-default select-none ${tx.type === TransactionType.INCOME ? 'text-[#0f766e]' : 'text-red-500'}`}>
                                                            {tx.type === TransactionType.INCOME ? '+' : '−'}{formatNumberSmart(tx.amount, false, language)}
                                                            <span className={`ml-1 text-xs font-semibold ${tx.type === TransactionType.INCOME ? (theme === 'dark' ? 'text-teal-700' : 'text-teal-400') : (theme === 'dark' ? 'text-red-800' : 'text-red-300')}`}>UZS</span>
                                                        </span>
                                                    </NumberTooltip>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {isAdmin && (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={() => setEditingTransaction(tx)} className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-400/10' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}><EditIcon className="w-4 h-4" /></button>
                                                        <button onClick={() => handleDeleteTransaction(tx.id)} className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-red-400 hover:bg-red-400/10' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}><TrashIcon className="w-4 h-4" /></button>
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

                {/* ── Mobile cards ─────────────────────────────────────────── */}
                <div className={`md:hidden flex flex-col divide-y ${theme === 'dark' ? 'divide-white/[0.07] bg-surface' : 'divide-gray-100 bg-white'}`}>
                    {loading ? (
                        <MobileSkeletonCards theme={theme} count={10} />
                    ) : transactions.length === 0 ? (
                        <div className={`p-8 text-center text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{t('noTransactions')}</div>
                    ) : (
                        transactions.map(tx => {
                            const driver = tx.driverId ? drivers.find(d => d.id === tx.driverId) : undefined;
                            const car = tx.carId ? cars.find(c => c.id === tx.carId) : undefined;
                            const isDeleted = tx.status === PaymentStatus.DELETED;
                            const expenseCat = tx.type === TransactionType.EXPENSE && !driver && !car ? detectCategory(tx.description) : null;
                            const descText = tx.description === 'Salary Refund: Manual Action' ? t('salaryRefundDescription') : tx.description || '—';
                            return (
                                <div key={tx.id} className={`p-4 flex flex-col gap-3 relative ${isDeleted ? 'opacity-50 grayscale' : ''} ${theme === 'dark' ? 'hover:bg-surface-2' : 'hover:bg-gray-50'}`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            {car ? (
                                                <div className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center border flex-shrink-0 ${theme === 'dark' ? 'border-white/[0.08] bg-surface-2' : 'border-gray-200 bg-gray-100'}`}>
                                                    {car.avatar ? (
                                                        <img src={car.avatar} className="w-full h-full object-cover" alt={car.name} />
                                                    ) : (
                                                        <CarIcon className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                                                    )}
                                                </div>
                                            ) : expenseCat ? (
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl border flex-shrink-0 ${theme === 'dark' ? 'border-red-500/20 bg-red-500/10' : 'border-red-200 bg-red-50'}`}>{expenseCat.icon}</div>
                                            ) : tx.type === TransactionType.EXPENSE && !driver ? (
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl border flex-shrink-0 ${theme === 'dark' ? 'border-orange-500/20 bg-orange-500/10' : 'border-orange-200 bg-orange-50'}`}>📦</div>
                                            ) : (
                                                <div className={`w-10 h-10 rounded-full overflow-hidden border flex-shrink-0 ${theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-200'} ${driver?.isDeleted ? 'opacity-50 grayscale' : ''}`}>
                                                    {driver ? <img src={driver.avatar} className="w-full h-full object-cover" alt={driver.name} /> : <div className={`w-full h-full flex items-center justify-center font-bold text-lg ${theme === 'dark' ? 'bg-surface-2 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>{tx.driverName ? tx.driverName.charAt(0) : '?'}</div>}
                                                </div>
                                            )}
                                            <div className="flex flex-col">
                                                <span className={`text-[15px] font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{car ? car.name : expenseCat ? expenseCat.label : driver ? driver.name : tx.driverName || t('generalExpense')}</span>
                                                <span className={`text-[11px] font-medium ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>{car ? car.licensePlate : driver ? driver.licensePlate : t('expense')}</span>
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0 pl-3">
                                            {tx.type === TransactionType.DAY_OFF ? (
                                                <span className="flex items-center justify-end gap-1 text-sm font-bold text-blue-400"><span>🏝️</span> {t('dayOffLabel')}</span>
                                            ) : (
                                                <span className={`text-[15px] font-bold font-mono tabular-nums leading-tight ${tx.type === TransactionType.INCOME ? 'text-[#0f766e]' : 'text-red-500'}`}>
                                                    {tx.type === TransactionType.INCOME ? '+' : '−'}{formatNumberSmart(tx.amount, false, language)}
                                                    <span className={`block text-[10px] uppercase font-semibold mt-0.5 ${tx.type === TransactionType.INCOME ? (theme === 'dark' ? 'text-teal-700' : 'text-teal-400') : (theme === 'dark' ? 'text-red-800' : 'text-red-300')}`}>UZS</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 mt-1">
                                        <span className={`text-[13px] ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{descText}</span>
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
                                                {tx.paymentMethod === 'card' && (
                                                    <button
                                                        onClick={(e) => handleViewCheque(e, tx)}
                                                        disabled={chequeLoading === tx.id}
                                                        className={`text-[10px] px-2 py-0.5 rounded border shadow-sm transition-all hover:-translate-y-0.5 disabled:opacity-50 ${theme === 'dark' ? 'bg-blue-900/30 border-blue-700/50 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700'}`}
                                                    >
                                                        {chequeLoading === tx.id ? '⏳' : '📄'} {t('viewReceipt')}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {isAdmin && (
                                        <div className={`flex items-center gap-3 pt-3 mt-1 border-t ${theme === 'dark' ? 'border-white/[0.05]' : 'border-gray-100'}`}>
                                            <label className="flex items-center gap-2 flex-1 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(tx.id)}
                                                    onChange={(e) => setSelectedIds(prev => e.target.checked ? [...prev, tx.id] : prev.filter(id => id !== tx.id))}
                                                    className={`w-5 h-5 rounded-md ${theme === 'dark' ? 'bg-surface-2 border-white/[0.08] checked:bg-[#0f766e]' : 'bg-white border-gray-300 checked:bg-[#0f766e]'}`}
                                                />
                                                <span className={`text-[12px] font-medium ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>Tanlash</span>
                                            </label>
                                            <button onClick={() => setEditingTransaction(tx)} className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-400/10' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'}`}><EditIcon className="w-4 h-4" /></button>
                                            <button onClick={() => handleDeleteTransaction(tx.id)} className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-red-400 hover:bg-red-400/10' : 'text-gray-500 hover:text-red-600 hover:bg-red-50'}`}><TrashIcon className="w-4 h-4" /></button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* ── Infinite scroll sentinel + fetch-more spinner ─────────── */}
                {!loading && (
                    <>
                        {isFetchingMore && <FetchMoreSpinner theme={theme} />}
                        {/* Sentinel: IntersectionObserver watches this div */}
                        <div ref={sentinelRef} className="h-px" aria-hidden="true" />
                        {!hasMore && transactions.length > 0 && (
                            <div className={`text-center text-xs py-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>
                                — {transactions.length} ta yozuv —
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── Receipt Viewer Modal ──────────────────────────────────────────── */}
            {selectedImage && typeof document !== 'undefined' && createPortal(
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={t('viewReceipt')}
                    className="fixed inset-0 z-[200] flex items-center justify-center md:pl-64"
                    style={{
                        background: 'rgba(0,0,0,0.72)',
                        backdropFilter: 'blur(8px)',
                        animation: 'rcFadeIn 0.2s ease-out',
                    }}
                    onClick={() => setSelectedImage(null)}
                    onKeyDown={e => { if (e.key === 'Escape') setSelectedImage(null); }}
                >
                    {/* Card */}
                    <div
                        className={`relative flex flex-col rounded-3xl shadow-2xl overflow-hidden w-full ${
                            theme === 'dark' ? 'bg-[#141c2e]' : 'bg-[#f5f5f7]'
                        }`}
                        style={{
                            maxWidth: 420,
                            maxHeight: 'calc(100vh - 80px)',
                            animation: 'rcPopUp 0.28s cubic-bezier(0.34,1.56,0.64,1)',
                            boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* ── Header ── */}
                        <div
                            className={`flex items-center justify-between px-5 py-4 flex-shrink-0 border-b ${
                                theme === 'dark' ? 'border-white/[0.07] bg-[#1a2336]' : 'border-black/[0.07] bg-white'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                                    theme === 'dark' ? 'bg-blue-500/15' : 'bg-blue-50'
                                }`}>
                                    <svg className="w-4.5 h-4.5 text-blue-500" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className={`text-[14px] font-bold leading-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                        {t('viewReceipt')}
                                    </p>
                                    <p className={`text-[11px] ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                        💳 {t('paymentCard')}
                                    </p>
                                </div>
                            </div>

                            {/* Controls — always visible, high contrast */}
                            <div className="flex items-center gap-2">
                                <a
                                    href={selectedImage}
                                    download
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    title="Yuklab olish"
                                    className={`w-10 h-10 flex items-center justify-center rounded-2xl font-semibold transition-all active:scale-90 ${
                                        theme === 'dark'
                                            ? 'bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border border-blue-500/20'
                                            : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
                                    }`}
                                >
                                    <svg className="w-4.5 h-4.5" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                </a>
                                <button
                                    autoFocus
                                    onClick={() => setSelectedImage(null)}
                                    title="Yopish"
                                    className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-all active:scale-90 ${
                                        theme === 'dark'
                                            ? 'bg-white/[0.08] text-gray-300 hover:bg-white/[0.14] hover:text-white border border-white/[0.10]'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 border border-gray-200'
                                    }`}
                                >
                                    <svg className="w-4.5 h-4.5" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* ── Image area ── */}
                        <div
                            className={`flex-1 overflow-y-auto flex items-center justify-center p-4 ${
                                theme === 'dark' ? 'bg-[#0e1525]' : 'bg-gray-100'
                            }`}
                            style={{ minHeight: 200 }}
                        >
                            <img
                                src={selectedImage}
                                alt="Payment receipt"
                                className="w-full rounded-2xl object-contain shadow-xl"
                                style={{ maxHeight: 'calc(100vh - 240px)' }}
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const parent = e.currentTarget.parentElement;
                                    if (parent && !parent.querySelector('.error-msg')) {
                                        const msg = document.createElement('div');
                                        msg.className = 'error-msg flex flex-col items-center justify-center p-8 text-center gap-3';
                                        const isTelegram = selectedImage?.includes('api.telegram.org');
                                        if (isTelegram) {
                                            msg.innerHTML = `
                                                <span class="text-4xl">⏰</span>
                                                <p class="font-bold text-gray-300 text-sm">Telegram cheki muddati o'tgan</p>
                                                <p class="text-xs text-gray-500 leading-relaxed max-w-[260px]">
                                                    Ushbu chek Telegram orqali yuborilgan va Telegram vaqtinchalik havolalari <strong class="text-orange-400">24 soat</strong> dan keyin o'chib ketadi.
                                                    Yangi yuborilgan cheklarni avtomatik saqlash yoqilgan ✅
                                                </p>`;
                                        } else {
                                            msg.innerHTML = `
                                                <span class="text-4xl">🖼️</span>
                                                <p class="font-bold text-gray-300 text-sm">Chek rasmi yuklanmadi</p>
                                                <p class="text-xs text-gray-500">Internet yoki saqlash xatosi. Qayta urinib ko'ring.</p>`;
                                        }
                                        parent.appendChild(msg);
                                    }
                                }}
                            />
                        </div>

                        {/* ── Footer ── */}
                        <div className={`px-5 py-3.5 flex items-center justify-between flex-shrink-0 border-t ${
                            theme === 'dark' ? 'border-white/[0.07] bg-[#1a2336]' : 'border-black/[0.07] bg-white'
                        }`}>
                            <span className={`text-[11px] ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>
                                Tashqariga bosing yoki{' '}
                                <kbd className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                                    theme === 'dark' ? 'bg-white/[0.08] border border-white/[0.12] text-gray-400' : 'bg-gray-100 border border-gray-200 text-gray-500'
                                }`}>Esc</kbd>{' '}
                                yopish uchun
                            </span>
                            <button
                                onClick={() => setSelectedImage(null)}
                                className={`text-[12px] font-semibold px-3.5 py-1.5 rounded-xl transition-all active:scale-95 ${
                                    theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-white/[0.08]' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                                }`}
                            >
                                Yopish
                            </button>
                        </div>
                    </div>

                    <style>{`
                        @keyframes rcFadeIn { from { opacity:0 } to { opacity:1 } }
                        @keyframes rcPopUp  { from { opacity:0; transform:scale(0.92) translateY(12px) } to { opacity:1; transform:scale(1) translateY(0) } }
                    `}</style>
                </div>,
                document.body
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

            {/* Balance Check Modal — uses full DataContext history for accurate totals */}
            <BalanceCheckModal
                isOpen={balanceCheckOpen}
                onClose={() => setBalanceCheckOpen(false)}
                transactions={allTransactionsForBalance}
                drivers={drivers}
                theme={theme}
            />
        </div>
    );
};
