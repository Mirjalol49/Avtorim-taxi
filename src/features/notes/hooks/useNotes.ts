import { useState, useEffect } from 'react';
import { Note } from '../../../core/types/note.types';
import { subscribeToNotes } from '../../../../services/notesService';

export const useNotes = (fleetId?: string) => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [tableError, setTableError] = useState(false);

    useEffect(() => {
        if (!fleetId) { setLoading(false); return; }
        setLoading(true);
        setTableError(false);

        const timeout = setTimeout(() => {
            setLoading(false);
            setTableError(true);
        }, 6000);

        const unsub = subscribeToNotes((data, error?: boolean) => {
            clearTimeout(timeout);
            if (error) { setTableError(true); setLoading(false); return; }
            setNotes(data);
            setLoading(false);
        }, fleetId);

        return () => { clearTimeout(timeout); unsub(); };
    }, [fleetId]);

    return { notes, loading, tableError };
};
