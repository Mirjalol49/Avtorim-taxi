-- 20260513000002_create_fines_table.sql

CREATE TABLE IF NOT EXISTS public.fines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fleet_id TEXT NOT NULL,
    driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    car_id UUID REFERENCES public.cars(id) ON DELETE SET NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    fine_date BIGINT NOT NULL, -- Date the fine occurred (Unix timestamp MS)
    status TEXT NOT NULL DEFAULT 'UNPAID', -- 'UNPAID', 'PAID'
    description TEXT,
    photo_url TEXT,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

-- Indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_fines_fleet_id ON public.fines (fleet_id);
CREATE INDEX IF NOT EXISTS idx_fines_driver_id ON public.fines (driver_id);
CREATE INDEX IF NOT EXISTS idx_fines_car_id ON public.fines (car_id);
CREATE INDEX IF NOT EXISTS idx_fines_status ON public.fines (status);

-- Enable RLS
ALTER TABLE public.fines ENABLE ROW LEVEL SECURITY;

-- Add policies matching the custom auth system (anon role)
CREATE POLICY "fines_fleet_select" ON public.fines
    FOR SELECT TO anon USING (true);

CREATE POLICY "fines_fleet_insert" ON public.fines
    FOR INSERT TO anon WITH CHECK (fleet_id IS NOT NULL);

CREATE POLICY "fines_fleet_update" ON public.fines
    FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "fines_fleet_delete" ON public.fines
    FOR DELETE TO anon USING (true);

-- Also add an avatar bucket for fine photos if needed, though we can reuse 'fines'
INSERT INTO storage.buckets (id, name, public) 
VALUES ('fines', 'fines', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Enable public read access for fines bucket" ON storage.objects
    FOR SELECT USING (bucket_id = 'fines');

CREATE POLICY "Enable authenticated insert for fines bucket" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'fines' AND auth.role() = 'authenticated');

CREATE POLICY "Enable authenticated update for fines bucket" ON storage.objects
    FOR UPDATE USING (bucket_id = 'fines' AND auth.role() = 'authenticated');
