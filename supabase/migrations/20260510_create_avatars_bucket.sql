-- Create the 'avatars' storage bucket for admin/driver/car profile images
-- This bucket is public so CDN URLs work without authentication

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    2097152,  -- 2 MB max per file
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- Allow anyone (including anonymous users of this app) to upload/read avatars
CREATE POLICY "Allow public reads on avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

CREATE POLICY "Allow authenticated uploads to avatars"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Allow authenticated updates to avatars"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'avatars');

CREATE POLICY "Allow authenticated deletes from avatars"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'avatars');
