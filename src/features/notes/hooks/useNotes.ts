import { useState, useEffect, useRef } from 'react';
import { Note } from '../../../core/types/note.types';
import { subscribeToNotes } from '../../../../services/notesService';
import { readCache, writeCache } from '../../../core/utils/dataCache';

export const useNotes = (fleetId?: string) => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [tableError, setTableError] = useState(false);
    const refetchRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        if (!fleetId) {
            setLoading(false);
            return;
        }

        // ── Pattern 1: Serve stale cache INSTANTLY ──────────────────────────────
        const cached = readCache<Note>(`notes_${fleetId}`);
        if (cached.length > 0) {
            setNotes(cached);
            setLoading(false);
        }
        // ────────────────────────────────────────────────────────────────────────

        if (cached.length === 0) setLoading(true);
        setTableError(false);

        const { unsubscribe, refetch } = subscribeToNotes((data, error?: boolean) => {
            if (error) {
                // Only show the SQL setup banner when Supabase explicitly says
                // the table doesn't exist (42P01 / relation does not exist).
                // Do NOT set tableError on timeouts or network hiccups.
                setTableError(true);
                setLoading(false);
                return;
            }
            setNotes(data);
            setLoading(false);
            setTableError(false); // clear any stale error
            writeCache(`notes_${fleetId}`, data);
        }, fleetId);

        refetchRef.current = refetch;

        return () => {
            refetchRef.current = null;
            unsubscribe();
        };
    }, [fleetId]);

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

    return { notes, loading, tableError };
};
