-- ============================================================
-- Migration: Add deposit tracking columns to transactions
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Add use_deposit column: true = this transaction is funded from driver's deposit
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS use_deposit BOOLEAN DEFAULT NULL;

-- Add category column: e.g. 'deposit_topup' for deposit top-up credits
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT NULL;

-- Optional: index for faster deposit queries
CREATE INDEX IF NOT EXISTS idx_transactions_use_deposit
  ON transactions (use_deposit)
  WHERE use_deposit = TRUE;

CREATE INDEX IF NOT EXISTS idx_transactions_category
  ON transactions (category)
  WHERE category IS NOT NULL;
