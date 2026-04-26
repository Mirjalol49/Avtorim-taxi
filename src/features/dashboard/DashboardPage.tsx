import React, { useState } from 'react';
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

    const isDark = theme === 'dark';

    // Chart: top-N toggle + status search
    const [chartLimit, setChartLimit] = useState<10 | 20 | 'all'>(20);
    const [statusSearch, setStatusSearch] = useState('');
    const [showAllCompleted, setShowAllCompleted] = useState(false);
    const [showAllPending, setShowAllPending] = useState(false);

    const STATUS_VISIBLE = 8;

    // Sort chart data by income desc so top earners are always first in the chart
    const sortedChartData = [...chartData].sort((a, b) => b.Income - a.Income);
    const visibleChartData = chartLimit === 'all' ? sortedChartData : sortedChartData.slice(0, chartLimit);
    const chartMinWidth = Math.max(500, visibleChartData.length * 56);

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
                        {/* Income */}
                        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-5 sm:p-6 group transition-all duration-300"
                            style={{
                                background: 'linear-gradient(145deg, #0a6b62 0%, #0f766e 100%)',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)',
                            }}
                        >

                            <div className="relative z-10 flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-white/15 rounded-xl border border-white/20 backdrop-blur-sm">
                                            <TrendingUpIcon className="w-4 h-4 text-white" />
                                        </div>
                                        <p className="text-[11px] text-white/70 font-bold uppercase tracking-widest">{t('totalIncome')}</p>
                                    </div>
                                    <TrendingUpIcon className="w-10 h-10 text-white/10 group-hover:text-white/20 transition-colors" />
                                </div>
                                <div>
                                    <NumberTooltip value={totalIncome} label={t('totalIncome')} theme={theme}>
                                        <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none font-mono cursor-help">
                                            {formatNumberSmart(totalIncome, isMobile, currentLanguage)}
                                        </h3>
                                    </NumberTooltip>
                                    <p className="text-[11px] text-white/50 font-semibold mt-2 tracking-wider">UZS</p>
                                </div>
                            </div>
                        </div>

                        {/* Expense */}
                        <div className={`relative overflow-hidden rounded-2xl sm:rounded-3xl p-5 sm:p-6 group transition-all duration-300 border ${
                            isDark
                                ? 'bg-surface border-white/[0.10]'
                                : 'bg-white border-black/[0.08]'
                        }`} style={{
                            boxShadow: isDark
                                ? '0 1px 3px rgba(0,0,0,0.3)'
                                : '0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)',
                        }}>
                            <div className="relative z-10 flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-2 rounded-xl border ${isDark ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-500'}`}>
                                            <TrendingDownIcon className="w-4 h-4" />
                                        </div>
                                        <p className={`text-[11px] font-bold uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{t('totalExpense')}</p>
                                    </div>
                                    <TrendingDownIcon className={`w-10 h-10 transition-opacity ${isDark ? 'opacity-[0.06] group-hover:opacity-[0.12] text-white' : 'opacity-[0.12] group-hover:opacity-20 text-gray-700'}`} />
                                </div>
                                <div>
                                    <NumberTooltip value={totalExpense} label={t('totalExpense')} theme={theme}>
                                        <h3 className={`text-3xl sm:text-4xl font-black tracking-tight leading-none font-mono cursor-help ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {formatNumberSmart(totalExpense, isMobile, currentLanguage)}
                                        </h3>
                                    </NumberTooltip>
                                    <p className={`text-[11px] font-semibold mt-2 tracking-wider ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>UZS</p>
                                </div>
                            </div>
                        </div>

                        {/* Net Profit */}
                        <div className={`relative overflow-hidden rounded-2xl sm:rounded-3xl p-5 sm:p-6 group transition-all duration-300 border sm:col-span-2 lg:col-span-1 ${
                            isDark
                                ? 'bg-surface border-white/[0.10]'
                                : 'bg-white border-black/[0.08]'
                        }`} style={{
                            boxShadow: isDark
                                ? '0 1px 3px rgba(0,0,0,0.3)'
                                : '0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)',
                        }}>
                            <div className="relative z-10 flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-2 rounded-xl border ${isDark ? 'bg-[#0f766e]/10 border-[#0f766e]/25 text-[#0f766e]' : 'bg-[#0f766e]/10 border-[#0f766e]/25 text-[#0f766e]'}`}>
                                            <WalletIcon className="w-4 h-4" />
                                        </div>
                                        <p className={`text-[11px] font-bold uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{t('netProfit')}</p>
                                    </div>
                                    <WalletIcon className={`w-10 h-10 transition-opacity ${isDark ? 'opacity-[0.06] group-hover:opacity-[0.12] text-white' : 'opacity-[0.12] group-hover:opacity-20 text-gray-700'}`} />
                                </div>
                                <div>
                                    <NumberTooltip value={netProfit} label={t('netProfit')} theme={theme}>
                                        <h3 className={`text-3xl sm:text-4xl font-black tracking-tight leading-none font-mono cursor-help ${netProfit >= 0 ? isDark ? 'text-emerald-400' : 'text-emerald-600' : isDark ? 'text-red-400' : 'text-red-600'}`}>
                                            {netProfit > 0 ? '+' : ''}{formatNumberSmart(netProfit, isMobile, currentLanguage)}
                                        </h3>
                                    </NumberTooltip>
                                    <p className={`text-[11px] font-semibold mt-2 tracking-wider ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>UZS</p>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* CHART ROW */}
            <div className={`w-full ${dashboardViewMode === 'chart' ? 'h-[300px] sm:h-[400px] md:h-[500px]' : 'h-auto'} p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border flex flex-col relative overflow-hidden ${isDark ? 'bg-surface border-white/[0.10]' : 'bg-white border-black/[0.08]'}`}
                style={{ boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.07)' }}
            >
                <div className="flex items-center justify-between mb-4 sm:mb-6 gap-3 flex-wrap">
                    <h3 className={`text-sm sm:text-base md:text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        <div className={`p-1.5 rounded-lg ${isDark ? 'bg-surface-2 text-[rgba(235,235,245,0.5)]' : 'bg-black/[0.05] text-[rgba(60,60,67,0.5)]'}`}>
                            <LayoutDashboardIcon className="w-4 sm:w-5 h-4 sm:h-5" />
                        </div>
                        {t('incomeVsExpense')}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Top N selector — only shown in chart mode */}
                        {dashboardViewMode === 'chart' && (
                            <div className={`flex items-center p-1 rounded-xl border text-[12px] font-semibold ${isDark ? 'bg-surface-2 border-white/[0.10]' : 'bg-black/[0.04] border-black/[0.07]'}`}>
                                {([10, 20, 'all'] as const).map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => setChartLimit(opt)}
                                        className={`px-2.5 py-1 rounded-lg transition-all ${chartLimit === opt ? 'bg-[#0f766e] text-white' : isDark ? 'text-[rgba(235,235,245,0.5)] hover:text-white' : 'text-[rgba(60,60,67,0.5)] hover:text-black'}`}
                                    >
                                        {opt === 'all' ? t('allTime') : `${t('top')} ${opt}`}
                                    </button>
                                ))}
                            </div>
                        )}
                        {/* Chart / Grid toggle */}
                        <div className={`flex items-center p-1 rounded-xl border ${isDark ? 'bg-surface-2 border-white/[0.10]' : 'bg-black/[0.04] border-black/[0.07]'}`}>
                            <button onClick={() => setDashboardViewMode('chart')} className={`p-2 rounded-xl transition-all ${dashboardViewMode === 'chart' ? 'bg-[#0f766e] text-white' : theme === 'dark' ? 'text-[rgba(235,235,245,0.5)] hover:text-white' : 'text-[rgba(60,60,67,0.5)] hover:text-black'}`}>
                                <LayoutDashboardIcon className="w-4 h-4" />
                            </button>
                            <button onClick={() => setDashboardViewMode('grid')} className={`p-2 rounded-lg transition-all ${dashboardViewMode === 'grid' ? 'bg-[#0f766e] text-white shadow-md' : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
                                <GridIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                    {dashboardViewMode === 'chart' ? (
                        <div className="h-full overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
                            <div style={{ minWidth: chartMinWidth, height: '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={visibleChartData} barSize={18} margin={{ left: 0, right: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#E5E7EB'} vertical={false} />
                                        <XAxis dataKey="name" stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'} axisLine={false} tickLine={false} dy={10} fontSize={10} interval={0} angle={-40} textAnchor="end" height={64} />
                                        <YAxis stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'} axisLine={false} tickLine={false} dx={-10} fontSize={10} tickFormatter={(value) => {
                                            if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}${currentLanguage === 'en' ? 'B' : 'mlrd'}`;
                                            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}${currentLanguage === 'en' ? 'M' : 'mln'}`;
                                            if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                                            return value;
                                        }} />
                                        <Tooltip cursor={{ fill: theme === 'dark' ? 'rgba(55, 65, 81, 0.3)' : 'rgba(229, 231, 235, 0.3)' }} content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className={`p-3 rounded-xl border shadow-lg ${theme === 'dark' ? 'bg-surface border-white/[0.10]' : 'bg-white border-black/[0.08]'}`}>
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
                                                    <div key={idx} className={`p-5 rounded-xl border transition-all hover:shadow-md h-fit ${isDark ? 'bg-surface-2 border-white/[0.10] hover:border-white/[0.16]' : 'bg-white border-black/[0.08] hover:border-gray-300'}`}>
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
            <div className={`rounded-2xl sm:rounded-3xl border overflow-hidden relative ${isDark ? 'bg-surface border-white/[0.10]' : 'bg-white border-black/[0.07]'}`}
                style={{ boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.07)' }}
            >

                {/* ── Header ─────────────────────────────────────────────── */}
                <div className={`px-6 py-5 border-b ${theme === 'dark' ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
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
                                    {todayStats.dayOff.length} {t('legendDayOff')}
                                </span>
                            )}
                        </div>
                    </div>
                    {/* Search — only shown when drivers > STATUS_VISIBLE */}
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
                                className={`w-full pl-9 pr-4 py-2 rounded-xl text-[13px] border outline-none transition-colors ${isDark
                                    ? 'bg-surface-2 border-white/[0.10] text-white placeholder-[rgba(235,235,245,0.3)] focus:border-[#0d9488]'
                                    : 'bg-[#F2F2F7] border-black/[0.07] text-black placeholder-[rgba(60,60,67,0.35)] focus:border-[#0f766e]'
                                }`}
                            />
                            {statusSearch && (
                                <button onClick={() => setStatusSearch('')} className={`absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold ${isDark ? 'text-[rgba(235,235,245,0.4)]' : 'text-[rgba(60,60,67,0.4)]'}`}>✕</button>
                            )}
                        </div>
                    )}
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

                        {filteredCompleted.length > 0 ? (
                            <>
                            <div className={`rounded-2xl overflow-hidden divide-y ${theme === 'dark' ? 'divide-white/[0.08] bg-surface-2' : 'divide-black/[0.04] bg-[#F2F2F7]'}`}>
                                {displayedCompleted.map((driver, i) => {
                                    const plan = driver.dailyPlan || 1;
                                    const pct = Math.min(100, Math.round((driver.todayIncome / plan) * 100));
                                    const driverCar = cars.find(c => c.assignedDriverId === driver.id);
                                    return (
                                        <div key={driver.id} className={`flex items-center gap-3 px-4 py-3 transition-colors ${theme === 'dark' ? 'hover:bg-white/[0.03]' : 'hover:bg-white'}`}>
                                            {/* Avatar */}
                                            <div className="relative flex-shrink-0">
                                                <div className="w-10 h-10 rounded-xl overflow-hidden ring-2 ring-emerald-500/50">
                                                    {driver.avatar
                                                        ? <img src={driver.avatar} className="w-full h-full object-cover" alt={driver.name} />
                                                        : <div className={`w-full h-full flex items-center justify-center text-sm font-bold ${theme === 'dark' ? 'bg-surface-2 text-[rgba(235,235,245,0.6)]' : 'bg-[#E5E5EA] text-[rgba(60,60,67,0.6)]'}`}>{driver.name?.charAt(0)}</div>
                                                    }
                                                </div>
                                                {i < 3 && !statusSearch && (
                                                    <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black border ${
                                                        i === 0 ? 'bg-yellow-400 text-yellow-900 border-yellow-300'
                                                        : i === 1 ? 'bg-gray-300 text-gray-700 border-gray-200'
                                                        : 'bg-amber-600 text-white border-amber-500'
                                                    }`}>{i + 1}</span>
                                                )}
                                            </div>
                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className={`text-sm font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{driver.name}</span>
                                                    <span className="text-xs font-bold tabular-nums flex-shrink-0 text-emerald-500">
                                                        +{(driver.todayIncome || 0).toLocaleString()}
                                                    </span>
                                                </div>
                                                {driverCar && (
                                                    <div className="flex items-center gap-1.5 mt-0.5 mb-1">
                                                        <span className={`text-[11px] truncate ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{driverCar.name}</span>
                                                        <span className={`text-[10px] font-mono font-bold px-1.5 py-px rounded border flex-shrink-0 ${theme === 'dark' ? 'bg-surface border-white/[0.10] text-gray-500' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>{driverCar.licensePlate}</span>
                                                    </div>
                                                )}
                                                <div className={`h-1 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-surface-2' : 'bg-[#E5E5EA]'}`}>
                                                    <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                            <div className="w-7 h-7 flex-shrink-0">
                                                <Lottie animationData={badgeAnimation} loop={false} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {filteredCompleted.length > STATUS_VISIBLE && (
                                <button
                                    onClick={() => setShowAllCompleted(v => !v)}
                                    className={`mt-2 w-full py-2 rounded-xl text-[12px] font-semibold transition-colors ${isDark ? 'bg-white/[0.05] hover:bg-white/[0.09] text-[rgba(235,235,245,0.55)]' : 'bg-black/[0.04] hover:bg-black/[0.07] text-[rgba(60,60,67,0.55)]'}`}
                                >
                                    {showAllCompleted ? t('collapse') : t('showMore', { count: filteredCompleted.length - STATUS_VISIBLE })}
                                </button>
                            )}
                            </>
                        ) : (
                            <div className={`flex flex-col items-center justify-center py-12 rounded-2xl ${theme === 'dark' ? 'bg-surface-2' : 'bg-[#F2F2F7]'}`}>
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

                        {filteredPending.length > 0 ? (
                            <>
                            <div className={`rounded-2xl overflow-hidden divide-y ${theme === 'dark' ? 'divide-white/[0.08] bg-surface-2' : 'divide-black/[0.04] bg-[#F2F2F7]'}`}>
                                {displayedPending.map(driver => {
                                    const plan = driver.dailyPlan || 750000;
                                    const paid = driver.todayIncome || 0;
                                    const remaining = Math.max(0, plan - paid);
                                    const pct = Math.min(100, Math.round((paid / plan) * 100));
                                    const barColor = pct >= 70 ? 'bg-amber-400' : pct >= 30 ? 'bg-orange-500' : 'bg-red-500';
                                    const driverCar = cars.find(c => c.assignedDriverId === driver.id);
                                    return (
                                        <div key={driver.id} className={`flex items-center gap-3 px-4 py-3 transition-colors ${theme === 'dark' ? 'hover:bg-white/[0.03]' : 'hover:bg-white'}`}>
                                            {/* Avatar */}
                                            <div className="w-10 h-10 rounded-xl overflow-hidden ring-2 ring-orange-500/25 flex-shrink-0">
                                                {driver.avatar
                                                    ? <img src={driver.avatar} className="w-full h-full object-cover" alt={driver.name} />
                                                    : <div className={`w-full h-full flex items-center justify-center text-sm font-bold ${theme === 'dark' ? 'bg-surface-2 text-[rgba(235,235,245,0.6)]' : 'bg-[#E5E5EA] text-[rgba(60,60,67,0.6)]'}`}>{driver.name?.charAt(0)}</div>
                                                }
                                            </div>
                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className={`text-sm font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{driver.name}</span>
                                                    <span className={`text-xs font-bold tabular-nums flex-shrink-0 ${theme === 'dark' ? 'text-red-400' : 'text-red-500'}`}>
                                                        −{remaining.toLocaleString()}
                                                    </span>
                                                </div>
                                                {driverCar && (
                                                    <div className="flex items-center gap-1.5 mt-0.5 mb-1">
                                                        <span className={`text-[11px] truncate ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{driverCar.name}</span>
                                                        <span className={`text-[10px] font-mono font-bold px-1.5 py-px rounded border flex-shrink-0 ${theme === 'dark' ? 'bg-surface border-white/[0.10] text-gray-500' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>{driverCar.licensePlate}</span>
                                                    </div>
                                                )}
                                                <div className={`h-1 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-surface-2' : 'bg-[#E5E5EA]'}`}>
                                                    <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {filteredPending.length > STATUS_VISIBLE && (
                                <button
                                    onClick={() => setShowAllPending(v => !v)}
                                    className={`mt-2 w-full py-2 rounded-xl text-[12px] font-semibold transition-colors ${isDark ? 'bg-white/[0.05] hover:bg-white/[0.09] text-[rgba(235,235,245,0.55)]' : 'bg-black/[0.04] hover:bg-black/[0.07] text-[rgba(60,60,67,0.55)]'}`}
                                >
                                    {showAllPending ? t('collapse') : t('showMore', { count: filteredPending.length - STATUS_VISIBLE })}
                                </button>
                            )}
                            </>
                        ) : (
                            <div className={`flex flex-col items-center justify-center py-12 rounded-2xl ${theme === 'dark' ? 'bg-surface-2' : 'bg-[#F2F2F7]'}`}>
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                                    <MedalIcon className={`w-5 h-5 ${theme === 'dark' ? 'text-emerald-500' : 'text-emerald-400'}`} />
                                </div>
                                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t('allPaidToday')}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Day-off section ──────────────────────────────────────── */}
                {todayStats.dayOff.length > 0 && (
                    <div className={`border-t ${theme === 'dark' ? 'border-white/[0.06]' : 'border-black/[0.05]'}`}>
                        <div className="px-6 pt-4 pb-2 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />
                            <span className={`text-[11px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-500'}`}>
                                🌙 {t('legendDayOff')}
                            </span>
                        </div>
                        <div className={`mx-6 mb-4 rounded-2xl overflow-hidden divide-y ${theme === 'dark' ? 'divide-white/[0.06] bg-surface-2' : 'divide-black/[0.04] bg-[#F2F2F7]'}`}>
                            {todayStats.dayOff.map(driver => {
                                const driverCar = cars.find(c => c.assignedDriverId === driver.id);
                                return (
                                    <div key={driver.id} className={`flex items-center gap-3 px-4 py-3 transition-colors ${theme === 'dark' ? 'hover:bg-white/[0.03]' : 'hover:bg-white'}`}>
                                        {/* Avatar */}
                                        <div className="w-10 h-10 rounded-xl overflow-hidden ring-2 ring-indigo-400/30 grayscale-[0.4] flex-shrink-0">
                                            {driver.avatar
                                                ? <img src={driver.avatar} className="w-full h-full object-cover" alt={driver.name} />
                                                : <div className={`w-full h-full flex items-center justify-center text-sm font-bold ${theme === 'dark' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-500'}`}>{driver.name?.charAt(0)}</div>
                                            }
                                        </div>
                                        {/* Name + Car */}
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-semibold truncate ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>{driver.name}</p>
                                            {driverCar ? (
                                                <p className={`text-[11px] font-medium mt-0.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                                    {driverCar.name}
                                                    <span className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] font-bold tracking-wide ${theme === 'dark' ? 'bg-white/[0.06] text-gray-400' : 'bg-black/[0.06] text-gray-500'}`}>
                                                        {driverCar.licensePlate}
                                                    </span>
                                                </p>
                                            ) : (
                                                <p className={`text-[11px] mt-0.5 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>{t('carNotAssigned')}</p>
                                            )}
                                        </div>
                                        {/* Status badge */}
                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${theme === 'dark' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-500'}`}>
                                            {t('legendDayOff')}
                                        </span>
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
