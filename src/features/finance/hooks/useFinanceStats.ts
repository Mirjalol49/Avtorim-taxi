import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Transaction, TransactionType, PaymentStatus, Driver, Car } from '../../../core/types';
import { getEffectivePlanForDriverDay } from '../../drivers/utils/driverPlanHistory';

interface FinanceFilters {
    startDate: string;
    endDate: string;
    driverId: string;
    type: string;
    paymentMethod: string;
}

export const useFinanceStats = (transactions: Transaction[], cars: Car[] = [], drivers: Driver[] = []) => {
    const { i18n } = useTranslation();
    const language = i18n.language; // Use i18n language

    // Default date range: 1st of current month → today (end of day)
    const defaultStartDate = (() => {
        const d = new Date();
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        return d.toISOString();
    })();
    const defaultEndDate = (() => {
        const d = new Date();
        d.setHours(23, 59, 59, 999);
        return d.toISOString();
    })();

    // State
    const [filters, setFilters] = useState<FinanceFilters>({
        startDate: defaultStartDate,
        endDate: defaultEndDate,
        driverId: 'all',
        type: 'all',
        paymentMethod: 'all'
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
            let methodMatch = true;
            if (filters.paymentMethod !== 'all') {
                methodMatch = tx.paymentMethod === filters.paymentMethod;
            }
            return dateMatch && driverMatch && typeMatch && methodMatch;
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

    // Derive available years from ALL transactions (not filtered), always include current year
    const availableYears = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const yearsFromData = new Set<number>(
            transactions.map(tx => new Date(tx.timestamp).getFullYear())
        );
        yearsFromData.add(currentYear);
        return Array.from(yearsFromData).sort((a, b) => b - a);
    }, [transactions]);

    // Advanced Analytics based on filtered transactions
    const advancedStats = useMemo(() => {
        const incomeByCategory: Record<string, number> = {};
        const expenseByCategory: Record<string, number> = {};
        const paymentMethods: Record<string, number> = { cash: 0, card: 0, transfer: 0 };
        const driverIncome: Record<string, { id: string; name: string; amount: number }> = {};
        
        const getExpenseCat = (desc: string): string => {
            const d = (desc || '').trim();
            const lower = d.toLowerCase();
            if (lower.includes('ta\'mir') || lower.includes('ehtiyot')) return "Ta'mirlash";
            if (lower.includes('jarima')) return "Jarimalar";
            if (lower.includes('kommunal') || lower.includes('ijara') || lower.includes('ofis') || lower.includes('xarid')) return 'Ofis';
            if (lower.includes('maosh')) return 'Maosh';
            return 'Boshqa';
        };

        const highCostCarsObj: Record<string, { id: string; name: string; amount: number; avatar?: string; latestComment?: string }> = {};

        filteredTransactions.forEach(tx => {
            if (tx.status === PaymentStatus.REVERSED || tx.status === PaymentStatus.REFUNDED || tx.status === PaymentStatus.DELETED) return;

            // Payment Methods (for bar widget)
            if (tx.amount > 0 && (tx as any).paymentMethod) {
                const pm = (tx as any).paymentMethod as string;
                paymentMethods[pm] = (paymentMethods[pm] || 0) + tx.amount;
            }

            if (tx.type === TransactionType.INCOME && (tx as any).category !== 'deposit_topup') {
                const pm = ((tx as any).paymentMethod as string) || 'cash';
                incomeByCategory[pm] = (incomeByCategory[pm] || 0) + tx.amount;
                const did = (tx as any).driverId;
                const dname = (tx as any).driverName;
                if (did && dname) {
                    if (!driverIncome[did]) driverIncome[did] = { id: did, name: dname, amount: 0 };
                    driverIncome[did].amount += tx.amount;
                }
            } else if (tx.type === TransactionType.EXPENSE) {
                const cat = (tx as any).category === 'salary_payment'
                    ? 'Maosh'
                    : getExpenseCat((tx as any).description || '');
                expenseByCategory[cat] = (expenseByCategory[cat] || 0) + tx.amount;
                
                // Track repair costs for cars
                if (cat === "Ta'mirlash") {
                    let cid = (tx as any).carId;
                    let cName = (tx as any).carName;

                    if (!cid && tx.driverId) {
                        const driver = drivers.find(d => d.id === tx.driverId);
                        if (driver?.carId) {
                            cid = driver.carId;
                        }
                    }

                    if (cid) {
                        const car = cars.find(c => c.id === cid);
                        if (!cName) {
                            cName = car ? car.name : 'Noma\'lum avto';
                        }
                        if (!highCostCarsObj[cid]) {
                            highCostCarsObj[cid] = { id: cid, name: cName, amount: 0, avatar: car?.avatar, latestComment: tx.description };
                        } else if (!highCostCarsObj[cid].latestComment && tx.description) {
                            // If we encounter a description later and didn't have one, save it
                            highCostCarsObj[cid].latestComment = tx.description;
                        }
                        highCostCarsObj[cid].amount += tx.amount;
                    }
                }
            }
        });

        const topEarners = Object.values(driverIncome)
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);

        const highCostCars = Object.values(highCostCarsObj)
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 3);

        // Format for Recharts — top 6 slices, merge rest into 'Boshqa'
        const formatForPie = (data: Record<string, number>) => {
            const sorted = Object.entries(data)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value);
            if (sorted.length <= 6) return sorted;
            const top = sorted.slice(0, 5);
            const otherVal = sorted.slice(5).reduce((s, e) => s + e.value, 0);
            if (otherVal > 0) top.push({ name: 'Boshqa', value: otherVal });
            return top;
        };

        let totalPlanTarget = 0;
        let totalPlanIncome = 0;
        let totalActualDebt = 0;
        
        const fStart = new Date(filters.startDate);
        const fEnd = new Date(filters.endDate);
        const today = new Date();
        const endDay = fEnd > today ? today : fEnd;

        if (fStart <= endDay) {
            const driversToProcess = filters.driverId !== 'all'
                ? drivers.filter(d => !d.isDeleted && d.id === filters.driverId)
                : drivers.filter(d => !d.isDeleted);

            driversToProcess.forEach(driver => {
                const car = cars.find(c => c.assignedDriverId === driver.id) || null;
                
                let driverTarget = 0;
                let d = new Date(fStart);
                d.setHours(0,0,0,0);
                const endDateMidnight = new Date(endDay);
                endDateMidnight.setHours(23,59,59,999);
                
                while (d <= endDateMidnight) {
                    const dateKeyStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    const isDayOffTx = transactions.some(tx => 
                        tx.driverId === driver.id && 
                        (tx.type === TransactionType.DAY_OFF || (tx.type as string) === 'NOT_WORKING') && 
                        tx.status !== PaymentStatus.DELETED &&
                        (() => {
                            const td = new Date(tx.timestamp);
                            return `${td.getFullYear()}-${String(td.getMonth() + 1).padStart(2, '0')}-${String(td.getDate()).padStart(2, '0')}` === dateKeyStr;
                        })()
                    );

                    if (!isDayOffTx) {
                        driverTarget += getEffectivePlanForDriverDay(driver, d, car);
                    }
                    d.setDate(d.getDate() + 1);
                }

                let driverIncome = 0;
                filteredTransactions.forEach(tx => {
                    if (tx.driverId === driver.id && tx.type === TransactionType.INCOME && tx.status !== PaymentStatus.REVERSED && tx.status !== PaymentStatus.REFUNDED && tx.status !== PaymentStatus.DELETED) {
                        driverIncome += tx.amount;
                    }
                });

                totalPlanTarget += driverTarget;
                totalPlanIncome += driverIncome;
                if (driverTarget > driverIncome) {
                    totalActualDebt += (driverTarget - driverIncome);
                }
            });

            let otherIncome = 0;
            filteredTransactions.forEach(tx => {
                if (tx.type === TransactionType.INCOME && tx.status !== PaymentStatus.REVERSED && tx.status !== PaymentStatus.REFUNDED && tx.status !== PaymentStatus.DELETED) {
                    const isCounted = driversToProcess.some(d => d.id === tx.driverId);
                    if (!isCounted) {
                        otherIncome += tx.amount;
                    }
                }
            });
            totalPlanIncome += otherIncome;
        }
        
        const planFulfillment = {
            target: totalPlanTarget,
            income: totalPlanIncome,
            actualDebt: totalActualDebt,
            percentage: totalPlanTarget > 0 ? Math.min(100, Math.round((totalPlanIncome / totalPlanTarget) * 100)) : 0
        };

        // --- Fleet Utilization ---
        let activeCount = 0;
        let idleCount = 0;
        let repairCount = 0;
        
        cars.forEach(car => {
            if (car.isDeleted) return;
            if (car.inRepair) {
                repairCount++;
            } else if (car.assignedDriverId) {
                activeCount++;
            } else {
                idleCount++;
            }
        });
        
        const fleetStats = { activeCount, idleCount, repairCount, total: activeCount + idleCount + repairCount };

        return {
            incomeByCategory: formatForPie(incomeByCategory),
            expenseByCategory: formatForPie(expenseByCategory),
            paymentMethods: Object.entries(paymentMethods)
                .filter(([, v]) => v > 0)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value),
            topEarners,
            highCostCars,
            planFulfillment,
            fleetStats
        };
    }, [filteredTransactions]);

    return {
        filters, setFilters,
        analyticsYear, setAnalyticsYear,
        availableYears,
        currentPage, setCurrentPage,
        paginatedTransactions,
        totalPages,
        financeStats,
        monthlyAnalyticsData,
        yearlyAnalyticsTotals,
        filteredTransactionsCount: filteredTransactions.length,
        filteredTransactions,
        itemsPerPage,
        advancedStats
    };
};
