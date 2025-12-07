import { useState, useEffect } from 'react';
import { Transaction } from '../../../core/types';
import { subscribeToTransactions } from '../../../../services/firestoreService';

export const useTransactions = (fleetId?: string) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        setLoading(true);
        const unsubscribe = subscribeToTransactions(
            (data) => {
                setTransactions(data);
                setLoading(false);
            },
            fleetId
        );

        return () => unsubscribe();
    }, [fleetId]);

    return { transactions, loading, error };
};
