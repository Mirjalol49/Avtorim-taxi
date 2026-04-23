import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Transaction, TransactionType, PaymentStatus } from '../../../core/types';

interface FinanceFilters {
    startDate: string;
    endDate: string;
    driverId: string;
    type: string;
}

export const useFinanceStats = (transactions: Transaction[]) => {
    const { i18n } = useTranslation();
    const language = i18n.language; // Use i18n language

    // State
    const [filters, setFilters] = useState<FinanceFilters>({
        startDate: '',
        endDate: '',
        driverId: 'all',
        type: 'all'
    });
    const [analyticsYear, setAnalyticsYear] = useState<number>(new Date().getFullYear());
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Filter Logic
    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            // Exclude refunded/reversed transactions from list (but keep deleted ones visible as requested? Original logic excluded refunded/reversed)
            if (tx.status === PaymentStatus.REFUNDED || tx.status === PaymentStatus.REVERSED) return false;

            const txDate = new Date(tx.timestamp);
            let dateMatch = true;
            if (filters.startDate) {
                const start = new Date(filters.startDate);
                dateMatch = dateMatch && txDate >= start;
            }
            if (filters.endDate) {
                const end = new Date(filters.endDate);
                end.setHours(23, 59, 59, 999);
                dateMatch = dateMatch && txDate <= end;
            }
            let driverMatch = true;
            if (filters.driverId !== 'all') {
                driverMatch = tx.driverId === filters.driverId;
            }
            let typeMatch = true;
            if (filters.type !== 'all') {
                typeMatch = tx.type === filters.type;
            }
            return dateMatch && driverMatch && typeMatch;
        }).sort((a, b) => b.timestamp - a.timestamp);
    }, [transactions, filters]);

    // Pagination
    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filters]);

    const paginatedTransactions = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredTransactions.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredTransactions, currentPage, itemsPerPage]);

    const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / itemsPerPage));

    // Finance Tab Stats (Cards) - Exclude DELETED transactions
    const financeStats = useMemo(() => {
        const income = filteredTransactions
            .filter(t => t.type === TransactionType.INCOME && t.status !== PaymentStatus.DELETED)
            .reduce((sum, t) => sum + t.amount, 0);
        const expense = filteredTransactions
            .filter(t => t.type === TransactionType.EXPENSE && t.status !== PaymentStatus.DELETED)
            .reduce((sum, t) => sum + t.amount, 0);

        return {
            income,
            expense,
            netProfit: income - expense
        };
    }, [filteredTransactions]);


    // Monthly Analytics Data (Chart)
    const monthlyAnalyticsData = useMemo(() => {
        const monthlyData: Record<string, { name: string; Income: number; Expense: number }> = {};

        // Stable short month names — avoid uz-UZ returning "M01" in some browsers
        const SHORT_MONTHS_UZ = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
        const SHORT_MONTHS_RU = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
        const SHORT_MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const getMonthName = (idx: number): string => {
            if (language === 'ru') return SHORT_MONTHS_RU[idx];
            if (language === 'en') return SHORT_MONTHS_EN[idx];
            return SHORT_MONTHS_UZ[idx]; // uz default
        };

        // Initialize all 12 months for the selected year
        for (let i = 0; i < 12; i++) {
            const key = `${analyticsYear}-${i}`;
            monthlyData[key] = { name: getMonthName(i), Income: 0, Expense: 0 };
        }

        // Logic from App.tsx: Falls back to 'transactions' if filtered list is empty.
        const source = filteredTransactions;

        source.forEach(tx => {
            const d = new Date(tx.timestamp);
            if (d.getFullYear() === analyticsYear) {
                const key = `${d.getFullYear()}-${d.getMonth()}`;
                if (monthlyData[key]) {
                    if (tx.status === PaymentStatus.REVERSED || tx.status === PaymentStatus.REFUNDED || tx.status === PaymentStatus.DELETED) return;
                    if (tx.type === TransactionType.INCOME) {
                        monthlyData[key].Income += tx.amount;
                    } else {
                        monthlyData[key].Expense += tx.amount;
                    }
                }
            }
        });

        return Object.values(monthlyData);
    }, [filteredTransactions, language, analyticsYear]);

    // Yearly Analytics Totals (Cards above Chart)
    const yearlyAnalyticsTotals = useMemo(() => {
        let yearlyIncome = 0;
        let yearlyExpense = 0;

        const source = filteredTransactions;
        source.forEach(tx => {
            if (tx.status === PaymentStatus.REVERSED || tx.status === PaymentStatus.REFUNDED || tx.status === PaymentStatus.DELETED) return;

            const d = new Date(tx.timestamp);
            if (d.getFullYear() === analyticsYear) {
                if (tx.type === TransactionType.INCOME) {
                    yearlyIncome += tx.amount;
                } else {
                    yearlyExpense += tx.amount;
                }
            }
        });

        return {
            income: yearlyIncome,
            expense: yearlyExpense,
            netProfit: yearlyIncome - yearlyExpense
        };
    }, [filteredTransactions, analyticsYear]);

    return {
        filters, setFilters,
        analyticsYear, setAnalyticsYear,
        currentPage, setCurrentPage,
        paginatedTransactions,
        totalPages,
        financeStats,
        monthlyAnalyticsData,
        yearlyAnalyticsTotals,
        filteredTransactionsCount: filteredTransactions.length,
        filteredTransactions, // Expose full list for 'Select All' functionality
        itemsPerPage
    };
};
