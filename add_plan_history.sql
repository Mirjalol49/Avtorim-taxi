-- ============================================================
-- Migration: Add plan_history column to cars table
-- Purpose: Store daily plan change history so that updating
--          the daily plan never retroactively changes past
--          debt / payment calculations.
--
-- Run this once in the Supabase SQL Editor.
-- ============================================================

-- 1. Add the plan_history JSONB column (null-safe with default empty array)
ALTER TABLE cars
    ADD COLUMN IF NOT EXISTS plan_history JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 2. Back-fill existing cars:
--    Seed each car's plan_history with a single entry using the car's
--    current daily_plan, effective from the car's creation time (created_ms).
--    This means all past days correctly use the plan that was set at creation.
UPDATE cars
SET plan_history = jsonb_build_array(
    jsonb_build_object(
        'plan',          COALESCE(daily_plan, 0),
        'effectiveFrom', COALESCE(created_ms, EXTRACT(EPOCH FROM NOW()) * 1000)
    )
)
WHERE plan_history = '[]'::jsonb
  AND daily_plan IS NOT NULL
  AND daily_plan > 0;

-- 3. Verify
SELECT id, name, daily_plan, plan_history FROM cars LIMIT 10;
