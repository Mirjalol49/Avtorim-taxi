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
    if (!fleetId) return () => {};

    const fetch = () =>
        supabase
            .from('notes')
            .select('*')
            .eq('fleet_id', fleetId)
            .order('is_pinned', { ascending: false })
            .order('updated_ms', { ascending: false })
            .then(({ data, error }) => {
                if (error) { console.error('Notes fetch error:', error.message); callback([], true); return; }
                callback((data ?? []).map(toNote));
            });

    fetch();

    const channel = supabase
        .channel(`notes_${fleetId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notes', filter: `fleet_id=eq.${fleetId}` }, fetch)
        .subscribe();

    return () => { supabase.removeChannel(channel); };
};

export const addNote = async (note: Omit<Note, 'id'>) => {
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
    if (error) throw error;
    return data.id as string;
};

export const updateNote = async (id: string, updates: Partial<Omit<Note, 'id' | 'fleetId' | 'createdMs'>>) => {
    const row: Record<string, any> = { updated_ms: Date.now() };
    if (updates.title !== undefined) row.title = updates.title;
    if (updates.content !== undefined) row.content = updates.content;
    if (updates.color !== undefined) row.color = updates.color;
    if (updates.isPinned !== undefined) row.is_pinned = updates.isPinned;
    if (updates.updatedMs !== undefined) row.updated_ms = updates.updatedMs;

    const { error } = await supabase.from('notes').update(row).eq('id', id);
    if (error) throw error;
};

export const deleteNote = async (id: string) => {
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) throw error;
};
