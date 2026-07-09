-- ============================================================
-- Migration: Car Assignment History
-- Tracks when a driver is assigned to a car and when they are unassigned.
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

CREATE TABLE IF NOT EXISTS public.car_assignments_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    fleet_id UUID NOT NULL,
    start_ms BIGINT NOT NULL,
    end_ms BIGINT,
    created_ms BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_car_assignments_history_car_id ON public.car_assignments_history(car_id);
CREATE INDEX IF NOT EXISTS idx_car_assignments_history_driver_id ON public.car_assignments_history(driver_id);
CREATE INDEX IF NOT EXISTS idx_car_assignments_history_start_ms ON public.car_assignments_history(start_ms);

-- Backfill current car assignments into history
INSERT INTO public.car_assignments_history (car_id, driver_id, fleet_id, start_ms, created_ms)
SELECT id, assigned_driver_id, fleet_id, (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT, (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
FROM public.cars
WHERE assigned_driver_id IS NOT NULL AND is_deleted = false;
