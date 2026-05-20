import React from 'react';
import { useTranslation } from 'react-i18next';
import { Transaction, Driver, Language } from '../../core/types';
import { Car } from '../../core/types/car.types';
import { useFinanceStats } from './hooks/useFinanceStats';
import { formatNumberSmart } from '../../../utils/formatNumber';
import DatePicker from '../../../components/DatePicker';
import CustomSelect from '../../../components/CustomSelect';
import NumberTooltip from '../../../components/NumberTooltip';
import YearSelector from '../../../components/YearSelector';
import DriverFilterModal from '../../../components/DriverFilterModal';
import {
    UsersIcon,
    TrendingUpIcon,
    TrendingDownIcon,
    WalletIcon,
    BanknoteIcon,
    DownloadIcon,
} from '../../../components/Icons';
import { exportFinanceSummaryToExcel } from '../../../utils/exportToExcel';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import { MetricCard } from '../../../components/MetricCard';


interface FinancePageProps {
    transactions: Transaction[];
    drivers: Driver[];
    cars: Car[];
    theme: 'dark' | 'light';
    isMobile?: boolean;
}

export const FinancePage: React.FC<FinancePageProps> = ({
    transactions: allTransactions,
    drivers,
    cars = [],
    theme,
    isMobile = false
}) => {
    const { t, i18n } = useTranslation();
    const language = (['uz', 'en', 'ru'].includes(i18n.language) ? i18n.language : 'uz') as Language;

    // useFinanceStats now manages language internally
    const {
        filters, setFilters,
        analyticsYear, setAnalyticsYear,
        availableYears,
        monthlyAnalyticsData,
        yearlyAnalyticsTotals,
        advancedStats
    } = useFinanceStats(allTransactions, cars, drivers);

    const nonDeletedDrivers = drivers.filter(d => !d.isDeleted);

    const EXPENSE_COLORS = ['#f43f5e', '#fb923c', '#fbbf24', '#38bdf8', '#34d399', '#94a3b8'];
    const PAYMENT_COLORS = { cash: '#34d399', card: '#0f766e', transfer: '#f59e0b' };
    const PAYMENT_LABELS: Record<string, Record<string, string>> = {
        cash:     { uz: 'Naqd',     ru: 'Нал.',    en: 'Cash'     },
        card:     { uz: 'Karta',    ru: 'Карта',   en: 'Card'     },
        transfer: { uz: "O'tkazma", ru: 'Перевод', en: 'Transfer' },
    };
    const getPaymentLabel = (key: string) =>
        PAYMENT_LABELS[key]?.[language] ?? key.toUpperCase();
    // Income donut uses payment-method colors — max 3 slices, no rainbow
    const COLORS = [PAYMENT_COLORS.cash, PAYMENT_COLORS.card, PAYMENT_COLORS.transfer];
    const getIncomeLabel = (key: string) => getPaymentLabel(key);
    const netProfitRows = ['cash', 'card', 'transfer']
        .map(key => ({
            key,
            label: getPaymentLabel(key),
            color: PAYMENT_COLORS[key as keyof typeof PAYMENT_COLORS],
            ...((advancedStats.netProfitByPayment?.[key]) ?? { income: 0, expense: 0, net: 0 }),
        }))
        .filter(row => row.key === 'cash' || row.key === 'card' || row.income > 0 || row.expense > 0 || row.net !== 0);
    const totalPureProfit = advancedStats.totalNetProfit ?? netProfitRows.reduce((sum, row) => sum + row.net, 0);
    const netProfitChartRows = netProfitRows
        .map(row => ({ ...row, value: Math.abs(row.net) }))
        .filter(row => row.value > 0);
    const totalNetProfitAbs = netProfitChartRows.reduce((sum, row) => sum + row.value, 0);
    const formatFullMoney = (value: number, withSign = false) => {
        const rounded = Math.round(Math.abs(value));
        const sign = withSign && value !== 0 ? (value > 0 ? '+' : '-') : '';
        return `${sign}${rounded.toLocaleString('uz-UZ')} UZS`;
    };

    
    const [driverModalOpen, setDriverModalOpen] = React.useState(false);

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Analytics Header Filters */}
            <div className={`p-5 rounded-2xl border ${theme === 'dark' ? 'bg-surface border-white/[0.08]' : 'bg-white border-gray-200'}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <DatePicker
                        label={t('fromDate') || 'Boshlanish sanasi'}
                        value={filters.startDate ? new Date(filters.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)}
                        onChange={(date) => setFilters(prev => ({ ...prev, startDate: date.toISOString() }))}
                        theme={theme}
                        labelClassName={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}
                    />
                    <DatePicker
                        label={t('toDate') || 'Tugash sanasi'}
                        value={filters.endDate ? new Date(filters.endDate) : new Date()}
                        onChange={(date) => setFilters(prev => ({ ...prev, endDate: date.toISOString() }))}
                        theme={theme}
                        labelClassName={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}
                    />
                    {/* Driver Filter via Modal */}
                    <div className="w-full relative">
                        <div className="flex items-center gap-2 mb-3">
                            <UsersIcon className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`} />
                            <span className={`text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                                {t('driver') || 'Haydovchi'}
                            </span>
                        </div>
                        {(() => {
                            const selectedDriver = filters.driverId && filters.driverId !== 'all'
                                ? nonDeletedDrivers.find(d => d.id === filters.driverId)
                                : null;
                            return (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setDriverModalOpen(true)}
                                        className={`w-full h-[48px] px-3 sm:px-4 rounded-xl border text-left transition-all flex items-center justify-between gap-3 ${
                                            driverModalOpen
                                                ? theme === 'dark'
                                                    ? 'bg-surface-2 border-teal-500 ring-1 ring-teal-500/40'
                                                    : 'bg-white border-teal-500 ring-1 ring-teal-500/20 shadow-md'
                                                : theme === 'dark'
                                                    ? 'bg-surface-2/50 border-white/[0.08] hover:border-white/[0.12]'
                                                    : 'bg-gray-50 border-gray-200 hover:border-gray-300 text-gray-900'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            {selectedDriver ? (
                                                <>
                                                    <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 border border-slate-200 dark:border-surface-3">
                                                        {selectedDriver.avatar
                                                            ? <img src={selectedDriver.avatar} alt="" className="w-full h-full object-cover" />
                                                            : <div className={`w-full h-full flex items-center justify-center text-xs font-bold ${theme === 'dark' ? 'bg-surface-2 text-gray-300' : 'bg-slate-100 text-slate-600'}`}>{selectedDriver.name.charAt(0)}</div>
                                                        }
                                                    </div>
                                                    <div className="flex-1 min-w-0 pr-2">
                                                        <div className={`text-[13px] sm:text-[14px] font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{selectedDriver.name}</div>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="flex items-center -space-x-2.5 flex-shrink-0">
                                                        {nonDeletedDrivers.slice(0, 3).map((d, i) => (
                                                            <div key={d.id} className="w-7 h-7 rounded-full overflow-hidden border-2 border-white dark:border-surface bg-slate-100 shadow-sm" style={{ zIndex: 3 - i }}>
                                                                {d.avatar ? (
                                                                    <img src={d.avatar} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-600">
                                                                        {d.name.charAt(0).toUpperCase()}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <span className={`text-[13px] sm:text-[14px] font-medium truncate ${theme === 'dark' ? 'text-gray-300' : 'text-slate-700'}`}>
                                                        {t('allDrivers') || 'Barcha Haydovchilar'}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                        <svg className={`w-4 h-4 flex-shrink-0 transition-transform duration-300 ${driverModalOpen ? 'transform rotate-180 text-teal-600' : theme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    <DriverFilterModal
                                        isOpen={driverModalOpen}
                                        onClose={() => setDriverModalOpen(false)}
                                        selectedDriverId={filters.driverId || 'all'}
                                        onSelect={(val) => setFilters(prev => ({ ...prev, driverId: val }))}
                                        drivers={nonDeletedDrivers}
                                        cars={cars}
                                        theme={theme}
                                        allLabel={t('allDrivers') || 'Barcha Haydovchilar'}
                                        searchPlaceholder={t('search') || 'Qidirish...'}
                                    />
                                </>
                            );
                        })()}
                    </div>

                    <CustomSelect
                        label={t('paymentMethodFilter', 'To\'lov usuli')}
                        value={filters.paymentMethod}
                        onChange={(val) => setFilters(prev => ({ ...prev, paymentMethod: val }))}
                        options={[
                            { id: 'all', name: t('allMethods', 'Barchasi') },
                            { id: 'cash', name: t('cash', 'Naqd pul') },
                            { id: 'card', name: t('card', 'Karta') }
                        ]}
                        theme={theme}
                        icon={WalletIcon}
                        labelClassName={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}
                    />
                </div>
                {/* Export button */}
                <div className="flex justify-end">
                    <button
                        onClick={() => exportFinanceSummaryToExcel(
                            nonDeletedDrivers,
                            allTransactions,
                            filters.startDate,
                            filters.endDate,
                            `Moliyaviy_hisobot_${filters.startDate?.slice(0,10) || 'barcha'}`
                        )}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all active:scale-95 ${
                            theme === 'dark'
                                ? 'bg-surface-2 border-white/[0.08] text-gray-300 hover:border-emerald-500/40 hover:text-emerald-400 hover:bg-emerald-500/5'
                                : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50'
                        }`}
                    >
                        <DownloadIcon className="w-4 h-4" />
                        {t('exportExcel', 'Excel hisoboti')}
                    </button>
                </div>
            </div>

            {/* Yearly Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <MetricCard title={`${analyticsYear} ${t('totalIncome')}`} value={yearlyAnalyticsTotals.income} type="income" icon={TrendingUpIcon} isDark={theme === 'dark'} />
                <MetricCard title={`${analyticsYear} ${t('totalExpense')}`} value={yearlyAnalyticsTotals.expense} type="expense" icon={TrendingDownIcon} isDark={theme === 'dark'} />
                <div className="sm:col-span-2 lg:col-span-1">
                    <MetricCard title={`${analyticsYear} ${t('netProfit')}`} value={yearlyAnalyticsTotals.netProfit} type="profit" icon={WalletIcon} isDark={theme === 'dark'} showPlusSign />
                </div>
            </div>

            {/* Monthly Analytics Chart */}
            <div className={`w-full h-[300px] sm:h-[400px] p-4 sm:p-6 rounded-2xl sm:rounded-3xl border flex flex-col shadow-xl ${theme === 'dark' ? 'bg-surface border-white/[0.08]' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <h3 className={`text-sm sm:text-base md:text-lg font-bold flex items-center gap-2 opacity-80 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        <BanknoteIcon className={`w-4 sm:w-5 h-4 sm:h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                        {t('monthlyAnalytics')}
                    </h3>

                    {/* Year Selector */}
                    <YearSelector
                        selectedYear={analyticsYear}
                        onYearChange={setAnalyticsYear}
                        theme={theme}
                        availableYears={availableYears}
                    />
                </div>
                <div className="flex-1 -mx-2 sm:mx-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyAnalyticsData} barSize={30} margin={{ left: 0, right: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#E5E7EB'} vertical={false} />
                            <XAxis
                                dataKey="name"
                                stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'}
                                axisLine={false}
                                tickLine={false}
                                dy={10}
                                fontSize={12}
                                interval={0}
                            />
                            <YAxis
                                stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'}
                                axisLine={false}
                                tickLine={false}
                                dx={-10}
                                fontSize={10}
                                tickFormatter={(value) => {
                                    if (value >= 1000000000) {
                                        return `${(value / 1000000000).toFixed(1)}${language === 'en' ? 'B' : 'mlrd'}`;
                                    }
                                    if (value >= 1000000) {
                                        return `${(value / 1000000).toFixed(1)}${language === 'en' ? 'M' : 'mln'}`;
                                    }
                                    if (value >= 1000) {
                                        return `${(value / 1000).toFixed(0)}k`;
                                    }
                                    return value;
                                }}
                            />
                            <Tooltip
                                cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className={`p-4 rounded-2xl shadow-2xl backdrop-blur-xl border ${theme === 'dark' ? 'bg-[#151e2e]/90 border-white/[0.08]' : 'bg-white/90 border-gray-200'}`}>
                                                <p className={`text-sm font-black mb-3 pb-2 border-b ${theme === 'dark' ? 'text-white border-white/10' : 'text-gray-900 border-gray-100'}`}>{label}</p>
                                                <div className="space-y-3">
                                                    {payload.map((entry: any, index: number) => (
                                                        <div key={index} className="flex items-center justify-between gap-8">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
                                                                <span className={`text-[13px] font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{entry.name}</span>
                                                            </div>
                                                            <span className={`text-[14px] font-black font-mono tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                                {entry.value.toLocaleString('uz-UZ')} <span className="text-[10px] text-gray-500 font-sans ml-0.5">UZS</span>
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar dataKey="Income" name={t('income')} fill="#0f766e" radius={[6, 6, 0, 0]} />
                            <Bar dataKey="Expense" name={t('expense')} fill="#EF4444" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Advanced Analytics Widgets */}
            <div className="flex flex-col gap-6 animate-slideInUp">
                {/* Income & Expense Donuts */}
                <div className={`p-5 rounded-3xl border shadow-xl flex flex-col gap-6 w-full ${theme === 'dark' ? 'bg-surface border-white/[0.08]' : 'bg-white border-gray-200'}`}>
                    <h3 className={`text-sm md:text-base font-bold flex items-center gap-2 opacity-80 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        <svg className={`w-4 h-4 ${theme === 'dark' ? 'text-teal-400' : 'text-teal-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
                        {t('incomeAndExpenseCategories', 'Tushum va Xarajat Kategoriyalari')}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
                        {/* Income Donut */}
                        <div className="flex flex-col items-center relative">
                            <h4 className={`text-xs font-bold tracking-wider uppercase mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t('incomes', 'Tushumlar')}</h4>
                            {advancedStats.incomeByCategory.length > 0 ? (
                                <div className="h-[220px] w-full relative max-w-[220px] mx-auto">
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1 z-0">
                                        <span className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{t('total', 'Jami')}</span>
                                        <span className={`text-xl font-black ${theme === 'dark' ? 'text-white' : 'text-gray-900'} pointer-events-auto`}>
                                            <NumberTooltip value={advancedStats.incomeByCategory.reduce((s:number,c:any)=>s+c.value,0)} label={t('totalIncome', 'Jami tushum')} theme={theme}>
                                                <span className="cursor-help">{formatNumberSmart(advancedStats.incomeByCategory.reduce((s:number,c:any)=>s+c.value,0), true, language).replace(' UZS', '')}</span>
                                            </NumberTooltip>
                                        </span>
                                    </div>
                                    <ResponsiveContainer width="100%" height="100%" className="z-10 relative">
                                        <PieChart>
                                            <Pie
                                                data={advancedStats.incomeByCategory}
                                                cx="50%" cy="50%" innerRadius={70} outerRadius={90}
                                                paddingAngle={5} dataKey="value" stroke="none"
                                            >
                                                {advancedStats.incomeByCategory.map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={PAYMENT_COLORS[entry.name as keyof typeof PAYMENT_COLORS] || COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value: number, name: string) => [`${value.toLocaleString('uz-UZ')} UZS`, getIncomeLabel(name)]}
                                                contentStyle={{ borderRadius: '12px', border: theme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : 'none', backgroundColor: theme === 'dark' ? '#1c1c1e' : '#fff', color: theme === 'dark' ? '#fff' : '#000', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)' }}
                                                itemStyle={{ fontWeight: 'bold', color: theme === 'dark' ? '#ffffff' : '#000000' }}
                                                labelStyle={{ color: theme === 'dark' ? '#9ca3af' : '#6b7280', fontWeight: 'bold' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-[220px] flex items-center justify-center opacity-50"><p className="text-sm">Ma'lumot yo'q</p></div>
                            )}
                            <div className="w-full mt-2 flex flex-wrap gap-4 justify-center px-2">
                                {(() => {
                                    const totalIncome = advancedStats.incomeByCategory.reduce((s:number,c:any)=>s+c.value,0);
                                    return advancedStats.incomeByCategory.map((entry: any, index: number) => {
                                        const pct = totalIncome > 0 ? ((entry.value / totalIncome) * 100).toFixed(0) : '0';
                                        return (
                                            <div key={index} className="flex items-center gap-1.5 text-[11px]">
                                                <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: PAYMENT_COLORS[entry.name as keyof typeof PAYMENT_COLORS] || COLORS[index % COLORS.length] }} />
                                                <span className={`font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{getIncomeLabel(entry.name)} ({pct}%)</span>
                                                <NumberTooltip value={entry.value} label={getIncomeLabel(entry.name)} theme={theme}>
                                                    <span className={`font-bold cursor-help ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{formatNumberSmart(entry.value, true, language)}</span>
                                                </NumberTooltip>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>

                        {/* Expense Donut */}
                        <div className="flex flex-col items-center relative">
                            <h4 className={`text-xs font-bold tracking-wider uppercase mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t('expenses', 'Xarajatlar')}</h4>
                            {advancedStats.expenseByCategory.length > 0 ? (
                                <div className="h-[220px] w-full relative max-w-[220px] mx-auto">
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1 z-0">
                                        <span className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{t('total', 'Jami')}</span>
                                        <span className={`text-xl font-black ${theme === 'dark' ? 'text-white' : 'text-gray-900'} pointer-events-auto`}>
                                            <NumberTooltip value={advancedStats.expenseByCategory.reduce((s:number,c:any)=>s+c.value,0)} label={t('totalExpense', 'Jami xarajat')} theme={theme}>
                                                <span className="cursor-help">{formatNumberSmart(advancedStats.expenseByCategory.reduce((s:number,c:any)=>s+c.value,0), true, language).replace(' UZS', '')}</span>
                                            </NumberTooltip>
                                        </span>
                                    </div>
                                    <ResponsiveContainer width="100%" height="100%" className="z-10 relative">
                                        <PieChart>
                                            <Pie
                                                data={advancedStats.expenseByCategory}
                                                cx="50%" cy="50%" innerRadius={70} outerRadius={90}
                                                paddingAngle={5} dataKey="value" stroke="none"
                                            >
                                                {advancedStats.expenseByCategory.map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value: number) => `${value.toLocaleString('uz-UZ')} UZS`}
                                                contentStyle={{ borderRadius: '12px', border: theme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : 'none', backgroundColor: theme === 'dark' ? '#1c1c1e' : '#fff', color: theme === 'dark' ? '#fff' : '#000', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)' }}
                                                itemStyle={{ fontWeight: 'bold', color: theme === 'dark' ? '#ffffff' : '#000000' }}
                                                labelStyle={{ color: theme === 'dark' ? '#9ca3af' : '#6b7280', fontWeight: 'bold' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-[220px] flex items-center justify-center opacity-50"><p className="text-sm">Ma'lumot yo'q</p></div>
                            )}
                            <div className="w-full mt-2 flex flex-wrap gap-4 justify-center px-2">
                                {advancedStats.expenseByCategory.map((entry: any, index: number) => (
                                    <div key={index} className="flex items-center gap-1.5 text-[11px]">
                                        <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: EXPENSE_COLORS[index % EXPENSE_COLORS.length] }} />
                                        <span className={`font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{entry.name}</span>
                                        <NumberTooltip value={entry.value} label={entry.name} theme={theme}>
                                            <span className={`font-bold cursor-help ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{formatNumberSmart(entry.value, true, language)}</span>
                                        </NumberTooltip>
                                    </div>
                                ))}
                            </div>
	                        </div>

                        {/* Net Profit Donut */}
                        <div className="flex flex-col items-center relative">
                            <h4 className={`text-xs font-bold tracking-wider uppercase mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t('pureNetProfit', 'Sof foyda')}</h4>
                            {netProfitChartRows.length > 0 ? (
                                <div className="h-[220px] w-full relative max-w-[220px] mx-auto">
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1 z-0">
                                        <span className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{t('total', 'Jami')}</span>
                                        <span className={`text-xl font-black pointer-events-auto ${totalPureProfit >= 0 ? theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600' : theme === 'dark' ? 'text-rose-400' : 'text-rose-600'}`}>
                                            <NumberTooltip value={totalPureProfit} label={t('pureNetProfit', 'Sof foyda')} theme={theme}>
                                                <span className="cursor-help">{totalPureProfit >= 0 ? '+' : '-'}{formatNumberSmart(Math.abs(totalPureProfit), true, language).replace(' UZS', '')}</span>
                                            </NumberTooltip>
                                        </span>
                                    </div>
                                    <ResponsiveContainer width="100%" height="100%" className="z-10 relative">
                                        <PieChart>
                                            <Pie
                                                data={netProfitChartRows}
                                                cx="50%" cy="50%" innerRadius={70} outerRadius={90}
                                                paddingAngle={5} dataKey="value" stroke="none"
                                            >
                                                {netProfitChartRows.map((entry, index) => (
                                                    <Cell key={`net-profit-cell-${entry.key}-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                content={({ active, payload }) => {
                                                    const row = payload?.[0]?.payload as typeof netProfitChartRows[number] | undefined;
                                                    if (!active || !row) return null;
                                                    const netTone = row.net >= 0
                                                        ? theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                                                        : theme === 'dark' ? 'text-rose-400' : 'text-rose-600';
                                                    return (
                                                        <div className={`min-w-[180px] rounded-2xl border p-3 shadow-2xl ${theme === 'dark' ? 'bg-[#151e2e] border-white/[0.08] text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
                                                            <div className="flex items-center gap-2 mb-3">
                                                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                                                                <span className="text-xs font-black uppercase tracking-wider">{row.label}</span>
                                                            </div>
                                                            <div className="space-y-2 text-[12px]">
                                                                <div className="flex justify-between gap-5">
                                                                    <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>{t('pureNetProfit', 'Sof foyda')}</span>
                                                                    <span className={`font-black ${netTone}`}>{row.net >= 0 ? '+' : '-'}{formatNumberSmart(Math.abs(row.net), true, language)}</span>
                                                                </div>
                                                                <div className="flex justify-between gap-5">
                                                                    <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>{t('income', 'Tushum')}</span>
                                                                    <span className="font-bold">{formatNumberSmart(row.income, true, language)}</span>
                                                                </div>
                                                                <div className="flex justify-between gap-5">
                                                                    <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>{t('expense', 'Xarajat')}</span>
                                                                    <span className="font-bold">{formatNumberSmart(row.expense, true, language)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-[220px] flex items-center justify-center opacity-50"><p className="text-sm">Ma'lumot yo'q</p></div>
                            )}
                            <div className="w-full mt-2 flex flex-wrap gap-4 justify-center px-2">
                                {netProfitRows.map(row => {
                                    const pct = totalNetProfitAbs > 0 ? ((Math.abs(row.net) / totalNetProfitAbs) * 100).toFixed(0) : '0';
                                    return (
                                        <div key={row.key} className="flex items-center gap-1.5 text-[11px]">
                                            <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: row.color }} />
                                            <span className={`font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{row.label} ({pct}%)</span>
                                            <NumberTooltip value={row.net} label={`${row.label} ${t('pureNetProfit', 'Sof foyda')}`} theme={theme}>
                                                <span className={`font-bold cursor-help ${row.net >= 0 ? theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600' : theme === 'dark' ? 'text-rose-400' : 'text-rose-600'}`}>
                                                    {row.net >= 0 ? '+' : '-'}{formatNumberSmart(Math.abs(row.net), true, language)}
                                                </span>
                                            </NumberTooltip>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
	                    </div>
	                </div>

	                {/* Operations Widgets */}
	                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
	                    {/* Plan Fulfillment */}
	                    <div className={`p-5 rounded-3xl border shadow-lg xl:col-span-2 ${theme === 'dark' ? 'bg-surface border-white/[0.08]' : 'bg-white border-gray-200'}`}>
                            <h3 className={`text-sm md:text-base font-bold flex items-center gap-2 mb-4 opacity-80 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                <TrendingUpIcon className={`w-4 h-4 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                                {t('planFulfillment', 'Reja Bajarilishi')}
                            </h3>
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                    <div className="min-w-0">
                                        <div className={`text-[34px] leading-none font-black font-mono ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                            {advancedStats.planFulfillment.percentage}%
                                        </div>
                                        <div className={`mt-1 text-[12px] font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                            {formatFullMoney(advancedStats.planFulfillment.paidTowardPlan)} / {formatFullMoney(advancedStats.planFulfillment.target)}
                                        </div>
                                    </div>
                                    <div className={`rounded-2xl px-4 py-3 text-[12px] font-bold ${theme === 'dark' ? 'bg-white/[0.04] text-gray-300' : 'bg-slate-50 text-slate-600'}`}>
                                        <span className={theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}>
                                            {formatFullMoney(advancedStats.planFulfillment.paidTowardPlan)}
                                        </span>
                                        <span className="mx-2 opacity-50">+</span>
                                        <span className={theme === 'dark' ? 'text-rose-400' : 'text-rose-600'}>
                                            {formatFullMoney(advancedStats.planFulfillment.actualDebt)}
                                        </span>
                                        <span className="mx-2 opacity-50">=</span>
                                        <span>{formatFullMoney(advancedStats.planFulfillment.target)}</span>
                                    </div>
                                </div>
                                <div className={`w-full h-3 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-100'}`}>
                                    <div 
                                        className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-1000"
                                        style={{ width: `${advancedStats.planFulfillment.percentage}%` }}
                                    />
                                </div>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    <div className={`rounded-2xl border p-4 ${theme === 'dark' ? 'border-white/[0.08] bg-white/[0.03]' : 'border-gray-100 bg-slate-50/70'}`}>
                                        <div className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                            {t('totalExpectedPlan', 'Jami kutilgan reja')}
                                        </div>
                                        <NumberTooltip value={advancedStats.planFulfillment.target} label={t('planFulfillmentTooltip', "Reja bajarilishi: rejaga to'langan + qolgan qarz = jami kutilgan reja")} theme={theme}>
                                            <div className={`mt-2 cursor-help text-[17px] font-black tabular-nums leading-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                                {formatFullMoney(advancedStats.planFulfillment.target)}
                                            </div>
                                        </NumberTooltip>
                                    </div>
                                    <div className={`rounded-2xl border p-4 ${theme === 'dark' ? 'border-emerald-500/20 bg-emerald-500/[0.06]' : 'border-emerald-100 bg-emerald-50/70'}`}>
                                        <div className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>
                                            {t('paidTowardPlan', "Rejaga to'langan")}
                                        </div>
                                        <NumberTooltip value={advancedStats.planFulfillment.paidTowardPlan} label={t('paidTowardPlan', "Rejaga to'langan")} theme={theme}>
                                            <div className={`mt-2 cursor-help text-[17px] font-black tabular-nums leading-tight ${theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700'}`}>
                                                {formatFullMoney(advancedStats.planFulfillment.paidTowardPlan)}
                                            </div>
                                        </NumberTooltip>
                                    </div>
                                    <div className={`rounded-2xl border p-4 ${theme === 'dark' ? 'border-rose-500/20 bg-rose-500/[0.06]' : 'border-rose-100 bg-rose-50/70'}`}>
                                        <div className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-rose-400' : 'text-rose-700'}`}>
                                            {t('debt', 'Qarz')}
                                        </div>
                                        <NumberTooltip value={advancedStats.planFulfillment.actualDebt} label={t('debt', 'Qarz')} theme={theme}>
                                            <div className={`mt-2 cursor-help text-[17px] font-black tabular-nums leading-tight ${theme === 'dark' ? 'text-rose-300' : 'text-rose-700'}`}>
                                                {formatFullMoney(advancedStats.planFulfillment.actualDebt)}
                                            </div>
                                        </NumberTooltip>
                                    </div>
                                </div>
                            </div>
                    </div>

                    {/* Fleet Utilization */}
                    <div className={`p-5 rounded-3xl border shadow-lg ${theme === 'dark' ? 'bg-surface border-white/[0.08]' : 'bg-white border-gray-200'}`}>
                            <h3 className={`text-sm md:text-base font-bold flex items-center gap-2 mb-4 opacity-80 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                <svg className={`w-4 h-4 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                {t('fleetStatus', 'Avtopark Holati')}
                            </h3>
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col gap-1.5 flex-1">
                                    <div className="flex justify-between text-sm items-center mr-6">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                            <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{t('active', 'Faol')}</span>
                                        </div>
                                        <span className="font-bold">{advancedStats.fleetStats.activeCount}</span>
                                    </div>
                                    <div className="flex justify-between text-sm items-center mr-6">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></div>
                                            <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{t('inRepair', 'Ta\'mirda')}</span>
                                        </div>
                                        <span className="font-bold">{advancedStats.fleetStats.repairCount}</span>
                                    </div>
                                    <div className="flex justify-between text-sm items-center mr-6">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                                            <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{t('idle', 'Bo\'sh')}</span>
                                        </div>
                                        <span className="font-bold">{advancedStats.fleetStats.idleCount}</span>
                                    </div>
                                </div>
                                <div className="w-[80px] h-[80px] rounded-full border-4 border-dashed border-gray-500/20 flex flex-col items-center justify-center flex-shrink-0">
                                    <span className="text-xl font-black leading-none">{advancedStats.fleetStats.total}</span>
                                    <span className="text-[10px] uppercase tracking-wider text-gray-500 mt-1">{t('total', 'Jami')}</span>
                                </div>
                            </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
