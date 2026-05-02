import { useState, useEffect, useRef } from 'react';
import { Transaction } from '../../../core/types';
import { subscribeToTransactions } from '../../../../services/firestoreService';

export const useTransactions = (fleetId?: string, _refreshTrigger?: number) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const refetchRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        // Keep loading=true while fleetId is not yet resolved (auth still in progress).
        // Setting loading=false here would cause a false empty-state flash.
        if (!fleetId) return;

        setLoading(true);

        // Bail out after 5s if data never arrives (network/RLS issue)
        const timeout = setTimeout(() => setLoading(false), 5000);

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
    }, [fleetId]);

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
