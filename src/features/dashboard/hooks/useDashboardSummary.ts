import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../../supabase';
import { PaymentStatus, TimeFilter, Transaction, TransactionType } from '../../../core/types';
import { readCache, writeCache } from '../../../core/utils/dataCache';

interface DashboardSummary {
    totalIncome: number;
    totalExpense: number;
    netProfit: number;
    rowCount: number;
}

const EMPTY_SUMMARY: DashboardSummary = {
    totalIncome: 0,
    totalExpense: 0,
    netProfit: 0,
    rowCount: 0,
};

const SUMMARY_COLUMNS = 'amount,type,status,timestamp_ms,use_deposit,category';
const PAGE_SIZE = 1000;
const MAX_SUMMARY_ROWS = 20000;

const getPeriodBounds = (filter: TimeFilter) => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekDate = new Date(now);
    const startOfWeek = new Date(weekDate.setDate(weekDate.getDate() - weekDate.getDay())).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

    if (filter === 'today') return { startMs: startOfDay, cacheKey: `today_${startOfDay}` };
    if (filter === 'week') return { startMs: startOfWeek, cacheKey: `week_${startOfWeek}` };
    if (filter === 'month') return { startMs: startOfMonth, cacheKey: `month_${startOfMonth}` };
    if (filter === 'year') return { startMs: startOfYear, cacheKey: `year_${startOfYear}` };
    return { startMs: null, cacheKey: 'all' };
};

const isExcludedStatus = (status?: string | null) =>
    status === PaymentStatus.DELETED ||
    status === PaymentStatus.REFUNDED ||
    status === PaymentStatus.REVERSED;

const summarizeRows = (rows: any[]): DashboardSummary => {
    let totalIncome = 0;
    let totalExpense = 0;

    for (const row of rows) {
        if (isExcludedStatus(row.status)) continue;
        const amount = Number(row.amount ?? 0);
        if (row.type === TransactionType.INCOME && row.use_deposit !== true) {
            totalIncome += amount;
        } else if (row.type === TransactionType.EXPENSE) {
            totalExpense += amount;
        }
    }

    return {
        totalIncome,
        totalExpense,
        netProfit: totalIncome - totalExpense,
        rowCount: rows.length,
    };
};

const fetchDashboardSummary = async (fleetId: string, filter: TimeFilter): Promise<DashboardSummary> => {
    const { startMs } = getPeriodBounds(filter);
    let offset = 0;
    const rows: any[] = [];

    while (offset < MAX_SUMMARY_ROWS) {
        let query = supabase
            .from('transactions')
            .select(SUMMARY_COLUMNS)
            .eq('fleet_id', fleetId)
            .neq('status', PaymentStatus.DELETED)
            .order('timestamp_ms', { ascending: false })
            .range(offset, offset + PAGE_SIZE - 1);

        if (startMs !== null) {
            query = query.gte('timestamp_ms', startMs);
        }

        const { data, error } = await query;
        if (error) throw error;

        const page = data ?? [];
        rows.push(...page);
        if (page.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
    }

    return summarizeRows(rows);
};

export const useDashboardSummary = (
    fleetId: string | undefined,
    filter: TimeFilter,
    latestTransaction?: Transaction,
) => {
    const period = useMemo(() => getPeriodBounds(filter), [filter]);
    const cacheKey = fleetId ? `dashboard_summary_${fleetId}_${filter}_${period.cacheKey}` : '';
    const latestTransactionKey = latestTransaction
        ? `${latestTransaction.id}_${latestTransaction.amount}_${latestTransaction.status}_${latestTransaction.timestamp}`
        : '';

    const [summary, setSummary] = useState<DashboardSummary>(EMPTY_SUMMARY);
    const [loading, setLoading] = useState(true);
    const [validating, setValidating] = useState(false);

    useEffect(() => {
        if (!fleetId) {
            setSummary(EMPTY_SUMMARY);
            setLoading(true);
            setValidating(false);
            return;
        }

        let cancelled = false;
        const cached = readCache<DashboardSummary>(cacheKey)[0];
        if (cached) {
            setSummary(cached);
            setLoading(false);
            setValidating(true);
        } else {
            setLoading(true);
            setValidating(false);
        }

        const timer = setTimeout(() => {
            fetchDashboardSummary(fleetId, filter)
                .then((next) => {
                    if (cancelled) return;
                    setSummary(next);
                    setLoading(false);
                    setValidating(false);
                    writeCache(cacheKey, [next]);
                })
                .catch(() => {
                    if (cancelled) return;
                    setLoading(false);
                    setValidating(false);
                });
        }, cached ? 250 : 0);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [fleetId, filter, cacheKey, latestTransactionKey]);

    return { summary, loading, validating };
};
