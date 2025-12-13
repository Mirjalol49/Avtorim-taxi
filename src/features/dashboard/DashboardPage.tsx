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
import Lottie from 'lottie-react';
import rank1Animation from '../../../Images/1.json';
import rank2Animation from '../../../Images/2.json';
import rank3Animation from '../../../Images/3.json';
import badgeAnimation from '../../../Images/badge.json';

interface DashboardPageProps {
    transactions: Transaction[];
    drivers: Driver[];
    isDataLoading: boolean;
    // language, t removed - using hooks
    theme: 'light' | 'dark';
    isMobile: boolean;
}

const DashboardPage: React.FC<DashboardPageProps> = ({
    transactions,
    drivers,
    isDataLoading,
    theme,
    isMobile
}) => {
    const { t, i18n } = useTranslation();
    // Ensure accurate type for helpers that expect specific Language string
    const currentLanguage = (['uz', 'ru', 'en'].includes(i18n.language) ? i18n.language : 'uz') as Language;

    const {
        timeFilter, setTimeFilter,
        dashboardViewMode, setDashboardViewMode,
        dashboardPage, setDashboardPage, dashboardItemsPerPage,
        totalIncome, totalExpense, netProfit,
        chartData, topDrivers, activeDriversList,
        getBadgeColor
    } = useDashboardStats(transactions, drivers);

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
                        <div className="bg-[#0d9488] p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl shadow-lg">
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
                        <div className="bg-[#0d9488] p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl shadow-lg relative overflow-hidden group transition-all hover:shadow-xl">
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
                                    <div className={`p-1.5 rounded-lg border flex-shrink-0 ${theme === 'dark' ? 'bg-gray-800 text-[#0d9488] border-gray-700' : 'bg-[#0d9488]/10 text-[#0d9488] border-[#0d9488]/20'}`}>
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
                        <button onClick={() => setDashboardViewMode('chart')} className={`p-2 rounded-lg transition-all ${dashboardViewMode === 'chart' ? 'bg-[#0d9488] text-white shadow-md' : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
                            <LayoutDashboardIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDashboardViewMode('grid')} className={`p-2 rounded-lg transition-all ${dashboardViewMode === 'grid' ? 'bg-[#0d9488] text-white shadow-md' : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
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
                                                            <span className={`text-sm font-bold ${entry.dataKey === 'Income' ? 'text-[#0d9488]' : 'text-red-500'}`}>{entry.value.toLocaleString()}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        }
                                        return null;
                                    }} />
                                    <Bar dataKey="Income" fill="#0d9488" radius={[8, 8, 0, 0]} />
                                    <Bar dataKey="Expense" fill="#EF4444" radius={[8, 8, 0, 0]} />
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
                                                    <div key={idx} className={`p-5 rounded-xl border-2 transition-all hover:shadow-lg h-fit ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700/50 hover:border-[#0d9488]' : 'bg-white border-gray-200 hover:border-[#0d9488]'}`}>
                                                        <div className="flex items-center gap-3 mb-4">
                                                            {driver && (
                                                                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#0d9488] flex-shrink-0">
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
                                                                    <span className="text-sm font-bold text-[#0d9488] font-mono">+{data.Income.toLocaleString()}</span>
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

            {/* TOP PERFORMERS */}
            <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl relative overflow-hidden ${theme === 'dark' ? 'bg-[#151F32] border-[#2A3441]' : 'bg-white border-gray-200'}`}>
                {/* Background Glow Effect - subtle/premium */}
                {theme === 'dark' && <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />}

                <div className="flex items-center justify-between mb-8 relative z-10">
                    <h3 className={`text-lg sm:text-xl font-bold flex items-center gap-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        <div className="w-8 h-8">
                            <Lottie animationData={badgeAnimation} loop={true} />
                        </div>
                        {t('topPerformers')}
                    </h3>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border ${theme === 'dark' ? 'text-blue-200 bg-blue-500/10 border-blue-500/20' : 'text-blue-600 bg-blue-50 border-blue-100'}`}>
                        {t(timeFilter)}
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                    {topDrivers.length > 0 ? topDrivers.map((driver, index) => (
                        <div key={driver.id} className={`flex flex-col items-center p-6 rounded-2xl border transition-all duration-300 hover:transform hover:-translate-y-1 ${theme === 'dark'
                            ? 'bg-[#1E293B]/60 border-[#334155] hover:bg-[#1E293B] hover:shadow-lg hover:shadow-black/20 hover:border-[#0d9488]/30 glass-effect'
                            : 'bg-gray-50 border-gray-100 hover:bg-white hover:shadow-xl hover:shadow-gray-200/50 hover:border-[#0d9488]/20'
                            }`}>

                            {/* Animated Rank Badge */}
                            <div className="mb-4 relative">
                                <div className="w-24 h-24 flex items-center justify-center">
                                    {index === 0 && <Lottie animationData={rank1Animation} loop={true} className="scale-125" />}
                                    {index === 1 && <Lottie animationData={rank2Animation} loop={true} className="scale-125" />}
                                    {index === 2 && <Lottie animationData={rank3Animation} loop={true} className="scale-125" />}
                                </div>
                                {/* Glow under the badge */}
                                <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 w-16 h-4 blur-xl rounded-full ${index === 0 ? 'bg-yellow-500/40' : index === 1 ? 'bg-slate-400/40' : 'bg-orange-500/40'
                                    }`} />
                            </div>

                            {/* Driver Avatar */}
                            <div className={`w-20 h-20 rounded-full p-1 mb-4 ${index === 0 ? 'bg-gradient-to-tr from-yellow-400 to-yellow-600' :
                                index === 1 ? 'bg-gradient-to-tr from-slate-300 to-slate-500' :
                                    'bg-gradient-to-tr from-orange-400 to-orange-600'
                                }`}>
                                <div className={`w-full h-full rounded-full border-4 overflow-hidden relative ${theme === 'dark' ? 'border-[#1E293B]' : 'border-white'}`}>
                                    <img src={driver.avatar} className="w-full h-full object-cover" alt={driver.name} />
                                </div>
                            </div>

                            <div className="text-center w-full mb-4">
                                <p className={`text-lg font-bold whitespace-normal break-words leading-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{driver.name}</p>
                                <p className={`text-sm font-medium mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{driver.carModel}</p>
                            </div>

                            <div className="mt-auto">
                                <p className={`text-2xl font-black tracking-tight ${theme === 'dark' ? 'text-[#0d9488]' : 'text-[#0d9488]'}`}>
                                    {driver.income.toLocaleString()}
                                    <span className={`text-[10px] font-bold uppercase ml-1 align-top ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>UZS</span>
                                </p>
                            </div>
                        </div>
                    )) : (
                        <div className={`text-center py-20 text-sm col-span-3 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                            {t('noData') || "Ma'lumotlar yo'q"}
                        </div>
                    )}
                </div>
            </div>

            {/* Active Drivers List */}
            <div className={`p-8 rounded-3xl border shadow-xl ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'}`}>
                <h3 className={`text-lg font-bold mb-6 flex items-center gap-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    {t('activeDrivers')} ({activeDriversList.length})
                </h3>
                {isDataLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className={`flex items-center gap-4 p-4 rounded-2xl border ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                                <Skeleton variant="circular" width={48} height={48} theme={theme} />
                                <div className="flex-1 space-y-2">
                                    <Skeleton variant="text" width="60%" height={14} theme={theme} />
                                    <Skeleton variant="text" width="40%" height={12} theme={theme} />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : activeDriversList.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {activeDriversList.map(driver => (
                            <div key={driver.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-colors ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700 hover:border-gray-600' : 'bg-gray-50 border-gray-100 hover:border-gray-300'}`}>
                                <div className="relative w-12 h-12 flex-shrink-0">
                                    <div className="w-12 h-12 rounded-full border border-green-500/50 overflow-hidden">
                                        <img src={driver.avatar} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                                </div>
                                <div className="min-w-0">
                                    <div className={`text-sm font-bold whitespace-normal break-words ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{driver.name}</div>
                                    <div className={`text-xs truncate mt-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{driver.carModel} • {driver.licensePlate}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className={`text-sm italic py-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Hozirda faol haydovchilar yo'q.</div>
                )}
            </div>
        </div>
    );
};

export default DashboardPage;
