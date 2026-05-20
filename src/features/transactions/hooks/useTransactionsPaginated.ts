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
    reload: (quiet?: boolean) => void;
    fetchMore: () => void;
    removeRows: (ids: Set<string>) => void;
    restoreRows: (rows: Transaction[]) => void;
    patchRow: (id: string, patch: Partial<Transaction>) => void;
}

type CachedTxPage = {
    rows: Transaction[];
    nextCursor: number | null;
    hasMore: boolean;
    ts: number;
};

const PAGE_CACHE = new Map<string, CachedTxPage>();
const PAGE_CACHE_TTL_MS = 5 * 60 * 1000;

const getCacheKey = (fleetId: string | undefined, filters: TxPageFilters) => {
    if (!fleetId) return '';
    return [
        'tx-page',
        fleetId,
        filters.startMs ?? 'any',
        filters.endMs ?? 'any',
        filters.driverId ?? 'all',
        filters.type ?? 'all',
    ].join('|');
};

const readPageCache = (key: string): CachedTxPage | null => {
    if (!key) return null;
    const cached = PAGE_CACHE.get(key);
    if (!cached) return null;
    if (Date.now() - cached.ts > PAGE_CACHE_TTL_MS) {
        PAGE_CACHE.delete(key);
        return null;
    }
    return cached;
};

const writePageCache = (
    key: string,
    rows: Transaction[],
    nextCursor: number | null,
    hasMore: boolean,
) => {
    if (!key) return;
    PAGE_CACHE.set(key, { rows, nextCursor, hasMore, ts: Date.now() });
};

export const useTransactionsPaginated = (
    fleetId: string | undefined,
    filters: TxPageFilters,
): UsePaginatedTxState => {
    const initialCache = readPageCache(getCacheKey(fleetId, filters));
    const [rows, setRows] = useState<Transaction[]>(initialCache?.rows ?? []);
    const [nextCursor, setNextCursor] = useState<number | null>(initialCache?.nextCursor ?? null);
    const [hasMore, setHasMore] = useState(initialCache?.hasMore ?? false);
    const [loading, setLoading] = useState(!initialCache);
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
    const hasMoreRef = useRef(false);
    hasMoreRef.current = hasMore;
    const cacheKeyRef = useRef(getCacheKey(fleetId, filters));
    cacheKeyRef.current = getCacheKey(fleetId, filters);

    // Generation counter: incremented on every reset (filter change / initial load).
    // Any async callback checks this before committing state — prevents stale fetches
    // from landing after a newer fetch has already started.
    const genRef = useRef(0);

    const fetchPage = useCallback(async (cursor: number | null, reset: boolean, showLoading: boolean = true) => {
        const fleet = fleetRef.current;
        const key = cacheKeyRef.current;
        if (!fleet) {
            setRows([]);
            setNextCursor(null);
            setHasMore(false);
            setError(null);
            setLoading(false);
            setIsFetchingMore(false);
            return;
        }

        if (reset) {
            if (showLoading) setLoading(true);
            setError(null);
        } else {
            if (fetchingMoreRef.current) return;
            setIsFetchingMore(true);
        }

        const gen = reset ? ++genRef.current : genRef.current;
        const stale = () => genRef.current !== gen;

        // Keep failures short and visible instead of making the page look stuck.
        let lastErr: any = null;
        for (let attempt = 0; attempt < 2; attempt++) {
            if (stale()) return;
            if (attempt > 0) {
                await new Promise<void>(resolve => setTimeout(resolve, 900));
                if (stale()) return;
            }
            try {
                const result = await fetchTransactionsPage(fleet, cursor, 50, filtersRef.current);
                if (stale()) return;

                if (reset) {
                    setRows(result.data);
                    writePageCache(key, result.data, result.nextCursor, result.nextCursor !== null);
                } else {
                    setRows(prev => {
                        const existing = new Set(prev.map(r => r.id));
                        const next = [...prev, ...result.data.filter(r => !existing.has(r.id))];
                        writePageCache(key, next, result.nextCursor, result.nextCursor !== null);
                        return next;
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

        if (!stale()) {
            setError(lastErr?.message ?? 'Failed to load transactions');
            setHasMore(false);
            if (showLoading) setLoading(false);
            setIsFetchingMore(false);
        }
    }, []);

    const reload = useCallback((quiet = false) => {
        fetchPage(null, true, !quiet);
    }, [fetchPage]);

    const fetchMore = useCallback(() => {
        const cursor = cursorRef.current;
        if (!cursor || !hasMoreRef.current || fetchingMoreRef.current || loading) return;
        fetchPage(cursor, false);
    }, [fetchPage, loading]);

    useEffect(() => {
        const key = getCacheKey(fleetId, filters);
        const cached = readPageCache(key);
        if (cached) {
            setRows(cached.rows);
            setNextCursor(cached.nextCursor);
            setHasMore(cached.hasMore);
            setError(null);
            setLoading(false);
            fetchPage(null, true, false);
            return;
        }

        setRows([]);
        setNextCursor(null);
        setHasMore(false);
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
                debounceTimer = setTimeout(() => reload(true), 300);
            })
            .subscribe();

        return () => {
            clearTimeout(debounceTimer);
            supabase.removeChannel(channel);
        };
    }, [fleetId, reload]);

    const removeRows = useCallback((ids: Set<string>) => {
        setRows(prev => {
            const next = prev.filter(r => !ids.has(r.id));
            writePageCache(cacheKeyRef.current, next, cursorRef.current, hasMoreRef.current);
            return next;
        });
    }, []);

    const restoreRows = useCallback((toRestore: Transaction[]) => {
        setRows(prev => {
            const existing = new Set(prev.map(r => r.id));
            const fresh = toRestore.filter(r => !existing.has(r.id));
            const next = [...prev, ...fresh].sort((a, b) => b.timestamp - a.timestamp);
            writePageCache(cacheKeyRef.current, next, cursorRef.current, hasMoreRef.current);
            return next;
        });
    }, []);

    const patchRow = useCallback((id: string, patch: Partial<Transaction>) => {
        setRows(prev => {
            const next = prev.map(r => r.id === id ? { ...r, ...patch } : r);
            writePageCache(cacheKeyRef.current, next, cursorRef.current, hasMoreRef.current);
            return next;
        });
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
