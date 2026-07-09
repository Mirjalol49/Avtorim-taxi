-- ============================================================
-- Migration: Add missing driver history columns
-- Adds `plan_history` and `day_overrides` to `drivers` table.
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

ALTER TABLE public.drivers
    ADD COLUMN IF NOT EXISTS plan_history JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.drivers
    ADD COLUMN IF NOT EXISTS day_overrides JSONB DEFAULT '{}'::jsonb;
