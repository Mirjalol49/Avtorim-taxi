-- Add notes and extra_phone columns to the drivers table
ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS extra_phone TEXT;
