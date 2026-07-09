import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboardStats } from './hooks/useDashboardStats';
import { useDashboardSummary } from './hooks/useDashboardSummary';
import DateFilter from '../../../components/DateFilter';
import DatePicker from '../../../components/DatePicker';
import Skeleton from '../../../components/Skeleton';
import {
    TrendingUpIcon, TrendingDownIcon, WalletIcon, MedalIcon, SendIcon
} from '../../../components/Icons';
import { useToast } from '../../../components/ToastNotification';
import { Transaction, Driver, Language } from '../../core/types';
import { Car } from '../../core/types/car.types';
import Lottie from 'lottie-react';
import badgeAnimation from '../../../Images/badge.json';
import { MetricCard } from '../../../components/MetricCard';
import { LicensePlate } from '../../components/ui/LicensePlate';
import { PremiumCard } from '../../components/ui/PremiumCard';
import { ShiftBy } from '../../components/ui/ShiftBy';

interface DashboardPageProps {
    transactions: Transaction[];
    drivers: Driver[];
    cars: Car[];
    fleetId?: string;
    isDataLoading: boolean;
    theme: 'light' | 'dark';
    isMobile: boolean;
}

const DashboardPage: React.FC<DashboardPageProps> = ({
    transactions,
    drivers,
    cars,
    fleetId,
    isDataLoading,
    theme,
    isMobile
}) => {
    const { t, i18n } = useTranslation();
    const { addToast } = useToast();
    const currentLanguage = (['uz', 'ru', 'en'].includes(i18n.language) ? i18n.language : 'uz') as Language;

    const {
        timeFilter, setTimeFilter,
        targetDate, setTargetDate,
        todayStats
    } = useDashboardStats(transactions, drivers, cars);
    const { summary, loading: summaryLoading } = useDashboardSummary(fleetId, timeFilter, transactions[0]);

    const isDark = theme === 'dark';
    const showStatsSkeleton = isDataLoading || summaryLoading;

    const [statusSearch, setStatusSearch] = useState('');
    const [showAllCompleted, setShowAllCompleted] = useState(false);
    const [showAllPending, setShowAllPending] = useState(false);
    const [messageDriver, setMessageDriver] = useState<Driver | null>(null);
    const [customMessage, setCustomMessage] = useState('');
    const [isSendingMessage, setIsSendingMessage] = useState(false);

    const STATUS_VISIBLE = 8;

    const searchLower = statusSearch.toLowerCase();
    const filteredCompleted = todayStats.completed.filter(d => d.name.toLowerCase().includes(searchLower));
    const filteredPending = todayStats.pending.filter(d => d.name.toLowerCase().includes(searchLower));
    const displayedCompleted = showAllCompleted ? filteredCompleted : filteredCompleted.slice(0, STATUS_VISIBLE);
    const displayedPending = showAllPending ? filteredPending : filteredPending.slice(0, STATUS_VISIBLE);

    const closeMessageModal = () => {
        setMessageDriver(null);
        setCustomMessage('');
        setIsSendingMessage(false);
    };

    const handleSendTelegramMessage = async () => {
        if (!fleetId || !messageDriver || !messageDriver.telegram || !customMessage.trim()) return;

        setIsSendingMessage(true);
        try {
            const response = await fetch('/.netlify/functions/send-driver-telegram-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fleetId,
                    driverId: messageDriver.id,
                    message: customMessage.trim(),
                }),
            });

            if (!response.ok) throw new Error('Telegram message failed');

            addToast('success', 'Telegram xabar yuborildi');
            closeMessageModal();
        } catch {
            addToast('error', 'Telegram xabar yuborilmadi');
            setIsSendingMessage(false);
        }
    };

    const renderTelegramMessageButton = (driver: Driver) => {
        const hasTelegram = Boolean(driver.telegram);
        if (!hasTelegram) return null;

        return (
            <button
                type="button"
                onClick={() => setMessageDriver(driver)}
                aria-label={`Telegram xabar yuborish: ${driver.name}`}
                title="Telegram xabar yuborish"
                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-95 ${
                    isDark
                        ? 'bg-cyan-500/[0.10] text-cyan-300 hover:bg-cyan-500/[0.18]'
                        : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100'
                }`}
            >
                <SendIcon className="w-4 h-4" />
            </button>
        );
    };

    return (
        <div className="space-y-6">
            {/* Time Filters */}
            <DateFilter
                currentFilter={timeFilter}
                onFilterChange={setTimeFilter}
                theme={theme}
                labels={{
                    today: t('today'),
                    week: t('week'),
                    month: t('month'),
                    year: t('year'),
                    all: t('allTime') || 'All'
                }}
            />

            {/* MAIN STATS ROW */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {showStatsSkeleton ? (
                    <>
                        <PremiumCard isDark={isDark} padding="p-5 sm:p-6" className="min-h-[140px]">
                            <div className="flex flex-col gap-3">
                                <Skeleton variant="rectangular" width="40%" height={12} theme={theme} />
                                <Skeleton variant="rectangular" width="70%" height={32} theme={theme} />
                                <Skeleton variant="rectangular" width="30%" height={10} theme={theme} />
                            </div>
                        </PremiumCard>
                        <PremiumCard isDark={isDark} padding="p-5 sm:p-6" className="min-h-[140px]">
                            <div className="flex flex-col gap-3">
                                <Skeleton variant="rectangular" width="40%" height={12} theme={theme} />
                                <Skeleton variant="rectangular" width="70%" height={32} theme={theme} />
                                <Skeleton variant="rectangular" width="30%" height={10} theme={theme} />
                            </div>
                        </PremiumCard>
                        <PremiumCard isDark={isDark} padding="p-5 sm:p-6" className="sm:col-span-2 lg:col-span-1 min-h-[140px]">
                            <div className="flex flex-col gap-3">
                                <Skeleton variant="rectangular" width="40%" height={12} theme={theme} />
                                <Skeleton variant="rectangular" width="70%" height={32} theme={theme} />
                                <Skeleton variant="rectangular" width="30%" height={10} theme={theme} />
                            </div>
                        </PremiumCard>
                    </>
                ) : (
                    <>
                        <MetricCard title={t('cashIncome', 'Kassa tushumi')} value={summary.totalIncome} type="income" icon={TrendingUpIcon} isDark={isDark} />
                        <MetricCard title={t('totalExpense')} value={summary.totalExpense} type="expense" icon={TrendingDownIcon} isDark={isDark} />
                        <div className="sm:col-span-2 lg:col-span-1">
                            <MetricCard title={t('netProfit')} value={summary.netProfit} type="profit" icon={WalletIcon} isDark={isDark} showPlusSign />
                        </div>
                    </>
                )}
            </div>

            {/* DAILY PAYMENT STATUS */}
            <div className="mt-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <h3 className={`text-xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {t('todayStatus')}
                    </h3>
                    
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                        <div className="w-full sm:w-[150px]">
                            <DatePicker
                                label=""
                                hideLabel
                                value={targetDate}
                                onChange={(d) => setTargetDate(d || new Date())}
                                theme={theme}
                            />
                        </div>

                        {(todayStats.completed.length + todayStats.pending.length) > STATUS_VISIBLE && (
                            <div className="relative w-full sm:w-auto">
                                <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDark ? 'text-[rgba(235,235,245,0.4)]' : 'text-[rgba(60,60,67,0.4)]'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                                <input
                                    type="text"
                                    value={statusSearch}
                                    onChange={e => {
                                        setStatusSearch(e.target.value);
                                        setShowAllCompleted(false);
                                        setShowAllPending(false);
                                    }}
                                    placeholder={t('searchDriverStatus')}
                                    className={`w-full sm:w-[220px] pl-9 pr-4 py-2 rounded-xl text-[14px] font-medium border outline-none transition-all duration-300 ${isDark
                                        ? 'bg-[#222a3d] border-white/[0.08] text-white placeholder-[rgba(235,235,245,0.4)] focus:border-[#6bd8cb] focus:shadow-[0_0_0_2px_rgba(107,216,203,0.15)]'
                                        : 'bg-white border-black/[0.08] text-black placeholder-[rgba(60,60,67,0.4)] focus:border-[#0f766e] focus:shadow-[0_0_0_2px_rgba(15,118,110,0.15)]'
                                    }`}
                                />
                                {statusSearch && (
                                    <button onClick={() => setStatusSearch('')} className={`absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full transition-colors ${isDark ? 'hover:bg-white/[0.1] text-white' : 'hover:bg-black/[0.05] text-black'}`}>✕</button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Daily Summary Totals */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                    {/* Expected */}
                    <PremiumCard isDark={isDark} hoverLift={false} padding="p-5">
                        <div className={`text-[12px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t('expectedTotalAmount', 'Kutilayotgan umumiy summa')}</div>
                        <div className={`text-[24px] font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{todayStats.totals.expectedTotal.toLocaleString()} UZS</div>
                    </PremiumCard>
                    
                    {/* Paid */}
                    <PremiumCard isDark={isDark} hoverLift={false} padding="p-5" className={isDark ? '!bg-emerald-500/[0.04] !border-emerald-500/[0.15]' : '!bg-emerald-50/50 !border-emerald-200/50'}>
                        <div className={`text-[12px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-emerald-400/80' : 'text-emerald-600/80'}`}>{t('paidTotalAmount', "To'langan umumiy summa")}</div>
                        <div className={`text-[24px] font-black tracking-tight ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{todayStats.totals.paidTotal.toLocaleString()} UZS</div>
                    </PremiumCard>
                    
                    {/* Remaining */}
                    <PremiumCard isDark={isDark} hoverLift={false} padding="p-5" className={isDark ? '!bg-rose-500/[0.04] !border-rose-500/[0.15]' : '!bg-rose-50/50 !border-rose-200/50'}>
                        <div className={`text-[12px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-rose-400/80' : 'text-rose-600/80'}`}>{t('remainingTotalDebt', 'Qolgan umumiy qarz')}</div>
                        <div className={`text-[24px] font-black tracking-tight ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>{todayStats.totals.debtTotal.toLocaleString()} UZS</div>
                    </PremiumCard>
                </div>

                {/* Two columns */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {/* COMPLETED COLUMN */}
                    <PremiumCard isDark={isDark} padding="p-5 sm:p-6" hoverLift={false}>
                        <h4 className={`text-[17px] font-bold mb-5 tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {t('driversPaidToday')} <span className={`font-semibold ml-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>({todayStats.completed.length} {t('paid')})</span>
                        </h4>

                        {filteredCompleted.length > 0 ? (
                            <div className="space-y-2">
                                {displayedCompleted.map((driver, i) => {
                                    const driverCar = cars.find(c => c.id === driver.historicalCarId) || cars.find(c => c.assignedDriverId === driver.id);
                                    return (
                                        <div key={driver.id} className={`group relative flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-black/[0.02]'}`}>
                                            {/* Green indicator bar */}
                                            <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-emerald-500" />
                                            
                                            {/* Avatar */}
                                            <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 border transition-transform duration-300 group-hover:scale-[1.05] border-transparent shadow-sm">
                                                {driver.avatar
                                                    ? <img src={driver.avatar} className="w-full h-full object-cover" alt={driver.name} />
                                                    : <div className={`w-full h-full flex items-center justify-center text-sm font-bold ${isDark ? 'bg-[#2d3449] text-gray-300' : 'bg-gray-100 text-gray-600'}`}>{driver.name?.charAt(0)}</div>
                                                }
                                            </div>
                                            {/* Info */}
                                            <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                                                <span className={`text-[15px] font-bold truncate leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{driver.name}</span>
                                                {driverCar ? (
                                                    <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                                        <span className={`text-[13px] font-semibold truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{driverCar.name}</span>
                                                        <LicensePlate plate={driverCar.licensePlate} size="sm" />
                                                    </div>
                                                ) : driver.fallbackCarName ? (
                                                    <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                                        <span className={`text-[13px] font-semibold truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{driver.fallbackCarName.split(' — ')[0]}</span>
                                                        {driver.fallbackCarName.includes(' — ') && (
                                                            <LicensePlate plate={driver.fallbackCarName.split(' — ')[1]} size="sm" />
                                                        )}
                                                    </div>
                                                ) : null}
                                            </div>
                                            {/* Amount & Check */}
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                {renderTelegramMessageButton(driver)}
                                                <span className={`text-[14px] font-bold tabular-nums tracking-tight ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                                    +{(driver.todayIncome || 0).toLocaleString()} UZS
                                                </span>
                                                <div className="w-8 h-8 flex items-center justify-center -mr-2">
                                                    <Lottie animationData={badgeAnimation} loop={false} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {filteredCompleted.length > STATUS_VISIBLE && (
                                    <button
                                        onClick={() => setShowAllCompleted(v => !v)}
                                        className={`mt-4 w-full py-3 rounded-xl text-[14px] font-bold transition-all active:scale-[0.98] ${isDark ? 'bg-white/[0.04] hover:bg-white/[0.08] text-[rgba(235,235,245,0.7)] hover:text-white' : 'bg-black/[0.03] hover:bg-black/[0.06] text-[rgba(60,60,67,0.7)] hover:text-black'}`}
                                    >
                                        {showAllCompleted ? t('collapse') : t('showMore', { count: filteredCompleted.length - STATUS_VISIBLE })}
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className={`flex flex-col items-center justify-center py-12 rounded-2xl ${isDark ? 'bg-[#222a3d]' : 'bg-gray-50/50'}`}>
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${isDark ? 'bg-emerald-500/[0.08]' : 'bg-emerald-500/10'}`}>
                                    <MedalIcon className={`w-7 h-7 ${isDark ? 'text-emerald-400/80' : 'text-emerald-500/80'}`} />
                                </div>
                                <p className={`text-[15px] font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t('noPaymentsYet')}</p>
                            </div>
                        )}
                    </PremiumCard>

                    {/* PENDING COLUMN */}
                    <PremiumCard isDark={isDark} padding="p-5 sm:p-6" hoverLift={false}>
                        <h4 className={`text-[17px] font-bold mb-5 tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {t('pendingPaymentsLabel')} <span className={`font-semibold ml-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>({todayStats.pending.length} {t('statusPending')})</span>
                        </h4>

                        {filteredPending.length > 0 ? (
                            <div className="space-y-2">
                                {displayedPending.map(driver => {
                                    const plan = driver.dailyPlan || 0;
                                    const paid = driver.todayIncome || 0;
                                    const remaining = Math.max(0, plan - paid);
                                    const driverCar = cars.find(c => c.id === driver.historicalCarId) || cars.find(c => c.assignedDriverId === driver.id);
                                    return (
                                        <div key={driver.id} className={`group flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-black/[0.02]'}`}>
                                            {/* Avatar */}
                                            <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 border border-transparent shadow-sm transition-transform duration-300 group-hover:scale-[1.05]">
                                                {driver.avatar
                                                    ? <img src={driver.avatar} className="w-full h-full object-cover" alt={driver.name} />
                                                    : <div className={`w-full h-full flex items-center justify-center text-sm font-bold ${isDark ? 'bg-[#2d3449] text-gray-300' : 'bg-gray-100 text-gray-600'}`}>{driver.name?.charAt(0)}</div>
                                                }
                                            </div>
                                            {/* Info */}
                                            <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                                                <span className={`text-[15px] font-bold truncate leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{driver.name}</span>
                                                {driverCar ? (
                                                    <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                                        <span className={`text-[13px] font-semibold truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{driverCar.name}</span>
                                                        <LicensePlate plate={driverCar.licensePlate} size="sm" />
                                                    </div>
                                                ) : driver.fallbackCarName ? (
                                                    <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                                        <span className={`text-[13px] font-semibold truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{driver.fallbackCarName.split(' — ')[0]}</span>
                                                        {driver.fallbackCarName.includes(' — ') && (
                                                            <LicensePlate plate={driver.fallbackCarName.split(' — ')[1]} size="sm" />
                                                        )}
                                                    </div>
                                                ) : null}
                                            </div>
                                            {/* Amount */}
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {renderTelegramMessageButton(driver)}
                                                <div className="flex flex-col items-end justify-center">
                                                    <span className={`text-[15px] font-black tabular-nums tracking-tight ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>
                                                        −{remaining.toLocaleString()} UZS
                                                    </span>
                                                    {paid > 0 && (
                                                        <span className={`text-[11px] font-bold tracking-wide uppercase mt-1 ${isDark ? 'text-emerald-400/80' : 'text-emerald-600/80'}`}>
                                                            +{paid.toLocaleString()} to'landi
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {filteredPending.length > STATUS_VISIBLE && (
                                    <button
                                        onClick={() => setShowAllPending(v => !v)}
                                        className={`mt-4 w-full py-3 rounded-xl text-[14px] font-bold transition-all active:scale-[0.98] ${isDark ? 'bg-white/[0.04] hover:bg-white/[0.08] text-[rgba(235,235,245,0.7)] hover:text-white' : 'bg-black/[0.03] hover:bg-black/[0.06] text-[rgba(60,60,67,0.7)] hover:text-black'}`}
                                    >
                                        {showAllPending ? t('collapse') : t('showMore', { count: filteredPending.length - STATUS_VISIBLE })}
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className={`flex flex-col items-center justify-center py-12 rounded-2xl ${isDark ? 'bg-[#222a3d]' : 'bg-gray-50/50'}`}>
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${isDark ? 'bg-emerald-500/[0.08]' : 'bg-emerald-500/10'}`}>
                                    <MedalIcon className={`w-7 h-7 ${isDark ? 'text-emerald-400/80' : 'text-emerald-500/80'}`} />
                                </div>
                                <p className={`text-[15px] font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t('allPaidToday')}</p>
                            </div>
                        )}
                    </PremiumCard>
                </div>

                {/* ── Day-off section (If any) ────────────────────────────── */}
                {todayStats.dayOff.length > 0 && (
                    <PremiumCard isDark={isDark} padding="p-5 sm:p-6" hoverLift={false} className="mt-6">
                        <h4 className={`text-[17px] font-bold mb-5 flex items-center gap-2 tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
                            {t('legendDayOff')} <span className={`font-semibold ml-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>({todayStats.dayOff.length})</span>
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {todayStats.dayOff.map(driver => {
                                const driverCar = cars.find(c => c.id === driver.historicalCarId) || cars.find(c => c.assignedDriverId === driver.id);
                                return (
                                    <div key={driver.id} className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 ${isDark ? 'bg-white/[0.03] border border-white/[0.05]' : 'bg-gray-50 border border-gray-100'}`}>
                                        <div className="w-11 h-11 rounded-full overflow-hidden ring-2 ring-indigo-500/20 grayscale-[0.5] flex-shrink-0 shadow-sm">
                                            {driver.avatar
                                                ? <img src={driver.avatar} className="w-full h-full object-cover" alt={driver.name} />
                                                : <div className={`w-full h-full flex items-center justify-center text-sm font-bold ${isDark ? 'bg-[#2d3449] text-gray-300' : 'bg-gray-100 text-gray-600'}`}>{driver.name?.charAt(0)}</div>
                                            }
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                                            <p className={`text-[15px] font-bold truncate leading-tight ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{driver.name}</p>
                                            {driverCar ? (
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`text-[13px] font-semibold truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{driverCar.name}</span>
                                                    <LicensePlate plate={driverCar.licensePlate} size="sm" />
                                                </div>
                                            ) : driver.fallbackCarName ? (
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`text-[13px] font-semibold truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{driver.fallbackCarName.split(' — ')[0]}</span>
                                                    {driver.fallbackCarName.includes(' — ') && (
                                                        <LicensePlate plate={driver.fallbackCarName.split(' — ')[1]} size="sm" />
                                                    )}
                                                </div>
                                            ) : null}
                                        </div>
                                        {renderTelegramMessageButton(driver)}
                                    </div>
                                );
                            })}
                        </div>
                    </PremiumCard>
                )}
            </div>

            {messageDriver && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={closeMessageModal}
                    />
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="telegram-message-title"
                        className={`relative w-full max-w-lg rounded-2xl border shadow-2xl ${isDark ? 'bg-[#151b2b] border-white/[0.08]' : 'bg-white border-black/[0.08]'}`}
                    >
                        <div className={`px-5 py-4 border-b ${isDark ? 'border-white/[0.08]' : 'border-black/[0.08]'}`}>
                            <h3 id="telegram-message-title" className={`text-[18px] font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                Telegram xabar yuborish
                            </h3>
                            <p className={`mt-1 text-[13px] font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                {messageDriver.name}
                            </p>
                        </div>

                        <div className="p-5 space-y-4">
                            {!messageDriver.telegram && (
                                <div className={`rounded-xl px-4 py-3 text-[13px] font-semibold ${isDark ? 'bg-amber-500/[0.10] text-amber-300' : 'bg-amber-50 text-amber-700'}`}>
                                    Bu haydovchida Telegram ulanmagan.
                                </div>
                            )}
                            <textarea
                                value={customMessage}
                                onChange={event => setCustomMessage(event.target.value)}
                                placeholder="Xabar matni..."
                                disabled={!messageDriver.telegram || isSendingMessage}
                                rows={5}
                                className={`w-full resize-none rounded-xl border px-4 py-3 text-[14px] font-medium outline-none transition-all disabled:cursor-not-allowed disabled:opacity-60 ${isDark
                                    ? 'bg-[#20283a] border-white/[0.08] text-white placeholder:text-gray-500 focus:border-cyan-400'
                                    : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-cyan-600'
                                }`}
                            />
                        </div>

                        <div className={`flex items-center justify-end gap-3 px-5 py-4 border-t ${isDark ? 'border-white/[0.08]' : 'border-black/[0.08]'}`}>
                            <button
                                type="button"
                                onClick={closeMessageModal}
                                disabled={isSendingMessage}
                                className={`px-4 py-2.5 rounded-xl text-[14px] font-bold transition-all active:scale-95 disabled:opacity-60 ${isDark ? 'bg-white/[0.06] text-gray-200 hover:bg-white/[0.10]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                            >
                                Bekor qilish
                            </button>
                            <button
                                type="button"
                                onClick={handleSendTelegramMessage}
                                disabled={!messageDriver.telegram || !customMessage.trim() || isSendingMessage}
                                className={`px-5 py-2.5 rounded-xl text-[14px] font-black transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${isDark ? 'bg-cyan-500 text-[#061116] hover:bg-cyan-400' : 'bg-cyan-700 text-white hover:bg-cyan-800'}`}
                            >
                                {isSendingMessage ? 'Yuborilmoqda...' : 'Yuborish'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardPage;
