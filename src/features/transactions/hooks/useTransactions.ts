import { useState, useEffect, useRef } from 'react';
import { Transaction } from '../../../core/types';
import { subscribeToTransactions } from '../../../../services/firestoreService';

export const useTransactions = (fleetId?: string, refreshTrigger?: number) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const refetchRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        // Keep loading=true while fleetId is not yet resolved (auth still in progress).
        // Setting loading=false here would cause a false empty-state flash.
        if (!fleetId) return;

        // If this is a manual refresh (refreshTrigger changed), use refetch instead of re-subscribing
        if (refreshTrigger !== undefined && refreshTrigger > 0 && refetchRef.current) {
            refetchRef.current();
            return;
        }

        setLoading(true);

        // Bail out after 15s if data never arrives (network/RLS issue).
        // Kept high because fetchAll (triggered on reconnect) can take several seconds on slow networks.
        const timeout = setTimeout(() => setLoading(false), 15000);

        const { unsubscribe, refetch } = subscribeToTransactions(
            (data) => {
                clearTimeout(timeout);
                setTransactions(data);
                setLoading(false);
                setError(null);
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
