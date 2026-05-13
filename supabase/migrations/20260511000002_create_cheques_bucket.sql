-- Create the 'cheques' storage bucket for permanent cheque image storage
-- This replaces storing temporary Telegram file URLs that expire in 24h

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'cheques',
    'cheques',
    true,
    10485760,  -- 10 MB max per file
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- Allow public reads (so cheque URLs work without auth)
CREATE POLICY "Allow public reads on cheques"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'cheques');

-- Allow service role and anon to upload (Telegram bot uses anon key)
CREATE POLICY "Allow uploads to cheques"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'cheques');

CREATE POLICY "Allow updates to cheques"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'cheques');
