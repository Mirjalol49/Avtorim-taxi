import { useState, useEffect, useRef } from 'react';
import { Transaction } from '../../../core/types';
import { subscribeToTransactions } from '../../../../services/firestoreService';

export const useTransactions = (fleetId?: string, _refreshTrigger?: number) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const initializedRef = useRef(false);

    useEffect(() => {
        if (!fleetId) {
            setLoading(false);
            return;
        }

        if (!initializedRef.current) {
            setLoading(true);
        }

        // Bail out after 12s if subscription never fires (network / RLS issue)
        const timeout = setTimeout(() => setLoading(false), 12000);

        const unsubscribe = subscribeToTransactions(
            (data) => {
                clearTimeout(timeout);
                initializedRef.current = true;
                setTransactions(data);
                setLoading(false);
                setError(null);
            },
            fleetId,
        );

        return () => {
            clearTimeout(timeout);
            unsubscribe();
        };
    // Intentionally exclude _refreshTrigger: subscription handles live updates,
    // recreating the channel on refresh causes a gap in coverage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fleetId]);

    return { transactions, loading, error };
};
