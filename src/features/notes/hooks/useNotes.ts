import { useState, useEffect } from 'react';
import { Note } from '../../../core/types/note.types';
import { subscribeToNotes } from '../../../../services/notesService';

export const useNotes = (fleetId?: string) => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [tableError, setTableError] = useState(false);

    useEffect(() => {
        console.log('[useNotes] Effect running with fleetId:', fleetId);

        if (!fleetId) {
            console.warn('[useNotes] No fleetId — skipping subscription');
            setLoading(false);
            return;
        }

        setLoading(true);
        setTableError(false);

        const timeout = setTimeout(() => {
            console.error('[useNotes] 6s timeout reached — setting tableError');
            setLoading(false);
            setTableError(true);
        }, 6000);

        const unsub = subscribeToNotes((data, error?: boolean) => {
            clearTimeout(timeout);
            if (error) {
                console.error('[useNotes] Subscription returned error');
                setTableError(true);
                setLoading(false);
                return;
            }
            console.log(`[useNotes] Received ${data.length} notes`);
            setNotes(data);
            setLoading(false);
        }, fleetId);

        return () => {
            console.log('[useNotes] Cleanup — unsubscribing');
            clearTimeout(timeout);
            unsub();
        };
    }, [fleetId]);

    return { notes, loading, tableError };
};
