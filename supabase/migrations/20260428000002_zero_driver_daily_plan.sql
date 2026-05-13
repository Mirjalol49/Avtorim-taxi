-- Daily plan belongs to cars, not drivers.
-- Zero out the phantom 750 000 default that was being used as a fallback.
ALTER TABLE drivers ALTER COLUMN daily_plan SET DEFAULT 0;

-- Clear any driver that still carries the old 750 000 default.
-- This is safe: the app now reads plan exclusively from the assigned car.
UPDATE drivers SET daily_plan = 0 WHERE daily_plan = 750000;
