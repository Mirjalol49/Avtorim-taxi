import React, { useState, useMemo } from 'react';
import { useFines } from './hooks/useFines';
import { Fine } from '../../core/types/fines.types';
import { useAuthContext } from '../auth/context/AuthContext';
import { useUIContext } from '../shared/context/UIContext';
import { addFine, updateFine, deleteFine } from '../../../services/finesService';
import FineModal from './components/FineModal';
import { addTransaction } from '../../../services/firestoreService';
import { TransactionType } from '../../core/types/transaction.types';
import { formatNumberSmart } from '../../../utils/formatNumber';
import Skeleton from '../../../components/Skeleton';
import { useToast } from '../../../components/ToastNotification';
import { Driver, Car } from '../../../types';
import { AlertTriangleIcon, CheckCircleIcon, PlusIcon, SearchIcon, TrashIcon, EditIcon } from '../../../components/Icons';
import { format } from 'date-fns';
import { uz } from 'date-fns/locale';

interface FinesPageProps {
    drivers: Driver[];
    cars: Car[];
}

const FinesPage: React.FC<FinesPageProps> = ({ drivers, cars }) => {
    const { userRole, adminUser, adminProfile } = useAuthContext();
    const { theme } = useUIContext();
    const { addToast } = useToast();
    const isDark = theme === 'dark';

    const fleetId = userRole === 'admin'
        ? adminUser?.id
        : ((adminProfile as any)?.fleet_id || (adminProfile as any)?.created_by);

    const { fines, loading, refetch } = useFines(fleetId);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFine, setEditingFine] = useState<Fine | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNPAID' | 'PAID'>('ALL');

    const handleSaveFine = async (data: any) => {
        try {
            let shouldDeduct = false;
            let fineAmount = data.amount;

            if (data.id) {
                const oldFine = fines.find(f => f.id === data.id);
                const { id, ...updates } = data;
                await updateFine(id, updates);
                
                // If it wasn't paid before, and now it is PAID
                if (oldFine && oldFine.status === 'UNPAID' && updates.status === 'PAID') {
                    shouldDeduct = true;
                }
                addToast('success', "Jarima yangilandi");
            } else {
                await addFine({ ...data, fleetId });
                // If a new fine is created directly as PAID
                if (data.status === 'PAID') {
                    shouldDeduct = true;
                }
                addToast('success', "Yangi jarima qo'shildi");
            }

            if (refetch) refetch();

            if (shouldDeduct) {
                const driver = drivers.find(d => d.id === data.driverId);
                const car = cars.find(c => c.id === data.carId);
                
                await addTransaction({
                    driverId: data.driverId,
                    driverName: driver?.name,
                    carId: data.carId || undefined,
                    carName: car ? `${car.name} — ${car.licensePlate}` : undefined,
                    amount: fineAmount,
                    type: TransactionType.EXPENSE,
                    description: `Jarima: ${data.description || 'Sababsiz'}`,
                    timestamp: Date.now(),
                    category: 'Jarima',
                }, fleetId);
                addToast('success', "Jarima summasi haydovchi balansidan yechildi");
            }

        } catch (error: any) {
            addToast('error', error.message || "Xatolik yuz berdi");
            throw error;
        }
    };

    const handleDeleteFine = async (id: string) => {
        if (!window.confirm("Jarimani o'chirishni tasdiqlaysizmi?")) return;
        try {
            await deleteFine(id);
            addToast('success', "Jarima o'chirildi");
            if (refetch) refetch();
        } catch (error: any) {
            addToast('error', "O'chirishda xatolik");
        }
    };

    const filteredFines = useMemo(() => {
        let list = fines;
        if (statusFilter !== 'ALL') {
            list = list.filter(f => f.status === statusFilter);
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(f => 
                f.driverName?.toLowerCase().includes(q) ||
                f.carName?.toLowerCase().includes(q) ||
                f.description?.toLowerCase().includes(q)
            );
        }
        return list;
    }, [fines, statusFilter, searchQuery]);

    const totalUnpaid = useMemo(() => fines.filter(f => f.status === 'UNPAID').reduce((sum, f) => sum + f.amount, 0), [fines]);

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Jarimalar</h1>
                    <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Avtomobil va haydovchilar jarimalari nazorati
                    </p>
                </div>

                <button
                    onClick={() => { setEditingFine(null); setIsModalOpen(true); }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold shadow-md transition-all active:scale-95 ${
                        isDark ? 'bg-[#0f766e] text-white hover:bg-[#0d9488]' : 'bg-[#0f766e] text-white hover:bg-[#0d9488]'
                    }`}
                >
                    <PlusIcon className="w-5 h-5" />
                    <span>Yangi jarima</span>
                </button>
            </div>

            {/* Stats Header */}
            <div className={`p-5 rounded-2xl border flex items-center justify-between ${isDark ? 'bg-surface-2 border-white/[0.08]' : 'bg-white border-gray-100 shadow-sm'}`}>
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDark ? 'bg-rose-500/10' : 'bg-rose-50'}`}>
                        <AlertTriangleIcon className={`w-6 h-6 ${isDark ? 'text-rose-400' : 'text-rose-500'}`} />
                    </div>
                    <div>
                        <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>To'lanmagan jami jarimalar</p>
                        <p className="text-2xl font-black">{formatNumberSmart(totalUnpaid)} <span className="text-sm font-semibold text-gray-500">UZS</span></p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className={`relative flex-1 rounded-xl overflow-hidden border ${isDark ? 'bg-surface-2 border-white/[0.08]' : 'bg-white border-gray-200'}`}>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                    </div>
                    <input
                        type="text"
                        placeholder="Haydovchi, avto yoki izoh bo'yicha qidiruv..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2.5 outline-none bg-transparent font-medium ${isDark ? 'text-white placeholder-gray-500' : 'text-black placeholder-gray-400'}`}
                    />
                </div>
                <div className={`flex rounded-xl p-1 border ${isDark ? 'bg-surface-2 border-white/[0.08]' : 'bg-white border-gray-200'}`}>
                    {(['ALL', 'UNPAID', 'PAID'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setStatusFilter(f)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                                statusFilter === f
                                    ? isDark ? 'bg-white/[0.1] text-white' : 'bg-gray-100 text-black'
                                    : isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-black'
                            }`}
                        >
                            {f === 'ALL' ? 'Barchasi' : f === 'UNPAID' ? "To'lanmagan" : "To'langan"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Fines List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} variant="rectangular" height={160} className="rounded-2xl" theme={theme} />
                    ))
                ) : filteredFines.length === 0 ? (
                    <div className="col-span-full py-12 text-center">
                        <AlertTriangleIcon className={`w-12 h-12 mx-auto mb-3 opacity-20 ${isDark ? 'text-white' : 'text-black'}`} />
                        <p className={`text-lg font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Jarimalar topilmadi</p>
                    </div>
                ) : (
                    filteredFines.map(fine => {
                        const driver = drivers.find(d => d.id === fine.driverId);
                        return (
                            <div key={fine.id} className={`rounded-[1.5rem] p-5 border flex flex-col transition-all duration-200 group ${
                                isDark 
                                    ? 'bg-surface-2 border-white/[0.06] hover:bg-surface-3 hover:border-white/[0.1] hover:-translate-y-1 hover:shadow-xl' 
                                    : 'bg-white border-gray-100 shadow-sm hover:shadow-lg hover:border-gray-200 hover:-translate-y-1'
                            }`}>
                                <div className="flex justify-between items-start mb-5 gap-3">
                                    <div className="flex items-center gap-3">
                                        {driver?.avatar ? (
                                            <img src={driver.avatar} alt={fine.driverName} className={`w-11 h-11 rounded-2xl object-cover shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-100'}`} />
                                        ) : (
                                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-lg shadow-inner ${isDark ? 'bg-surface-3 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                                                {fine.driverName?.charAt(0) || '?'}
                                            </div>
                                        )}
                                        <div>
                                            <h3 className={`font-bold text-base leading-tight truncate max-w-[150px] sm:max-w-[180px] ${isDark ? 'text-white' : 'text-gray-900'}`}>{fine.driverName || 'Noma\'lum'}</h3>
                                            {fine.carName && <p className={`text-[11px] font-medium mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{fine.carName}</p>}
                                        </div>
                                    </div>
                                    <div className={`px-2.5 py-1.5 rounded-xl flex flex-shrink-0 items-center gap-1.5 text-[10px] font-bold tracking-wider ${
                                        fine.status === 'UNPAID' 
                                            ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400'
                                            : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'
                                    }`}>
                                        {fine.status === 'PAID' ? <CheckCircleIcon className="w-3.5 h-3.5" /> : <AlertTriangleIcon className="w-3.5 h-3.5" />}
                                        <span className="hidden sm:inline">{fine.status === 'UNPAID' ? "TO'LANMAGAN" : "TO'LANGAN"}</span>
                                    </div>
                                </div>
                                
                                <div className="mb-4 bg-black/[0.02] dark:bg-white/[0.02] p-3.5 rounded-2xl border border-black/[0.03] dark:border-white/[0.04]">
                                    <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Jarima Summasi</p>
                                    <p className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{formatNumberSmart(fine.amount)} <span className="text-sm font-semibold opacity-60">UZS</span></p>
                                </div>

                                {fine.description && (
                                    <p className={`text-sm mb-4 line-clamp-2 flex-1 leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                        {fine.description}
                                    </p>
                                )}

                                <div className="mt-auto pt-4 flex items-center justify-between border-t border-gray-100 dark:border-white/[0.06]">
                                    <span className={`text-[13px] font-semibold flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${fine.status === 'PAID' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                        {format(new Date(fine.fineDate), 'dd MMM yyyy', { locale: uz })}
                                    </span>
                                    <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => { setEditingFine(fine); setIsModalOpen(true); }} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/[0.08] text-gray-300 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-black'}`}>
                                            <EditIcon className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDeleteFine(fine.id)} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-rose-500/15 text-gray-300 hover:text-rose-400' : 'hover:bg-rose-50 text-gray-500 hover:text-rose-500'}`}>
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <FineModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingFine(null); }}
                onSubmit={handleSaveFine}
                editingFine={editingFine}
                drivers={drivers}
                cars={cars}
            />
        </div>
    );
};

export default FinesPage;
