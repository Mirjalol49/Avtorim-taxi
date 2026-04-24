import { useState, useEffect, useRef } from 'react';
import { Driver } from '../../../core/types';
import { subscribeToDrivers } from '../../../../services/firestoreService';

export const useDrivers = (fleetId?: string, refreshTrigger?: number) => {
    const [drivers, setDrivers] = useState<Driver[]>([]);
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

        const unsubscribe = subscribeToDrivers(
            (data) => {
                if (timeout) clearTimeout(timeout);
                initializedFleetId.current = fleetId;
                setDrivers(data);
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

    return { drivers, loading, error };
};
