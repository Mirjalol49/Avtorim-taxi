import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../supabase';
import { Driver } from '../../core/types';
import { Car } from '../../core/types/car.types';
import { Transaction, TransactionType } from '../../core/types/transaction.types';
import { calcDriverFinance } from './utils/debtUtils';

import { DriverAvatar } from './components/DriverAvatar';
import { LicensePlate } from '../../components/ui/LicensePlate';
import { forceDownload } from '../../../utils/downloadHelper';
import { DriverHistoryPage } from './components/DriverHistoryPage';
import {
    ChevronLeftIcon, EditIcon, TrashIcon, CarIcon
} from '../../../components/Icons';
import PageSkeleton from '../../../components/PageSkeleton';
import Lottie from 'lottie-react';
import chequeAnimation from '../../../Images/cheque.json';
import depositAnimation from '../../../Images/deposit.json';

interface Props {
    drivers: Driver[];
    cars: Car[];
    transactions: Transaction[];
    theme: 'light' | 'dark';
    userRole: 'admin' | 'viewer';
    onEditDriver?: (driver: Driver) => void;
    onDeleteDriver?: (id: string) => void;
    onAddTransaction?: (data: Omit<Transaction, 'id'>) => void;
    onOpenDepositTopup?: (driverId: string) => void;
}

const fmt = (n: number) => `${new Intl.NumberFormat('uz-UZ').format(Math.round(n))} UZS`;

function getFriendlyDocName(doc: any): string {
    if (doc.category) {
        switch (doc.category) {
            case 'driver_license': return 'Haydovchilik guvohnomasi';
            case 'passport': return 'Pasport';
            case 'car_registration': return 'Texnik pasport';
            case 'car_insurance': return "Sug'urta";
        }
    }
    const fn = doc.name || '';
    const lo = fn.toLowerCase();
    if (lo.includes('pasport')||lo.includes('passport')||lo.includes('id')) return 'ID / Pasport';
    if (lo.includes('prava')||lo.includes('license')||lo.includes('guvohnoma')) return 'Haydovchilik guvohnomasi';
    if (lo.includes('tex')||lo.includes('tech')) return 'Texnik pasport';
    if (lo.includes('sug')||lo.includes('insur')) return "Sug'urta";
    return (fn.split('.').slice(0,-1).join('.')||fn).replace(/[_-]/g,' ');
}

export const DriverProfilePage: React.FC<Props> = ({
    drivers, cars, transactions, theme, userRole, onEditDriver, onDeleteDriver, onAddTransaction, onOpenDepositTopup
}) => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const isDark = theme === 'dark';
    
    const driver = drivers.find(d => d.id === id);
    const car = driver ? cars.find(c => c.assignedDriverId === driver.id) : null;
    
    const [docs, setDocs] = useState<any[]>([]);
    const [docsLoading, setDocsLoading] = useState(true);
    const [viewingDoc, setViewingDoc] = useState<{ name: string; data: string } | null>(null);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        if (driver?.id) {
            setDocsLoading(true);
            supabase.from('drivers').select('documents').eq('id', driver.id).single()
                .then(({ data, error }) => {
                    if (!error && data?.documents) {
                        setDocs(data.documents);
                    } else {
                        setDocs([]);
                    }
                    setDocsLoading(false);
                });
        }
    }, [driver?.id]);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && viewingDoc) setViewingDoc(null);
        };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [viewingDoc]);

    const finance = useMemo(() => {
        if (!driver) return null;
        return calcDriverFinance(driver, car ?? null, transactions);
    }, [driver, car, transactions]);

    if (!driver) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center h-full">
                <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Haydovchi topilmadi</p>
                <button onClick={() => navigate('/drivers')} className="mt-4 px-4 py-2 bg-teal-500 text-white rounded-xl">Ortga qaytish</button>
            </div>
        );
    }

    const dt = driver.driverType ?? 'deposit';
    const remaining = finance?.remainingDeposit ?? 0;
    const initial = finance?.depositAmount ?? driver.depositAmount ?? 0;
    const depositPct = initial > 0 ? Math.max(0, Math.min(100, (remaining / initial) * 100)) : 0;
    const isLow = dt === 'deposit' && remaining <= (driver.depositWarningThreshold ?? 1_000_000);

    const bg = isDark ? 'bg-surface border-white/[0.07]' : 'bg-white border-gray-200';
    const bdr = isDark ? 'border-white/[0.07]' : 'border-gray-200';
    const txt = isDark ? 'text-white' : 'text-gray-900';
    const muted = isDark ? 'text-white/40' : 'text-gray-500';

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12">
            {/* Header */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl border shadow-sm ${bg}`}>
                <div className="flex items-center gap-4 min-w-0">
                    <button 
                        onClick={() => navigate('/drivers')}
                        className={`w-10 h-10 flex items-center justify-center rounded-2xl border transition-all active:scale-95 flex-shrink-0 ${isDark ? 'border-white/[0.08] hover:bg-white/[0.04]' : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                        <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                    <DriverAvatar
                        src={driver.avatar}
                        name={driver.name}
                        size={64}
                        theme={theme}
                        rounded="2xl"
                        className="flex-shrink-0 ring-2 ring-black/5"
                    />
                    <div className="min-w-0">
                        <div className="flex items-center gap-3">
                            <h1 className={`text-2xl font-bold tracking-tight truncate ${txt}`}>{driver.name}</h1>
                        </div>
                        <p className={`text-[13px] font-medium mt-1 ${muted}`}>
                            {driver.phone} {driver.telegram && `• ✈ ${driver.telegram}`}
                        </p>
                    </div>
                </div>
                
                {userRole === 'admin' && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onEditDriver?.(driver)}
                            className={`px-4 py-2.5 rounded-xl text-[13px] font-bold border transition-all active:scale-95 flex items-center gap-2 ${isDark ? 'border-teal-500/30 text-teal-400 hover:bg-teal-500/10' : 'border-teal-200 text-teal-700 hover:bg-teal-50'}`}
                        >
                            <EditIcon className="w-4 h-4" /> Tahrirlash
                        </button>
                        <button
                            onClick={() => {
                                if (window.confirm("Rostdan ham bu haydovchini o'chirmoqchimisiz?")) {
                                    onDeleteDriver?.(driver.id);
                                    navigate('/drivers');
                                }
                            }}
                            className={`px-4 py-2.5 rounded-xl text-[13px] font-bold border transition-all active:scale-95 flex items-center gap-2 ${isDark ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-red-200 text-red-600 hover:bg-red-50'}`}
                        >
                            <TrashIcon className="w-4 h-4" /> O'chirish
                        </button>
                    </div>
                )}
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column: Personal Info & Car & Docs */}
                <div className="space-y-6 lg:col-span-1">
                    
                    {/* Employment Info */}
                    <div className={`p-5 rounded-3xl border ${bg}`}>
                        <p className={`text-[11px] font-black uppercase tracking-wider mb-4 ${muted}`}>🏢 Ish faoliyati</p>
                        <div className="flex flex-wrap gap-x-12 gap-y-6">
                            <div>
                                <p className={`text-[11px] font-semibold ${muted} mb-1`}>Boshladi</p>
                                <p className={`text-[15px] font-bold ${txt}`}>
                                    {driver.startDate || driver.createdAt 
                                        ? new Date(driver.startDate || driver.createdAt).toLocaleDateString('ru-RU')
                                        : 'Noma\'lum'}
                                </p>
                            </div>
                            {driver.quitDate && (
                                <div>
                                    <p className={`text-[11px] font-semibold ${muted} mb-1`}>Tugadi</p>
                                    <p className={`text-[15px] font-bold text-red-500`}>
                                        {new Date(driver.quitDate).toLocaleDateString('ru-RU')}
                                    </p>
                                </div>
                            )}
                            <div>
                                <p className={`text-[11px] font-semibold ${muted} mb-1`}>Jami muddat</p>
                                <p className={`text-[15px] font-black ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>
                                    {(() => {
                                        const start = driver.startDate || driver.createdAt || Date.now();
                                        const end = driver.quitDate || Date.now();
                                        const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24));
                                        if (diffDays <= 0) return '0 kun';
                                        const years = Math.floor(diffDays / 365);
                                        const months = Math.floor((diffDays % 365) / 30);
                                        const days = (diffDays % 365) % 30;
                                        let res = [];
                                        if (years > 0) res.push(`${years} yil`);
                                        if (months > 0) res.push(`${months} oy`);
                                        if (days > 0 && years === 0) res.push(`${days} kun`);
                                        return res.join(' ') || '0 kun';
                                    })()}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Car Details */}
                    {car && (
                        <div className={`flex rounded-3xl border overflow-hidden p-2 gap-4 shadow-sm ${bg}`}>
                            {/* Left Side: Large Image */}
                            <div className={`w-[130px] h-[130px] sm:w-[150px] sm:h-[150px] flex-shrink-0 rounded-[20px] overflow-hidden ${isDark ? 'bg-surface-2' : 'bg-gray-100'}`}>
                                {car.avatar
                                    ? <img src={car.avatar} alt={car.name} className="w-full h-full object-cover" />
                                    : <div className="w-full h-full flex flex-col items-center justify-center"><CarIcon className={`w-8 h-8 ${isDark ? 'text-white/20' : 'text-gray-300'}`} /></div>
                                }
                            </div>
                            
                            {/* Right Side: Details & Plan */}
                            <div className="flex-1 flex flex-col justify-center py-2 pr-4 min-w-0">
                                <p className={`text-[18px] sm:text-[20px] font-bold truncate leading-tight mb-2 ${txt}`}>{car.name}</p>
                                <div className="mb-4 inline-flex shadow-sm rounded-[6px]">
                                    <LicensePlate plate={car.licensePlate} size="lg" />
                                </div>
                                
                                {(car.dailyPlan ?? 0) > 0 && (
                                    <div className={`p-3 rounded-2xl ${isDark ? 'bg-[#ebf5ff]/5' : 'bg-[#f5f8ff] border border-[#e2e8f0]/50'}`}>
                                        <p className={`text-[11px] font-medium mb-1 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>Kunlik reja</p>
                                        <p className={`text-[15px] sm:text-[16px] font-black font-mono leading-none ${txt}`}>
                                            {fmt(car.dailyPlan ?? 0)} <span className={`text-[12px] font-medium font-sans ${isDark ? 'text-white/50' : 'text-slate-600'}`}>/ kun</span>
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Documents */}
                    {!docsLoading && docs.length > 0 && (
                        <div className={`p-5 rounded-3xl border ${bg}`}>
                            <p className={`text-[13px] font-bold uppercase tracking-widest mb-6 ${txt} flex items-center gap-2`}>
                                <span className="opacity-50 text-[18px]">📄</span> {t('documents', 'HUJJATLAR').toUpperCase()}
                            </p>
                            <div className="space-y-4">
                                {docs.map((doc:any, idx:number) => {
                                    const isImage = doc.type?.startsWith('image/');
                                    const friendlyName = getFriendlyDocName(doc);
                                    
                                    return (
                                        <div key={idx} className="flex gap-4 items-center">
                                            {/* Left side preview */}
                                            <div className={`w-[80px] h-[80px] rounded-2xl border flex-shrink-0 overflow-hidden ${isDark ? 'border-white/10 bg-surface-2' : 'border-gray-200 bg-gray-50'}`}>
                                                {isImage ? (
                                                    <img src={doc.data} alt={doc.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-3xl">📄</div>
                                                )}
                                            </div>
                                            
                                            {/* Right side content */}
                                            <div className="flex flex-col py-1">
                                                <p className={`text-[15px] font-bold ${txt} mb-2`}>{friendlyName}</p>
                                                
                                                <div className="flex gap-2">
                                                    {isImage && (
                                                        <button 
                                                            onClick={() => setViewingDoc({ name: doc.name, data: doc.data })}
                                                            className={`flex items-center px-3 py-1.5 rounded-lg border text-[12px] font-medium transition-colors ${isDark ? 'border-white/20 text-white/80 hover:bg-white/10' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 opacity-60"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                                                            {t('view', "Ko'rish")}
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => forceDownload(doc.data, doc.name)}
                                                        className={`flex items-center px-3 py-1.5 rounded-lg border text-[12px] font-medium transition-colors ${isDark ? 'border-white/20 text-white/80 hover:bg-white/10' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 opacity-60"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                                                        {t('download', 'Yuklab olish')}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Financials & History */}
                <div className="space-y-6 lg:col-span-2">
                    
                    {/* Finance Hero Card */}
                    {dt === 'lease_to_own' ? (
                        <div className={`p-6 rounded-3xl border shadow-sm ${isDark ? 'border-teal-500/30 bg-teal-500/[0.04]' : 'border-teal-200 bg-teal-50/50'}`}>
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="flex-1">
                                    <p className={`text-[11px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-teal-400/80' : 'text-teal-700/80'}`}>🚗 Shartnoma qoldig'i</p>
                                    <p className={`text-[36px] font-black font-mono leading-none tracking-tight ${isDark ? 'text-teal-300' : 'text-teal-700'}`}>
                                        {fmt(finance?.contractRemaining ?? 0)}
                                    </p>
                                </div>
                                <div className={`flex flex-col justify-end gap-2 p-4 rounded-2xl ${isDark ? 'bg-black/20' : 'bg-white'} border ${isDark ? 'border-teal-500/10' : 'border-teal-100'}`}>
                                    <div className="flex justify-between gap-8">
                                        <span className={`text-[11px] font-bold uppercase ${muted}`}>Jami shartnoma</span>
                                        <span className={`text-[13px] font-black font-mono ${isDark ? 'text-teal-400/80' : 'text-teal-600'}`}>{fmt(driver.totalContractAmount ?? 0)}</span>
                                    </div>
                                    <div className="flex justify-between gap-8">
                                        <span className={`text-[11px] font-bold uppercase ${muted}`}>To'langan</span>
                                        <span className={`text-[13px] font-black font-mono ${isDark ? 'text-teal-400/80' : 'text-teal-600'}`}>{fmt(finance?.contractPaid ?? 0)}</span>
                                    </div>
                                </div>
                            </div>
                            {/* Progress bar */}
                            {driver.totalContractAmount && driver.totalContractAmount > 0 ? (
                                <div className="mt-6">
                                    <div className="flex justify-between mb-2">
                                        <span className={`text-[11px] font-bold ${muted}`}>To'lov progressi</span>
                                        <span className={`text-[11px] font-bold ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>
                                            {Math.round(((finance?.contractPaid ?? 0) / driver.totalContractAmount) * 100)}%
                                        </span>
                                    </div>
                                    <div className={`w-full h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-black/30' : 'bg-teal-200/60'}`}>
                                        <div
                                            className="h-full rounded-full transition-all duration-700 bg-teal-500"
                                            style={{ width: `${Math.round(((finance?.contractPaid ?? 0) / driver.totalContractAmount) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    ) : dt === 'deposit' ? (
                        <div className={`p-6 rounded-3xl border shadow-sm ${isLow ? (isDark ? 'border-red-500/30 bg-red-500/[0.04]' : 'border-red-200 bg-red-50/50') : (isDark ? 'border-amber-500/30 bg-amber-500/[0.04]' : 'border-amber-200 bg-amber-50/50')}`}>
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="flex-1">
                                    <p className={`text-[11px] font-black uppercase tracking-widest mb-2 flex items-center gap-1.5 ${isLow ? (isDark ? 'text-red-400/80' : 'text-red-600/80') : (isDark ? 'text-amber-400/80' : 'text-amber-700/80')}`}>
                                        <div className="w-4 h-4"><Lottie animationData={depositAnimation} loop={true} /></div> Depozit qoldig'i
                                    </p>
                                    <p className={`text-[36px] font-black font-mono leading-none tracking-tight ${isLow ? 'text-red-400' : (isDark ? 'text-amber-300' : 'text-amber-700')}`}>
                                        {fmt(Math.max(0, remaining))}
                                    </p>
                                    {isLow && (
                                        <p className="text-[12px] font-bold mt-2 text-red-500 flex items-center gap-1.5">
                                            <span>⚠️</span> Depozit miqdori kam — to'ldirish kerak
                                        </p>
                                    )}
                                    {/* Top-up button */}
                                    {userRole !== 'viewer' && onOpenDepositTopup && (
                                        <div className="mt-4">
                                            <button
                                                onClick={() => onOpenDepositTopup(driver.id)}
                                                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[13px] font-bold transition-all active:scale-[0.97] ${
                                                    isLow
                                                        ? 'bg-red-500 text-white hover:bg-red-600 shadow-sm'
                                                        : isDark ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30' : 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-300'
                                                }`}
                                            >
                                                <div className="w-4 h-4"><Lottie animationData={depositAnimation} loop={true} /></div>
                                                Depozitni to'ldirish
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className={`flex flex-col justify-end gap-2 p-4 rounded-2xl ${isDark ? 'bg-black/20' : 'bg-white'} border ${isLow ? (isDark ? 'border-red-500/10' : 'border-red-100') : (isDark ? 'border-amber-500/10' : 'border-amber-100')}`}>
                                    <div className="flex justify-between gap-8">
                                        <span className={`text-[11px] font-bold uppercase ${muted}`}>Boshlang'ich</span>
                                        <span className={`text-[13px] font-black font-mono ${isDark ? 'text-amber-400/80' : 'text-amber-600'}`}>{fmt(initial)}</span>
                                    </div>
                                    <div className="flex justify-between gap-8">
                                        <span className={`text-[11px] font-bold uppercase ${muted}`}>Ishlatilgan</span>
                                        <span className={`text-[13px] font-black font-mono ${isDark ? 'text-red-400/80' : 'text-red-500'}`}>{fmt(Math.max(0, initial - remaining))}</span>
                                    </div>
                                </div>
                            </div>
                            {initial > 0 && (
                                <div className="mt-6">
                                    <div className="flex justify-between mb-2">
                                        <span className={`text-[11px] font-bold ${muted}`}>Qolgan depozit</span>
                                        <span className={`text-[11px] font-bold ${isLow ? 'text-red-500' : (isDark ? 'text-amber-400' : 'text-amber-600')}`}>
                                            {Math.round(depositPct)}%
                                        </span>
                                    </div>
                                    <div className={`w-full h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-black/30' : 'bg-amber-200/60'}`}>
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ${isLow ? 'bg-red-500' : 'bg-amber-500'}`}
                                            style={{ width: `${depositPct}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className={`p-6 rounded-3xl border shadow-sm ${isDark ? 'border-violet-500/30 bg-violet-500/[0.04]' : 'border-violet-200 bg-violet-50/50'}`}>
                            <div className="flex-1">
                                <p className={`text-[11px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-violet-400/80' : 'text-violet-700/80'}`}>💵 Oylik maosh</p>
                                <p className={`text-[36px] font-black font-mono leading-none tracking-tight ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>
                                    {fmt(driver.monthlySalary ?? 0)}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Quick History Actions */}
                    <div className={`p-5 rounded-3xl border ${bg}`}>
                        <div className="flex items-center justify-between mb-4">
                            <p className={`text-[14px] font-bold ${txt}`}>Moliya tarixi</p>
                            <button 
                                onClick={() => setShowHistory(true)}
                                className={`text-[12px] font-bold px-3 py-1.5 rounded-xl border transition-colors ${isDark ? 'bg-white/[0.05] border-white/[0.1] text-white hover:bg-white/[0.1]' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}`}
                            >
                                To'liq ochish
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <button
                                onClick={() => setShowHistory(true)}
                                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all active:scale-[0.98] ${isDark ? 'border-teal-500/20 bg-teal-500/[0.04] hover:bg-teal-500/[0.08]' : 'border-teal-200 bg-teal-50 hover:bg-teal-100/50'}`}
                            >
                                <div className="w-10 h-10 flex-shrink-0">
                                    <Lottie animationData={chequeAnimation} loop={true} />
                                </div>
                                <div className="text-left">
                                    <p className={`text-[14px] font-black ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>Tranzaksiyalar tarixi</p>
                                    <p className={`text-[11px] ${muted}`}>Barcha kirim / chiqimlar</p>
                                </div>
                            </button>

                            {dt === 'deposit' && (
                                <button
                                    onClick={() => setShowHistory(true)}
                                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all active:scale-[0.98] ${isDark ? 'border-amber-500/20 bg-amber-500/[0.04] hover:bg-amber-500/[0.08]' : 'border-amber-200 bg-amber-50 hover:bg-amber-100/50'}`}
                                >
                                    <div className="w-10 h-10 flex-shrink-0">
                                        <Lottie animationData={depositAnimation} loop={true} />
                                    </div>
                                    <div className="text-left">
                                        <p className={`text-[14px] font-black ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>Depozit tarixi</p>
                                        <p className={`text-[11px] ${muted}`}>To'ldirish va sarflash</p>
                                    </div>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Notes */}
                    {(driver as any).notes && (
                        <div className={`p-5 rounded-3xl border ${bg}`}>
                            <p className={`text-[11px] font-black uppercase tracking-wider mb-3 ${muted}`}>📝 Izohlar</p>
                            <p className={`text-[13px] leading-relaxed whitespace-pre-wrap ${txt}`}>{(driver as any).notes}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Document Viewer Modal */}
            {viewingDoc && (
                <div 
                    className="fixed inset-y-0 right-0 left-0 md:left-64 z-[300] flex items-center justify-center p-4 sm:p-8 bg-black/60 backdrop-blur-sm" 
                    onClick={() => setViewingDoc(null)}
                >
                    <div 
                        className={`relative w-full max-w-[800px] max-h-[90vh] rounded-[32px] overflow-hidden shadow-2xl flex flex-col ${isDark ? 'bg-[#151a23] border border-white/10' : 'bg-white'}`} 
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className={`flex items-center justify-between p-5 pb-4 ${isDark ? 'bg-[#151a23]' : 'bg-white'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-[18px] flex items-center justify-center ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
                                </div>
                                <div>
                                    <h3 className={`font-bold text-[16px] leading-tight ${txt}`}>{t('viewDocument', "Hujjatni ko'rish")}</h3>
                                    <p className={`text-[12px] flex items-center gap-1.5 mt-0.5 ${muted}`}>
                                        <span className="opacity-70">📄</span> {viewingDoc.name || t('file', 'Fayl')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => forceDownload(viewingDoc.data, viewingDoc.name)} 
                                    className={`w-12 h-12 flex items-center justify-center rounded-[18px] border transition-colors active:scale-95 ${isDark ? 'border-blue-500/30 text-blue-400 hover:bg-blue-500/10' : 'border-blue-100 text-blue-600 hover:bg-blue-50'}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                </button>
                                <button 
                                    onClick={() => setViewingDoc(null)} 
                                    className={`w-12 h-12 flex items-center justify-center rounded-[18px] border transition-colors active:scale-95 ${isDark ? 'border-white/10 text-white/70 hover:bg-white/10' : 'border-gray-200 text-gray-600 bg-gray-50 hover:bg-gray-100'}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                </button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className={`flex-1 p-8 md:p-12 overflow-y-auto flex items-center justify-center ${isDark ? 'bg-black/40' : 'bg-[#f4f7fc]'}`}>
                            <img 
                                src={viewingDoc.data} 
                                alt={viewingDoc.name} 
                                className="w-full max-w-[600px] rounded-2xl shadow-sm object-contain max-h-[65vh]" 
                            />
                        </div>

                        {/* Footer */}
                        <div className={`p-5 flex items-center justify-between ${isDark ? 'bg-[#151a23] border-t border-white/5' : 'bg-white border-t border-gray-100'}`}>
                            <p className={`text-[12px] ${muted}`}>
                                {t('clickOutsideOr', 'Tashqariga bosing yoki')} <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono mx-0.5 ${isDark ? 'bg-white/10' : 'bg-gray-100 border border-gray-200'}`}>Esc</kbd> {t('toClose', 'yopish uchun')}
                            </p>
                            <button 
                                onClick={() => setViewingDoc(null)} 
                                className={`text-[14px] font-bold ${isDark ? 'text-white/70 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                {t('close', 'Yopish')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* History Full Modal */}
            {showHistory && (
                <DriverHistoryPage
                    driver={driver}
                    car={car}
                    transactions={transactions}
                    theme={theme}
                    onClose={() => setShowHistory(false)}
                />
            )}
        </div>
    );
};
