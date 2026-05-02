import { useState, useEffect, useRef } from 'react';
import { Driver } from '../../../core/types';
import { subscribeToDrivers } from '../../../../services/firestoreService';

export const useDrivers = (fleetId?: string, _refreshTrigger?: number) => {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const refetchRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        // Keep loading=true while fleetId is not yet resolved (auth still in progress).
        // Setting loading=false here would cause a false empty-state flash.
        if (!fleetId) return;

        setLoading(true);

        const timeout = setTimeout(() => setLoading(false), 5000);

        const { unsubscribe, refetch } = subscribeToDrivers(
            (data) => {
                clearTimeout(timeout);
                setDrivers(data);
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

    return { drivers, setDrivers, loading, error };
};
