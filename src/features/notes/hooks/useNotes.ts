import { useState, useEffect, useRef } from 'react';
import { Note } from '../../../core/types/note.types';
import { subscribeToNotes } from '../../../../services/notesService';

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

        setLoading(true);
        setTableError(false);

        const timeout = setTimeout(() => {
            setLoading(false);
            setTableError(true);
        }, 6000);

        const { unsubscribe, refetch } = subscribeToNotes((data, error?: boolean) => {
            clearTimeout(timeout);
            if (error) {
                setTableError(true);
                setLoading(false);
                return;
            }
            setNotes(data);
            setLoading(false);
        }, fleetId);

        refetchRef.current = refetch;

        return () => {
            clearTimeout(timeout);
            refetchRef.current = null;
            unsubscribe();
        };
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

    return { notes, loading, tableError };
};
