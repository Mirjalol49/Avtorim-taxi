-- ============================================================
-- Migration: Add driver lifecycle tracking columns
-- Adds `start_date` and `quit_date` to `drivers` table.
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

ALTER TABLE public.drivers
    ADD COLUMN IF NOT EXISTS start_date BIGINT,
    ADD COLUMN IF NOT EXISTS quit_date BIGINT;
