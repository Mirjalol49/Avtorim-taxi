import { useState, useEffect } from 'react';
import { Note } from '../../../core/types/note.types';
import { subscribeToNotes } from '../../../../services/notesService';

export const useNotes = (fleetId?: string) => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!fleetId) { setLoading(false); return; }
        setLoading(true);
        const unsub = subscribeToNotes((data) => {
            setNotes(data);
            setLoading(false);
        }, fleetId);
        return unsub;
    }, [fleetId]);

    return { notes, loading };
};
