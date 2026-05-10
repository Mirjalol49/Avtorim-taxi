-- ============================================================
-- Migration: Add all missing driver columns
-- These columns are required for driverType (deposit/salary/lease_to_own) functionality.
-- Safe to run on existing DB — all use IF NOT EXISTS / DO NOTHING patterns.
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Payment type: 'deposit' | 'salary' | 'lease_to_own'
ALTER TABLE public.drivers
    ADD COLUMN IF NOT EXISTS driver_type TEXT NOT NULL DEFAULT 'deposit';

-- Deposit driver fields
ALTER TABLE public.drivers
    ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(15, 2) DEFAULT 0;

ALTER TABLE public.drivers
    ADD COLUMN IF NOT EXISTS deposit_warning_threshold NUMERIC(15, 2) DEFAULT 1000000;

-- Salary driver fields
ALTER TABLE public.drivers
    ADD COLUMN IF NOT EXISTS last_salary_paid_at BIGINT;

-- Lease-to-own (vikup) contract fields
ALTER TABLE public.drivers
    ADD COLUMN IF NOT EXISTS total_contract_amount NUMERIC(15, 2);

ALTER TABLE public.drivers
    ADD COLUMN IF NOT EXISTS contract_duration_months INTEGER;

ALTER TABLE public.drivers
    ADD COLUMN IF NOT EXISTS contract_start_date BIGINT;

-- Transactions table: deposit tracking columns
ALTER TABLE public.transactions
    ADD COLUMN IF NOT EXISTS use_deposit BOOLEAN;

ALTER TABLE public.transactions
    ADD COLUMN IF NOT EXISTS category TEXT;

ALTER TABLE public.transactions
    ADD COLUMN IF NOT EXISTS car_id UUID;

ALTER TABLE public.transactions
    ADD COLUMN IF NOT EXISTS car_name TEXT;

-- Notifications table: fleet_id scoping
ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS fleet_id UUID REFERENCES public.admin_users(id) ON DELETE CASCADE;

-- Notes table: reminder column
ALTER TABLE public.notes
    ADD COLUMN IF NOT EXISTS reminder_at BIGINT;
