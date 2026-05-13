-- Add configurable deposit warning threshold per driver.
-- Defaults to 1 000 000 UZS (same as the previous hardcoded value).

ALTER TABLE drivers
    ADD COLUMN IF NOT EXISTS deposit_warning_threshold BIGINT NOT NULL DEFAULT 1000000;
