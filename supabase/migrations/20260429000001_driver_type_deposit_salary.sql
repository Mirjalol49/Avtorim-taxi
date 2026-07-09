-- Driver payment type: 'deposit' (driver gives upfront deposit) or 'salary' (fleet pays driver monthly)
ALTER TABLE drivers
    ADD COLUMN IF NOT EXISTS driver_type   TEXT    NOT NULL DEFAULT 'deposit'
        CHECK (driver_type IN ('deposit', 'salary')),
    ADD COLUMN IF NOT EXISTS deposit_amount BIGINT  NOT NULL DEFAULT 0;

-- Existing monthly_salary column is reused for salary drivers.
-- deposit_amount is only relevant when driver_type = 'deposit'.
