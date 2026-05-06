import { useState, useEffect, useRef } from 'react';
import { Transaction } from '../../../core/types';
import { subscribeToTransactions } from '../../../../services/firestoreService';
import { readCache, writeCache } from '../../../core/utils/dataCache';

export const useTransactions = (fleetId?: string, refreshTrigger?: number) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const refetchRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        // Keep loading=true while fleetId is not yet resolved (auth still in progress).
        if (!fleetId) return;

        // ── Pattern 1: Serve stale cache INSTANTLY ──────────────────────────────
        // Transactions are the slowest resource (dual-fetch, can take 5–9s on a cold
        // Supabase instance). Showing the last-known list immediately eliminates the
        // most visible empty-state flash in the entire app.
        const cached = readCache<Transaction>(`transactions_${fleetId}`);
        if (cached.length > 0) {
            setTransactions(cached);
            setLoading(false); // unblock UI immediately — fetchAll will update silently
        }
        // ────────────────────────────────────────────────────────────────────────

        // If this is a manual refresh (refreshTrigger changed), use refetch instead of re-subscribing
        if (refreshTrigger !== undefined && refreshTrigger > 0 && refetchRef.current) {
            refetchRef.current();
            return;
        }

        // Only show the spinner on first-ever load (no cache yet)
        if (cached.length === 0) setLoading(true);

        // Bail out after 10s if data never arrives.
        // With 5s AbortController + 3s retry gap, data arrives in ≤9s on cold Supabase.
        const timeout = setTimeout(() => setLoading(false), 10000);

        const { unsubscribe, refetch } = subscribeToTransactions(
            (data) => {
                clearTimeout(timeout);
                setTransactions(data);
                setLoading(false);
                setError(null);
                // Persist fresh data so the next load is instant.
                // writeCache guards against oversized payloads automatically.
                writeCache(`transactions_${fleetId}`, data);
            },
            fleetId,
        );

        refetchRef.current = refetch;

        return () => {
            clearTimeout(timeout);
            refetchRef.current = null;
            unsubscribe();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fleetId, refreshTrigger]);

    // Refetch when the app comes back to the foreground (PWA resume, tab switch)
    useEffect(() => {
        const handleVisibility = () => {
            if (document.visibilityState === 'visible' && refetchRef.current) {
                refetchRef.current();
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, []);

    return { transactions, setTransactions, loading, error };
};
