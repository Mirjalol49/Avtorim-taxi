import React, { useState, useMemo } from 'react';
import { useFines } from './hooks/useFines';
import { Fine } from '../../core/types/fines.types';
import { useAuthContext } from '../auth/context/AuthContext';
import { useUIContext } from '../shared/context/UIContext';
import { addFine, updateFine, deleteFine } from '../../../services/finesService';
import FineModal from './components/FineModal';
import FineDriverDetectorModal from './components/FineDriverDetectorModal';
import { formatNumberSmart } from '../../../utils/formatNumber';
import Skeleton from '../../../components/Skeleton';
import { useToast } from '../../../components/ToastNotification';
import { useConfirm } from '../../../components/ConfirmContext';
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
    const confirm = useConfirm();
    const isDark = theme === 'dark';

    const fleetId = userRole === 'admin'
        ? adminUser?.id
        : ((adminProfile as any)?.fleet_id || (adminProfile as any)?.created_by);

    const { fines, loading, refetch } = useFines(fleetId);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetectorOpen, setIsDetectorOpen] = useState(false);
    const [editingFine, setEditingFine] = useState<Fine | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNPAID' | 'PAID'>('ALL');

    const handleSaveFine = async (data: any) => {
        if (!fleetId) {
            addToast('error', 'Foydalanuvchi aniqlanmadi. Sahifani yangilang.');
            return;
        }
        try {
            if (data.id) {
                const { id, ...updates } = data;
                await updateFine(id, updates);
                addToast('success', "Jarima yangilandi");
            } else {
                await addFine({ ...data, fleetId });
                addToast('success', "Yangi jarima qo'shildi");
            }
            if (refetch) refetch();
        } catch (error: any) {
            addToast('error', error.message || "Xatolik yuz berdi");
        }
    };


    const handleToggleStatus = async (fine: Fine) => {
        const newStatus = fine.status === 'PAID' ? 'UNPAID' : 'PAID';
        try {
            await updateFine(fine.id, { status: newStatus });
            addToast('success', `Holat: ${newStatus === 'PAID' ? "To'langan" : "To'lanmagan"}`);
            if (refetch) refetch();
        } catch (error: any) {
            addToast('error', "Holatni o'zgartirishda xatolik");
        }
    };

    const handleDeleteFine = async (id: string) => {
        const confirmed = await confirm({
            title: "Jarimani o'chirish",
            message: "Ushbu jarimani o'chirishni tasdiqlaysizmi? Bu amalni ortga qaytarib bo'lmaydi.",
            isDanger: true,
            confirmLabel: "O'chirish",
            cancelLabel: "Bekor qilish"
        });
        
        if (!confirmed) return;

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
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Jarimalar</h1>
                    <p className={`mt-1 text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Avtomobil va haydovchilar jarimalari nazorati
                    </p>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <button
                        onClick={() => setIsDetectorOpen(true)}
                        className={`flex-1 md:flex-none flex justify-center items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 rounded-xl font-bold transition-all active:scale-95 shadow-sm border ${
                            isDark ? 'bg-surface-2 border-white/[0.08] text-gray-300 hover:bg-white/[0.06] hover:text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                    >
                        <span>🔍</span>
                        <span className="text-[13px] sm:text-sm whitespace-nowrap">Kim haydagan?</span>
                    </button>
                    <button
                        onClick={() => { setEditingFine(null); setIsModalOpen(true); }}
                        className={`flex-1 md:flex-none flex justify-center items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 rounded-xl font-semibold shadow-md transition-all active:scale-95 ${
                            isDark ? 'bg-[#0f766e] text-white hover:bg-[#0d9488]' : 'bg-[#0f766e] text-white hover:bg-[#0d9488]'
                        }`}
                    >
                        <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-[13px] sm:text-sm whitespace-nowrap">Yangi jarima</span>
                    </button>
                </div>
            </div>

            {/* Stats Header */}
            <div className={`p-4 sm:p-5 rounded-2xl border flex items-center justify-between ${isDark ? 'bg-surface-2 border-white/[0.08]' : 'bg-white border-gray-100 shadow-sm'}`}>
                <div className="flex items-center gap-3 sm:gap-4">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex flex-shrink-0 items-center justify-center ${isDark ? 'bg-rose-500/10' : 'bg-rose-50'}`}>
                        <AlertTriangleIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${isDark ? 'text-rose-400' : 'text-rose-500'}`} />
                    </div>
                    <div>
                        <p className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-0.5 sm:mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>To'lanmagan jami jarimalar</p>
                        <p className="text-xl sm:text-2xl font-black">{formatNumberSmart(totalUnpaid)} <span className="text-xs sm:text-sm font-semibold text-gray-500">UZS</span></p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <div className={`relative flex-1 rounded-xl overflow-hidden border ${isDark ? 'bg-surface-2 border-white/[0.08]' : 'bg-white border-gray-200'}`}>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon className={`w-4 h-4 sm:w-5 sm:h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                    </div>
                    <input
                        type="text"
                        placeholder="Qidiruv..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 text-[13px] sm:text-sm outline-none bg-transparent font-medium ${isDark ? 'text-white placeholder-gray-500' : 'text-black placeholder-gray-400'}`}
                    />
                </div>
                <div className={`flex rounded-xl p-1 border ${isDark ? 'bg-surface-2 border-white/[0.08]' : 'bg-white border-gray-200'}`}>
                    {(['ALL', 'UNPAID', 'PAID'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setStatusFilter(f)}
                            className={`flex-1 sm:flex-none px-2 sm:px-4 py-1.5 sm:py-1.5 rounded-lg text-[12px] sm:text-sm font-semibold transition-all ${
                                statusFilter === f
                                    ? isDark ? 'bg-white/[0.1] text-white shadow-sm' : 'bg-gray-100 text-black shadow-sm'
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
                                    <div className="flex items-center gap-2.5">
                                        <span className={`text-[10px] font-bold tracking-wider hidden sm:block ${
                                            fine.status === 'UNPAID' ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-500 dark:text-emerald-400'
                                        }`}>
                                            {fine.status === 'UNPAID' ? "TO'LANMAGAN" : "TO'LANGAN"}
                                        </span>
                                        <button 
                                            onClick={() => handleToggleStatus(fine)}
                                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none active:scale-95 ${
                                                fine.status === 'PAID' 
                                                    ? 'bg-emerald-500 hover:bg-emerald-600' 
                                                    : 'bg-rose-500 hover:bg-rose-600'
                                            }`}
                                        >
                                            <span
                                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                    fine.status === 'PAID' ? 'translate-x-5' : 'translate-x-0'
                                                }`}
                                            />
                                        </button>
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
            
            <FineDriverDetectorModal 
                isOpen={isDetectorOpen}
                onClose={() => setIsDetectorOpen(false)}
                drivers={drivers}
                cars={cars}
            />
        </div>
    );
};

export default FinesPage;
