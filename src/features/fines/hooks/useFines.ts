import { useState, useEffect, useRef } from 'react';
import { Fine } from '../../../core/types/fines.types';
import { subscribeToFines } from '../../../../services/finesService';
import { readCache, writeCache } from '../../../core/utils/dataCache';

export const useFines = (fleetId?: string) => {
    const [fines, setFines] = useState<Fine[]>([]);
    const [loading, setLoading] = useState(true);
    const [tableError, setTableError] = useState(false);
    const refetchRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        if (!fleetId) {
            setLoading(false);
            return;
        }

        const cached = readCache<Fine>(`fines_${fleetId}`);
        if (cached.length > 0) {
            setFines(cached);
            setLoading(false);
        }

        if (cached.length === 0) setLoading(true);
        setTableError(false);

        const { unsubscribe, refetch } = subscribeToFines((data, error?: boolean) => {
            if (error) {
                setTableError(true);
                setLoading(false);
                return;
            }
            setFines(data);
            setLoading(false);
            setTableError(false);
            writeCache(`fines_${fleetId}`, data);
        }, fleetId);

        refetchRef.current = refetch;

        return () => {
            refetchRef.current = null;
            unsubscribe();
        };
    }, [fleetId]);

    useEffect(() => {
        let hiddenAt = 0;
        const STALE_THRESHOLD_MS = 60_000;
        const handleVisibility = () => {
            if (document.visibilityState === 'hidden') {
                hiddenAt = Date.now();
            } else if (document.visibilityState === 'visible' && refetchRef.current) {
                if (hiddenAt > 0 && Date.now() - hiddenAt > STALE_THRESHOLD_MS) {
                    refetchRef.current();
                }
                hiddenAt = 0;
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, []);

    return { fines, loading, tableError, refetch: () => refetchRef.current?.() };
};
