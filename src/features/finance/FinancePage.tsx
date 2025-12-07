import React from 'react';
import { useTranslation } from 'react-i18next';
import { Transaction, Driver, Language } from '../../core/types';
import { useFinanceStats } from './hooks/useFinanceStats';
import { formatNumberSmart } from '../../../utils/formatNumber';
import DatePicker from '../../../components/DatePicker';
import CustomSelect from '../../../components/CustomSelect';
import NumberTooltip from '../../../components/NumberTooltip';
import YearSelector from '../../../components/YearSelector';
import {
    UsersIcon,
    TrendingUpIcon,
    TrendingDownIcon,
    WalletIcon,
    BanknoteIcon
} from '../../../components/Icons';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface FinancePageProps {
    transactions: Transaction[];
    drivers: Driver[];
    theme: 'dark' | 'light';
    // language removed
    isMobile?: boolean;
}

export const FinancePage: React.FC<FinancePageProps> = ({
    transactions: allTransactions,
    drivers,
    theme,
    isMobile = false
}) => {
    const { t, i18n } = useTranslation();
    const language = (['uz', 'en', 'ru'].includes(i18n.language) ? i18n.language : 'uz') as Language;

    // useFinanceStats now manages language internally
    const {
        filters, setFilters,
        analyticsYear, setAnalyticsYear,
        monthlyAnalyticsData,
        yearlyAnalyticsTotals
    } = useFinanceStats(allTransactions);

    const nonDeletedDrivers = drivers.filter(d => !d.isDeleted);

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Analytics Header Filters */}
            <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 p-5 rounded-2xl border ${theme === 'dark' ? 'bg-[#1E293B]/80 border-[#334155]' : 'bg-[#1F2937]/95 border-gray-700'}`}>
                <DatePicker
                    label={t('fromDate') || 'Boshlanish sanasi'}
                    value={filters.startDate ? new Date(filters.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)}
                    onChange={(date) => setFilters(prev => ({ ...prev, startDate: date.toISOString() }))}
                    theme={theme}
                    labelClassName="text-white"
                />
                <DatePicker
                    label={t('toDate') || 'Tugash sanasi'}
                    value={filters.endDate ? new Date(filters.endDate) : new Date()}
                    onChange={(date) => setFilters(prev => ({ ...prev, endDate: date.toISOString() }))}
                    theme={theme}
                    labelClassName="text-white"
                />
                <CustomSelect
                    label={t('driver') || 'Haydovchi'}
                    value={filters.driverId}
                    onChange={(val) => setFilters(prev => ({ ...prev, driverId: val }))}
                    options={[
                        { id: 'all', name: t('allDrivers') || 'Barcha Haydovchilar' },
                        ...nonDeletedDrivers.map(d => ({ id: d.id, name: d.name }))
                    ]}
                    theme={theme}
                    showSearch={true}
                    icon={UsersIcon}
                    labelClassName="text-white"
                />
            </div>

            {/* Yearly Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {/* Yearly Income */}
                <div className="bg-[#0d9488] p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl shadow-lg relative overflow-hidden group transition-all hover:shadow-xl">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUpIcon className="w-12 sm:w-16 md:w-20 h-12 sm:h-16 md:h-20 text-white" />
                    </div>
                    <div className="flex flex-col justify-between relative z-10 gap-2 sm:gap-3">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-white/10 rounded-lg text-white border border-white/10 flex-shrink-0">
                                <TrendingUpIcon className="w-4 sm:w-4 md:w-5 h-4 sm:h-4 md:h-5" />
                            </div>
                            <p className="text-[10px] sm:text-[10px] md:text-[11px] text-teal-100/80 font-bold uppercase tracking-wide">{analyticsYear} {t('totalIncome')}</p>
                        </div>
                        <div>
                            <NumberTooltip value={yearlyAnalyticsTotals.income} label={`${analyticsYear} ${t('totalIncome')}`} theme={theme}>
                                <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-4xl font-black text-white tracking-tight leading-none font-mono cursor-help whitespace-nowrap">
                                    {formatNumberSmart(yearlyAnalyticsTotals.income, isMobile, language)}
                                </h3>
                            </NumberTooltip>
                            <p className="text-[10px] sm:text-[11px] md:text-xs text-teal-100/60 font-medium mt-1.5 ml-0.5">UZS</p>
                        </div>
                    </div>
                </div>

                {/* Yearly Expense */}
                <div className={`p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border shadow-lg relative overflow-hidden group transition-all ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-100'}`}>
                    <div className={`absolute top-0 right-0 p-3 transition-opacity ${theme === 'dark' ? 'opacity-5 group-hover:opacity-10' : 'opacity-[0.08] group-hover:opacity-[0.12]'}`}>
                        <TrendingDownIcon className={`w-12 sm:w-16 md:w-20 h-12 sm:h-16 md:h-20 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`} />
                    </div>
                    <div className="flex flex-col justify-between relative z-10 gap-2 sm:gap-3">
                        <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg border flex-shrink-0 ${theme === 'dark' ? 'bg-gray-800 text-red-400 border-gray-700' : 'bg-red-50 text-red-500 border-red-100'}`}>
                                <TrendingDownIcon className="w-4 sm:w-4 md:w-5 h-4 sm:h-4 md:h-5" />
                            </div>
                            <p className={`text-[10px] sm:text-[10px] md:text-[11px] font-bold uppercase tracking-wide ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`}>{analyticsYear} {t('totalExpense')}</p>
                        </div>
                        <div>
                            <NumberTooltip value={yearlyAnalyticsTotals.expense} label={`${analyticsYear} ${t('totalExpense')}`} theme={theme}>
                                <h3 className={`text-2xl sm:text-3xl md:text-4xl lg:text-4xl font-black tracking-tight leading-none font-mono cursor-help whitespace-nowrap ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                    {formatNumberSmart(yearlyAnalyticsTotals.expense, isMobile, language)}
                                </h3>
                            </NumberTooltip>
                            <p className={`text-[10px] sm:text-[11px] md:text-xs font-medium mt-1.5 ml-0.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>UZS</p>
                        </div>
                    </div>
                </div>

                {/* Yearly Net Profit */}
                <div className={`p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border shadow-lg relative overflow-hidden group transition-all sm:col-span-2 lg:col-span-1 ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-100'}`}>
                    <div className={`absolute top-0 right-0 p-3 transition-opacity ${theme === 'dark' ? 'opacity-5 group-hover:opacity-10' : 'opacity-[0.08] group-hover:opacity-[0.12]'}`}>
                        <WalletIcon className={`w-12 sm:w-16 md:w-20 h-12 sm:h-16 md:h-20 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`} />
                    </div>
                    <div className="flex flex-col justify-between relative z-10 gap-2 sm:gap-3">
                        <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg border flex-shrink-0 ${theme === 'dark' ? 'bg-gray-800 text-[#0d9488] border-gray-700' : 'bg-[#0d9488]/10 text-[#0d9488] border-[#0d9488]/20'}`}>
                                <WalletIcon className="w-4 sm:w-4 md:w-5 h-4 sm:h-4 md:h-5" />
                            </div>
                            <p className={`text-[10px] sm:text-[10px] md:text-[11px] font-bold uppercase tracking-wide ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`}>{analyticsYear} {t('netProfit')}</p>
                        </div>
                        <div>
                            <NumberTooltip value={yearlyAnalyticsTotals.netProfit} label={`${analyticsYear} ${t('netProfit')}`} theme={theme}>
                                <h3 className={`text-2xl sm:text-3xl md:text-4xl lg:text-4xl font-black tracking-tight leading-none font-mono cursor-help whitespace-nowrap ${yearlyAnalyticsTotals.netProfit > 0
                                    ? theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                                    : yearlyAnalyticsTotals.netProfit < 0
                                        ? theme === 'dark' ? 'text-red-400' : 'text-red-600'
                                        : theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                                    }`}>
                                    {yearlyAnalyticsTotals.netProfit > 0 ? '+' : ''}{formatNumberSmart(yearlyAnalyticsTotals.netProfit, isMobile, language)}
                                </h3>
                            </NumberTooltip>
                            <p className={`text-[10px] sm:text-[11px] md:text-xs font-medium mt-1.5 ml-0.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>UZS</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Monthly Analytics Chart */}
            <div className={`w-full h-[300px] sm:h-[400px] p-4 sm:p-6 rounded-2xl sm:rounded-3xl border flex flex-col shadow-xl ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'}`}>
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
                        startYear={new Date().getFullYear()}
                        endYear={new Date().getFullYear() + 10}
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
                                contentStyle={{
                                    backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
                                    border: `1px solid ${theme === 'dark' ? '#374151' : '#E5E7EB'}`,
                                    borderRadius: '12px',
                                    color: theme === 'dark' ? '#FFFFFF' : '#111827',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                    fontSize: '12px'
                                }}
                                cursor={{ fill: theme === 'dark' ? '#374151' : '#F3F4F6', opacity: 0.5 }}
                                itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                                formatter={(value: number) => value.toLocaleString()}
                            />
                            <Bar dataKey="Income" name={t('income')} fill="#0d9488" radius={[6, 6, 0, 0]} />
                            <Bar dataKey="Expense" name={t('expense')} fill="#EF4444" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
