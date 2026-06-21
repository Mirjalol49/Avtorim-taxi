import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../supabase';
import { Driver } from '../../core/types';
import { Car } from '../../core/types/car.types';
import { PaymentStatus, Transaction } from '../../core/types/transaction.types';
import { calcDriverFinance } from './utils/debtUtils';
import { getDriverWorkPeriods } from './utils/driverPlanHistory';
import {
    getIshonchnomaReminderMs,
    normalizeIshonchnomaReminderDocument,
    startOfDayMs,
} from './utils/ishonchnomaReminder';

import { DriverAvatar } from './components/DriverAvatar';
import { LicensePlate } from '../../components/ui/LicensePlate';
import { forceDownload } from '../../../utils/downloadHelper';
import { DriverHistoryPage } from './components/DriverHistoryPage';
import {
    ChevronLeftIcon, EditIcon, TrashIcon, CarIcon, EyeIcon, DownloadIcon, XIcon, FilePdfIcon
} from '../../../components/Icons';
import DatePicker from '../../../components/DatePicker';
import QuickAssignmentModal from '../../../components/QuickAssignmentModal';
import { isPdfSource, openDocumentInNewTab } from '../documents/pdfPreviewUtils';

interface Props {
    drivers: Driver[];
    cars: Car[];
    transactions: Transaction[];
    theme: 'light' | 'dark';
    userRole: 'admin' | 'viewer';
    onEditDriver?: (driver: Driver) => void;
    onRehireDriver?: (driver: Driver) => void;
    onDeleteDriver?: (id: string) => void;
    onAddTransaction?: (data: Omit<Transaction, 'id'>) => void;
    onOpenDepositTopup?: (driverId: string) => void;
    onQuickAssign?: (payload: { driverId: string; carId: string | null; effectiveFrom?: number; replaceExisting?: boolean }) => Promise<void>;
}

const fmt = (n: number) => `${new Intl.NumberFormat('uz-UZ').format(Math.round(n))} UZS`;

function getFriendlyDocName(doc: any, t: (key: string, fallback: string) => string): string {
    if (doc.category) {
        switch (doc.category) {
            case 'driver_license': return t('driverLicenseCardTitle', 'Ishonchnoma');
            case 'passport':       return t('docNamePassport', 'Pasport');
            case 'car_registration': return t('docNameCarRegistration', 'Texnik pasport');
            case 'car_insurance':  return t('docNameInsurance', "Sug'urta");
        }
    }
    const fn = doc.name || '';
    const lo = fn.toLowerCase();
    if (lo.includes('pasport')||lo.includes('passport')||lo.includes('id')) return t('docNamePassport', 'Pasport');
    if (lo.includes('prava')||lo.includes('license')||lo.includes('guvohnoma')||lo.includes('ishonchnoma')) return t('docNameLicense', 'Ishonchnoma');
    if (lo.includes('tex')||lo.includes('tech')) return t('docNameCarRegistration', 'Texnik pasport');
    if (lo.includes('sug')||lo.includes('insur')) return t('docNameInsurance', "Sug'urta");
    return (fn.split('.').slice(0,-1).join('.')||fn).replace(/[_-]/g,' ');
}

const DOC_CATEGORY_ORDER = ['driver_license', 'passport', 'other', 'car_registration', 'car_insurance'];

type DriverProfileDocPreview = {
    name: string;
    data: string;
    type?: string;
};

function isImageDocument(doc: { type?: string; data?: string }) {
    return Boolean(doc.type?.startsWith('image/') || doc.data?.startsWith('data:image/'));
}

function isPdfDocument(doc: { name?: string; type?: string; data?: string }) {
    return isPdfSource(doc);
}

function isDriverCurrentlyWorking(driver: Driver | undefined): boolean {
    if (!driver || driver.isDeleted) return false;
    if (!driver.quitDate) return true;
    const quitEnd = new Date(driver.quitDate);
    quitEnd.setHours(23, 59, 59, 999);
    return quitEnd.getTime() >= Date.now();
}

function resolveDriverProfileCar(driver: Driver | undefined, cars: Car[], transactions: Transaction[]): Car | null {
    if (!driver) return null;

    if (isDriverCurrentlyWorking(driver)) {
        const activeAssigned = cars.find(c => c.assignedDriverId === driver.id && !c.isDeleted);
        return activeAssigned ?? null;
    }

    const latestPlanCarId = [...(driver.planHistory ?? [])]
        .sort((a, b) => b.effectiveFrom - a.effectiveFrom)
        .find(entry => entry.carId)?.carId;
    if (latestPlanCarId) {
        const planCar = cars.find(c => c.id === latestPlanCarId);
        if (planCar) return planCar;
    }

    const normalizedDriverPlate = (driver.licensePlate || '').replace(/\s+/g, '').toLowerCase();
    if (normalizedDriverPlate) {
        const plateCar = cars.find(c => (c.licensePlate || '').replace(/\s+/g, '').toLowerCase() === normalizedDriverPlate);
        if (plateCar) return plateCar;
    }

    const driverCarName = (driver.carModel || '').trim().toLowerCase();
    if (driverCarName) {
        const nameCar = cars.find(c => (c.name || '').trim().toLowerCase() === driverCarName);
        if (nameCar) return nameCar;
    }

    const latestTxWithCar = transactions
        .filter(tx => tx.driverId === driver.id && tx.carId && tx.status !== PaymentStatus.DELETED)
        .sort((a, b) => b.timestamp - a.timestamp)[0];
    if (latestTxWithCar?.carId) {
        return cars.find(c => c.id === latestTxWithCar.carId) ?? null;
    }

    return null;
}

function groupDriverDocuments(docs: any[], t: (key: string, fallback: string) => string) {
    const grouped = new Map<string, { key: string; title: string; docs: any[] }>();

    docs.forEach((doc) => {
        const key = doc.category || doc.name || 'other';
        const existing = grouped.get(key);
        if (existing) {
            existing.docs.push(doc);
        } else {
            grouped.set(key, {
                key,
                title: getFriendlyDocName(doc, t),
                docs: [doc],
            });
        }
    });

    return Array.from(grouped.values()).sort((a, b) => {
        const ai = DOC_CATEGORY_ORDER.indexOf(a.key);
        const bi = DOC_CATEGORY_ORDER.indexOf(b.key);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
}

export const DriverProfilePage: React.FC<Props> = ({
    drivers, cars, transactions, theme, userRole, onEditDriver, onRehireDriver, onDeleteDriver, onAddTransaction, onOpenDepositTopup, onQuickAssign
}) => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const isDark = theme === 'dark';
    
    const driver = drivers.find(d => d.id === id);
    const car = useMemo(() => resolveDriverProfileCar(driver, cars, transactions), [driver, cars, transactions]);
    
    const [docs, setDocs] = useState<any[]>([]);
    const [docsLoading, setDocsLoading] = useState(true);
    const [viewingDoc, setViewingDoc] = useState<DriverProfileDocPreview | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [assignOpen, setAssignOpen] = useState(false);
    const [licenseModalOpen, setLicenseModalOpen] = useState(false);
    const [licenseReminderDateDraft, setLicenseReminderDateDraft] = useState<Date | null>(null);
    const [licenseSaving, setLicenseSaving] = useState(false);
    const [licenseError, setLicenseError] = useState<string | null>(null);

    useEffect(() => {
        if (!driver?.id) return;

        let cancelled = false;
        const fetchDocuments = async () => {
            setDocsLoading(true);
            const { data, error } = await supabase.from('drivers').select('documents').eq('id', driver.id).single();
            if (cancelled) return;

            if (!error && data?.documents) {
                setDocs(data.documents);
            } else {
                setDocs([]);
            }
            setDocsLoading(false);
        };

        void fetchDocuments();

        const channel = supabase
            .channel(`driver_documents_${driver.id}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'drivers', filter: `id=eq.${driver.id}` },
                () => { void fetchDocuments(); }
            )
            .subscribe();

        return () => {
            cancelled = true;
            supabase.removeChannel(channel);
        };
    }, [driver?.id]);

    useEffect(() => {
        if (viewingDoc && isPdfDocument(viewingDoc)) {
            setViewingDoc(null);
            return;
        }

        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && viewingDoc) setViewingDoc(null);
        };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [viewingDoc]);

    useEffect(() => {
        if (!viewingDoc) {
            setPreviewUrl(null);
            return;
        }
        if (isPdfDocument(viewingDoc)) {
            setPreviewUrl(null);
            return;
        }

        setPreviewUrl(viewingDoc.data);
    }, [viewingDoc]);

    if (!driver) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center h-full">
                <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('driverNotFound', 'Haydovchi topilmadi')}</p>
                <button onClick={() => navigate('/drivers')} className="mt-4 px-4 py-2 bg-teal-500 text-white rounded-xl">{t('goBack', 'Ortga qaytish')}</button>
            </div>
        );
    }

    const dt = driver.driverType ?? 'deposit';
    const finance = calcDriverFinance(driver, car ?? null, transactions);
    const balanceCard = dt === 'lease_to_own'
        ? {
            label: t('contractRemaining', "Shartnoma qoldig'i"),
            value: finance.contractRemaining ?? 0,
        }
        : dt === 'deposit'
            ? {
                label: t('depositBalance', "Depozit qoldig'i"),
                value: finance.remainingDeposit,
            }
            : null;
    const isWorkingNow = isDriverCurrentlyWorking(driver);

    const bg = isDark ? 'bg-[#151f32] border-white/5' : 'bg-white border-slate-200/60';
    const txt = isDark ? 'text-white' : 'text-slate-900';
    const muted = isDark ? 'text-slate-400' : 'text-slate-500';
    
    const groupedDocs = groupDriverDocuments(docs.filter((doc: any) => Boolean(doc.data)), t);
    const isViewingImage = viewingDoc ? isImageDocument(viewingDoc) : false;
    const driverLicenseDoc = docs.find((doc: any) => doc.category === 'driver_license' && getIshonchnomaReminderMs(doc) !== null);
    const driverLicenseReminderAt = getIshonchnomaReminderMs(driverLicenseDoc);
    const todayStartMs = startOfDayMs(Date.now());
    
    const driverLicenseStatus = driverLicenseReminderAt === null
        ? 'missing'
        : todayStartMs >= startOfDayMs(driverLicenseReminderAt)
            ? 'warning'
            : 'valid';

    const formatDriverDocDate = (ms: number | null) => {
        if (!ms) return t('notSpecified', 'Kiritilmagan');
        const date = new Date(ms);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${day}.${month}.${date.getFullYear()}`;
    };

    const driverLicenseReminderText = driverLicenseReminderAt
        ? t('driverLicenseReminderLine', 'Eslatma: {{date}}').replace('{{date}}', formatDriverDocDate(driverLicenseReminderAt))
        : t('driverLicenseReminderMissing', 'Eslatma belgilanmagan');

    const workPeriods = getDriverWorkPeriods(driver, car);
    const latestPeriods = [...workPeriods].sort((a, b) => b.startDate - a.startDate).slice(0, 3);
    const formatShortDate = (ms?: number | null) => {
        if (!ms) return t('nowWorking', 'Hozir ishlayapti');
        const date = new Date(ms);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${day}.${month}.${date.getFullYear()}`;
    };

    const openLicenseModal = () => {
        if (userRole !== 'admin') return;
        setLicenseReminderDateDraft(driverLicenseReminderAt ? new Date(driverLicenseReminderAt) : null);
        setLicenseError(null);
        setLicenseModalOpen(true);
    };

    const saveIshonchnomaReminder = async () => {
        if (!driver?.id) return;
        setLicenseSaving(true);
        setLicenseError(null);
        const previousDocs = docs;
        try {
            const reminderAtMs = licenseReminderDateDraft ? startOfDayMs(licenseReminderDateDraft) : null;
            const reminderName = t('driverLicenseCardTitle', 'Ishonchnoma');
            const nextDocs = [...docs];
            const idx = nextDocs.findIndex((doc: any) => doc.category === 'driver_license');

            if (idx >= 0) {
                if (!reminderAtMs && !nextDocs[idx]?.data) {
                    nextDocs.splice(idx, 1);
                } else {
                    nextDocs[idx] = normalizeIshonchnomaReminderDocument(nextDocs[idx], reminderAtMs, reminderName);
                }
            } else if (reminderAtMs) {
                nextDocs.push({
                    name: reminderName,
                    type: 'application/x-ishonchnoma-reminder',
                    data: '',
                    category: 'driver_license',
                    reminderAtMs,
                    expiryMs: null,
                    reminderDaysBefore: null,
                });
            }

            setDocs(nextDocs);
            const { error } = await supabase.from('drivers').update({ documents: nextDocs }).eq('id', driver.id);
            if (error) throw error;
            setLicenseModalOpen(false);
        } catch (err: any) {
            setDocs(previousDocs);
            setLicenseError(err?.message || t('errorOccurred', 'Xatolik yuz berdi'));
        } finally {
            setLicenseSaving(false);
        }
    };

    return (
        <div className="w-full max-w-7xl mx-auto space-y-5 pb-16 px-4 sm:px-6 lg:px-8 mt-6">
            <button
                type="button"
                onClick={() => navigate('/drivers')}
                className={`inline-flex items-center gap-2 h-10 px-3 rounded-xl text-[13px] font-bold border transition-all active:scale-[0.98] ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-slate-300 hover:bg-white/[0.08] hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                aria-label={t('backToDriversList', "Haydovchilar ro'yxatiga qaytish")}
            >
                <ChevronLeftIcon className="w-4 h-4" />
                {t('back', 'Orqaga')}
            </button>

            <div className={`grid grid-cols-1 gap-4 ${balanceCard ? 'xl:grid-cols-[minmax(0,1fr)_320px]' : ''}`}>
                {/* Minimal Header */}
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl border shadow-sm ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/60'}`}>
                    <div className="flex items-center gap-4 min-w-0">
                        <DriverAvatar src={driver.avatar} name={driver.name} size={72} theme={theme} rounded="full" className="shadow-sm border flex-shrink-0" />
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className={`text-2xl font-semibold tracking-tight truncate ${txt}`}>{driver.name}</h1>
                                {isWorkingNow ? (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">{t('active', 'Faol')}</span>
                                ) : (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400">{t('inactive', 'Nofaol')}</span>
                                )}
                            </div>
                            <p className={`text-[15px] mt-1 ${muted}`}>
                                {driver.phone} {driver.telegram && `• ✈ ${driver.telegram}`}
                            </p>
                        </div>
                    </div>

                    {/* Admin Actions */}
                    {userRole === 'admin' && (
                        <div className="flex items-center gap-2 self-start sm:self-center">
                            {!isWorkingNow && onRehireDriver && (
                                <button onClick={() => onRehireDriver(driver)} className={`px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${isDark ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                                    {t('rehireDriverAction', 'Qayta ishga olish')}
                                </button>
                            )}
                            <button onClick={() => onEditDriver?.(driver)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isDark ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-slate-50 text-slate-600 border hover:bg-slate-100'}`}>
                                <EditIcon className="w-4 h-4" />
                            </button>
                            <button onClick={() => { if (window.confirm(t('confirmDeleteDriver', "Rostdan ham bu haydovchini o'chirmoqchimisiz?"))) { onDeleteDriver?.(driver.id); navigate('/drivers'); } }} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isDark ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100'}`}>
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>

                {balanceCard && (
                    <div className={`p-5 sm:p-6 rounded-2xl border shadow-sm flex flex-col justify-center min-h-[124px] ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/60'}`}>
                        <p className={`text-[13px] font-medium ${muted}`}>{balanceCard.label}</p>
                        <p className={`mt-2 text-3xl font-semibold tracking-tight ${balanceCard.value < 0 ? 'text-red-500' : txt}`}>
                            {fmt(balanceCard.value)}
                        </p>
                    </div>
                )}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)] gap-5">
                
                {/* Left Column: Activity & Car */}
                <div className="space-y-4">
                    <div className={`rounded-2xl border shadow-sm overflow-hidden ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/60'}`}>
                        <div className={`px-4 py-3 border-b text-[13px] font-medium ${isDark ? 'border-white/10' : 'border-slate-100'} ${muted}`}>
                            {t('activityAndCar', 'Faoliyat va Avtomobil')}
                        </div>
                        
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                                    <CarIcon className="w-5 h-5 opacity-60" />
                                </div>
                                <div>
                                    {isWorkingNow && car ? (
                                        <>
                                            <p className={`text-[14px] font-medium ${txt}`}>{car.name}</p>
                                            <p className={`text-[12px] mt-0.5 ${muted}`}>{car.licensePlate}</p>
                                        </>
                                    ) : (
                                        <>
                                            <p className={`text-[14px] font-medium ${txt}`}>{t('carNotAssigned', 'Avtomobil yo‘q')}</p>
                                            <p className={`text-[12px] mt-0.5 ${muted}`}>{t('noCarSubtitle', 'Biriktirilmagan')}</p>
                                        </>
                                    )}
                                </div>
                            </div>
                            {isWorkingNow && userRole === 'admin' && onQuickAssign && (
                                <button onClick={() => setAssignOpen(true)} className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                                    {car ? t('quickAssignChange', 'Almashtirish') : t('assignCar', 'Biriktirish')}
                                </button>
                            )}
                        </div>
                        
                        <div className={`h-px mx-4 ${isDark ? 'bg-white/10' : 'bg-slate-100'}`} />

                        <div className="p-4 flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                                <span className="text-lg opacity-80">📅</span>
                            </div>
                            <div>
                                <p className={`text-[14px] font-medium ${txt}`}>
                                    {driver.startDate || driver.createdAt ? new Date(driver.startDate || driver.createdAt).toLocaleDateString('ru-RU') : t('unknown', "Noma'lum")}
                                    {driver.quitDate ? ` - ${new Date(driver.quitDate).toLocaleDateString('ru-RU')}` : ` - ${t('nowWorking', 'Hozir')}`}
                                </p>
                                <p className={`text-[12px] mt-0.5 ${muted}`}>
                                    {(() => {
                                        const start = driver.startDate || driver.createdAt || Date.now();
                                        const end = driver.quitDate || Date.now();
                                        const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24));
                                        if (diffDays <= 0) return `0 ${t('daysCount', 'kun')}`;
                                        const years = Math.floor(diffDays / 365);
                                        const months = Math.floor((diffDays % 365) / 30);
                                        return years > 0 ? `${years} yil ${months} oy` : `${months} oy ${diffDays % 30} kun`;
                                    })()}
                                </p>
                            </div>
                        </div>

                        <div className={`px-4 py-3 bg-opacity-50 border-t flex gap-2 ${isDark ? 'border-white/10 bg-black/20' : 'border-slate-100 bg-slate-50'}`}>
                            {dt === 'deposit' && userRole !== 'viewer' && onOpenDepositTopup && (
                                <button onClick={() => onOpenDepositTopup(driver.id)} className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-all ${isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white border text-slate-700 shadow-sm hover:bg-slate-50'}`}>
                                    + {t('topupDepositBtn', "Depozit to'ldirish")}
                                </button>
                            )}
                            <button onClick={() => setShowHistory(true)} className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-all ${isDark ? 'bg-teal-500/20 text-teal-400 hover:bg-teal-500/30' : 'bg-teal-50 text-teal-700 hover:bg-teal-100'}`}>
                                {t('financialHistory', 'Moliya tarixi')} &rarr;
                            </button>
                        </div>
                    </div>

                    {(driver as any).notes && (
                        <div className={`rounded-2xl border shadow-sm overflow-hidden ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/60'}`}>
                            <div className={`px-4 py-3 border-b text-[13px] font-medium ${isDark ? 'border-white/10' : 'border-slate-100'} ${muted}`}>
                                {t('notes', 'Izohlar')}
                            </div>
                            <div className="p-4">
                                <p className={`text-[14px] leading-relaxed whitespace-pre-wrap ${txt}`}>{(driver as any).notes}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Documents */}
                <div className="space-y-4">
                    <div className={`rounded-2xl border shadow-sm overflow-hidden ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/60'}`}>
                        <div className={`px-4 py-3 border-b text-[13px] font-medium ${isDark ? 'border-white/10' : 'border-slate-100'} ${muted}`}>
                            {t('documents', 'Hujjatlar')}
                        </div>

                        {/* License Reminder Row */}
                        <div className={`p-4 flex items-center justify-between transition-all ${userRole === 'admin' ? 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5' : ''}`} onClick={openLicenseModal}>
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${driverLicenseStatus === 'missing' ? (isDark ? 'bg-white/5' : 'bg-slate-100') : (isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600')}`}>
                                    <span className="text-lg opacity-80">🪪</span>
                                </div>
                                <div>
                                    <p className={`text-[14px] font-medium ${txt}`}>{t('driverLicenseCardTitle', 'Ishonchnoma')}</p>
                                    <p className={`text-[12px] mt-0.5 ${driverLicenseStatus === 'missing' ? muted : (isDark ? 'text-emerald-400/80' : 'text-emerald-600')}`}>
                                        {driverLicenseStatus === 'missing' ? t('driverLicenseReminderMissing', 'Eslatma yo‘q') : formatDriverDocDate(driverLicenseReminderAt)}
                                    </p>
                                </div>
                            </div>
                            {userRole === 'admin' && <ChevronLeftIcon className={`w-4 h-4 rotate-180 opacity-40 ${txt}`} />}
                        </div>

                        {groupedDocs.length > 0 && <div className={`h-px mx-4 ${isDark ? 'bg-white/10' : 'bg-slate-100'}`} />}

                        {/* Other Documents */}
                        {groupedDocs.length > 0 && (
                            <div className="p-4 space-y-3">
                                {groupedDocs.map(group => (
                                    <div
                                        key={group.key}
                                        className={`rounded-2xl border p-3.5 ${
                                            isDark ? 'border-white/[0.08] bg-white/[0.03]' : 'border-slate-200 bg-slate-50/70'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-3 mb-3">
                                            <p className={`text-[14px] font-black ${txt}`}>{group.title}</p>
                                            <span className={`text-[11px] font-bold ${muted}`}>
                                                {group.docs.length} {t('driverModalFileCount', 'fayl')}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                                            {group.docs.map((doc, idx) => {
                                                const isImage = isImageDocument(doc);
                                                const isPdf = isPdfDocument(doc);
                                                const fileNumber = idx + 1;
                                                const openDocument = () => {
                                                    if (isPdf) {
                                                        openDocumentInNewTab(doc.data);
                                                        return;
                                                    }
                                                    setViewingDoc({ name: doc.name || group.title, data: doc.data, type: doc.type });
                                                };

                                                return (
                                                    <div key={`${doc.name || group.key}-${idx}`} className="relative group">
                                                        <button
                                                            type="button"
                                                            onClick={openDocument}
                                                            className={`relative w-full aspect-square overflow-hidden rounded-2xl border flex items-center justify-center ${
                                                                isDark ? 'border-white/[0.10] bg-black/15' : 'border-slate-200 bg-white'
                                                            }`}
                                                            title={doc.name || group.title}
                                                            aria-label={`${t('view', "Ko'rish")}: ${doc.name || group.title}`}
                                                        >
                                                            {isImage ? (
                                                                <img src={doc.data} alt={doc.name || group.title} className="absolute inset-0 w-full h-full object-cover" />
                                                            ) : isPdf ? (
                                                                <div className="flex flex-col items-center gap-1.5 pt-2 text-rose-500">
                                                                    <FilePdfIcon className="w-8 h-8" />
                                                                    <span className="text-[10px] font-black tracking-wider">PDF</span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col items-center gap-1.5 px-2 pt-2 text-slate-500">
                                                                    <FilePdfIcon className="w-8 h-8" />
                                                                    <span className="max-w-full truncate text-[10px] font-black tracking-wider">{doc.type?.split('/')[1]?.toUpperCase() || 'FILE'}</span>
                                                                </div>
                                                            )}
                                                            <span className="absolute left-1.5 top-1.5 min-w-6 h-6 px-1 rounded-full bg-black/70 text-white text-[11px] font-black flex items-center justify-center">
                                                                {fileNumber}
                                                            </span>
                                                            <span className="absolute right-1.5 bottom-1.5 w-7 h-7 rounded-full bg-black/65 text-white flex items-center justify-center opacity-90 group-hover:scale-105 transition-transform">
                                                                <EyeIcon className="w-3.5 h-3.5" />
                                                            </span>
                                                        </button>
                                                        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={openDocument}
                                                                className={`h-8 rounded-xl flex items-center justify-center transition-all active:scale-[0.97] ${
                                                                    isDark ? 'bg-white/[0.06] text-white/75 hover:bg-white/[0.1]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                                }`}
                                                                aria-label={`${t('view', "Ko'rish")}: ${doc.name || group.title}`}
                                                                title={t('view', "Ko'rish")}
                                                            >
                                                                <EyeIcon className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => forceDownload(doc.data, doc.name || group.title)}
                                                                className={`h-8 rounded-xl flex items-center justify-center transition-all active:scale-[0.97] ${
                                                                    isDark ? 'bg-teal-500/15 text-teal-200 hover:bg-teal-500/25' : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
                                                                }`}
                                                                aria-label={`${t('download', 'Yuklab olish')}: ${doc.name || group.title}`}
                                                                title={t('download', 'Yuklab olish')}
                                                            >
                                                                <DownloadIcon className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!docsLoading && groupedDocs.length === 0 && (
                            <div className={`p-4 text-center border-t ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                                <p className={`text-[12px] ${muted}`}>{t('noDocuments', 'Boshqa hujjatlar yo‘q')}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals remain structurally the same */}
            {viewingDoc && !isPdfDocument(viewingDoc) && typeof document !== 'undefined' && createPortal(
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={t('viewDocument', "Hujjatni ko'rish")}
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md"
                    onMouseDown={() => setViewingDoc(null)}
                >
                    <div
                        className={`relative w-full max-w-[920px] h-[min(820px,calc(100dvh-32px))] sm:h-[min(860px,calc(100dvh-48px))] rounded-[28px] overflow-hidden shadow-2xl flex flex-col border ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'}`}
                        onMouseDown={e => e.stopPropagation()}
                    >
                        <div className={`flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4 border-b ${isDark ? 'border-white/10 bg-[#111827]' : 'border-slate-200 bg-white'}`}>
                            <div className="min-w-0">
                                <h3 className={`font-bold text-[16px] leading-tight ${txt}`}>{t('viewDocument', "Hujjatni ko'rish")}</h3>
                                <p className={`mt-0.5 text-[12px] truncate ${muted}`}>{viewingDoc.name || t('file', 'Fayl')}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {previewUrl && (
                                    <button
                                        type="button"
                                        onClick={() => window.open(previewUrl, '_blank', 'noopener,noreferrer')}
                                        className={`hidden sm:flex h-10 px-3 items-center justify-center rounded-[16px] border text-[12px] font-bold transition-colors ${isDark ? 'border-white/10 text-white/75 hover:bg-white/10' : 'border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100'}`}
                                    >
                                        {t('open', 'Ochish')}
                                    </button>
                                )}
                                <button onClick={() => forceDownload(viewingDoc.data, viewingDoc.name)} className="h-10 px-3 sm:px-4 flex items-center justify-center gap-2 rounded-[16px] bg-[#0f766e] text-white text-[12px] font-bold hover:bg-[#0b665f] transition-colors">
                                    <DownloadIcon className="w-4 h-4" />
                                    <span className="hidden sm:inline">{t('download', 'Yuklab olish')}</span>
                                </button>
                                <button onClick={() => setViewingDoc(null)} className={`w-10 h-10 flex items-center justify-center rounded-[16px] border transition-colors ${isDark ? 'border-white/10 text-white/70 hover:bg-white/20' : 'border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100'}`} aria-label={t('close', 'Yopish')}><XIcon className="w-5 h-5" /></button>
                            </div>
                        </div>
                        <div className={`flex-1 min-h-0 p-3 sm:p-5 overflow-auto flex items-center justify-center ${isDark ? 'bg-black/40' : 'bg-slate-50'}`}>
                            {isViewingImage ? (
                                <img src={viewingDoc.data} alt={viewingDoc.name} className="max-w-full max-h-full rounded-[20px] shadow-xl object-contain" />
                            ) : (
                                <div className={`w-full max-w-sm rounded-[24px] border p-6 text-center ${isDark ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'}`}>
                                    <FilePdfIcon className={`mx-auto mb-3 w-12 h-12 ${isDark ? 'text-white/50' : 'text-slate-400'}`} />
                                    <p className={`text-[15px] font-black ${txt}`}>{viewingDoc.name || t('file', 'Fayl')}</p>
                                    <p className={`mt-1 text-[12px] ${muted}`}>{t('documentPreviewUnavailable', "Bu faylni brauzerda ko'rib bo'lmadi. Yuklab oling yoki alohida oynada oching.")}</p>
                                    {previewUrl && (
                                        <button
                                            type="button"
                                            onClick={() => window.open(previewUrl, '_blank', 'noopener,noreferrer')}
                                            className="mt-4 h-10 px-4 rounded-[16px] bg-[#0f766e] text-white text-[12px] font-bold hover:bg-[#0b665f] transition-colors"
                                        >
                                            {t('open', 'Ochish')}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>, document.body
            )}

            {showHistory && <DriverHistoryPage driver={driver} car={car} cars={cars} transactions={transactions} theme={theme} onClose={() => setShowHistory(false)} />}
            {onQuickAssign && <QuickAssignmentModal isOpen={assignOpen} mode="driver" driver={driver} car={car} drivers={drivers} cars={cars} theme={theme} onClose={() => setAssignOpen(false)} onSave={onQuickAssign} />}
            {licenseModalOpen && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[330] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm" onMouseDown={() => setLicenseModalOpen(false)}>
                    <div className={`w-full max-w-md rounded-[32px] border shadow-2xl overflow-hidden ${isDark ? 'bg-[#151f32] border-white/10' : 'bg-white border-slate-200'}`} onMouseDown={e => e.stopPropagation()}>
                        <div className={`px-6 py-5 border-b ${isDark ? 'border-white/5' : 'border-slate-100'} flex items-start justify-between gap-4`}>
                            <div>
                                <h2 className={`text-[20px] font-black ${txt}`}>{t('driverLicenseReminderTitle', 'Ishonchnoma eslatmasi')}</h2>
                                <p className={`mt-1 text-[13px] ${muted}`}>{t('driverLicenseReminderSubtitle', 'Eslatma kunini tanlang.')}</p>
                            </div>
                            <button onClick={() => setLicenseModalOpen(false)} className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isDark ? 'bg-white/5 text-white/70 hover:bg-white/10' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}><XIcon className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <DatePicker label={t('driverLicenseReminderDate', 'Eslatma kuni')} value={licenseReminderDateDraft} onChange={(d: Date | null) => setLicenseReminderDateDraft(d)} placeholder={t('driverLicenseReminderDatePlaceholder', 'Kunni tanlang')} isClearable theme={theme} />
                            {licenseError && <p className="text-sm font-bold text-red-500">{licenseError}</p>}
                        </div>
                        <div className={`px-6 py-5 border-t ${isDark ? 'border-white/5 bg-black/20' : 'border-slate-100 bg-slate-50'} flex justify-between gap-3`}>
                            <button onClick={() => setLicenseReminderDateDraft(null)} className={`px-4 py-2.5 rounded-xl text-[13px] font-bold ${isDark ? 'text-white/70 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-200'}`}>{t('clear', 'Tozalash')}</button>
                            <div className="flex gap-3">
                                <button onClick={() => setLicenseModalOpen(false)} className={`px-4 py-2.5 rounded-xl text-[13px] font-bold ${isDark ? 'text-white/70 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-200'}`}>{t('cancel', 'Bekor qilish')}</button>
                                <button disabled={licenseSaving} onClick={saveIshonchnomaReminder} className="px-6 py-2.5 rounded-xl text-[13px] font-black bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">{licenseSaving ? t('saving', 'Saqlanmoqda...') : t('save', 'Saqlash')}</button>
                            </div>
                        </div>
                    </div>
                </div>, document.body
            )}
        </div>
    );

};
