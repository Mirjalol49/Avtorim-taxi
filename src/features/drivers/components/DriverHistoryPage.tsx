'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import Lottie from 'lottie-react';
import restAnimation from '../../../../Images/rest.json';
import planDoneAnimation from '../../../../Images/plan_done.json';
import repairSticker from '../../../../Images/sticker.webm';
import { Driver } from '../../../core/types';
import type { DriverPaymentType } from '../../../core/types/driver.types';
import { Car } from '../../../core/types/car.types';
import { PaymentStatus, Transaction, TransactionType } from '../../../core/types/transaction.types';
import { LicensePlate } from '../../../components/ui/LicensePlate';
import { calcDriverFinance } from '../utils/debtUtils';
import {
    getDriverDayOverrideType,
    getDriverWorkPeriodForDate,
    getDriverWorkPeriods,
    getEffectivePlanForDriverDay,
    resolveTransactionCarSnapshot,
} from '../utils/driverPlanHistory';
import type { DriverWorkPeriod, TransactionCarSnapshot } from '../utils/driverPlanHistory';

interface Props {
    driver: Driver;
    car: Car | null;
    cars: Car[];
    transactions: Transaction[];
    theme: 'light' | 'dark';
    onClose: () => void;
}

type DayStatus = 'PAID' | 'PARTIAL' | 'DEBT' | 'EXTRA' | 'DAY_OFF' | 'NOT_WORKING' | 'NO_PLAN';

interface DepositLedgerRow {
    tx: Transaction;
    prevBal: number;
    newBal: number;
}

interface DailyHistory {
    dateKey: string;
    timestamp: number;
    dateObj: Date;
    expectedPlan: number;
    paidAmount: number;
    expenseAmount: number;
    explicitDebtAmount: number;
    dailyDebt: number;
    excessAmount: number;
    extraIncome: number;
    overrideType?: string;
    isDayOff: boolean;
    isNotWorking: boolean;
    status: DayStatus;
    carSnapshots: TransactionCarSnapshot[];
    transactions: Transaction[];
    workPeriodId?: string | null;
}

interface CalendarDay {
    date: Date;
    dateKey: string;
    history: DailyHistory;
    deposits: DepositLedgerRow[];
    salaryTxs: Transaction[];
}

interface WorkPeriodSummary extends DriverWorkPeriod {
    totalPaid: number;
    totalExpected: number;
    totalDebt: number;
    carName?: string;
    licensePlate?: string;
}

interface SummaryCard {
    label: string;
    value: string;
    title?: string;
    tone: string;
    bg: string;
    icon: React.ReactNode;
    helper?: string;
}

const WEEKDAYS = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

const localeForLanguage = (language?: string) => {
    const lang = (language || 'uz').slice(0, 2);
    if (lang === 'ru') return 'ru-RU';
    if (lang === 'en') return 'en-US';
    return 'uz-Latn-UZ';
};

const capitalize = (value: string) => value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

const dateKey = (date: Date | number) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const monthKey = (date: Date | number) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const dayStart = (date: Date | number) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
};

const dayEnd = (date: Date | number) => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d.getTime();
};

const fmtNumber = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(Math.abs(n)));
const fmt = (n: number) => `${fmtNumber(n)} UZS`;
const fmtSigned = (n: number) => `${n > 0 ? '+' : n < 0 ? '-' : ''}${fmtNumber(n)} UZS`;
const fmtCompact = (n: number) => {
    const abs = Math.abs(Math.round(n));
    if (abs >= 1_000_000) {
        const value = abs / 1_000_000;
        return `${Number.isInteger(value) ? value : value.toFixed(1)} mln`;
    }
    if (abs >= 1_000) return `${Math.round(abs / 1_000)} ming`;
    return fmtNumber(abs);
};

const formatMonthLabel = (key: string, language?: string) => {
    const [year, month] = key.split('-').map(Number);
    if (!year || !month) return key;
    return capitalize(new Intl.DateTimeFormat(localeForLanguage(language), {
        month: 'long',
        year: 'numeric',
    }).format(new Date(year, month - 1, 1)));
};

const formatDayShort = (date: Date, language?: string) => capitalize(new Intl.DateTimeFormat(localeForLanguage(language), {
    month: 'short',
    day: 'numeric',
}).format(date));

const formatFullDate = (date: Date | number, language?: string) => capitalize(new Intl.DateTimeFormat(localeForLanguage(language), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
}).format(new Date(date)));

const fmtTime = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const isDepositTopup = (tx: Transaction) => tx.type === TransactionType.INCOME && tx.category === 'deposit_topup';
const isPlanIncome = (tx: Transaction) => tx.type === TransactionType.INCOME && !isDepositTopup(tx);
const isSalaryPayment = (tx: Transaction) => tx.category === 'salary_payment';
const sumAbs = (txs: Transaction[]) => txs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

const MoneyInline: React.FC<{
    prefix?: React.ReactNode;
    amount: number;
    sign?: '+' | '-' | '';
    className?: string;
}> = ({ prefix, amount, sign = '', className = '' }) => (
    <span className={`inline-flex min-w-0 flex-wrap items-baseline gap-x-1 gap-y-0.5 leading-tight ${className}`}>
        {prefix && <span className="shrink-0">{prefix}</span>}
        <span className="inline-flex shrink-0 items-baseline gap-0.5 whitespace-nowrap">
            <span>{sign}{fmtNumber(amount)}</span>
            <span className="text-[8px] sm:text-[9px] font-black uppercase opacity-70">UZS</span>
        </span>
    </span>
);


const CalendarIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
);

const WalletIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
        <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
        <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z" />
    </svg>
);

const ArrowIcon = ({ direction, className = '' }: { direction: 'up' | 'down'; className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {direction === 'up' ? (
            <>
                <path d="M7 17 17 7" />
                <path d="M9 7h8v8" />
            </>
        ) : (
            <>
                <path d="M7 7l10 10" />
                <path d="M17 9v8H9" />
            </>
        )}
    </svg>
);

const CoinIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <ellipse cx="12" cy="5" rx="7" ry="3" />
        <path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5" />
        <path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
    </svg>
);

const buildDepositLedger = (driver: Driver, depositTxs: Transaction[], initialLabel: string): DepositLedgerRow[] => {
    const txsToProcess = [...depositTxs];
    if ((driver.depositAmount ?? 0) > 0) {
        txsToProcess.push({
            id: 'synthetic_initial_deposit',
            driverId: driver.id,
            driverName: driver.name,
            amount: driver.depositAmount ?? 0,
            type: TransactionType.INCOME,
            category: 'deposit_topup',
            description: initialLabel,
            timestamp: driver.createdAt || driver.startDate || 0,
            status: PaymentStatus.ACTIVE,
        } as Transaction);
    }

    let balance = 0;
    return txsToProcess
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(tx => {
            const prevBal = balance;
            balance = isDepositTopup(tx) ? balance + Math.abs(tx.amount) : balance - Math.abs(tx.amount);
            return { tx, prevBal, newBal: balance };
        });
};

const monthKeysBetween = (startMs: number, endMs: number) => {
    const start = new Date(startMs);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endMs);
    end.setDate(1);
    end.setHours(0, 0, 0, 0);

    const keys: string[] = [];
    while (start.getTime() <= end.getTime()) {
        keys.push(monthKey(start));
        start.setMonth(start.getMonth() + 1);
    }
    return keys;
};

export const DriverHistoryPage: React.FC<Props> = ({ driver, car, cars, transactions, theme, onClose }) => {
    const isDark = theme === 'dark';
    const { t, i18n } = useTranslation();
    const [visible, setVisible] = useState(false);
    const [selectedMonthKey, setSelectedMonthKey] = useState(monthKey(new Date()));
    const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 260);
    };

    useEffect(() => {
        requestAnimationFrame(() => setVisible(true));
        const h = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };
        document.addEventListener('keydown', h);
        return () => document.removeEventListener('keydown', h);
    }, []);

    const allDriverTxs = useMemo(() => (
        transactions
            .filter(tx => tx.driverId === driver.id && tx.status !== PaymentStatus.DELETED)
            .sort((a, b) => b.timestamp - a.timestamp)
    ), [driver.id, transactions]);

    const planTxs = useMemo(() => allDriverTxs.filter(tx => !isDepositTopup(tx)), [allDriverTxs]);
    const depositTxs = useMemo(() => allDriverTxs.filter(tx => isDepositTopup(tx) || tx.useDeposit === true), [allDriverTxs]);
    const salaryTxs = useMemo(() => allDriverTxs.filter(isSalaryPayment), [allDriverTxs]);
    const driverType: DriverPaymentType = driver.driverType ?? 'deposit';

    const finance = useMemo(() => calcDriverFinance(driver, car, allDriverTxs), [driver, car, allDriverTxs]);
    const workPeriods = useMemo(() => getDriverWorkPeriods(driver, car), [driver, car]);

    const txByDate = useMemo(() => {
        const map = new Map<string, Transaction[]>();
        for (const tx of allDriverTxs) {
            const key = dateKey(tx.timestamp);
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(tx);
        }
        return map;
    }, [allDriverTxs]);

    const depositLedger = useMemo(
        () => buildDepositLedger(driver, depositTxs, t('initialDeposit', "Boshlang'ich depozit")),
        [depositTxs, driver, t]
    );

    const depositByDate = useMemo(() => {
        const map = new Map<string, DepositLedgerRow[]>();
        for (const row of depositLedger) {
            const key = dateKey(row.tx.timestamp);
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(row);
        }
        return map;
    }, [depositLedger]);

    const salaryByDate = useMemo(() => {
        const map = new Map<string, Transaction[]>();
        for (const tx of salaryTxs) {
            const key = dateKey(tx.timestamp);
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(tx);
        }
        return map;
    }, [salaryTxs]);

    const monthOptions = useMemo(() => {
        const keys = new Set<string>();
        const today = dayEnd(new Date());
        keys.add(monthKey(new Date()));

        for (const tx of allDriverTxs) keys.add(monthKey(tx.timestamp));
        for (const row of depositLedger) keys.add(monthKey(row.tx.timestamp));
        for (const period of workPeriods) {
            monthKeysBetween(period.startDate, period.endDate ?? today).forEach(key => keys.add(key));
        }

        return Array.from(keys).sort((a, b) => b.localeCompare(a));
    }, [allDriverTxs, depositLedger, workPeriods]);

    useEffect(() => {
        if (!monthOptions.includes(selectedMonthKey)) {
            setSelectedMonthKey(monthOptions[0] || monthKey(new Date()));
            setSelectedDayKey(null);
        }
    }, [monthOptions, selectedMonthKey]);

    const buildDayHistory = (date: Date): DailyHistory => {
        const key = dateKey(date);
        const dayTxs = txByDate.get(key) ?? [];
        const overrideType = getDriverDayOverrideType(driver, date, car);
        const hasDayOffTx = dayTxs.some(tx => tx.type === TransactionType.DAY_OFF);
        const hasNotWorkingTx = dayTxs.some(tx => tx.type === TransactionType.NOT_WORKING);
        const isDayOff = overrideType === 'OFF' || hasDayOffTx;
        const isNotWorking = overrideType === 'NOT_WORKING' || overrideType === 'REPAIR' || hasNotWorkingTx;
        const isFutureQuietDay = dayStart(date) > dayStart(new Date()) && dayTxs.length === 0;
        const expectedPlan = (isDayOff || isNotWorking || isFutureQuietDay)
            ? 0
            : getEffectivePlanForDriverDay(driver, date, car);
        const workPeriod = getDriverWorkPeriodForDate(driver, date, car);
        const paidAmount = sumAbs(dayTxs.filter(isPlanIncome));
        const expenseAmount = sumAbs(dayTxs.filter(tx => tx.type === TransactionType.EXPENSE));
        const explicitDebtAmount = sumAbs(dayTxs.filter(tx => tx.type === TransactionType.DEBT));
        const dailyDebt = expectedPlan > 0 ? Math.max(0, expectedPlan - paidAmount) : 0;
        const excessAmount = expectedPlan > 0 ? Math.max(0, paidAmount - expectedPlan) : 0;
        const extraIncome = expectedPlan <= 0 ? paidAmount : 0;

        let status: DayStatus = 'NO_PLAN';
        if (isDayOff) status = 'DAY_OFF';
        else if (isNotWorking) status = 'NOT_WORKING';
        else if (expectedPlan <= 0 && paidAmount > 0) status = 'EXTRA';
        else if (expectedPlan <= 0) status = 'NO_PLAN';
        else if (paidAmount >= expectedPlan) status = 'PAID';
        else if (paidAmount > 0) status = 'PARTIAL';
        else status = 'DEBT';

        const snapshots = dayTxs
            .map(tx => resolveTransactionCarSnapshot(tx, driver, cars, car))
            .filter((snapshot): snapshot is TransactionCarSnapshot => Boolean(snapshot));

        if (snapshots.length === 0 && (workPeriod?.carId || car)) {
            const snapshot = resolveTransactionCarSnapshot({
                id: `day-${key}`,
                driverId: driver.id,
                driverName: driver.name,
                amount: 0,
                type: TransactionType.INCOME,
                timestamp: date.getTime(),
                description: '',
                status: PaymentStatus.ACTIVE,
            } as Transaction, driver, cars, car);
            if (snapshot) snapshots.push(snapshot);
        }

        return {
            dateKey: key,
            timestamp: date.getTime(),
            dateObj: new Date(date),
            expectedPlan,
            paidAmount,
            expenseAmount,
            explicitDebtAmount,
            dailyDebt,
            excessAmount,
            extraIncome,
            overrideType,
            isDayOff,
            isNotWorking,
            status,
            carSnapshots: Array.from(new Map(snapshots.map(snapshot => [snapshot.id || snapshot.label, snapshot])).values()),
            transactions: dayTxs,
            workPeriodId: workPeriod?.id ?? null,
        };
    };

    const calendarDays = useMemo<CalendarDay[]>(() => {
        const [year, month] = selectedMonthKey.split('-').map(Number);
        if (!year || !month) return [];
        const daysInMonth = new Date(year, month, 0).getDate();
        return Array.from({ length: daysInMonth }, (_, index) => {
            const date = new Date(year, month - 1, index + 1);
            const key = dateKey(date);
            return {
                date,
                dateKey: key,
                history: buildDayHistory(date),
                deposits: depositByDate.get(key) ?? [],
                salaryTxs: salaryByDate.get(key) ?? [],
            };
        });
    }, [selectedMonthKey, txByDate, depositByDate, salaryByDate, driver, car, cars]);

    const monthStats = useMemo(() => {
        const totalExpected = calendarDays.reduce((sum, day) => sum + day.history.expectedPlan, 0);
        const totalPaid = calendarDays.reduce((sum, day) => sum + day.history.paidAmount, 0);
        const totalDebt = calendarDays.reduce((sum, day) => sum + day.history.dailyDebt, 0);
        const totalExcess = totalExpected > 0 ? calendarDays.reduce((sum, day) => sum + day.history.excessAmount, 0) : 0;
        const nonPlanIncome = totalExpected === 0 ? totalPaid : 0;
        const expenseTotal = calendarDays.reduce((sum, day) => sum + day.history.expenseAmount, 0);
        const explicitDebtTotal = calendarDays.reduce((sum, day) => sum + day.history.explicitDebtAmount, 0);
        const depositTopup = calendarDays.flatMap(day => day.deposits).filter(row => isDepositTopup(row.tx)).reduce((sum, row) => sum + Math.abs(row.tx.amount), 0);
        const depositUsed = calendarDays.flatMap(day => day.deposits).filter(row => !isDepositTopup(row.tx)).reduce((sum, row) => sum + Math.abs(row.tx.amount), 0);
        const salaryPaid = sumAbs(calendarDays.flatMap(day => day.salaryTxs));
        const activeDays = calendarDays.filter(day => day.history.expectedPlan > 0).length;
        const monthEnd = calendarDays.length ? dayEnd(calendarDays[calendarDays.length - 1].date) : dayEnd(new Date());
        const ledgerUntilMonthEnd = depositLedger.filter(row => row.tx.timestamp <= monthEnd);
        const depositBalance = ledgerUntilMonthEnd.length > 0 ? ledgerUntilMonthEnd[ledgerUntilMonthEnd.length - 1].newBal : 0;
        const financeMonth = finance.months.find(month => month.monthKey === selectedMonthKey);
        const salaryDeductions = (financeMonth?.shortfall ?? 0) + (financeMonth?.expenses ?? 0) + (financeMonth?.debts ?? 0) + (financeMonth?.salaryAdvance ?? 0);

        return {
            totalExpected,
            totalPaid,
            totalDebt,
            totalExcess,
            nonPlanIncome,
            expenseTotal,
            explicitDebtTotal,
            depositTopup,
            depositUsed,
            depositBalance,
            activeDays,
            salaryPaid,
            salaryDeductions,
            salaryPayable: financeMonth?.netSalary ?? Math.max(0, (driver.monthlySalary ?? 0) - salaryDeductions),
            financeMonth,
        };
    }, [calendarDays, depositLedger, finance.months, selectedMonthKey, driver.monthlySalary]);

    useEffect(() => {
        if (selectedDayKey && calendarDays.some(day => day.dateKey === selectedDayKey)) return;
        const todayKey = dateKey(new Date());
        const todayInMonth = calendarDays.find(day => day.dateKey === todayKey);
        const firstActive = calendarDays.find(day =>
            day.history.expectedPlan > 0 ||
            day.history.paidAmount > 0 ||
            day.history.transactions.length > 0 ||
            day.deposits.length > 0 ||
            day.salaryTxs.length > 0
        );
        setSelectedDayKey((todayInMonth ?? firstActive ?? calendarDays[0])?.dateKey ?? null);
    }, [calendarDays, selectedDayKey]);

    const selectedDay = useMemo(
        () => calendarDays.find(day => day.dateKey === selectedDayKey) ?? null,
        [calendarDays, selectedDayKey]
    );

    const firstWeekday = calendarDays.length > 0 ? (calendarDays[0].date.getDay() + 6) % 7 : 0;
    const progressPercent = driverType === 'salary'
        ? ((driver.monthlySalary ?? 0) > 0 ? Math.min(100, Math.round((monthStats.salaryPaid / (driver.monthlySalary ?? 1)) * 100)) : 0)
        : (monthStats.totalExpected > 0 ? Math.min(100, Math.round((Math.min(monthStats.totalPaid, monthStats.totalExpected) / monthStats.totalExpected) * 100)) : 0);

    const workPeriodSummaries = useMemo<WorkPeriodSummary[]>(() => {
        const today = dayEnd(new Date());
        return workPeriods.map((period, index) => {
            const periodEnd = period.endDate ?? today;
            const carForPeriod = period.carId ? cars.find(c => c.id === period.carId) : null;
            let totalPaid = 0;
            let totalExpected = 0;
            const cursor = new Date(period.startDate);
            cursor.setHours(0, 0, 0, 0);
            while (cursor.getTime() <= periodEnd) {
                const day = buildDayHistory(cursor);
                totalPaid += day.paidAmount;
                totalExpected += day.expectedPlan;
                cursor.setDate(cursor.getDate() + 1);
            }
            return {
                ...period,
                id: period.id || `period-${index}`,
                totalPaid,
                totalExpected,
                totalDebt: totalExpected - totalPaid,
                carName: carForPeriod?.name || (index === 0 ? car?.name : undefined) || driver.carModel || undefined,
                licensePlate: carForPeriod?.licensePlate || (index === 0 ? car?.licensePlate : undefined) || driver.licensePlate || undefined,
            };
        }).sort((a, b) => (b.endDate ?? Number.MAX_SAFE_INTEGER) - (a.endDate ?? Number.MAX_SAFE_INTEGER));
    }, [workPeriods, cars, car, driver, txByDate]);

    const selectedMonthBalance = driverType === 'salary'
        ? monthStats.salaryPaid - monthStats.salaryPayable
        : monthStats.totalPaid - monthStats.totalExpected;

    const bg = isDark ? '#000000' : '#F2F2F7';
    const surface = isDark ? 'bg-[#1C1C1E]' : 'bg-white';
    const softSurface = isDark ? 'bg-white/[0.04]' : 'bg-slate-50';
    const bdr = isDark ? 'border-[#38383A]' : 'border-[#E5E5EA]';
    const txt = isDark ? 'text-white' : 'text-slate-950';
    const muted = isDark ? 'text-[#EBEBF5]/60' : 'text-slate-500';
    const cleanLabel = (value: string) => value.replace(/[:：]\s*$/, '');
    const debtLabel = cleanLabel(t('debt', 'Qarz'));
    const excessLabel = cleanLabel(t('excess', 'Ortiqcha'));

    const summaryCards: SummaryCard[] = useMemo(() => {
        const baseBg = isDark ? 'border-white/8 bg-white/[0.035]' : 'border-gray-100 bg-slate-50';
        const card = (
            label: string,
            value: string,
            tone: string,
            icon: React.ReactNode,
            bgClass = baseBg,
            title?: string,
            helper?: string
        ): SummaryCard => ({ label, value, tone, icon, bg: bgClass, title, helper });

        if (driverType === 'salary') {
            return [
                card(t('monthlySalary', 'Oylik maosh'), fmt(driver.monthlySalary ?? 0), isDark ? 'text-violet-300' : 'text-violet-700', <CoinIcon className="w-5 h-5" />, isDark ? 'border-violet-500/15 bg-violet-500/[0.06]' : 'border-violet-100 bg-violet-50'),
                card(t('salaryDeductions', 'Avans / ushlab qolish'), fmt(monthStats.salaryDeductions), isDark ? 'text-amber-300' : 'text-amber-700', <ArrowIcon direction="down" className="w-5 h-5" />, isDark ? 'border-amber-500/15 bg-amber-500/[0.06]' : 'border-amber-100 bg-amber-50'),
                card(t('salaryPaidAmount', "To'langan maosh"), fmt(monthStats.salaryPaid), isDark ? 'text-emerald-300' : 'text-emerald-700', <ArrowIcon direction="up" className="w-5 h-5" />, isDark ? 'border-emerald-500/15 bg-emerald-500/[0.06]' : 'border-emerald-100 bg-emerald-50'),
                card(t('salaryPayable', "To'lanadigan qoldiq"), fmt(monthStats.salaryPayable), monthStats.salaryPayable > 0 ? 'text-red-500' : txt, <WalletIcon className="w-5 h-5" />),
            ];
        }

        const balanceLabel = monthStats.totalExpected === 0 && monthStats.totalPaid > 0
            ? t('nonPlanIncome', 'Rejadan tashqari tushum')
            : monthStats.totalDebt > 0
                ? debtLabel
                : monthStats.totalExcess > 0
                    ? excessLabel
                    : t('debtOrExcess', 'Qarz / Ortiqcha');
        const balanceValue = monthStats.totalExpected === 0 && monthStats.totalPaid > 0
            ? fmt(monthStats.nonPlanIncome)
            : monthStats.totalDebt > 0
                ? `-${fmt(monthStats.totalDebt)}`
                : monthStats.totalExcess > 0
                    ? `+${fmt(monthStats.totalExcess)}`
                    : fmt(0);
        const balanceTone = monthStats.totalDebt > 0
            ? 'text-red-500'
            : monthStats.totalExcess > 0 || monthStats.nonPlanIncome > 0
                ? (isDark ? 'text-emerald-300' : 'text-emerald-700')
                : txt;

        const cards = [
            card(t('totalExpectedPlan', 'Jami reja'), fmt(monthStats.totalExpected), isDark ? 'text-blue-300' : 'text-blue-700', <CalendarIcon className="w-5 h-5" />),
            card(t('paidTowardPlan', "Rejaga to'langan"), fmt(monthStats.totalPaid), isDark ? 'text-emerald-300' : 'text-emerald-700', <ArrowIcon direction="up" className="w-5 h-5" />, isDark ? 'border-emerald-500/15 bg-emerald-500/[0.06]' : 'border-emerald-100 bg-emerald-50'),
            card(balanceLabel, balanceValue, balanceTone, <ArrowIcon direction={monthStats.totalDebt > 0 ? 'down' : 'up'} className="w-5 h-5" />),
        ];

        if (driverType === 'lease_to_own') {
            cards.push(card(t('contractRemaining', "Shartnoma qoldig'i"), fmt(finance.contractRemaining ?? 0), isDark ? 'text-orange-300' : 'text-orange-700', <WalletIcon className="w-5 h-5" />, isDark ? 'border-orange-500/15 bg-orange-500/[0.06]' : 'border-orange-100 bg-orange-50'));
        } else if (driverType === 'deposit' || monthStats.depositTopup > 0 || monthStats.depositUsed > 0 || (driver.depositAmount ?? 0) > 0) {
            cards.push(card(t('depositBalance', "Depozit qoldig'i"), fmt(monthStats.depositBalance), isDark ? 'text-amber-300' : 'text-amber-700', <WalletIcon className="w-5 h-5" />, isDark ? 'border-amber-500/15 bg-amber-500/[0.06]' : 'border-amber-100 bg-amber-50'));
        } else {
            cards.push(card(t('activeDays', 'Faol kunlar'), String(monthStats.activeDays), txt, <CalendarIcon className="w-5 h-5" />));
        }
        return cards;
    }, [driverType, driver.monthlySalary, driver.depositAmount, monthStats, finance.contractRemaining, isDark, t, txt, debtLabel, excessLabel]);

    const dayStatusClass = (day: CalendarDay) => {
        const hasActivity = day.history.paidAmount > 0 || day.history.expectedPlan > 0 || day.history.transactions.length > 0 || day.deposits.length > 0 || day.salaryTxs.length > 0;
        if (!hasActivity) return isDark ? 'border-white/[0.04] bg-white/[0.02]' : 'border-transparent bg-transparent';
        if (day.history.status === 'DAY_OFF') return isDark ? 'border-blue-500/25 bg-blue-500/10' : 'border-blue-200 bg-blue-50';
        if (day.history.status === 'NOT_WORKING') return isDark ? 'border-slate-500/25 bg-slate-500/10' : 'border-slate-200 bg-slate-50';
        if (day.history.status === 'PAID') return isDark ? 'border-emerald-500/25 bg-emerald-500/10' : 'border-emerald-200 bg-emerald-50/75';
        if (day.history.status === 'PARTIAL') return isDark ? 'border-amber-500/25 bg-amber-500/10' : 'border-amber-200 bg-amber-50/75';
        if (day.history.status === 'EXTRA') return isDark ? 'border-teal-500/25 bg-teal-500/10' : 'border-teal-200 bg-teal-50/75';
        if (day.history.status === 'DEBT') return isDark ? 'border-red-500/25 bg-red-500/10' : 'border-red-200 bg-red-50/75';
        if (day.deposits.length > 0) return isDark ? 'border-amber-500/25 bg-amber-500/10' : 'border-amber-200 bg-amber-50';
        return isDark ? 'border-white/[0.06] bg-white/[0.03]' : 'border-gray-100 bg-white';
    };

    const renderTransactionLine = (tx: Transaction) => {
        const isTopup = isDepositTopup(tx);
        const isDepositUse = tx.useDeposit === true && !isTopup;
        const isIncome = tx.type === TransactionType.INCOME && !isTopup;
        const isSalary = isSalaryPayment(tx);
        const label = isTopup
            ? t('depositTopup', "Depozit to'ldirildi")
            : isDepositUse
                ? t('depositInternalUse', 'Depozitdan ichki foydalanish')
                : isSalary
                    ? t('salaryPaidAmount', "To'langan maosh")
                    : tx.type === TransactionType.EXPENSE
                        ? t('expense', 'Chiqim')
                        : tx.type === TransactionType.DEBT
                            ? t('debt', 'Qarz')
                            : tx.type === TransactionType.DAY_OFF
                                ? t('dayOff', 'Dam olish')
                                : tx.type === TransactionType.NOT_WORKING
                                    ? t('notWorking', 'Ishlamagan')
                                    : t('income', 'Kirim');
        const tone = isTopup ? 'text-amber-600 dark:text-amber-300'
            : isDepositUse ? 'text-orange-600 dark:text-orange-300'
            : isIncome || isSalary ? 'text-emerald-600 dark:text-emerald-300'
            : 'text-red-600 dark:text-red-300';
        const prefix = isIncome || isTopup ? '+' : tx.amount === 0 ? '' : '-';

        return (
            <div key={tx.id} className={`rounded-2xl border p-3 ${isDark ? 'border-white/8 bg-white/[0.04]' : 'border-gray-200 bg-white'}`}>
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className={`text-[13px] font-black ${tone}`}>{label}</p>
                        <p className={`mt-1 text-[12px] leading-snug ${muted}`}>{tx.description || tx.note || t('noComment', 'Izohsiz')}</p>
                        <div className={`mt-2 flex flex-wrap items-center gap-2 text-[11px] ${muted}`}>
                            <span>{fmtTime(tx.timestamp)}</span>
                            {tx.paymentMethod && <span className={`rounded-full px-2 py-0.5 font-bold ${isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>{t(tx.paymentMethod, tx.paymentMethod)}</span>}
                            {isDepositUse && <span className="rounded-full bg-orange-500/10 px-2 py-0.5 font-bold text-orange-600 dark:text-orange-300">{t('internalBalanceMovement', 'Ichki depozit harakati')}</span>}
                        </div>
                    </div>
                    <p className={`shrink-0 text-[13px] font-black tabular-nums ${tone}`}>
                        {prefix}{fmtNumber(tx.amount)}
                    </p>
                </div>
            </div>
        );
    };

    return createPortal(
        <div
            className="fixed inset-y-0 right-0 left-0 md:left-64 z-[45] flex flex-col"
            style={{
                background: bg,
                transform: visible ? 'translateY(0)' : 'translateY(100%)',
                opacity: visible ? 1 : 0,
                transition: 'transform 0.36s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.24s ease',
            }}
        >
            <div className={`flex-shrink-0 sticky top-0 z-20 border-b ${bdr}`} style={{ background: isDark ? 'rgba(28,28,30,0.88)' : 'rgba(242,242,247,0.88)', backdropFilter: 'blur(20px)' }}>
                <div className="flex items-center justify-between px-4 lg:px-8 h-14 w-full">
                    <button onClick={handleClose} className={`flex items-center gap-1.5 text-[16px] -ml-2 px-2 py-1 rounded-lg active:opacity-60 ${isDark ? 'text-[#0A84FF]' : 'text-[#007AFF]'}`}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                        {t('back', 'Orqaga')}
                    </button>
                    <div className={`text-[17px] font-semibold tracking-tight ${txt}`}>{t('driverHistoryTitle', 'Haydovchi tarixi')}</div>
                    <div className="w-[70px]" />
                </div>

                <div className="px-4 sm:px-6 lg:px-8 pb-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.44fr)] gap-4 w-full max-w-[1680px] mx-auto">
                    <div className={`flex items-center gap-4 rounded-3xl p-4 shadow-sm border ${surface} ${bdr}`}>
                        <div className="w-16 h-16 shrink-0 rounded-full overflow-hidden bg-slate-100 dark:bg-white/5 ring-4 ring-white/60 dark:ring-white/5">
                            {driver.avatar
                                ? <img src={driver.avatar} alt={driver.name} className="w-full h-full object-cover" />
                                : <div className={`w-full h-full flex items-center justify-center text-2xl font-black ${muted}`}>{driver.name.charAt(0)}</div>}
                        </div>
                        <div className="min-w-0">
                            <h1 className={`text-[21px] font-black truncate ${txt}`}>{driver.name}</h1>
                            <p className={`text-[13px] font-medium truncate ${muted}`}>{car?.name || driver.carModel || t('unassigned', 'Biriktirilmagan')}</p>
                            <div className="mt-1 scale-90 origin-left"><LicensePlate plate={car?.licensePlate || driver.licensePlate || ''} size="sm" /></div>
                        </div>
                    </div>
                    <div className={`rounded-3xl p-4 shadow-sm border ${surface} ${bdr}`}>
                        <p className={`text-[12px] font-semibold ${muted}`}>{t('selectedMonthBalance', 'Tanlangan oy balansi')}</p>
                        <div className="mt-2 flex items-center justify-between gap-3">
                            <p className={`text-[28px] font-black tracking-tight tabular-nums ${selectedMonthBalance < 0 ? 'text-red-500' : selectedMonthBalance > 0 ? 'text-emerald-500' : txt}`}>
                                {fmtSigned(selectedMonthBalance)}
                            </p>
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${selectedMonthBalance < 0 ? 'bg-red-500/10 text-red-500' : selectedMonthBalance > 0 ? 'bg-emerald-500/10 text-emerald-500' : softSurface}`}>
                                <WalletIcon className="w-6 h-6" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
                    <section className={`rounded-[28px] border p-4 sm:p-5 shadow-sm ${surface} ${bdr}`}>
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div>
                                <p className={`text-[11px] font-black uppercase tracking-widest ${muted}`}>{t('financialHistory', 'Moliya tarixi')}</p>
                                <h2 className={`text-[22px] font-black mt-1 ${txt}`}>{formatMonthLabel(selectedMonthKey, i18n.language)}</h2>
                            </div>
                            <select
                                value={selectedMonthKey}
                                onChange={(e) => { setSelectedMonthKey(e.target.value); setSelectedDayKey(null); }}
                                className={`h-12 rounded-2xl border px-4 text-[14px] font-bold outline-none ${isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-white border-gray-200 text-slate-900'}`}
                                aria-label={t('month', 'Oy')}
                            >
                                {monthOptions.map(key => <option key={key} value={key}>{formatMonthLabel(key, i18n.language)}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mt-5">
                            {summaryCards.map(card => (
                                <div key={card.label} className={`rounded-2xl border p-4 ${card.bg}`}>
                                    <div className="flex items-center justify-between gap-3">
                                        <p className={`text-[11px] font-black uppercase tracking-widest ${muted}`}>{card.label}</p>
                                        <span className={card.tone}>{card.icon}</span>
                                    </div>
                                    <p className={`mt-4 text-[22px] font-black tabular-nums tracking-tight ${card.tone}`} title={card.title || card.value}>{card.value}</p>
                                    {card.helper && <p className={`mt-1 text-[11px] font-semibold ${muted}`}>{card.helper}</p>}
                                </div>
                            ))}
                        </div>

                        <div className="mt-5">
                            <div className="flex items-center justify-between mb-3">
                                <span className={`text-[13px] font-bold ${muted}`}>{driverType === 'salary' ? t('salaryProgress', 'Maosh progressi') : t('planProgress', 'Reja progressi')}</span>
                                <span className={`rounded-lg border px-2 py-1 text-[11px] font-black ${isDark ? 'border-white/10 bg-white/[0.05] text-white' : 'border-gray-200 bg-white text-slate-900'}`}>{progressPercent}%</span>
                            </div>
                            <div className={`w-full h-3 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                                <div className="h-full rounded-full bg-gradient-to-r from-teal-700 to-emerald-400 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                            </div>
                            <div className={`mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] font-bold ${muted}`}>
                                <span>{t('activeDays', 'Faol kunlar')}: {monthStats.activeDays}</span>
                                {monthStats.depositTopup > 0 && <span>{t('depositTopup', "Depozit to'ldirildi")}: {fmt(monthStats.depositTopup)}</span>}
                                {monthStats.depositUsed > 0 && <span>{t('depositWithdrawal', 'Depozitdan ishlatildi')}: {fmt(monthStats.depositUsed)}</span>}
                                {monthStats.expenseTotal > 0 && <span>{t('expense', 'Chiqim')}: {fmt(monthStats.expenseTotal)}</span>}
                            </div>
                        </div>
                    </section>

                    <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_420px] gap-5 items-start">
                        <section className={`rounded-[28px] border p-4 sm:p-5 shadow-sm ${surface} ${bdr}`}>
                            
<div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <div className="flex flex-wrap items-center gap-3 text-[12px] font-bold">
        <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-300"><div className="w-4 h-4"><Lottie animationData={planDoneAnimation} loop={true} /></div>{t('fullyPaid', "To'liq to'landi")}</span>
        <span className="inline-flex items-center gap-1.5 text-red-500">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            {debtLabel}
        </span>
        <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-300"><span className="w-2 h-2 rounded-full bg-amber-500" />{t('depositTab', 'Depozit')}</span>
        <span className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-300"><div className="w-4 h-4"><Lottie animationData={restAnimation} loop={true} /></div>{t('dayOff', 'Dam olish')}</span>
        <span className={`inline-flex items-center gap-1.5 ${muted}`}>
            <span className="text-[12px] leading-none">❌</span>
            {t('notWorking', 'Ishlamagan')}
        </span>
    </div>
</div>

<div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2">
    {WEEKDAYS.map(day => (
        <div key={day} className={`text-center text-[10px] font-black uppercase tracking-widest py-1 ${muted}`}>{day}</div>
    ))}
</div>

<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-1.5 sm:gap-2 md:gap-2.5">
    {Array(firstWeekday).fill(null).map((_, index) => <div key={`pad-${index}`} className="hidden xl:block min-h-[90px] md:min-h-[110px]" />)}
    
    {calendarDays.map((day, index) => {
        const history = day.history;
        const isSelected = selectedDayKey === day.dateKey;
        const depositTopups = day.deposits.filter(row => isDepositTopup(row.tx));
        const depositUses = day.deposits.filter(row => !isDepositTopup(row.tx));
        const isFuture = dayStart(day.date) > dayStart(new Date());

        const cardStyle = () => {
            if (isSelected) {
                return isDark
                    ? 'bg-white/[0.04] shadow-md ring-2 ring-emerald-500 ring-offset-2 ring-offset-[#1C1C1E] border border-transparent'
                    : 'bg-white shadow-md ring-2 ring-emerald-500 ring-offset-2 ring-offset-slate-50 border border-transparent';
            }
            if (isFuture) {
                return isDark
                    ? 'bg-white/[0.02] border border-white/[0.04] opacity-50 hover:opacity-100'
                    : 'bg-gray-50/70 border-transparent opacity-60 hover:opacity-100';
            }
            if (history.status === 'NOT_WORKING') {
                return isDark
                    ? 'bg-white/[0.02] border-transparent'
                    : 'bg-gray-50 border-transparent text-gray-400';
            }
            if (history.status === 'DAY_OFF') {
                return isDark
                    ? 'bg-white/[0.04] border border-blue-500/20'
                    : 'bg-white border border-transparent shadow-sm';
            }
            if (history.status === 'PAID' || history.status === 'EXTRA') {
                return isDark
                    ? 'bg-white/[0.04] border border-emerald-500/20 hover:border-emerald-500/40 hover:bg-white/[0.06]'
                    : 'bg-white border-transparent shadow-sm hover:shadow-md';
            }
            return isDark
                ? 'bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06]'
                : 'bg-white border-transparent shadow-sm hover:shadow-md';
        };

        const isReducedRate = history.expectedPlan > 0 && history.expectedPlan < (car?.dailyPlan ?? 0);
        const cellClass = `relative flex flex-col min-h-[90px] md:min-h-[110px] rounded-lg sm:rounded-2xl p-1 sm:p-3 transition-all duration-150 overflow-hidden cursor-pointer hover:scale-[1.03] hover:shadow-md ${cardStyle()} ${isReducedRate && history.status !== 'DAY_OFF' && history.status !== 'NOT_WORKING' && history.overrideType !== 'REPAIR' ? (isDark ? 'bg-indigo-500/5' : 'bg-indigo-50/50') : ''}`;

        return (
            <button
                key={day.dateKey}
                type="button"
                onClick={() => setSelectedDayKey(day.dateKey)}
                className={cellClass}
            >
                {/* Background Lottie for DAY_OFF */}
                {history.status === 'DAY_OFF' && (
                    <div className="absolute inset-0 z-0 pointer-events-none bg-[#1c1229] overflow-hidden">
                        <div className="absolute inset-0 scale-105 sm:scale-110 flex items-center justify-center origin-center">
                            <Lottie 
                                animationData={restAnimation} 
                                loop={true} 
                                style={{ width: '100%', height: '100%' }}
                                rendererSettings={{ preserveAspectRatio: 'xMidYMid slice' }}
                            />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-[#1c1229] via-[#1c1229]/30 to-transparent opacity-90"></div>
                    </div>
                )}
                {/* Background Video for REPAIR */}
                {history.overrideType === 'REPAIR' && (
                    <div className="absolute inset-0 z-0 pointer-events-none bg-[#151111] overflow-hidden">
                        <div className="absolute inset-0 scale-105 sm:scale-110 flex items-center justify-center origin-center">
                            <video 
                                src={repairSticker} 
                                autoPlay 
                                loop 
                                muted 
                                playsInline 
                                className="w-full h-full object-cover brightness-110"
                            />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent"></div>
                    </div>
                )}

                <div className="flex flex-col h-full w-full relative z-10 text-left">
                    {/* Date Header */}
                    <div className="mb-2 flex items-center justify-between">
                        <span className={`text-[12px] sm:text-[14px] font-bold ${
                            (history.status === 'DAY_OFF' || history.overrideType === 'REPAIR')
                                ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'
                                : isFuture
                                    ? isDark ? 'text-gray-600' : 'text-gray-400'
                                    : isDark ? 'text-gray-300' : 'text-slate-800'
                        }`}>
                            {formatDayShort(day.date, i18n.language)}
                        </span>
                        
                        {/* Deposit indicators */}
                        {(depositTopups.length > 0 || depositUses.length > 0) && (
                            <div className="flex gap-1">
                                {depositTopups.length > 0 && <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-black text-emerald-600 dark:text-emerald-400">+{fmtCompact(depositTopups.reduce((sum, row) => sum + Math.abs(row.tx.amount), 0))}</span>}
                                {depositUses.length > 0 && <span className="rounded-full bg-orange-500/15 px-1.5 py-0.5 text-[9px] font-black text-orange-600 dark:text-orange-400">-{fmtCompact(depositUses.reduce((sum, row) => sum + Math.abs(row.tx.amount), 0))}</span>}
                            </div>
                        )}
                    </div>
                    <div className={`mb-2 h-[1px] w-full ${
                        (history.status === 'DAY_OFF' || history.overrideType === 'REPAIR')
                            ? 'bg-transparent'
                            : isDark ? 'bg-white/10' : 'bg-gray-100'
                    }`} />

                    {/* Center / Income */}
                    {!isFuture && history.overrideType !== 'REPAIR' && history.status !== 'DAY_OFF' && (
                        <div className="flex flex-col mb-auto text-left">
                            <span className={`text-[9px] sm:text-[10px] mb-0.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('incomeLabel', 'Tushum')}:</span>
                            <div className={`text-[12px] sm:text-[14px] font-black tabular-nums tracking-tight truncate leading-none ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                {history.paidAmount > 0 ? fmtNumber(history.paidAmount) + ' UZS' : '0 UZS'}
                            </div>
                        </div>
                    )}

                    {/* Bottom Status */}
                    <div className="mt-auto pt-1 w-full flex-shrink-0 text-left">
                        {history.status === 'DAY_OFF' ? (
                            <div className="w-full flex mb-0.5 pointer-events-none">
                                <span className="text-[10px] sm:text-[11px] font-bold tracking-widest text-white drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">{t('dayOff', 'DAM OLISH')}</span>
                            </div>
                        ) : history.overrideType === 'REPAIR' ? (
                            <div className="w-full flex mb-0.5 pointer-events-none">
                                <span className="text-[10px] sm:text-[11px] font-bold tracking-widest text-white drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">{t('inRepair', "TA'MIRDA")}</span>
                            </div>
                        ) : history.status === 'NOT_WORKING' ? (
                            <div className={`flex items-center gap-1.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                <span className="text-[10px] sm:text-[11px] font-medium">{t('notWorking', 'Ishlamagan')}</span>
                            </div>
                        ) : !isFuture ? (() => {
                            if (history.status === 'PAID' || history.status === 'EXTRA') {
                                return (
                                    <div className={`flex min-w-0 items-center gap-1.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                        <div className="w-4 h-4 flex-shrink-0 -ml-0.5">
                                            <Lottie animationData={planDoneAnimation} loop={true} />
                                        </div>
                                        {history.excessAmount > 0 ? (
                                            <MoneyInline
                                                prefix={excessLabel}
                                                amount={history.excessAmount}
                                                sign="+"
                                                className="text-[10px] sm:text-[11px] font-bold tracking-tight"
                                            />
                                        ) : history.extraIncome > 0 ? (
                                            <MoneyInline
                                                prefix={t('nonPlanIncome', 'Rejadan tashqari')}
                                                amount={history.extraIncome}
                                                sign="+"
                                                className="text-[10px] sm:text-[11px] font-bold tracking-tight"
                                            />
                                        ) : (
                                            <span className="text-[10px] sm:text-[11px] font-bold tracking-tight">
                                                {t('fullyPaid', "To'liq to'landi")}
                                            </span>
                                        )}
                                    </div>
                                );
                            } else if (history.dailyDebt > 0) {
                                return (
                                    <div className={`flex min-w-0 items-start gap-1.5 ${isDark ? 'text-red-400' : 'text-red-500'}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0">
                                            <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                                        </svg>
                                        <MoneyInline
                                            prefix={debtLabel}
                                            amount={history.dailyDebt}
                                            sign="-"
                                            className="text-[10px] sm:text-[11px] font-bold tracking-tight"
                                        />
                                    </div>
                                );
                            }
                            return null;
                        })() : null}
                    </div>
                </div>
            </button>
        );
    })}
</div>
</section>

<aside className={`rounded-[28px] border p-4 sm:p-5 shadow-sm 2xl:sticky 2xl:top-[190px] ${surface} ${bdr}`}>
                            {selectedDay ? (
                                <div>
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className={`text-[11px] font-black uppercase tracking-widest ${muted}`}>{t('dayDetails', 'Kun tafsilotlari')}</p>
                                            <h3 className={`mt-1 text-[20px] font-black ${txt}`}>{formatFullDate(selectedDay.date, i18n.language)}</h3>
                                        </div>
                                        <button onClick={() => setSelectedDayKey(null)} className={`w-9 h-9 rounded-full flex items-center justify-center ${softSurface} ${muted}`} aria-label={t('close', 'Yopish')}>×</button>
                                    </div>

                                    <div className={`mt-4 rounded-2xl border p-3 ${isDark ? 'border-white/8 bg-white/[0.035]' : 'border-gray-100 bg-slate-50'}`}>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div>
                                                <p className={`text-[10px] font-black uppercase ${muted}`}>{t('expected', 'Kutilgan')}</p>
                                                <p className={`mt-1 text-[13px] font-black ${txt}`}>{fmt(selectedDay.history.expectedPlan)}</p>
                                            </div>
                                            <div>
                                                <p className={`text-[10px] font-black uppercase ${muted}`}>{t('paid', "To'langan")}</p>
                                                <p className="mt-1 text-[13px] font-black text-emerald-600 dark:text-emerald-300">{fmt(selectedDay.history.paidAmount)}</p>
                                            </div>
                                            <div>
                                                <p className={`text-[10px] font-black uppercase ${muted}`}>{selectedDay.history.dailyDebt > 0 ? debtLabel : selectedDay.history.excessAmount > 0 ? excessLabel : t('balance', 'Balans')}</p>
                                                <p className={`mt-1 text-[13px] font-black ${selectedDay.history.dailyDebt > 0 ? 'text-red-500' : selectedDay.history.excessAmount > 0 ? 'text-emerald-500' : txt}`}>
                                                    {selectedDay.history.dailyDebt > 0 ? `-${fmt(selectedDay.history.dailyDebt)}` : selectedDay.history.excessAmount > 0 ? `+${fmt(selectedDay.history.excessAmount)}` : fmt(0)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {selectedDay.history.carSnapshots.length > 0 && (
                                        <div className="mt-4">
                                            <p className={`text-[11px] font-black uppercase tracking-widest mb-2 ${muted}`}>{t('drivenCar', 'Haydalgan avto')}</p>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedDay.history.carSnapshots.map(snapshot => (
                                                    <span key={snapshot.id || snapshot.label} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[12px] font-bold ${isDark ? 'border-white/10 bg-white/[0.04] text-white/75' : 'border-gray-200 bg-white text-gray-700'}`}>
                                                        {snapshot.name}
                                                        {snapshot.licensePlate && <LicensePlate plate={snapshot.licensePlate} size="sm" />}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-5 space-y-2">
                                        <p className={`text-[11px] font-black uppercase tracking-widest ${muted}`}>{t('moneyMovements', 'Harakatlar')}</p>
                                        {[
                                            ...selectedDay.history.transactions,
                                            ...selectedDay.salaryTxs.filter(tx => !selectedDay.history.transactions.some(existing => existing.id === tx.id)),
                                            ...selectedDay.deposits.map(row => row.tx).filter(tx => !selectedDay.history.transactions.some(existing => existing.id === tx.id)),
                                        ].length > 0 ? (
                                            [
                                                ...selectedDay.history.transactions,
                                                ...selectedDay.salaryTxs.filter(tx => !selectedDay.history.transactions.some(existing => existing.id === tx.id)),
                                                ...selectedDay.deposits.map(row => row.tx).filter(tx => !selectedDay.history.transactions.some(existing => existing.id === tx.id)),
                                            ].sort((a, b) => b.timestamp - a.timestamp).map(renderTransactionLine)
                                        ) : (
                                            <div className={`rounded-2xl border p-5 text-center ${isDark ? 'border-white/8 bg-white/[0.035]' : 'border-gray-100 bg-slate-50'}`}>
                                                <p className={`text-[13px] font-bold ${muted}`}>{t('noHistory', 'Tarix topilmadi')}</p>
                                            </div>
                                        )}
                                    </div>

                                    {selectedDay.deposits.length > 0 && (
                                        <div className={`mt-5 rounded-2xl border p-3 ${isDark ? 'border-amber-500/20 bg-amber-500/10' : 'border-amber-200 bg-amber-50'}`}>
                                            <p className="text-[11px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">{t('depositLedger', 'Depozit ledgeri')}</p>
                                            <div className="mt-2 space-y-2">
                                                {selectedDay.deposits.map(row => (
                                                    <div key={row.tx.id} className="flex items-center justify-between gap-2 text-[12px] font-bold text-amber-800 dark:text-amber-200">
                                                        <span>{fmt(row.prevBal)} → {fmt(row.newBal)}</span>
                                                        <span>{isDepositTopup(row.tx) ? '+' : '-'}{fmt(row.tx.amount)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {driverType === 'salary' && (
                                        <div className={`mt-5 rounded-2xl border p-3 ${isDark ? 'border-violet-500/20 bg-violet-500/10' : 'border-violet-200 bg-violet-50'}`}>
                                            <p className="text-[11px] font-black uppercase tracking-widest text-violet-700 dark:text-violet-300">{t('salaryContext', 'Maosh holati')}</p>
                                            <div className="mt-2 grid grid-cols-2 gap-2 text-[12px] font-bold text-violet-800 dark:text-violet-200">
                                                <span>{t('monthlySalary', 'Oylik maosh')}</span><span className="text-right">{fmt(driver.monthlySalary ?? 0)}</span>
                                                <span>{t('salaryPayable', "To'lanadigan qoldiq")}</span><span className="text-right">{fmt(monthStats.salaryPayable)}</span>
                                            </div>
                                        </div>
                                    )}

                                    {driverType === 'lease_to_own' && (
                                        <div className={`mt-5 rounded-2xl border p-3 ${isDark ? 'border-orange-500/20 bg-orange-500/10' : 'border-orange-200 bg-orange-50'}`}>
                                            <p className="text-[11px] font-black uppercase tracking-widest text-orange-700 dark:text-orange-300">{t('leaseContext', 'Vikup holati')}</p>
                                            <div className="mt-2 grid grid-cols-2 gap-2 text-[12px] font-bold text-orange-800 dark:text-orange-200">
                                                <span>{t('contractPaid', "Shartnomaga to'langan")}</span><span className="text-right">{fmt(finance.contractPaid ?? 0)}</span>
                                                <span>{t('contractRemaining', "Shartnoma qoldig'i")}</span><span className="text-right">{fmt(finance.contractRemaining ?? 0)}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                                    <div className={`w-16 h-16 rounded-3xl flex items-center justify-center ${softSurface}`}>
                                        <CalendarIcon className={`w-8 h-8 ${muted}`} />
                                    </div>
                                    <h3 className={`mt-4 text-[18px] font-black ${txt}`}>{t('selectDay', 'Kunni tanlang')}</h3>
                                    <p className={`mt-2 max-w-[260px] text-[13px] leading-relaxed ${muted}`}>{t('selectDayHint', "Tushum, qarz va depozit harakatlarini ko'rish uchun kalendardan kunni tanlang.")}</p>
                                </div>
                            )}
                        </aside>
                    </div>

                    {workPeriodSummaries.length > 0 && (
                        <section className={`w-full rounded-[28px] border p-4 sm:p-5 shadow-sm ${surface} ${bdr}`}>
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <div>
                                    <p className={`text-[11px] font-black uppercase tracking-widest ${muted}`}>{t('workPeriods', 'Ish davrlari')}</p>
                                    <h3 className={`text-[17px] font-bold mt-1 ${txt}`}>{t('rehireHistory', 'Ishga kirish, chiqish va qayta ishga olish tarixi')}</h3>
                                </div>
                                <span className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-bold ${softSurface} ${muted}`}>{workPeriodSummaries.length}</span>
                            </div>
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                                {workPeriodSummaries.map((period, index) => {
                                    const isActivePeriod = !period.endDate || period.endDate >= dayStart(new Date());
                                    const debtTone = period.totalDebt > 0 ? 'text-red-500' : period.totalDebt < 0 ? 'text-emerald-500' : muted;
                                    return (
                                        <div key={period.id} className={`rounded-2xl border p-4 ${isActivePeriod ? (isDark ? 'bg-blue-500/10 border-blue-500/25' : 'bg-blue-50 border-blue-200') : (isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-gray-50 border-gray-200')}`}>
                                            <div className="flex items-center gap-2">
                                                <span className={`h-7 w-7 rounded-full flex items-center justify-center text-[12px] font-black ${isActivePeriod ? 'bg-blue-600 text-white' : isDark ? 'bg-white/[0.08] text-white/70' : 'bg-white text-gray-600 border border-gray-200'}`}>{index + 1}</span>
                                                <span className={`text-[14px] font-black ${txt}`}>{isActivePeriod ? t('currentWorkPeriod', 'Hozirgi davr') : t('previousWorkPeriod', 'Oldingi davr')}</span>
                                            </div>
                                            <p className={`mt-2 text-[13px] font-semibold ${muted}`}>
                                                {formatFullDate(period.startDate, i18n.language)} - {period.endDate ? formatFullDate(period.endDate, i18n.language) : t('stillWorking', 'Hozir ishlayapti')}
                                            </p>
                                            <div className={`mt-2 flex flex-wrap items-center gap-1.5 text-[12px] font-medium ${muted}`}>
                                                <span>{t('drivenCar', 'Haydalgan avto')}:</span>
                                                {period.carName || period.licensePlate ? (
                                                    <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white/75' : 'bg-white border-gray-200 text-gray-700'}`}>
                                                        {period.carName && <span className="font-semibold">{period.carName}</span>}
                                                        {period.licensePlate && <LicensePlate plate={period.licensePlate} size="sm" />}
                                                    </span>
                                                ) : (
                                                    <span className="font-bold">{t('unassigned', 'Biriktirilmagan')}</span>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 mt-3">
                                                <div className={`rounded-xl px-3 py-2 ${isDark ? 'bg-black/15' : 'bg-white'}`}>
                                                    <p className={`text-[10px] uppercase tracking-widest font-black ${muted}`}>{t('expected', 'Kutilgan')}</p>
                                                    <p className={`text-[13px] font-black mt-1 ${txt}`}>{fmtCompact(period.totalExpected)} <span className="text-[10px]">UZS</span></p>
                                                </div>
                                                <div className={`rounded-xl px-3 py-2 ${isDark ? 'bg-black/15' : 'bg-white'}`}>
                                                    <p className={`text-[10px] uppercase tracking-widest font-black ${muted}`}>{t('paid', "To'langan")}</p>
                                                    <p className="text-[13px] font-black mt-1 text-emerald-500">{fmtCompact(period.totalPaid)} <span className="text-[10px]">UZS</span></p>
                                                </div>
                                                <div className={`rounded-xl px-3 py-2 ${isDark ? 'bg-black/15' : 'bg-white'}`}>
                                                    <p className={`text-[10px] uppercase tracking-widest font-black ${muted}`}>{period.totalDebt < 0 ? excessLabel : debtLabel}</p>
                                                    <p className={`text-[13px] font-black mt-1 ${debtTone}`}>{period.totalDebt > 0 ? '-' : period.totalDebt < 0 ? '+' : ''}{fmtCompact(period.totalDebt)} <span className="text-[10px]">UZS</span></p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};
