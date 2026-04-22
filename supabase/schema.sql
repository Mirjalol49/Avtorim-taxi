-- ============================================================
-- Avtorim Taxi Fleet Management - Supabase Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Drop tables in reverse dependency order (safe to re-run)
-- ============================================================
DROP TABLE IF EXISTS sessions           CASCADE;
DROP TABLE IF EXISTS password_history   CASCADE;
DROP TABLE IF EXISTS mfa_config         CASCADE;
DROP TABLE IF EXISTS notification_deletes CASCADE;
DROP TABLE IF EXISTS notification_reads CASCADE;
DROP TABLE IF EXISTS notifications      CASCADE;
DROP TABLE IF EXISTS audit_logs         CASCADE;
DROP TABLE IF EXISTS payment_reversals  CASCADE;
DROP TABLE IF EXISTS driver_salaries    CASCADE;
DROP TABLE IF EXISTS transactions       CASCADE;
DROP TABLE IF EXISTS drivers            CASCADE;
DROP TABLE IF EXISTS cars               CASCADE;
DROP TABLE IF EXISTS viewers            CASCADE;
DROP TABLE IF EXISTS fleet_metadata     CASCADE;
DROP TABLE IF EXISTS admin_profile      CASCADE;
DROP TABLE IF EXISTS admin_users        CASCADE;

-- ============================================================
-- admin_users
-- ============================================================
CREATE TABLE admin_users (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username                TEXT NOT NULL UNIQUE,
    password                TEXT,
    password_hash           TEXT,
    role                    TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin')),
    active                  BOOLEAN NOT NULL DEFAULT TRUE,
    avatar                  TEXT,
    email                   TEXT,
    display_name            TEXT,
    status                  TEXT DEFAULT 'active',
    verification_token      TEXT,
    verification_expires_at BIGINT,
    email_verified_at       BIGINT,
    approved_at             BIGINT,
    approved_by             UUID,
    rejected_at             BIGINT,
    rejected_by             UUID,
    rejection_reason        TEXT,
    recovered_at            BIGINT,
    mfa_enabled             BOOLEAN DEFAULT FALSE,
    created_ms              BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    created_by              UUID,
    FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL
);

-- ============================================================
-- admin_profile  (single-row profile for UI)
-- ============================================================
CREATE TABLE admin_profile (
    id         TEXT PRIMARY KEY DEFAULT 'profile',
    name       TEXT,
    role       TEXT,
    avatar     TEXT,
    password   TEXT,
    updated_ms BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- ============================================================
-- fleet_metadata
-- ============================================================
CREATE TABLE fleet_metadata (
    fleet_id    UUID PRIMARY KEY REFERENCES admin_users(id) ON DELETE CASCADE,
    username    TEXT,
    initialized BOOLEAN NOT NULL DEFAULT TRUE,
    created_ms  BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    created_by  UUID REFERENCES admin_users(id) ON DELETE SET NULL
);

-- ============================================================
-- cars
-- ============================================================
CREATE TABLE cars (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fleet_id            UUID REFERENCES admin_users(id) ON DELETE CASCADE,
    name                TEXT NOT NULL,
    license_plate       TEXT NOT NULL,
    avatar              TEXT DEFAULT '',
    documents           JSONB DEFAULT '[]'::JSONB,
    assigned_driver_id  UUID REFERENCES drivers(id) ON DELETE SET NULL,
    is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
    created_ms          BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- ============================================================
-- viewers
-- ============================================================
CREATE TABLE viewers (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       TEXT NOT NULL,
    password   TEXT NOT NULL,
    active     BOOLEAN NOT NULL DEFAULT TRUE,
    fleet_id   UUID REFERENCES admin_users(id) ON DELETE CASCADE,
    created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    created_ms BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- ============================================================
-- drivers
-- ============================================================
CREATE TABLE drivers (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fleet_id             UUID REFERENCES admin_users(id) ON DELETE CASCADE,
    name                 TEXT NOT NULL,
    phone                TEXT,
    car                  TEXT DEFAULT '',
    car_number           TEXT DEFAULT '',
    status               TEXT NOT NULL DEFAULT 'OFFLINE',
    avatar               TEXT DEFAULT '',
    balance              NUMERIC(12, 2) NOT NULL DEFAULT 0,
    rating               NUMERIC(4, 2) NOT NULL DEFAULT 5.0,
    monthly_salary       NUMERIC(12, 2) NOT NULL DEFAULT 0,
    daily_plan           NUMERIC(12, 2) NOT NULL DEFAULT 750000,
    weekly_target        NUMERIC(12, 2),
    telegram             TEXT,
    notes                TEXT,
    extra_phone          TEXT,
    is_deleted           BOOLEAN NOT NULL DEFAULT FALSE,
    location             JSONB,
    last_location_update BIGINT,
    location_accuracy    NUMERIC,
    documents            JSONB DEFAULT '[]'::JSONB,
    created_ms           BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- ============================================================
-- transactions
-- ============================================================
CREATE TABLE transactions (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fleet_id     UUID REFERENCES admin_users(id) ON DELETE CASCADE,
    driver_id    UUID REFERENCES drivers(id) ON DELETE SET NULL,
    driver_name  TEXT,
    amount       NUMERIC(12, 2) NOT NULL,
    type         TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'ACTIVE',
    description  TEXT,
    note         TEXT,
    payment_method TEXT,
    cheque_image TEXT,
    timestamp_ms BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    created_ms   BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    original_transaction_id UUID,
    reversed_at  BIGINT,
    reversed_by  TEXT,
    reversal_reason TEXT
);

-- ============================================================
-- driver_salaries
-- ============================================================
CREATE TABLE driver_salaries (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fleet_id      UUID REFERENCES admin_users(id) ON DELETE CASCADE,
    driver_id     UUID REFERENCES drivers(id) ON DELETE SET NULL,
    driver_name   TEXT,
    period_start  BIGINT NOT NULL,
    period_end    BIGINT,
    amount        NUMERIC(12, 2) NOT NULL DEFAULT 0,
    base_salary   NUMERIC(12, 2) NOT NULL DEFAULT 0,
    bonuses       NUMERIC(12, 2) NOT NULL DEFAULT 0,
    deductions    NUMERIC(12, 2) NOT NULL DEFAULT 0,
    net_salary    NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status        TEXT NOT NULL DEFAULT 'pending',
    paid_at       BIGINT,
    payment_note  TEXT,
    reversed_at   BIGINT,
    reversed_by   TEXT,
    reversal_reason TEXT,
    created_ms    BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- ============================================================
-- payment_reversals
-- ============================================================
CREATE TABLE payment_reversals (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fleet_id       UUID REFERENCES admin_users(id) ON DELETE CASCADE,
    transaction_id UUID,
    salary_id      UUID,
    driver_id      UUID REFERENCES drivers(id) ON DELETE SET NULL,
    amount         NUMERIC(12, 2) NOT NULL,
    reason         TEXT,
    status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_by   UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    approved_by    UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    requested_at   BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    resolved_at    BIGINT
);

-- ============================================================
-- notifications
-- ============================================================
CREATE TABLE notifications (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title             TEXT NOT NULL,
    message           TEXT NOT NULL,
    type              TEXT NOT NULL,
    category          TEXT NOT NULL,
    priority          TEXT NOT NULL DEFAULT 'normal',
    target_users      TEXT NOT NULL DEFAULT 'all',
    created_by        UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    created_by_name   TEXT,
    created_ms        BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    expires_at        BIGINT,
    delivery_tracking JSONB DEFAULT '{}'::JSONB,
    min_account_age   BIGINT
);

-- ============================================================
-- notification_reads
-- ============================================================
CREATE TABLE notification_reads (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
    user_id         TEXT NOT NULL,
    read_at         BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    UNIQUE (notification_id, user_id)
);

-- ============================================================
-- notification_deletes
-- ============================================================
CREATE TABLE notification_deletes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
    user_id         TEXT NOT NULL,
    deleted_at      BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    UNIQUE (notification_id, user_id)
);

-- ============================================================
-- audit_logs
-- ============================================================
CREATE TABLE audit_logs (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action            TEXT NOT NULL,
    performed_by      UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    performed_by_name TEXT,
    target_id         TEXT,
    target_name       TEXT,
    details           JSONB DEFAULT '{}'::JSONB,
    fleet_id          UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    timestamp_ms      BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- ============================================================
-- notes
-- ============================================================
CREATE TABLE notes (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fleet_id   UUID REFERENCES admin_users(id) ON DELETE CASCADE,
    title      TEXT NOT NULL DEFAULT '',
    content    TEXT NOT NULL DEFAULT '',
    color      TEXT NOT NULL DEFAULT 'default',
    is_pinned  BOOLEAN NOT NULL DEFAULT FALSE,
    created_ms BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    updated_ms BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- ============================================================
-- mfa_config
-- ============================================================
CREATE TABLE mfa_config (
    user_id      UUID PRIMARY KEY REFERENCES admin_users(id) ON DELETE CASCADE,
    enabled      BOOLEAN NOT NULL DEFAULT FALSE,
    secret       TEXT,
    backup_codes JSONB DEFAULT '[]'::JSONB,
    updated_ms   BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- ============================================================
-- password_history
-- ============================================================
CREATE TABLE password_history (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    password   TEXT NOT NULL,
    changed_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- ============================================================
-- sessions
-- ============================================================
CREATE TABLE sessions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    active              BOOLEAN NOT NULL DEFAULT TRUE,
    ip                  TEXT,
    user_agent          TEXT,
    created_ms          BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    last_activity       BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    invalidated_at      BIGINT,
    invalidation_reason TEXT
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_drivers_fleet          ON drivers(fleet_id);
CREATE INDEX idx_drivers_deleted        ON drivers(is_deleted);
CREATE INDEX idx_transactions_fleet     ON transactions(fleet_id);
CREATE INDEX idx_transactions_driver    ON transactions(driver_id);
CREATE INDEX idx_transactions_status    ON transactions(status);
CREATE INDEX idx_audit_logs_ts          ON audit_logs(timestamp_ms DESC);
CREATE INDEX idx_notifications_ms       ON notifications(created_ms DESC);
CREATE INDEX idx_notif_reads_user       ON notification_reads(user_id);
CREATE INDEX idx_notif_deletes_user     ON notification_deletes(user_id);
CREATE INDEX idx_sessions_user          ON sessions(user_id);
CREATE INDEX idx_sessions_active        ON sessions(active);
CREATE INDEX idx_viewers_fleet          ON viewers(fleet_id);
CREATE INDEX idx_cars_fleet             ON cars(fleet_id);
CREATE INDEX idx_cars_deleted           ON cars(is_deleted);
CREATE INDEX idx_reversals_fleet        ON payment_reversals(fleet_id);
CREATE INDEX idx_salaries_fleet         ON driver_salaries(fleet_id);
CREATE INDEX idx_salaries_driver        ON driver_salaries(driver_id);
CREATE INDEX idx_notes_fleet             ON notes(fleet_id);

-- ============================================================
-- Disable RLS (service-role key has full access)
-- ============================================================
ALTER TABLE admin_users          DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_profile        DISABLE ROW LEVEL SECURITY;
ALTER TABLE fleet_metadata       DISABLE ROW LEVEL SECURITY;
ALTER TABLE viewers              DISABLE ROW LEVEL SECURITY;
ALTER TABLE drivers              DISABLE ROW LEVEL SECURITY;
ALTER TABLE cars                 DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions         DISABLE ROW LEVEL SECURITY;
ALTER TABLE driver_salaries      DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reversals    DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        DISABLE ROW LEVEL SECURITY;
ALTER TABLE notification_reads   DISABLE ROW LEVEL SECURITY;
ALTER TABLE notification_deletes DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs           DISABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_config           DISABLE ROW LEVEL SECURITY;
ALTER TABLE password_history     DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions             DISABLE ROW LEVEL SECURITY;
ALTER TABLE notes                DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- Grant access to anon and authenticated roles
-- (Required for PostgREST / Supabase client queries)
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

-- ============================================================
-- Seed: initial super_admin account
-- Login password: Taksapark2024  (change after first login)
-- ============================================================
INSERT INTO admin_users (username, password, role, active, status, created_ms)
VALUES ('mirjalol', 'Taksapark2024', 'super_admin', TRUE, 'active', EXTRACT(EPOCH FROM NOW())::BIGINT * 1000)
ON CONFLICT (username) DO NOTHING;

-- ============================================================
-- Enable Realtime for all tables (required for live updates)
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE drivers;
ALTER PUBLICATION supabase_realtime ADD TABLE cars;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE notification_reads;
ALTER PUBLICATION supabase_realtime ADD TABLE notification_deletes;
ALTER PUBLICATION supabase_realtime ADD TABLE driver_salaries;
ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE admin_users;
ALTER PUBLICATION supabase_realtime ADD TABLE viewers;
ALTER PUBLICATION supabase_realtime ADD TABLE notes;

-- ============================================================
-- MIGRATION: Add missing drivers columns (safe to run on existing DB)
-- Run this block separately if you already have a drivers table
-- ============================================================
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS status         TEXT NOT NULL DEFAULT 'OFFLINE';
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS avatar         TEXT DEFAULT '';
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS rating         NUMERIC(4, 2) NOT NULL DEFAULT 5.0;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS monthly_salary NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS daily_plan     NUMERIC(12, 2) NOT NULL DEFAULT 750000;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS telegram       TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS documents      JSONB DEFAULT '[]'::JSONB;

-- MIGRATION: Add cars table if not already created
CREATE TABLE IF NOT EXISTS cars (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fleet_id            UUID REFERENCES admin_users(id) ON DELETE CASCADE,
    name                TEXT NOT NULL,
    license_plate       TEXT NOT NULL,
    avatar              TEXT DEFAULT '',
    documents           JSONB DEFAULT '[]'::JSONB,
    assigned_driver_id  UUID REFERENCES drivers(id) ON DELETE SET NULL,
    daily_plan          NUMERIC(12, 2) NOT NULL DEFAULT 0,
    is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
    created_ms          BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);
ALTER TABLE cars DISABLE ROW LEVEL SECURITY;
GRANT ALL ON cars TO anon, authenticated;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS daily_plan NUMERIC(12, 2) NOT NULL DEFAULT 0;

-- MIGRATION: Add notes table if not already created
CREATE TABLE IF NOT EXISTS notes (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fleet_id   UUID REFERENCES admin_users(id) ON DELETE CASCADE,
    title      TEXT NOT NULL DEFAULT '',
    content    TEXT NOT NULL DEFAULT '',
    color      TEXT NOT NULL DEFAULT 'default',
    is_pinned  BOOLEAN NOT NULL DEFAULT FALSE,
    created_ms BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    updated_ms BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);
CREATE INDEX IF NOT EXISTS idx_notes_fleet ON notes(fleet_id);
ALTER TABLE notes DISABLE ROW LEVEL SECURITY;
GRANT ALL ON notes TO anon, authenticated;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notes;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================
-- DRIVER DAYS OFF
-- Each driver gets 2 free days off per month.
-- On a day off, their daily plan is NOT required.
-- =====================================================
CREATE TABLE IF NOT EXISTS driver_days_off (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fleet_id   UUID REFERENCES admin_users(id) ON DELETE CASCADE,
    driver_id  UUID REFERENCES drivers(id) ON DELETE CASCADE,
    date_key   TEXT NOT NULL,   -- 'YYYY-MM-DD'
    month_key  TEXT NOT NULL,   -- 'YYYY-MM'
    note       TEXT DEFAULT '',
    created_ms BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    UNIQUE(driver_id, date_key)
);
CREATE INDEX IF NOT EXISTS idx_days_off_driver ON driver_days_off(driver_id);
CREATE INDEX IF NOT EXISTS idx_days_off_fleet  ON driver_days_off(fleet_id);
CREATE INDEX IF NOT EXISTS idx_days_off_month  ON driver_days_off(month_key);
ALTER TABLE driver_days_off DISABLE ROW LEVEL SECURITY;
GRANT ALL ON driver_days_off TO anon, authenticated;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE driver_days_off;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================
-- AUTO PAYMENT ALLOCATION DATA MODELS
-- =====================================================

CREATE TABLE IF NOT EXISTS driver_daily_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    plan_amount NUMERIC(12, 2) NOT NULL,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(driver_id, date)
);
ALTER TABLE driver_daily_records DISABLE ROW LEVEL SECURITY;
GRANT ALL ON driver_daily_records TO anon, authenticated;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE driver_daily_records;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_amount NUMERIC(12, 2) NOT NULL,
    allocated_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE payment_transactions DISABLE ROW LEVEL SECURITY;
GRANT ALL ON payment_transactions TO anon, authenticated;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE payment_transactions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE allocation_type_enum AS ENUM ('debt', 'current', 'credit');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS payment_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES payment_transactions(id) ON DELETE CASCADE,
    daily_record_id UUID REFERENCES driver_daily_records(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    allocation_type allocation_type_enum NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE payment_allocations DISABLE ROW LEVEL SECURITY;
GRANT ALL ON payment_allocations TO anon, authenticated;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE payment_allocations;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS driver_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE UNIQUE,
    balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE driver_credits DISABLE ROW LEVEL SECURITY;
GRANT ALL ON driver_credits TO anon, authenticated;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE driver_credits;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================
-- ALLOCATE PAYMENT RPC
-- atomic payment distribution into debt, current, credit
-- =====================================================
CREATE OR REPLACE FUNCTION allocate_payment(
  p_driver_id UUID,
  p_amount NUMERIC,
  p_received_at TIMESTAMP WITH TIME ZONE,
  p_created_by UUID
) RETURNS JSON AS $$
DECLARE
  v_remaining NUMERIC := p_amount;
  v_tx_id UUID;
  v_daily_rec_id UUID;
  v_owed NUMERIC;
  v_cover NUMERIC;
  v_day RECORD;
  v_today DATE := p_received_at::DATE;
  v_today_plan NUMERIC;
  v_allocations JSONB := '[]'::JSONB;
BEGIN
  -- Create Transaction
  INSERT INTO payment_transactions (driver_id, received_at, total_amount, created_by)
  VALUES (p_driver_id, p_received_at, p_amount, p_created_by)
  RETURNING id INTO v_tx_id;

  -- 1. Debt Days (before today, oldest first)
  FOR v_day IN
    SELECT id, date, plan_amount, paid_amount
    FROM driver_daily_records
    WHERE driver_id = p_driver_id 
      AND date < v_today
      AND paid_amount < plan_amount
    ORDER BY date ASC
  LOOP
    IF v_remaining <= 0 THEN
      EXIT;
    END IF;

    v_owed := v_day.plan_amount - v_day.paid_amount;
    v_cover := LEAST(v_remaining, v_owed);

    -- Create Allocation
    INSERT INTO payment_allocations (transaction_id, daily_record_id, amount, allocation_type)
    VALUES (v_tx_id, v_day.id, v_cover, 'debt');

    -- Update Daily Record
    UPDATE driver_daily_records 
    SET paid_amount = paid_amount + v_cover
    WHERE id = v_day.id;

    -- Append to return array
    v_allocations := v_allocations || jsonb_build_object(
      'daily_record_id', v_day.id,
      'amount', v_cover,
      'type', 'debt'
    );

    v_remaining := v_remaining - v_cover;
  END LOOP;

  -- 2. Current Day
  IF v_remaining > 0 THEN
    -- get or create today record
    SELECT id, plan_amount, paid_amount INTO v_day
    FROM driver_daily_records
    WHERE driver_id = p_driver_id AND date = v_today;

    IF NOT FOUND THEN
      -- Need to get the driver's daily plan from driver or car
      SELECT COALESCE(
        (SELECT daily_plan FROM cars WHERE assigned_driver_id = p_driver_id AND is_deleted = FALSE LIMIT 1),
        daily_plan
      ) INTO v_today_plan
      FROM drivers WHERE id = p_driver_id;

      INSERT INTO driver_daily_records (driver_id, date, plan_amount, paid_amount)
      VALUES (p_driver_id, v_today, COALESCE(v_today_plan, 0), 0)
      RETURNING id, plan_amount, paid_amount INTO v_day;
    END IF;

    v_owed := v_day.plan_amount - v_day.paid_amount;
    v_cover := LEAST(v_remaining, v_owed);

    IF v_cover > 0 THEN
      INSERT INTO payment_allocations (transaction_id, daily_record_id, amount, allocation_type)
      VALUES (v_tx_id, v_day.id, v_cover, 'current');

      UPDATE driver_daily_records 
      SET paid_amount = paid_amount + v_cover
      WHERE id = v_day.id;

      v_allocations := v_allocations || jsonb_build_object(
        'daily_record_id', v_day.id,
        'amount', v_cover,
        'type', 'current'
      );

      v_remaining := v_remaining - v_cover;
    END IF;
  END IF;

  -- 3. Credit
  IF v_remaining > 0 THEN
    INSERT INTO payment_allocations (transaction_id, daily_record_id, amount, allocation_type)
    VALUES (v_tx_id, NULL, v_remaining, 'credit');

    INSERT INTO driver_credits (driver_id, balance)
    VALUES (p_driver_id, v_remaining)
    ON CONFLICT (driver_id) DO UPDATE 
    SET balance = driver_credits.balance + v_remaining, updated_at = NOW();

    v_allocations := v_allocations || jsonb_build_object(
      'daily_record_id', NULL,
      'amount', v_remaining,
      'type', 'credit'
    );
  END IF;

  -- Update Transaction allocated_amount
  UPDATE payment_transactions
  SET allocated_amount = p_amount
  WHERE id = v_tx_id;

  RETURN json_build_object(
    'transaction_id', v_tx_id,
    'allocations', v_allocations,
    'driver_credit_balance', COALESCE((SELECT balance FROM driver_credits WHERE driver_id = p_driver_id), 0)
  );
END;
$$ LANGUAGE plpgsql;
