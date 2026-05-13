-- Fix: Change contract_start_date from TIMESTAMPTZ to BIGINT
-- since the codebase uses milliseconds (numbers) for dates.

ALTER TABLE public.drivers 
DROP COLUMN IF EXISTS contract_start_date;

ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS total_contract_amount NUMERIC(15, 2),
ADD COLUMN IF NOT EXISTS contract_duration_months INTEGER,
ADD COLUMN IF NOT EXISTS contract_start_date BIGINT;
