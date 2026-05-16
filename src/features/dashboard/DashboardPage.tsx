import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboardStats } from './hooks/useDashboardStats';
import DateFilter from '../../../components/DateFilter';
import NumberTooltip from '../../../components/NumberTooltip';
import Skeleton from '../../../components/Skeleton';
import {
    TrendingUpIcon, TrendingDownIcon, WalletIcon, MedalIcon
} from '../../../components/Icons';
import { formatNumberSmart } from '../../../utils/formatNumber';
import { Transaction, Driver, Language } from '../../core/types';
import { Car } from '../../core/types/car.types';
import Lottie from 'lottie-react';
import badgeAnimation from '../../../Images/badge.json';
import { MetricCard } from '../../../components/MetricCard';
import { LicensePlate } from '../../components/ui/LicensePlate';

interface DashboardPageProps {
    transactions: Transaction[];
    drivers: Driver[];
    cars: Car[];
    isDataLoading: boolean;
    // language, t removed - using hooks
    theme: 'light' | 'dark';
    isMobile: boolean;
}

const DashboardPage: React.FC<DashboardPageProps> = ({
    transactions,
    drivers,
    cars,
    isDataLoading,
    theme,
    isMobile
}) => {
    const { t, i18n } = useTranslation();
    // Ensure accurate type for helpers that expect specific Language string
    const currentLanguage = (['uz', 'ru', 'en'].includes(i18n.language) ? i18n.language : 'uz') as Language;
    const months = t('months', { returnObjects: true }) as string[];
    const weekdays = t('weekdays', { returnObjects: true }) as string[];

    const {
        timeFilter, setTimeFilter,
        totalIncome, totalExpense, netProfit,
        todayStats
    } = useDashboardStats(transactions, drivers, cars);

    const isDark = theme === 'dark';

    const [statusSearch, setStatusSearch] = useState('');
    const [showAllCompleted, setShowAllCompleted] = useState(false);
    const [showAllPending, setShowAllPending] = useState(false);

    const STATUS_VISIBLE = 8;

    const searchLower = statusSearch.toLowerCase();
    const filteredCompleted = todayStats.completed.filter(d => d.name.toLowerCase().includes(searchLower));
    const filteredPending = todayStats.pending.filter(d => d.name.toLowerCase().includes(searchLower));
    const displayedCompleted = showAllCompleted ? filteredCompleted : filteredCompleted.slice(0, STATUS_VISIBLE);
    const displayedPending = showAllPending ? filteredPending : filteredPending.slice(0, STATUS_VISIBLE);

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

            {/* MAIN STATS ROW - FULL WIDTH */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {isDataLoading ? (
                    <>
                        <div className="rounded-2xl sm:rounded-3xl p-5 sm:p-6" style={{ background: 'linear-gradient(135deg,#0a6b62,#0f766e)' }}>
                            <div className="flex flex-col gap-3">
                                <Skeleton variant="rectangular" width="40%" height={12} theme="dark" />
                                <Skeleton variant="rectangular" width="70%" height={32} theme="dark" />
                                <Skeleton variant="rectangular" width="30%" height={10} theme="dark" />
                            </div>
                        </div>
                        <div className={`p-5 sm:p-6 rounded-2xl sm:rounded-3xl border ${isDark ? 'bg-surface border-white/[0.10]' : 'bg-white border-black/[0.07]'}`}>
                            <div className="flex flex-col gap-3">
                                <Skeleton variant="rectangular" width="40%" height={12} theme={theme} />
                                <Skeleton variant="rectangular" width="70%" height={32} theme={theme} />
                                <Skeleton variant="rectangular" width="30%" height={10} theme={theme} />
                            </div>
                        </div>
                        <div className={`p-5 sm:p-6 rounded-2xl sm:rounded-3xl border sm:col-span-2 lg:col-span-1 ${isDark ? 'bg-surface border-white/[0.10]' : 'bg-white border-black/[0.07]'}`}>
                            <div className="flex flex-col gap-3">
                                <Skeleton variant="rectangular" width="40%" height={12} theme={theme} />
                                <Skeleton variant="rectangular" width="70%" height={32} theme={theme} />
                                <Skeleton variant="rectangular" width="30%" height={10} theme={theme} />
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <MetricCard title={t('totalIncome')} value={totalIncome} type="income" icon={TrendingUpIcon} isDark={isDark} />
                        <MetricCard title={t('totalExpense')} value={totalExpense} type="expense" icon={TrendingDownIcon} isDark={isDark} />
                        <div className="sm:col-span-2 lg:col-span-1">
                            <MetricCard title={t('netProfit')} value={netProfit} type="profit" icon={WalletIcon} isDark={isDark} showPlusSign />
                        </div>
                    </>
                )}
            </div>

            {/* DAILY PAYMENT STATUS - NEW LAYOUT */}
            <div className="mt-8">
                {/* ── Header ─────────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                        <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {t('todayStatus')}
                        </h3>
                    </div>
                    {/* Summary pills / Search */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {(todayStats.completed.length + todayStats.pending.length) > STATUS_VISIBLE && (
                            <div className="relative">
                                <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDark ? 'text-[rgba(235,235,245,0.3)]' : 'text-[rgba(60,60,67,0.3)]'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                                    className={`w-[180px] sm:w-[220px] pl-9 pr-4 py-2 rounded-xl text-[13px] border outline-none transition-colors ${isDark
                                        ? 'bg-surface border-white/[0.10] text-white placeholder-[rgba(235,235,245,0.3)] focus:border-[#0d9488]'
                                        : 'bg-white border-black/[0.07] text-black placeholder-[rgba(60,60,67,0.35)] focus:border-[#0f766e]'
                                    }`}
                                />
                                {statusSearch && (
                                    <button onClick={() => setStatusSearch('')} className={`absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold ${isDark ? 'text-[rgba(235,235,245,0.4)]' : 'text-[rgba(60,60,67,0.4)]'}`}>✕</button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Two columns ────────────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

                    {/* COMPLETED COLUMN */}
                    <div className={`p-5 sm:p-6 rounded-2xl sm:rounded-3xl border ${isDark ? 'bg-surface border-white/[0.08]' : 'bg-white border-black/[0.06]'}`}>
                        <h4 className={`text-base font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {t('driversPaidToday')} <span className={`font-medium ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>({todayStats.completed.length} {t('paid')})</span>
                        </h4>

                        {filteredCompleted.length > 0 ? (
                            <div className="space-y-3">
                                {displayedCompleted.map((driver, i) => {
                                    const driverCar = cars.find(c => c.assignedDriverId === driver.id);
                                    return (
                                        <div key={driver.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border-l-[4px] border-emerald-500 transition-colors ${isDark ? 'bg-emerald-500/[0.05]' : 'bg-emerald-50/60'}`}>
                                            {/* Avatar */}
                                            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                                                {driver.avatar
                                                    ? <img src={driver.avatar} className="w-full h-full object-cover" alt={driver.name} />
                                                    : <div className={`w-full h-full flex items-center justify-center text-sm font-bold ${isDark ? 'bg-surface-2 text-[rgba(235,235,245,0.6)]' : 'bg-white/50 text-emerald-700'}`}>{driver.name?.charAt(0)}</div>
                                                }
                                            </div>
                                            {/* Info */}
                                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                <span className={`text-[14px] font-bold truncate leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{driver.name}</span>
                                                {driverCar && (
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <span className={`text-[12px] font-medium truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{driverCar.name}</span>
                                                        <LicensePlate plate={driverCar.licensePlate} size="sm" />
                                                    </div>
                                                )}
                                            </div>
                                            {/* Amount & Check */}
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <span className={`text-[13px] font-bold tabular-nums ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                                    +{(driver.todayIncome || 0).toLocaleString()} UZS
                                                </span>
                                                <div className="w-8 h-8 flex items-center justify-center -mr-1">
                                                    <Lottie animationData={badgeAnimation} loop={false} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {filteredCompleted.length > STATUS_VISIBLE && (
                                    <button
                                        onClick={() => setShowAllCompleted(v => !v)}
                                        className={`mt-2 w-full py-2.5 rounded-xl text-[13px] font-semibold transition-colors ${isDark ? 'bg-white/[0.05] hover:bg-white/[0.09] text-[rgba(235,235,245,0.55)]' : 'bg-black/[0.04] hover:bg-black/[0.07] text-[rgba(60,60,67,0.6)]'}`}
                                    >
                                        {showAllCompleted ? t('collapse') : t('showMore', { count: filteredCompleted.length - STATUS_VISIBLE })}
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className={`flex flex-col items-center justify-center py-10 rounded-2xl ${isDark ? 'bg-surface-2' : 'bg-gray-50'}`}>
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-100'}`}>
                                    <MedalIcon className={`w-6 h-6 ${isDark ? 'text-emerald-500/50' : 'text-emerald-500/50'}`} />
                                </div>
                                <p className={`text-sm font-medium ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t('noPaymentsYet')}</p>
                            </div>
                        )}
                    </div>

                    {/* PENDING COLUMN */}
                    <div className={`p-5 sm:p-6 rounded-2xl sm:rounded-3xl border ${isDark ? 'bg-surface border-white/[0.08]' : 'bg-white border-black/[0.06]'}`}>
                        <h4 className={`text-base font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {t('pendingPaymentsLabel')} <span className={`font-medium ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>({todayStats.pending.length} {t('statusPending')})</span>
                        </h4>

                        {filteredPending.length > 0 ? (
                            <div className="space-y-3">
                                {displayedPending.map(driver => {
                                    const plan = driver.dailyPlan || 0;
                                    const paid = driver.todayIncome || 0;
                                    const remaining = Math.max(0, plan - paid);
                                    const driverCar = cars.find(c => c.assignedDriverId === driver.id);
                                    return (
                                        <div key={driver.id} className={`flex items-center gap-3 px-2 py-3 transition-colors`}>
                                            {/* Avatar */}
                                            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                                                {driver.avatar
                                                    ? <img src={driver.avatar} className="w-full h-full object-cover" alt={driver.name} />
                                                    : <div className={`w-full h-full flex items-center justify-center text-sm font-bold ${isDark ? 'bg-surface text-[rgba(235,235,245,0.6)]' : 'bg-gray-100 text-gray-600'}`}>{driver.name?.charAt(0)}</div>
                                                }
                                            </div>
                                            {/* Info */}
                                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                <span className={`text-[14px] font-bold truncate leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{driver.name}</span>
                                                {driverCar && (
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <span className={`text-[12px] font-medium truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{driverCar.name}</span>
                                                        <LicensePlate plate={driverCar.licensePlate} size="sm" />
                                                    </div>
                                                )}
                                            </div>
                                            {/* Amount */}
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <span className={`text-[13px] font-bold tabular-nums text-rose-500`}>
                                                    −{remaining.toLocaleString()} UZS
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                                {filteredPending.length > STATUS_VISIBLE && (
                                    <button
                                        onClick={() => setShowAllPending(v => !v)}
                                        className={`mt-2 w-full py-2.5 rounded-xl text-[13px] font-semibold transition-colors ${isDark ? 'bg-white/[0.05] hover:bg-white/[0.09] text-[rgba(235,235,245,0.55)]' : 'bg-black/[0.04] hover:bg-black/[0.07] text-[rgba(60,60,67,0.6)]'}`}
                                    >
                                        {showAllPending ? t('collapse') : t('showMore', { count: filteredPending.length - STATUS_VISIBLE })}
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className={`flex flex-col items-center justify-center py-10 rounded-2xl ${isDark ? 'bg-surface-2' : 'bg-gray-50'}`}>
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-100'}`}>
                                    <MedalIcon className={`w-6 h-6 ${isDark ? 'text-emerald-500/50' : 'text-emerald-500/50'}`} />
                                </div>
                                <p className={`text-sm font-medium ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t('allPaidToday')}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Day-off section (If any) ────────────────────────────── */}
                {todayStats.dayOff.length > 0 && (
                    <div className={`mt-6 p-5 sm:p-6 rounded-2xl sm:rounded-3xl border ${isDark ? 'bg-surface border-white/[0.08]' : 'bg-white border-black/[0.06]'}`}>
                        <h4 className={`text-base font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />
                            {t('legendDayOff')} <span className={`font-medium ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>({todayStats.dayOff.length})</span>
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {todayStats.dayOff.map(driver => {
                                const driverCar = cars.find(c => c.assignedDriverId === driver.id);
                                return (
                                    <div key={driver.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${isDark ? 'bg-surface-2 border-white/[0.08]' : 'bg-white border-gray-200'}`}>
                                        <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-indigo-400/30 grayscale-[0.4] flex-shrink-0">
                                            {driver.avatar
                                                ? <img src={driver.avatar} className="w-full h-full object-cover" alt={driver.name} />
                                                : <div className={`w-full h-full flex items-center justify-center text-sm font-bold ${isDark ? 'bg-surface text-[rgba(235,235,245,0.6)]' : 'bg-gray-100 text-gray-600'}`}>{driver.name?.charAt(0)}</div>
                                            }
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <p className={`text-[14px] font-bold truncate leading-tight ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{driver.name}</p>
                                            {driverCar && (
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className={`text-[12px] font-medium truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{driverCar.name}</span>
                                                    <LicensePlate plate={driverCar.licensePlate} size="sm" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardPage;
