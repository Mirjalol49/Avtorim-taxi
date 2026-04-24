import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboardStats } from './hooks/useDashboardStats';
import DateFilter from '../../../components/DateFilter';
import NumberTooltip from '../../../components/NumberTooltip';
import Skeleton from '../../../components/Skeleton';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
    TrendingUpIcon, TrendingDownIcon, WalletIcon, LayoutDashboardIcon, GridIcon, MedalIcon
} from '../../../components/Icons';
import { formatNumberSmart } from '../../../utils/formatNumber';
import { Transaction, Driver, Language } from '../../core/types';
import { Car } from '../../core/types/car.types';
import Lottie from 'lottie-react';
import badgeAnimation from '../../../Images/badge.json';

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
        dashboardViewMode, setDashboardViewMode,
        dashboardPage, setDashboardPage, dashboardItemsPerPage,
        totalIncome, totalExpense, netProfit,
        chartData, todayStats
    } = useDashboardStats(transactions, drivers, cars);

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
                        <div className="bg-[#0f766e] p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl shadow-md">
                            <div className="flex flex-col gap-3">
                                <Skeleton variant="rectangular" width="40%" height={12} theme="dark" />
                                <Skeleton variant="rectangular" width="70%" height={32} theme="dark" />
                                <Skeleton variant="rectangular" width="30%" height={10} theme="dark" />
                            </div>
                        </div>
                        <div className={`p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border shadow-lg ${theme === 'dark' ? 'bg-[#13141A] border-white/[0.08]' : 'bg-white border-gray-100'}`}>
                            <div className="flex flex-col gap-3">
                                <Skeleton variant="rectangular" width="40%" height={12} theme={theme} />
                                <Skeleton variant="rectangular" width="70%" height={32} theme={theme} />
                                <Skeleton variant="rectangular" width="30%" height={10} theme={theme} />
                            </div>
                        </div>
                        <div className={`p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border shadow-lg sm:col-span-2 lg:col-span-1 ${theme === 'dark' ? 'bg-[#13141A] border-white/[0.08]' : 'bg-white border-gray-100'}`}>
                            <div className="flex flex-col gap-3">
                                <Skeleton variant="rectangular" width="40%" height={12} theme={theme} />
                                <Skeleton variant="rectangular" width="70%" height={32} theme={theme} />
                                <Skeleton variant="rectangular" width="30%" height={10} theme={theme} />
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Income */}
                        <div className="bg-[#0f766e] p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl shadow-md relative overflow-hidden group transition-all hover:shadow-lg">
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <TrendingUpIcon className="w-12 sm:w-16 md:w-20 h-12 sm:h-16 md:h-20 text-white" />
                            </div>
                            <div className="flex flex-col justify-between relative z-10 gap-2 sm:gap-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-white/10 rounded-lg text-white border border-white/10 flex-shrink-0">
                                        <TrendingUpIcon className="w-4 sm:w-4 md:w-5 h-4 sm:h-4 md:h-5" />
                                    </div>
                                    <p className="text-[10px] sm:text-[10px] md:text-[11px] text-teal-100/80 font-bold uppercase tracking-wide">{t('totalIncome')}</p>
                                </div>
                                <div>
                                    <NumberTooltip value={totalIncome} label={t('totalIncome')} theme={theme}>
                                        <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-4xl font-black text-white tracking-tight leading-none font-mono cursor-help whitespace-nowrap">
                                            {formatNumberSmart(totalIncome, isMobile, currentLanguage)}
                                        </h3>
                                    </NumberTooltip>
                                    <p className="text-[10px] sm:text-[11px] md:text-xs text-teal-100/60 font-medium mt-1.5 ml-0.5">UZS</p>
                                </div>
                            </div>
                        </div>

                        {/* Expense */}
                        <div className={`p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border shadow-lg relative overflow-hidden group transition-all ${theme === 'dark' ? 'bg-[#13141A] border-white/[0.08]' : 'bg-white border-gray-100'}`}>
                            <div className={`absolute top-0 right-0 p-3 transition-opacity ${theme === 'dark' ? 'opacity-5 group-hover:opacity-10' : 'opacity-[0.08] group-hover:opacity-[0.12]'}`}>
                                <TrendingDownIcon className={`w-12 sm:w-16 md:w-20 h-12 sm:h-16 md:h-20 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`} />
                            </div>
                            <div className="flex flex-col justify-between relative z-10 gap-2 sm:gap-3">
                                <div className="flex items-center gap-2">
                                    <div className={`p-1.5 rounded-lg border flex-shrink-0 ${theme === 'dark' ? 'bg-[#1C1D23] text-red-400 border-white/[0.08]' : 'bg-red-50 text-red-500 border-red-100'}`}>
                                        <TrendingDownIcon className="w-4 sm:w-4 md:w-5 h-4 sm:h-4 md:h-5" />
                                    </div>
                                    <p className={`text-[10px] sm:text-[10px] md:text-[11px] font-bold uppercase tracking-wide ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`}>{t('totalExpense')}</p>
                                </div>
                                <div>
                                    <NumberTooltip value={totalExpense} label={t('totalExpense')} theme={theme}>
                                        <h3 className={`text-2xl sm:text-3xl md:text-4xl lg:text-4xl font-black tracking-tight leading-none font-mono cursor-help whitespace-nowrap ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                            {formatNumberSmart(totalExpense, isMobile, currentLanguage)}
                                        </h3>
                                    </NumberTooltip>
                                    <p className={`text-[10px] sm:text-[11px] md:text-xs font-medium mt-1.5 ml-0.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>UZS</p>
                                </div>
                            </div>
                        </div>

                        {/* Net Profit */}
                        <div className={`p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border shadow-lg relative overflow-hidden group transition-all sm:col-span-2 lg:col-span-1 ${theme === 'dark' ? 'bg-[#13141A] border-white/[0.08]' : 'bg-white border-gray-100'}`}>
                            <div className={`absolute top-0 right-0 p-3 transition-opacity ${theme === 'dark' ? 'opacity-5 group-hover:opacity-10' : 'opacity-[0.08] group-hover:opacity-[0.12]'}`}>
                                <WalletIcon className={`w-12 sm:w-16 md:w-20 h-12 sm:h-16 md:h-20 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`} />
                            </div>
                            <div className="flex flex-col justify-between relative z-10 gap-2 sm:gap-3">
                                <div className="flex items-center gap-2">
                                    <div className={`p-1.5 rounded-lg border flex-shrink-0 ${theme === 'dark' ? 'bg-[#1C1D23] text-[#0f766e] border-white/[0.08]' : 'bg-[#0f766e]/10 text-[#0f766e] border-[#0f766e]/20'}`}>
                                        <WalletIcon className="w-4 sm:w-4 md:w-5 h-4 sm:h-4 md:h-5" />
                                    </div>
                                    <p className={`text-[10px] sm:text-[10px] md:text-[11px] font-bold uppercase tracking-wide ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`}>{t('netProfit')}</p>
                                </div>
                                <div>
                                    <NumberTooltip value={netProfit} label={t('netProfit')} theme={theme}>
                                        <h3 className={`text-2xl sm:text-3xl md:text-4xl lg:text-4xl font-black tracking-tight leading-none font-mono cursor-help whitespace-nowrap ${netProfit >= 0 ? theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600' : theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                                            {netProfit > 0 ? '+' : ''}{formatNumberSmart(netProfit, isMobile, currentLanguage)}
                                        </h3>
                                    </NumberTooltip>
                                    <p className={`text-[10px] sm:text-[11px] md:text-xs font-medium mt-1.5 ml-0.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>UZS</p>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* CHART ROW */}
            <div className={`w-full ${dashboardViewMode === 'chart' ? 'h-[300px] sm:h-[400px] md:h-[500px]' : 'h-auto'} p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border flex flex-col shadow-xl ${theme === 'dark' ? 'bg-[#13141A] border-white/[0.08]' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <h3 className={`text-sm sm:text-base md:text-lg font-bold flex items-center gap-2 opacity-80 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        <LayoutDashboardIcon className={`w-4 sm:w-5 h-4 sm:h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                        {t('incomeVsExpense')}
                    </h3>
                    <div className={`flex items-center p-1.5 rounded-xl border shadow-sm ${theme === 'dark' ? 'bg-[#13141A] border-white/[0.08]' : 'bg-white border-gray-200'}`}>
                        <button onClick={() => setDashboardViewMode('chart')} className={`p-2 rounded-lg transition-all ${dashboardViewMode === 'chart' ? 'bg-[#0f766e] text-white shadow-md' : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
                            <LayoutDashboardIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDashboardViewMode('grid')} className={`p-2 rounded-lg transition-all ${dashboardViewMode === 'grid' ? 'bg-[#0f766e] text-white shadow-md' : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
                            <GridIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                    {dashboardViewMode === 'chart' ? (
                        <div className="-mx-2 sm:mx-0 h-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} barSize={20} margin={{ left: 0, right: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#E5E7EB'} vertical={false} />
                                    <XAxis dataKey="name" stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'} axisLine={false} tickLine={false} dy={10} fontSize={11} interval={0} angle={-45} textAnchor="end" height={60} />
                                    <YAxis stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'} axisLine={false} tickLine={false} dx={-10} fontSize={10} tickFormatter={(value) => {
                                        if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}${currentLanguage === 'en' ? 'B' : 'mlrd'}`;
                                        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}${currentLanguage === 'en' ? 'M' : 'mln'}`;
                                        if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                                        return value;
                                    }} />
                                    <Tooltip cursor={{ fill: theme === 'dark' ? 'rgba(55, 65, 81, 0.3)' : 'rgba(229, 231, 235, 0.3)' }} content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className={`p-3 rounded-xl border shadow-lg ${theme === 'dark' ? 'bg-[#13141A] border-white/[0.08]' : 'bg-white border-gray-200'}`}>
                                                    <p className={`text-sm font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{label}</p>
                                                    {payload.map((entry: any, index: number) => (
                                                        <div key={index} className="flex items-center gap-2 mb-1 last:mb-0">
                                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.fill }} />
                                                            <span className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{entry.dataKey === 'Income' ? t('income') : t('expense')}:</span>
                                                            <span className={`text-sm font-bold ${entry.dataKey === 'Income' ? 'text-[#0f766e]' : 'text-red-600'}`}>{entry.value.toLocaleString()}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        }
                                        return null;
                                    }} />
                                    <Bar dataKey="Income" fill="#0f766e" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Expense" fill="#dc2626" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        // Grid View
                        <div className="h-full flex flex-col">
                            {(() => {
                                const startIndex = (dashboardPage - 1) * dashboardItemsPerPage;
                                const paginatedData = chartData.slice(startIndex, startIndex + dashboardItemsPerPage);
                                const totalPages = Math.ceil(chartData.length / dashboardItemsPerPage);
                                return (
                                    <>
                                        <div className="flex-1 overflow-y-auto overflow-x-hidden pr-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4 items-start">
                                            {paginatedData.map((data: any, idx) => {
                                                const driver = drivers.find(d => d.id === data.id);
                                                const profit = data.Income - data.Expense;
                                                return (
                                                    <div key={idx} className={`p-5 rounded-xl border transition-all hover:shadow-md h-fit ${theme === 'dark' ? 'bg-[#1C1D23]/50 border-white/[0.08] hover:border-white/[0.12]' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                                                        <div className="flex items-center gap-3 mb-4">
                                                            {driver && (
                                                                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-300 dark:border-gray-600 flex-shrink-0">
                                                                    <img src={driver.avatar} alt={driver.name} className="w-full h-full object-cover" />
                                                                </div>
                                                            )}
                                                            <div className="min-w-0">
                                                                <h4 className={`font-bold text-sm whitespace-normal break-words ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{data.fullName}</h4>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-3">
                                                            {/* Income & Expense - Kept compact */}
                                                            <div className="space-y-2">
                                                                <div className="flex items-center justify-between">
                                                                    <span className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t('income')}</span>
                                                                    <span className="text-sm font-bold text-[#0f766e] font-mono">+{data.Income.toLocaleString()}</span>
                                                                </div>
                                                                <div className="flex items-center justify-between">
                                                                    <span className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t('expense')}</span>
                                                                    <span className="text-sm font-bold text-red-500 font-mono">-{data.Expense.toLocaleString()}</span>
                                                                </div>
                                                            </div>

                                                            {/* Net Profit - Vertical Stack (Block) */}
                                                            <div className={`pt-3 mt-2 border-t ${theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-200'}`}>
                                                                <div className="flex flex-col gap-1">
                                                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{t('netProfit')}</span>
                                                                    <span className={`text-xl font-black font-mono ${profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                                        {profit > 0 ? '+' : ''}{profit.toLocaleString()}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    )}
                </div>
            </div>

            {/* DAILY PAYMENT STATUS */}
            <div className={`rounded-3xl border shadow-xl overflow-hidden ${theme === 'dark' ? 'bg-[#13141A] border-white/[0.06]' : 'bg-white border-gray-200'}`}>

                {/* ── Header ─────────────────────────────────────────────── */}
                <div className={`px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b ${theme === 'dark' ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                    <div>
                        <p className={`text-[11px] font-semibold uppercase tracking-widest mb-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                            {new Date().getDate()} {months[new Date().getMonth()]}, {weekdays[new Date().getDay()]}
                        </p>
                        <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {t('todayStatus')}
                        </h3>
                    </div>
                    {/* Summary pills */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${theme === 'dark' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                            {todayStats.completed.length} {t('paid')}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${theme === 'dark' ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600'}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block" />
                            {todayStats.pending.length} {t('statusPending')}
                        </span>
                        {todayStats.dayOff.length > 0 && (
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${theme === 'dark' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />
                                {todayStats.dayOff.length} Dam olish
                            </span>
                        )}
                    </div>
                </div>

                {/* ── Two columns ────────────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.05]">

                    {/* COMPLETED */}
                    <div className="p-6 space-y-1">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className={`text-[11px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                {t('driversPaidToday')}
                            </span>
                        </div>

                        {todayStats.completed.length > 0 ? (
                            <div className={`rounded-2xl overflow-hidden divide-y ${theme === 'dark' ? 'divide-white/[0.05] bg-[#1C1D23]' : 'divide-gray-100 bg-gray-50'}`}>
                                {todayStats.completed.map((driver, i) => {
                                    const plan = driver.dailyPlan || 1;
                                    const pct = Math.min(100, Math.round((driver.todayIncome / plan) * 100));
                                    return (
                                        <div key={driver.id} className={`flex items-center gap-3 px-4 py-3.5 transition-colors ${theme === 'dark' ? 'hover:bg-white/[0.03]' : 'hover:bg-white'}`}>
                                            {/* Avatar */}
                                            <div className="relative flex-shrink-0">
                                                <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-emerald-500/60">
                                                    {driver.avatar
                                                        ? <img src={driver.avatar} className="w-full h-full object-cover" alt={driver.name} />
                                                        : <div className={`w-full h-full flex items-center justify-center text-sm font-bold ${theme === 'dark' ? 'bg-[#1C1D23] text-gray-300' : 'bg-gray-200 text-gray-600'}`}>{driver.name?.charAt(0)}</div>
                                                    }
                                                </div>
                                                {/* Rank badge */}
                                                {i < 3 && (
                                                    <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black border ${
                                                        i === 0 ? 'bg-yellow-400 text-yellow-900 border-yellow-300'
                                                        : i === 1 ? 'bg-gray-300 text-gray-700 border-gray-200'
                                                        : 'bg-amber-600 text-white border-amber-500'
                                                    }`}>{i + 1}</span>
                                                )}
                                            </div>
                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                                    <span className={`text-sm font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{driver.name}</span>
                                                    <span className={`text-xs font-bold tabular-nums flex-shrink-0 text-emerald-500`}>
                                                        +{(driver.todayIncome || 0).toLocaleString()}
                                                    </span>
                                                </div>
                                                {/* Progress bar */}
                                                <div className={`h-1 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-[#1C1D23]' : 'bg-gray-200'}`}>
                                                    <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                            {/* Lottie trophy */}
                                            <div className="w-8 h-8 flex-shrink-0">
                                                <Lottie animationData={badgeAnimation} loop={false} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className={`flex flex-col items-center justify-center py-12 rounded-2xl ${theme === 'dark' ? 'bg-[#1C1D23]' : 'bg-gray-50'}`}>
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${theme === 'dark' ? 'bg-white/[0.07]' : 'bg-gray-100'}`}>
                                    <MedalIcon className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} />
                                </div>
                                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{t('noPaymentsYet')}</p>
                            </div>
                        )}
                    </div>

                    {/* PENDING */}
                    <div className="p-6 space-y-1">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="w-2 h-2 rounded-full bg-orange-500" />
                            <span className={`text-[11px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`}>
                                {t('pendingPaymentsLabel')}
                            </span>
                        </div>

                        {todayStats.pending.length > 0 ? (
                            <div className={`rounded-2xl overflow-hidden divide-y ${theme === 'dark' ? 'divide-white/[0.05] bg-[#1C1D23]' : 'divide-gray-100 bg-gray-50'}`}>
                                {todayStats.pending.map(driver => {
                                    const plan = driver.dailyPlan || 750000;
                                    const paid = driver.todayIncome || 0;
                                    const remaining = Math.max(0, plan - paid);
                                    const pct = Math.min(100, Math.round((paid / plan) * 100));
                                    const barColor = pct >= 70 ? 'bg-amber-400' : pct >= 30 ? 'bg-orange-500' : 'bg-red-500';
                                    return (
                                        <div key={driver.id} className={`flex items-center gap-3 px-4 py-3.5 transition-colors ${theme === 'dark' ? 'hover:bg-white/[0.03]' : 'hover:bg-white'}`}>
                                            {/* Avatar */}
                                            <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-orange-500/30 flex-shrink-0 grayscale-[0.2]">
                                                {driver.avatar
                                                    ? <img src={driver.avatar} className="w-full h-full object-cover" alt={driver.name} />
                                                    : <div className={`w-full h-full flex items-center justify-center text-sm font-bold ${theme === 'dark' ? 'bg-[#1C1D23] text-gray-300' : 'bg-gray-200 text-gray-600'}`}>{driver.name?.charAt(0)}</div>
                                                }
                                            </div>
                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                                    <span className={`text-sm font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{driver.name}</span>
                                                    <span className={`text-xs font-bold tabular-nums flex-shrink-0 ${theme === 'dark' ? 'text-red-400' : 'text-red-500'}`}>
                                                        −{remaining.toLocaleString()}
                                                    </span>
                                                </div>
                                                {/* Progress bar */}
                                                <div className={`h-1 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-[#1C1D23]' : 'bg-gray-200'}`}>
                                                    <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className={`flex flex-col items-center justify-center py-12 rounded-2xl ${theme === 'dark' ? 'bg-[#1C1D23]' : 'bg-gray-50'}`}>
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                                    <MedalIcon className={`w-5 h-5 ${theme === 'dark' ? 'text-emerald-500' : 'text-emerald-400'}`} />
                                </div>
                                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t('allPaidToday')}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Day-off strip ──────────────────────────────────────── */}
                {todayStats.dayOff.length > 0 && (
                    <div className={`px-6 py-4 border-t flex items-center gap-4 flex-wrap ${theme === 'dark' ? 'border-white/[0.06] bg-[#1C1D23]' : 'border-gray-100 bg-gray-50/60'}`}>
                        <span className={`text-[11px] font-bold uppercase tracking-widest flex-shrink-0 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-500'}`}>
                            🌙 Dam olish
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                            {todayStats.dayOff.map(driver => (
                                <div key={driver.id} className="flex items-center gap-2 group">
                                    <div className="relative">
                                        <div className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-indigo-400/30 grayscale-[0.5]">
                                            {driver.avatar
                                                ? <img src={driver.avatar} className="w-full h-full object-cover" alt={driver.name} />
                                                : <div className={`w-full h-full flex items-center justify-center text-[10px] font-bold ${theme === 'dark' ? 'bg-[#1C1D23] text-gray-400' : 'bg-gray-200 text-gray-500'}`}>{driver.name?.charAt(0)}</div>
                                            }
                                        </div>
                                    </div>
                                    <span className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{driver.name.split(' ')[0]}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardPage;
