import { useState, useEffect, useRef } from 'react';
import { Driver } from '../../../core/types';
import { subscribeToDrivers } from '../../../../services/firestoreService';
import { readCache, writeCache } from '../../../core/utils/dataCache';

export const useDrivers = (fleetId?: string, refreshTrigger?: number) => {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const refetchRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        // Keep loading=true while fleetId is not yet resolved (auth still in progress).
        if (!fleetId) return;

        // ── Pattern 1: Serve stale cache INSTANTLY ──────────────────────────────
        // On every mount/fleetId change, show the last-known data in <1ms so the
        // user never sees an empty grid while the subscription is being established.
        const cached = readCache<Driver>(`drivers_${fleetId}`);
        if (cached.length > 0) {
            setDrivers(cached);
            setLoading(false); // unblock UI immediately — subscription will update silently
        }
        // ────────────────────────────────────────────────────────────────────────

        // If this is a manual refresh (refreshTrigger changed), use refetch instead of re-subscribing
        if (refreshTrigger !== undefined && refreshTrigger > 0 && refetchRef.current) {
            refetchRef.current();
            return;
        }

        // Only show the spinner on first-ever load (no cache yet)
        if (cached.length === 0) setLoading(true);

        const timeout = setTimeout(() => setLoading(false), 5000);

        const { unsubscribe, refetch } = subscribeToDrivers(
            (data) => {
                clearTimeout(timeout);
                setDrivers(data);
                setLoading(false);
                setError(null);
                // Persist fresh data so the next load is instant
                writeCache(`drivers_${fleetId}`, data);
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

    // Refetch when the app comes back to the foreground — but only if the tab
    // was hidden for >60s. This prevents burning egress on every tab switch.
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

    return { drivers, setDrivers, loading, error };
};
