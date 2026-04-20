import { supabase } from '../supabase';
import { Note, NoteColor } from '../src/core/types/note.types';

const toNote = (r: any): Note => ({
    id: r.id,
    fleetId: r.fleet_id,
    title: r.title ?? '',
    content: r.content ?? '',
    color: (r.color ?? 'default') as NoteColor,
    isPinned: r.is_pinned ?? false,
    createdMs: r.created_ms,
    updatedMs: r.updated_ms,
});

export const subscribeToNotes = (callback: (notes: Note[], error?: boolean) => void, fleetId?: string) => {
    if (!fleetId) {
        console.warn('[Notes] subscribeToNotes called without fleetId — skipping');
        return () => {};
    }

    console.log('[Notes] Subscribing to notes for fleet:', fleetId);

    const fetchNotes = () =>
        supabase
            .from('notes')
            .select('*')
            .eq('fleet_id', fleetId)
            .order('is_pinned', { ascending: false })
            .order('updated_ms', { ascending: false })
            .then(({ data, error }) => {
                if (error) {
                    console.error('[Notes] Fetch error:', error.message, error.details, error.hint);
                    callback([], true);
                    return;
                }
                console.log(`[Notes] Fetched ${(data ?? []).length} notes for fleet ${fleetId}`);
                callback((data ?? []).map(toNote));
            })
            .catch((err) => {
                console.error('[Notes] Network error:', err);
                callback([], true);
            });

    fetchNotes();

    const channel = supabase
        .channel(`notes_${fleetId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notes', filter: `fleet_id=eq.${fleetId}` }, (payload) => {
            console.log('[Notes] Realtime event:', payload.eventType);
            fetchNotes();
        })
        .subscribe((status) => {
            console.log('[Notes] Channel status:', status);
            if (status === 'CHANNEL_ERROR') {
                console.error('[Notes] Realtime channel error — check Supabase realtime config');
            }
        });

    return () => { supabase.removeChannel(channel); };
};

export const addNote = async (note: Omit<Note, 'id'>) => {
    console.log('[Notes] Adding note with fleet_id:', note.fleetId);
    const { data, error } = await supabase
        .from('notes')
        .insert({
            fleet_id: note.fleetId,
            title: note.title,
            content: note.content,
            color: note.color,
            is_pinned: note.isPinned,
            created_ms: note.createdMs,
            updated_ms: note.updatedMs,
        })
        .select('id')
        .single();
    if (error) {
        console.error('[Notes] Insert error:', error.message, error.details, error.hint);
        throw new Error(error.message);
    }
    console.log('[Notes] Note created with id:', data.id);
    return data.id as string;
};

export const updateNote = async (id: string, updates: Partial<Omit<Note, 'id' | 'fleetId' | 'createdMs'>>) => {
    const row: Record<string, any> = { updated_ms: Date.now() };
    if (updates.title !== undefined) row.title = updates.title;
    if (updates.content !== undefined) row.content = updates.content;
    if (updates.color !== undefined) row.color = updates.color;
    if (updates.isPinned !== undefined) row.is_pinned = updates.isPinned;
    if (updates.updatedMs !== undefined) row.updated_ms = updates.updatedMs;

    console.log('[Notes] Updating note:', id, row);
    const { error } = await supabase.from('notes').update(row).eq('id', id);
    if (error) {
        console.error('[Notes] Update error:', error.message, error.details, error.hint);
        throw new Error(error.message);
    }
    console.log('[Notes] Note updated:', id);
};

export const deleteNote = async (id: string) => {
    console.log('[Notes] Deleting note:', id);
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) {
        console.error('[Notes] Delete error:', error.message, error.details, error.hint);
        throw new Error(error.message);
    }
    console.log('[Notes] Note deleted:', id);
};
