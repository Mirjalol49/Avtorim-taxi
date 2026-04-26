import { supabase } from '../supabase';

export interface Document {
    id: string;
    fleet_id: string;
    name: string;
    description: string;
    file_url: string;
    file_type: string;   // mime type
    file_size: number;   // bytes
    original_name: string;
    created_at: string;
    created_by: string;
}

export type DocumentCategory = 'all' | 'image' | 'pdf' | 'video' | 'other';

export function getCategory(mimeType: string): DocumentCategory {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.startsWith('video/')) return 'video';
    return 'other';
}

export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const BUCKET = 'documents';

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function subscribeToDocuments(
    fleetId: string,
    onData: (docs: Document[]) => void,
    onError?: (err: Error) => void,
): Promise<() => void> {
    const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('fleet_id', fleetId)
        .order('created_at', { ascending: false });

    if (error) {
        onError?.(new Error(error.message));
        return () => {};
    }
    onData((data ?? []) as Document[]);

    const channel = supabase
        .channel(`documents:${fleetId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'documents', filter: `fleet_id=eq.${fleetId}` }, async () => {
            const { data: fresh } = await supabase
                .from('documents')
                .select('*')
                .eq('fleet_id', fleetId)
                .order('created_at', { ascending: false });
            onData((fresh ?? []) as Document[]);
        })
        .subscribe();

    return () => { supabase.removeChannel(channel); };
}

export async function uploadDocument(
    file: File,
    fleetId: string,
    name: string,
    description: string,
    createdBy: string,
): Promise<{ data: Document | null; error: string | null }> {
    // 1. Upload file to storage
    const ext = file.name.split('.').pop() ?? 'bin';
    const path = `${fleetId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });

    if (upErr) return { data: null, error: upErr.message };

    // 2. Get public URL
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const file_url = urlData.publicUrl;

    // 3. Insert metadata row
    const { data: row, error: dbErr } = await supabase
        .from('documents')
        .insert({
            fleet_id: fleetId,
            name: name || file.name,
            description,
            file_url,
            file_type: file.type,
            file_size: file.size,
            original_name: file.name,
            created_by: createdBy,
        })
        .select()
        .single();

    if (dbErr) {
        await supabase.storage.from(BUCKET).remove([path]);
        return { data: null, error: dbErr.message };
    }

    return { data: row as Document, error: null };
}

export async function deleteDocument(doc: Document): Promise<string | null> {
    // Extract storage path from the public URL
    const url = new URL(doc.file_url);
    const pathSegments = url.pathname.split(`/object/public/${BUCKET}/`);
    const storagePath = pathSegments[1] ?? '';

    if (storagePath) {
        await supabase.storage.from(BUCKET).remove([storagePath]);
    }

    const { error } = await supabase.from('documents').delete().eq('id', doc.id);
    return error ? error.message : null;
}

export async function updateDocumentMeta(
    id: string,
    name: string,
    description: string,
): Promise<string | null> {
    const { error } = await supabase
        .from('documents')
        .update({ name, description })
        .eq('id', id);
    return error ? error.message : null;
}

// ── SQL setup helper ──────────────────────────────────────────────────────────
export const DOCUMENTS_SETUP_SQL = `-- Run in your Supabase SQL editor:

-- 1. Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fleet_id     TEXT NOT NULL,
  name         TEXT NOT NULL,
  description  TEXT DEFAULT '',
  file_url     TEXT NOT NULL,
  file_type    TEXT NOT NULL,
  file_size    BIGINT DEFAULT 0,
  original_name TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  created_by   TEXT DEFAULT ''
);
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all" ON documents;
CREATE POLICY "allow_all" ON documents FOR ALL USING (true);

-- 2. Create storage bucket (run once)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "allow_all_documents" ON storage.objects;
CREATE POLICY "allow_all_documents" ON storage.objects
  FOR ALL USING (bucket_id = 'documents')
  WITH CHECK (bucket_id = 'documents');`;
