import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../supabase';
import { Driver } from '../../core/types';
import { Car } from '../../core/types/car.types';
import { PaymentStatus, Transaction, TransactionType } from '../../core/types/transaction.types';
import { calcDriverFinance, type MonthlyBreakdown } from './utils/debtUtils';
import { getDriverWorkPeriods, getEffectivePlanForDriverDay } from './utils/driverPlanHistory';
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
    ChevronLeftIcon, EditIcon, TrashIcon, CarIcon, EyeIcon, DownloadIcon, XIcon
} from '../../../components/Icons';
import DatePicker from '../../../components/DatePicker';
import QuickAssignmentModal from '../../../components/QuickAssignmentModal';

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
const toMonthKey = (ts: number | Date) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const toDateKey = (ts: number | Date) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const isDepositTopupTx = (tx: Transaction) => tx.type === TransactionType.INCOME && tx.category === 'deposit_topup';
const isPlanIncomeTx = (tx: Transaction) => tx.type === TransactionType.INCOME && !isDepositTopupTx(tx);
const sumAbsTx = (txs: Transaction[]) => txs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

interface ProfileMoneySummary {
    target: number;
    paid: number;
    debt: number;
    excess: number;
    nonPlanIncome: number;
    depositTopup: number;
    depositUsed: number;
    depositBalance: number;
    salaryPaid: number;
    salaryDeductions: number;
    salaryPayable: number;
}

function buildProfileMoneySummary(
    driver: Driver,
    car: Car | null,
    transactions: Transaction[],
    financeMonth: MonthlyBreakdown | undefined,
    depositBalance: number
): ProfileMoneySummary {
    const now = new Date();
    const mk = toMonthKey(now);
    const monthTxs = transactions.filter(tx =>
        tx.driverId === driver.id &&
        tx.status !== PaymentStatus.DELETED &&
        toMonthKey(tx.timestamp) === mk
    );
    const txByDay = new Map<string, Transaction[]>();
    for (const tx of monthTxs) {
        const key = toDateKey(tx.timestamp);
        if (!txByDay.has(key)) txByDay.set(key, []);
        txByDay.get(key)!.push(tx);
    }

    let target = 0;
    const year = now.getFullYear();
    const month = now.getMonth();
    for (let day = 1; day <= now.getDate(); day += 1) {
        const date = new Date(year, month, day);
        const dayTxs = txByDay.get(toDateKey(date)) ?? [];
        const isOffDay = dayTxs.some(tx => tx.type === TransactionType.DAY_OFF || tx.type === TransactionType.NOT_WORKING);
        if (!isOffDay) target += getEffectivePlanForDriverDay(driver, date, car);
    }

    const paid = sumAbsTx(monthTxs.filter(isPlanIncomeTx));
    const debt = target > 0 ? Math.max(0, target - paid) : 0;
    const excess = target > 0 ? Math.max(0, paid - target) : 0;
    const nonPlanIncome = target === 0 ? paid : 0;
    const depositTopup = sumAbsTx(monthTxs.filter(isDepositTopupTx));
    const depositUsed = sumAbsTx(monthTxs.filter(tx => tx.useDeposit === true && !isDepositTopupTx(tx)));
    const salaryPaid = sumAbsTx(monthTxs.filter(tx => tx.category === 'salary_payment'));
    const salaryDeductions = (financeMonth?.shortfall ?? debt) + (financeMonth?.expenses ?? 0) + (financeMonth?.debts ?? 0) + (financeMonth?.salaryAdvance ?? 0);

    return {
        target,
        paid,
        debt,
        excess,
        nonPlanIncome,
        depositTopup,
        depositUsed,
        depositBalance,
        salaryPaid,
        salaryDeductions,
        salaryPayable: financeMonth?.netSalary ?? Math.max(0, (driver.monthlySalary ?? 0) - salaryDeductions),
    };
}

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
    const [viewingDoc, setViewingDoc] = useState<{ name: string; data: string } | null>(null);
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
                <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('driverNotFound', 'Haydovchi topilmadi')}</p>
                <button onClick={() => navigate('/drivers')} className="mt-4 px-4 py-2 bg-teal-500 text-white rounded-xl">{t('goBack', 'Ortga qaytish')}</button>
            </div>
        );
    }

    const dt = driver.driverType ?? 'deposit';
    const remaining = finance?.remainingDeposit ?? 0;
    const initial = finance?.depositAmount ?? driver.depositAmount ?? 0;
    const depositPct = initial > 0 ? Math.max(0, Math.min(100, (remaining / initial) * 100)) : 0;
    const isLow = dt === 'deposit' && remaining <= (driver.depositWarningThreshold ?? 1_000_000);
    const isWorkingNow = isDriverCurrentlyWorking(driver);

    const bg = isDark ? 'bg-[#151f32] border-white/5' : 'bg-white border-slate-200/60';
    const txt = isDark ? 'text-white' : 'text-slate-900';
    const muted = isDark ? 'text-slate-400' : 'text-slate-500';
    
    const groupedDocs = groupDriverDocuments(docs.filter((doc: any) => Boolean(doc.data)), t);
    const driverLicenseDoc = docs.find((doc: any) => doc.category === 'driver_license' && getIshonchnomaReminderMs(doc) !== null);
    const driverLicenseReminderAt = getIshonchnomaReminderMs(driverLicenseDoc);
    const todayStartMs = startOfDayMs(Date.now());
    
    const driverLicenseStatus = driverLicenseReminderAt === null
        ? 'missing'
        : todayStartMs >= startOfDayMs(driverLicenseReminderAt)
            ? 'warning'
            : 'valid';

    const formatDriverDocDate = (ms: number | null) => ms
        ? new Intl.DateTimeFormat(t('localeCode', 'uz-UZ'), { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(ms))
        : t('notSpecified', 'Kiritilmagan');

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

    const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const currentFinanceMonth = finance?.months.find(month => month.monthKey === currentMonthKey);
    const currentMoneySummary = buildProfileMoneySummary(driver, car, transactions, currentFinanceMonth, remaining);

    const profileMoneyCards = dt === 'salary'
        ? [
            {
                label: t('monthlySalary', 'Oylik maosh'),
                value: fmt(driver.monthlySalary ?? 0),
            },
            {
                label: t('salaryDeductions', 'Avans / ushlab qolish'),
                value: fmt(currentMoneySummary.salaryDeductions),
            },
            {
                label: t('salaryPayable', "To'lanadigan qoldiq"),
                value: fmt(currentMoneySummary.salaryPayable),
            },
        ]
        : [
            {
                label: t('totalExpectedPlan', 'Jami reja'),
                value: fmt(currentMoneySummary.target),
            },
            {
                label: t('paidTowardPlan', "Rejaga to'langan"),
                value: fmt(currentMoneySummary.paid),
            },
            {
                label: currentMoneySummary.target === 0 && currentMoneySummary.paid > 0
                    ? t('nonPlanIncome', 'Rejadan tashqari tushum')
                    : currentMoneySummary.debt > 0
                        ? t('debt', 'Qarz')
                        : currentMoneySummary.excess > 0
                            ? t('excess', 'Ortiqcha')
                            : t('debtOrExcess', 'Qarz / Ortiqcha'),
                value: currentMoneySummary.target === 0 && currentMoneySummary.paid > 0
                    ? fmt(currentMoneySummary.nonPlanIncome)
                    : currentMoneySummary.debt > 0
                        ? `-${fmt(currentMoneySummary.debt)}`
                        : currentMoneySummary.excess > 0
                            ? `+${fmt(currentMoneySummary.excess)}`
                            : fmt(0),
                isDebt: currentMoneySummary.debt > 0,
                isExcess: currentMoneySummary.excess > 0 || currentMoneySummary.nonPlanIncome > 0,
            },
            {
                label: dt === 'lease_to_own' ? t('contractRemaining', "Shartnoma qoldig'i") : t('depositBalance', "Depozit qoldig'i"),
                value: fmt(dt === 'lease_to_own' ? finance?.contractRemaining ?? 0 : currentMoneySummary.depositBalance),
            },
        ];

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
        <div className="max-w-3xl mx-auto space-y-6 pb-16 px-4 sm:px-6 mt-8 sm:mt-12">
            
            {/* Header (Avatar & Name) */}
            <div className="flex flex-col items-center text-center">
                <DriverAvatar
                    src={driver.avatar}
                    name={driver.name}
                    size={100}
                    theme={theme}
                    rounded="full"
                    className="shadow-sm"
                />
                <div className="mt-4 flex items-center gap-2">
                    <h1 className={`text-2xl font-bold tracking-tight ${txt}`}>{driver.name}</h1>
                    {isWorkingNow ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" title={t('active', 'Faol')} />
                    ) : (
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-400" title={t('inactive', 'Nofaol')} />
                    )}
                </div>
                <p className={`text-[15px] font-medium mt-1 ${muted}`}>
                    {driver.phone} {driver.telegram && `• ✈ ${driver.telegram}`}
                </p>

                {/* Admin Actions */}
                {userRole === 'admin' && (
                    <div className="flex items-center justify-center gap-2 mt-5">
                        {!isWorkingNow && onRehireDriver && (
                            <button onClick={() => onRehireDriver(driver)} className={`px-4 py-2 rounded-full text-[13px] font-bold transition-all active:scale-95 ${isDark ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                                {t('rehireDriverAction', 'Qayta ishga olish')}
                            </button>
                        )}
                        <button onClick={() => onEditDriver?.(driver)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 ${isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                            <EditIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => { if (window.confirm(t('confirmDeleteDriver', "Rostdan ham bu haydovchini o'chirmoqchimisiz?"))) { onDeleteDriver?.(driver.id); navigate('/drivers'); } }} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 ${isDark ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Financial Overview (4 Stats) */}
            <div className="grid grid-cols-2 gap-3 mt-8">
                {profileMoneyCards.map((card, idx) => (
                    <div key={idx} className={`rounded-2xl p-4 sm:p-5 flex flex-col justify-center border ${isDark ? 'bg-[#1C1C1E] border-white/5' : 'bg-white border-black/5 shadow-sm'}`}>
                        <p className={`text-[11px] font-semibold uppercase tracking-wider mb-1 ${muted}`}>{card.label}</p>
                        <p className={`text-[18px] sm:text-[22px] font-bold tracking-tight ${
                            'isDebt' in card && card.isDebt ? 'text-red-500' : 
                            'isExcess' in card && card.isExcess ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : 
                            txt
                        }`}>
                            {card.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Main Details Group */}
            <div className="mt-8">
                <h2 className={`ml-4 mb-2 text-[12px] font-bold uppercase tracking-widest ${muted}`}>{t('activityAndCar', 'Faoliyat va Avtomobil')}</h2>
                <div className={`rounded-2xl overflow-hidden border ${isDark ? 'bg-[#1C1C1E] border-white/5' : 'bg-white border-black/5 shadow-sm'}`}>
                    
                    {/* Assigned Car Row */}
                    <div className={`p-4 flex items-center justify-between`}>
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-black/30' : 'bg-slate-100'}`}>
                                {isWorkingNow && car?.avatar ? (
                                    <img src={car.avatar} alt={car.name} className="w-full h-full object-cover rounded-xl" />
                                ) : (
                                    <CarIcon className={`w-6 h-6 ${isDark ? 'text-white/20' : 'text-slate-400'}`} />
                                )}
                            </div>
                            <div>
                                {isWorkingNow && car ? (
                                    <>
                                        <p className={`text-[15px] font-bold ${txt}`}>{car.name}</p>
                                        <div className="mt-1"><LicensePlate plate={car.licensePlate} size="sm" /></div>
                                    </>
                                ) : (
                                    <>
                                        <p className={`text-[15px] font-bold ${txt}`}>{t('carNotAssigned', 'Avtomobil yo‘q')}</p>
                                        <p className={`text-[13px] ${muted}`}>{t('noCarSubtitle', 'Biriktirilmagan')}</p>
                                    </>
                                )}
                            </div>
                        </div>
                        {isWorkingNow && userRole === 'admin' && onQuickAssign && (
                            <button onClick={() => setAssignOpen(true)} className={`px-4 py-2 rounded-full text-[13px] font-bold transition-all active:scale-95 ${isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                                {car ? t('quickAssignChange', 'Almashtirish') : t('assignCar', 'Biriktirish')}
                            </button>
                        )}
                    </div>
                    
                    <div className={`h-px ml-16 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`} />

                    {/* Work Period Row */}
                    <div className={`p-4 flex items-center justify-between`}>
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-black/30' : 'bg-slate-100'}`}>
                                <span className="text-xl">📅</span>
                            </div>
                            <div>
                                <p className={`text-[15px] font-bold ${txt}`}>
                                    {driver.startDate || driver.createdAt ? new Date(driver.startDate || driver.createdAt).toLocaleDateString('ru-RU') : t('unknown', "Noma'lum")}
                                    {driver.quitDate ? ` - ${new Date(driver.quitDate).toLocaleDateString('ru-RU')}` : ` - ${t('nowWorking', 'Hozir')}`}
                                </p>
                                <p className={`text-[13px] ${muted}`}>
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
                    </div>
                    
                    {/* Topup / History Row */}
                    <div className={`h-px ml-16 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`} />
                    <div className={`p-2 flex flex-col sm:flex-row gap-2 ${isDark ? 'bg-black/20' : 'bg-slate-50'}`}>
                        {dt === 'deposit' && userRole !== 'viewer' && onOpenDepositTopup && (
                            <button onClick={() => onOpenDepositTopup(driver.id)} className={`flex-1 py-3 rounded-xl text-[13px] font-bold transition-all active:scale-95 ${isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'}`}>
                                + {t('topupDepositBtn', "Depozit to'ldirish")}
                            </button>
                        )}
                        <button onClick={() => setShowHistory(true)} className={`flex-1 py-3 rounded-xl text-[13px] font-bold transition-all active:scale-95 ${isDark ? 'bg-teal-500/20 text-teal-400 hover:bg-teal-500/30' : 'bg-teal-50 text-teal-700 hover:bg-teal-100'}`}>
                            {t('financialHistory', 'Moliya tarixi')} &rarr;
                        </button>
                    </div>

                </div>
            </div>

            {/* Documents Group */}
            <div className="mt-8">
                <h2 className={`ml-4 mb-2 text-[12px] font-bold uppercase tracking-widest ${muted}`}>{t('documents', 'Hujjatlar')}</h2>
                <div className={`rounded-2xl overflow-hidden border ${isDark ? 'bg-[#1C1C1E] border-white/5' : 'bg-white border-black/5 shadow-sm'}`}>
                    
                    {/* License Reminder Row */}
                    <div className={`p-4 flex items-center justify-between transition-all ${userRole === 'admin' ? 'cursor-pointer active:bg-black/5 dark:active:bg-white/5' : ''}`} onClick={openLicenseModal}>
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${driverLicenseStatus === 'missing' ? (isDark ? 'bg-black/30' : 'bg-slate-100') : (isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600')}`}>
                                <span className="text-xl">🪪</span>
                            </div>
                            <div>
                                <p className={`text-[15px] font-bold ${txt}`}>{t('driverLicenseCardTitle', 'Ishonchnoma')}</p>
                                <p className={`text-[13px] ${driverLicenseStatus === 'missing' ? muted : (isDark ? 'text-emerald-400/80' : 'text-emerald-600')}`}>
                                    {driverLicenseStatus === 'missing' ? t('driverLicenseReminderMissing', 'Eslatma yo‘q') : formatDriverDocDate(driverLicenseReminderAt)}
                                </p>
                            </div>
                        </div>
                        {userRole === 'admin' && <ChevronLeftIcon className={`w-4 h-4 rotate-180 opacity-40 ${txt}`} />}
                    </div>

                    {groupedDocs.length > 0 && <div className={`h-px ml-16 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`} />}

                    {/* Other Documents */}
                    {groupedDocs.map((group, idx) => (
                        <React.Fragment key={group.key}>
                            {idx > 0 && <div className={`h-px ml-16 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`} />}
                            <div className={`p-4 flex items-center justify-between`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-black/30' : 'bg-slate-100'}`}>
                                        <span className="text-xl opacity-70">📁</span>
                                    </div>
                                    <div>
                                        <p className={`text-[15px] font-bold ${txt}`}>{group.title}</p>
                                        <p className={`text-[13px] ${muted}`}>{group.docs.length} {t('driverModalFileCount', 'fayl')}</p>
                                    </div>
                                </div>
                                <button onClick={() => {
                                    const doc = group.docs[0];
                                    if (doc.type?.startsWith('image/')) setViewingDoc({ name: doc.name, data: doc.data });
                                    else window.open(doc.data, '_blank');
                                }} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 ${isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                                    <EyeIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </React.Fragment>
                    ))}

                    {!docsLoading && groupedDocs.length === 0 && (
                        <div className={`p-4 text-center border-t ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                            <p className={`text-[13px] font-medium ${muted}`}>{t('noDocuments', 'Boshqa hujjatlar yo‘q')}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Notes Section */}
            {(driver as any).notes && (
                <div className="mt-8">
                    <h2 className={`ml-4 mb-2 text-[12px] font-bold uppercase tracking-widest ${muted}`}>{t('notes', 'Izohlar')}</h2>
                    <div className={`rounded-2xl p-5 border ${isDark ? 'bg-[#1C1C1E] border-white/5' : 'bg-white border-black/5 shadow-sm'}`}>
                        <p className={`text-[14px] leading-relaxed whitespace-pre-wrap font-medium ${txt}`}>{(driver as any).notes}</p>
                    </div>
                </div>
            )}

            {/* Modals remain structurally the same */}
            {viewingDoc && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm" onClick={() => setViewingDoc(null)}>
                    <div className={`relative w-full max-w-[760px] max-h-[calc(100dvh-32px)] sm:max-h-[calc(100dvh-48px)] rounded-[32px] overflow-hidden shadow-2xl flex flex-col ${isDark ? 'bg-[#151a23] border border-white/10' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
                        <div className={`flex items-center justify-between gap-3 p-5 ${isDark ? 'bg-[#151a23]' : 'bg-white'}`}>
                            <div className="min-w-0">
                                <h3 className={`font-bold text-[16px] leading-tight ${txt}`}>{t('viewDocument', "Hujjatni ko'rish")}</h3>
                                <p className={`text-[12px] truncate ${muted}`}>{viewingDoc.name || t('file', 'Fayl')}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button onClick={() => forceDownload(viewingDoc.data, viewingDoc.name)} className={`w-10 h-10 flex items-center justify-center rounded-[16px] border transition-colors ${isDark ? 'border-white/10 text-white/70 hover:bg-white/20' : 'border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100'}`}><DownloadIcon className="w-4 h-4" /></button>
                                <button onClick={() => setViewingDoc(null)} className={`w-10 h-10 flex items-center justify-center rounded-[16px] border transition-colors ${isDark ? 'border-white/10 text-white/70 hover:bg-white/20' : 'border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100'}`}><XIcon className="w-5 h-5" /></button>
                            </div>
                        </div>
                        <div className={`flex-1 min-h-0 p-6 overflow-auto flex items-center justify-center ${isDark ? 'bg-black/40' : 'bg-slate-50'}`}>
                            <img src={viewingDoc.data} alt={viewingDoc.name} className="w-full max-w-[620px] rounded-2xl shadow-sm object-contain max-h-[calc(100dvh-200px)]" />
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
