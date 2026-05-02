-- ============================================================
-- Migration: Add all missing columns
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- Safe to run multiple times (uses IF NOT EXISTS)
-- ============================================================

-- ── drivers table ──────────────────────────────────────────
-- Required for salary payment tracking (this is what causes the salary error!)
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS last_salary_paid_at BIGINT;

-- Required for deposit/salary driver type logic
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS driver_type               TEXT DEFAULT 'deposit';
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS deposit_amount            NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS deposit_warning_threshold NUMERIC(12, 2) NOT NULL DEFAULT 1000000;

-- Required for extra phone field
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS extra_phone TEXT;

-- ── transactions table ─────────────────────────────────────
-- Required for car-linked transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS car_id   UUID REFERENCES cars(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS car_name TEXT;

-- Required for deposit tracking (safe to re-run if already added)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS use_deposit BOOLEAN DEFAULT NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category    TEXT DEFAULT NULL;

-- Optional performance indexes
CREATE INDEX IF NOT EXISTS idx_transactions_use_deposit ON transactions (use_deposit) WHERE use_deposit = TRUE;
CREATE INDEX IF NOT EXISTS idx_transactions_category    ON transactions (category)    WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_drivers_last_salary      ON drivers (last_salary_paid_at);
