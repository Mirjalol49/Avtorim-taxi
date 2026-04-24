import { useState, useEffect, useRef } from 'react';
import { Transaction } from '../../../core/types';
import { subscribeToTransactions } from '../../../../services/firestoreService';

export const useTransactions = (fleetId?: string, refreshTrigger?: number) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    // Track whether the current fleetId has received its first batch of data
    const initializedFleetId = useRef<string | null>(null);

    useEffect(() => {
        if (!fleetId) {
            setLoading(false);
            return;
        }

        // Show loading spinner only on first load for this fleetId, not on refreshTrigger bumps
        const isFirstLoad = initializedFleetId.current !== fleetId;
        if (isFirstLoad) {
            setLoading(true);
        }

        // Bail out of loading after 10 s if callback never fires (network issue / RLS error)
        const timeout = isFirstLoad
            ? setTimeout(() => setLoading(false), 10000)
            : null;

        const unsubscribe = subscribeToTransactions(
            (data) => {
                if (timeout) clearTimeout(timeout);
                initializedFleetId.current = fleetId;
                setTransactions(data);
                setLoading(false);
                setError(null);
            },
            fleetId
        );

        return () => {
            if (timeout) clearTimeout(timeout);
            unsubscribe();
        };
    }, [fleetId, refreshTrigger]);

    return { transactions, loading, error };
};
