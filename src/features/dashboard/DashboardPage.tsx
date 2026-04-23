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
                        <div className={`p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border shadow-lg ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-100'}`}>
                            <div className="flex flex-col gap-3">
                                <Skeleton variant="rectangular" width="40%" height={12} theme={theme} />
                                <Skeleton variant="rectangular" width="70%" height={32} theme={theme} />
                                <Skeleton variant="rectangular" width="30%" height={10} theme={theme} />
                            </div>
                        </div>
                        <div className={`p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border shadow-lg sm:col-span-2 lg:col-span-1 ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-100'}`}>
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
                        <div className={`p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border shadow-lg relative overflow-hidden group transition-all ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-100'}`}>
                            <div className={`absolute top-0 right-0 p-3 transition-opacity ${theme === 'dark' ? 'opacity-5 group-hover:opacity-10' : 'opacity-[0.08] group-hover:opacity-[0.12]'}`}>
                                <TrendingDownIcon className={`w-12 sm:w-16 md:w-20 h-12 sm:h-16 md:h-20 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`} />
                            </div>
                            <div className="flex flex-col justify-between relative z-10 gap-2 sm:gap-3">
                                <div className="flex items-center gap-2">
                                    <div className={`p-1.5 rounded-lg border flex-shrink-0 ${theme === 'dark' ? 'bg-gray-800 text-red-400 border-gray-700' : 'bg-red-50 text-red-500 border-red-100'}`}>
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
                        <div className={`p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border shadow-lg relative overflow-hidden group transition-all sm:col-span-2 lg:col-span-1 ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-100'}`}>
                            <div className={`absolute top-0 right-0 p-3 transition-opacity ${theme === 'dark' ? 'opacity-5 group-hover:opacity-10' : 'opacity-[0.08] group-hover:opacity-[0.12]'}`}>
                                <WalletIcon className={`w-12 sm:w-16 md:w-20 h-12 sm:h-16 md:h-20 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`} />
                            </div>
                            <div className="flex flex-col justify-between relative z-10 gap-2 sm:gap-3">
                                <div className="flex items-center gap-2">
                                    <div className={`p-1.5 rounded-lg border flex-shrink-0 ${theme === 'dark' ? 'bg-gray-800 text-[#0f766e] border-gray-700' : 'bg-[#0f766e]/10 text-[#0f766e] border-[#0f766e]/20'}`}>
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
            <div className={`w-full ${dashboardViewMode === 'chart' ? 'h-[300px] sm:h-[400px] md:h-[500px]' : 'h-auto'} p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border flex flex-col shadow-xl ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <h3 className={`text-sm sm:text-base md:text-lg font-bold flex items-center gap-2 opacity-80 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        <LayoutDashboardIcon className={`w-4 sm:w-5 h-4 sm:h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                        {t('incomeVsExpense')}
                    </h3>
                    <div className={`flex items-center p-1.5 rounded-xl border shadow-sm ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'}`}>
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
                                                <div className={`p-3 rounded-xl border shadow-lg ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'}`}>
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
                                                    <div key={idx} className={`p-5 rounded-xl border transition-all hover:shadow-md h-fit ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
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
                                                            <div className={`pt-3 mt-2 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
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
            <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'}`}>
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h3 className={`text-xl sm:text-2xl font-black flex items-center gap-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            <span className="text-3xl">📅</span>
                            {t('todayStatus')}
                        </h3>
                        <p className={`mt-2 font-medium capitalize ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {new Date().getDate()} {months[new Date().getMonth()]},{' '}
                            {weekdays[new Date().getDay()]}
                        </p>
                    </div>
                    <div className="mt-4 sm:mt-0 flex gap-4">
                        <div className={`px-5 py-2.5 rounded-xl text-sm font-black border shadow-sm ${theme === 'dark' ? 'bg-[#0f766e]/20 text-teal-400 border-[#0f766e]/40' : 'bg-teal-50 text-teal-700 border-teal-200'}`}>
                            ✓ {todayStats.completed.length} {t('paid')}
                        </div>
                        <div className={`px-5 py-2.5 rounded-xl text-sm font-black border shadow-sm ${theme === 'dark' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>
                            ⏳ {todayStats.pending.length} {t('statusPending')}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* COMPLETED COLUMN */}
                    <div className="space-y-4">
                        <h4 className={`text-lg font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-teal-400' : 'text-teal-600'}`}>
                            <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                            {t('driversPaidToday')}
                        </h4>

                        {todayStats.completed.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {todayStats.completed.map(driver => (
                                    <div key={driver.id} className={`relative flex items-center gap-3 p-4 rounded-2xl border transition-all hover:scale-[1.02] ${theme === 'dark' ? 'bg-gray-800/50 border-teal-500/20 hover:border-teal-500/40' : 'bg-white border-teal-200 hover:border-teal-300 shadow-sm'}`}>
                                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-teal-400 flex-shrink-0">
                                            <img src={driver.avatar} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="min-w-0 pr-8">
                                            <div className={`text-sm font-bold truncate pr-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{driver.name}</div>
                                            <div className={`text-[11px] mt-0.5 truncate font-medium ${theme === 'dark' ? 'text-teal-400' : 'text-teal-600'}`}>
                                                {driver.isDayOff ? `🏖️ ${t('dayOffLabel')}` : `${t('todayPaidLabel')}: +${(driver.todayIncome || 0).toLocaleString()} UZS`}
                                            </div>
                                        </div>
                                        {/* Golden Badge JSON attached to the right */}
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10">
                                            <Lottie animationData={badgeAnimation} loop={false} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={`p-6 rounded-2xl border text-center text-sm font-medium ${theme === 'dark' ? 'bg-gray-800/30 border-gray-700 text-gray-500' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                                {t('noPaymentsYet')}
                            </div>
                        )}
                    </div>

                    {/* PENDING COLUMN */}
                    <div className="space-y-4">
                        <h4 className={`text-lg font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`}>
                            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                            {t('pendingPaymentsLabel')}
                        </h4>

                        {todayStats.pending.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {todayStats.pending.map(driver => (
                                    <div key={driver.id} className={`flex items-center gap-3 p-4 rounded-2xl border transition-all hover:scale-[1.02] ${theme === 'dark' ? 'bg-gray-800/50 border-orange-500/20 hover:border-orange-500/40' : 'bg-white border-orange-200 hover:border-orange-300 shadow-sm'}`}>
                                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-orange-400/50 flex-shrink-0 grayscale-[0.3]">
                                            <img src={driver.avatar} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className={`text-sm font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{driver.name}</div>
                                            <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                                <div className="flex items-center justify-between opacity-80">
                                                    <span className={`text-[10px] uppercase font-bold tracking-wider ${theme === 'dark' ? 'text-teal-500' : 'text-teal-600'}`}>{t('todayPaidLabel')}:</span>
                                                    <span className="text-xs font-bold text-teal-500/80 font-mono">+{(driver.todayIncome || 0).toLocaleString()} UZS</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={`p-6 rounded-2xl border text-center text-sm font-medium ${theme === 'dark' ? 'bg-gray-800/30 border-gray-700 text-gray-500' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                                {t('allPaidToday')}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
