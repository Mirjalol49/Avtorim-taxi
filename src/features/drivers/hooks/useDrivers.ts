import { useState, useEffect } from 'react';
import { Driver } from '../../../core/types';
import { subscribeToDrivers } from '../../../../services/firestoreService';

export const useDrivers = (fleetId?: string) => {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        setLoading(true);
        const unsubscribe = subscribeToDrivers(
            (data) => {
                setDrivers(data);
                setLoading(false);
            },
            fleetId
        );

        return () => unsubscribe();
    }, [fleetId]);

    return { drivers, loading, error };
};
