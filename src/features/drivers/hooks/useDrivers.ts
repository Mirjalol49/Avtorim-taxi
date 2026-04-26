import { useState, useEffect, useRef } from 'react';
import { Driver } from '../../../core/types';
import { subscribeToDrivers } from '../../../../services/firestoreService';

export const useDrivers = (fleetId?: string, _refreshTrigger?: number) => {
    const [drivers, setDrivers] = useState<Driver[]>([]);
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

        const unsubscribe = subscribeToDrivers(
            (data) => {
                clearTimeout(timeout);
                initializedRef.current = true;
                setDrivers(data);
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

    return { drivers, loading, error };
};
