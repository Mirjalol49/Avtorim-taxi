import { useState, useCallback, useRef, useEffect } from 'react';
import { Transaction } from '../../../core/types';
import { fetchTransactionsPage, TxPageFilters } from '../../../../services/firestoreService';

export interface UsePaginatedTxState {
    transactions: Transaction[];
    loading: boolean;
    isFetchingMore: boolean;
    hasMore: boolean;
    nextCursor: number | null;
    error: string | null;
    reload: () => void;
    fetchMore: () => void;
    // Optimistic update helpers for CRUD operations
    removeRows: (ids: Set<string>) => void;
    restoreRows: (rows: Transaction[]) => void;
    patchRow: (id: string, patch: Partial<Transaction>) => void;
}

export const useTransactionsPaginated = (
    fleetId: string | undefined,
    filters: TxPageFilters,
): UsePaginatedTxState => {
    const [rows, setRows] = useState<Transaction[]>([]);
    const [nextCursor, setNextCursor] = useState<number | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Keep stable refs so callbacks don't go stale
    const fleetRef = useRef(fleetId);
    fleetRef.current = fleetId;
    const filtersRef = useRef(filters);
    filtersRef.current = filters;
    const cursorRef = useRef<number | null>(null);
    cursorRef.current = nextCursor;
    const fetchingMoreRef = useRef(false);
    fetchingMoreRef.current = isFetchingMore;

    const fetchPage = useCallback(async (cursor: number | null, reset: boolean) => {
        const fleet = fleetRef.current;
        if (!fleet) { setLoading(false); return; }

        if (reset) {
            setLoading(true);
            setError(null);
        } else {
            if (fetchingMoreRef.current) return;
            setIsFetchingMore(true);
        }

        try {
            const result = await fetchTransactionsPage(fleet, cursor, 100, filtersRef.current);
            if (reset) {
                setRows(result.data);
            } else {
                setRows(prev => {
                    // Deduplicate in case of cursor overlap on identical timestamps
                    const existing = new Set(prev.map(r => r.id));
                    return [...prev, ...result.data.filter(r => !existing.has(r.id))];
                });
            }
            setNextCursor(result.nextCursor);
            setHasMore(result.nextCursor !== null);
        } catch (err: any) {
            setError(err?.message ?? 'Failed to load transactions');
            // On error still mark as not loading so UI unblocks
            setHasMore(false);
        } finally {
            setLoading(false);
            setIsFetchingMore(false);
        }
    }, []);

    const reload = useCallback(() => {
        fetchPage(null, true);
    }, [fetchPage]);

    const fetchMore = useCallback(() => {
        const cursor = cursorRef.current;
        if (!cursor || fetchingMoreRef.current) return;
        fetchPage(cursor, false);
    }, [fetchPage]);

    // Reload whenever fleetId or filters change
    useEffect(() => {
        fetchPage(null, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fleetId, filters.startMs, filters.endMs, filters.driverId, filters.type]);

    // ── Optimistic update helpers ─────────────────────────────────────────────
    const removeRows = useCallback((ids: Set<string>) => {
        setRows(prev => prev.filter(r => !ids.has(r.id)));
    }, []);

    const restoreRows = useCallback((toRestore: Transaction[]) => {
        setRows(prev => {
            const existing = new Set(prev.map(r => r.id));
            const fresh = toRestore.filter(r => !existing.has(r.id));
            return [...prev, ...fresh].sort((a, b) => b.timestamp - a.timestamp);
        });
    }, []);

    const patchRow = useCallback((id: string, patch: Partial<Transaction>) => {
        setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
    }, []);

    return {
        transactions: rows,
        loading,
        isFetchingMore,
        hasMore,
        nextCursor,
        error,
        reload,
        fetchMore,
        removeRows,
        restoreRows,
        patchRow,
    };
};
