import { useState, useCallback, useRef, useEffect } from 'react';
import { Transaction } from '../../../core/types';
import { fetchTransactionsPage, TxPageFilters } from '../../../../services/firestoreService';
import { supabase } from '../../../../supabase';

export interface UsePaginatedTxState {
    transactions: Transaction[];
    loading: boolean;
    isFetchingMore: boolean;
    hasMore: boolean;
    nextCursor: number | null;
    error: string | null;
    reload: () => void;
    fetchMore: () => void;
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

    const fleetRef = useRef(fleetId);
    fleetRef.current = fleetId;
    const filtersRef = useRef(filters);
    filtersRef.current = filters;
    const cursorRef = useRef<number | null>(null);
    cursorRef.current = nextCursor;
    const fetchingMoreRef = useRef(false);
    fetchingMoreRef.current = isFetchingMore;

    // Generation counter: incremented on every reset (filter change / initial load).
    // Any async callback checks this before committing state — prevents stale fetches
    // from landing after a newer fetch has already started.
    const genRef = useRef(0);

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

        const gen = reset ? ++genRef.current : genRef.current;
        const stale = () => genRef.current !== gen;

        // Retry up to 3 attempts with a 3s gap between each.
        // Mirrors the retry pattern in subscribeToTransactions/fetchAll so cold-start
        // Supabase hangs are handled the same way everywhere.
        let lastErr: any = null;
        for (let attempt = 0; attempt < 3; attempt++) {
            if (stale()) return;
            if (attempt > 0) {
                // Wait 3s before retry, abort if a newer fetch superseded us
                await new Promise<void>(resolve => setTimeout(resolve, 3000));
                if (stale()) return;
            }
            try {
                const result = await fetchTransactionsPage(fleet, cursor, 100, filtersRef.current);
                if (stale()) return;

                if (reset) {
                    setRows(result.data);
                } else {
                    setRows(prev => {
                        const existing = new Set(prev.map(r => r.id));
                        return [...prev, ...result.data.filter(r => !existing.has(r.id))];
                    });
                }
                setNextCursor(result.nextCursor);
                setHasMore(result.nextCursor !== null);
                setError(null);
                setLoading(false);
                setIsFetchingMore(false);
                return; // success — exit the retry loop
            } catch (err: any) {
                lastErr = err;
                // Log on first attempt only to avoid console spam during retries
                if (attempt === 0) {
                    console.warn('[Tx] fetch failed, will retry up to 2 more times:', err.message);
                }
            }
        }

        // All 3 attempts failed
        if (!stale()) {
            setError(lastErr?.message ?? 'Failed to load transactions');
            setHasMore(false);
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

    useEffect(() => {
        fetchPage(null, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fleetId, filters.startMs, filters.endMs, filters.driverId, filters.type]);

    // Realtime subscription to keep the paginated list fresh when new transactions are added
    useEffect(() => {
        if (!fleetId) return;

        let debounceTimer: NodeJS.Timeout;

        const channel = supabase
            .channel(`transactions_paginated_${fleetId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `fleet_id=eq.${fleetId}` }, () => {
                // Debounce reload to prevent spamming if many transactions change at once
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => reload(), 300);
            })
            .subscribe();

        return () => {
            clearTimeout(debounceTimer);
            supabase.removeChannel(channel);
        };
    }, [fleetId, reload]);

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
