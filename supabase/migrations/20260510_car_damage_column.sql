-- ============================================================
-- Migration: Add damage JSONB column to cars table
-- Stores an array of CarDamage records (photos, description, severity, etc.)
-- Safe to run multiple times (uses IF NOT EXISTS / column check).
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Add the damage column to the cars table
ALTER TABLE public.cars
    ADD COLUMN IF NOT EXISTS damage JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 2. Create the car-damages storage bucket (idempotent via DO block)
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
        'car-damages',
        'car-damages',
        true,                        -- public: images are served directly via getPublicUrl
        5242880,                     -- 5 MB max per file (matches MAX_DOC_SIZE_MB in the UI)
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    )
    ON CONFLICT (id) DO NOTHING;    -- already exists → no-op
END
$$;

-- 3. Storage RLS policies for car-damages bucket
--    Allow any authenticated user (admin) to upload and delete.
--    Allow public read (needed because images are embedded in the UI without auth tokens).

-- Read (SELECT) — public
CREATE POLICY IF NOT EXISTS "car-damages public read"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'car-damages');

-- Insert (upload) — authenticated only
CREATE POLICY IF NOT EXISTS "car-damages authenticated upload"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'car-damages');

-- Delete — authenticated only
CREATE POLICY IF NOT EXISTS "car-damages authenticated delete"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'car-damages');

-- 4. Optional index — fast lookup of cars that have at least one damage record
CREATE INDEX IF NOT EXISTS idx_cars_has_damage
    ON public.cars ((jsonb_array_length(damage) > 0))
    WHERE damage IS NOT NULL;
