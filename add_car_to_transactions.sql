-- Adds car support to the transactions table to allow expenses to be bound to a specific vehicle

ALTER TABLE transactions
ADD COLUMN car_id UUID REFERENCES cars(id) ON DELETE SET NULL,
ADD COLUMN car_name TEXT;

-- We make driver_id optional now since an expense can exclusively belong to a car
ALTER TABLE transactions
ALTER COLUMN driver_id DROP NOT NULL;
