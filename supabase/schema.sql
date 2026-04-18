-- ============================================================
-- Avtorim Taxi Fleet Management - Supabase Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- admin_users
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username    TEXT NOT NULL UNIQUE,
    password    TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin')),
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    avatar      TEXT,
    created_at  BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    created_by  UUID REFERENCES admin_users(id) ON DELETE SET NULL
);

-- ============================================================
-- admin_profile  (single-row config for super admin UI profile)
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_profile (
    id          TEXT PRIMARY KEY DEFAULT 'profile',
    name        TEXT,
    role        TEXT,
    avatar      TEXT,
    password    TEXT,
    updated_at  BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- ============================================================
-- fleet_metadata
-- ============================================================
CREATE TABLE IF NOT EXISTS fleet_metadata (
    fleet_id    UUID PRIMARY KEY REFERENCES admin_users(id) ON DELETE CASCADE,
    username    TEXT,
    initialized BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    created_by  UUID REFERENCES admin_users(id) ON DELETE SET NULL
);

-- ============================================================
-- viewers
-- ============================================================
CREATE TABLE IF NOT EXISTS viewers (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL,
    password    TEXT NOT NULL,
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    fleet_id    UUID REFERENCES admin_users(id) ON DELETE CASCADE,
    created_by  UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at  BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- ============================================================
-- drivers
-- ============================================================
CREATE TABLE IF NOT EXISTS drivers (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fleet_id             UUID REFERENCES admin_users(id) ON DELETE CASCADE,
    name                 TEXT NOT NULL,
    phone                TEXT,
    car                  TEXT,
    car_number           TEXT,
    balance              NUMERIC(12, 2) NOT NULL DEFAULT 0,
    weekly_target        NUMERIC(12, 2),
    is_deleted           BOOLEAN NOT NULL DEFAULT FALSE,
    location             JSONB,
    last_location_update BIGINT,
    location_accuracy    NUMERIC,
    created_at           BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- ============================================================
-- transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fleet_id    UUID REFERENCES admin_users(id) ON DELETE CASCADE,
    driver_id   UUID REFERENCES drivers(id) ON DELETE SET NULL,
    driver_name TEXT,
    amount      NUMERIC(12, 2) NOT NULL,
    type        TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'ACTIVE',
    note        TEXT,
    timestamp   BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    created_at  BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- ============================================================
-- driver_salaries
-- ============================================================
CREATE TABLE IF NOT EXISTS driver_salaries (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fleet_id        UUID REFERENCES admin_users(id) ON DELETE CASCADE,
    driver_id       UUID REFERENCES drivers(id) ON DELETE SET NULL,
    driver_name     TEXT,
    period_start    BIGINT NOT NULL,
    period_end      BIGINT NOT NULL,
    base_salary     NUMERIC(12, 2) NOT NULL DEFAULT 0,
    bonuses         NUMERIC(12, 2) NOT NULL DEFAULT 0,
    deductions      NUMERIC(12, 2) NOT NULL DEFAULT 0,
    net_salary      NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'pending',
    paid_at         BIGINT,
    payment_note    TEXT,
    created_at      BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- ============================================================
-- payment_reversals
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_reversals (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fleet_id        UUID REFERENCES admin_users(id) ON DELETE CASCADE,
    transaction_id  UUID REFERENCES transactions(id) ON DELETE SET NULL,
    driver_id       UUID REFERENCES drivers(id) ON DELETE SET NULL,
    amount          NUMERIC(12, 2) NOT NULL,
    reason          TEXT,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_by    UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    approved_by     UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    requested_at    BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    resolved_at     BIGINT
);

-- ============================================================
-- notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           TEXT NOT NULL,
    message         TEXT NOT NULL,
    type            TEXT NOT NULL,
    category        TEXT NOT NULL,
    priority        TEXT NOT NULL DEFAULT 'normal',
    target_users    TEXT NOT NULL DEFAULT 'all',
    created_by      UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    created_by_name TEXT,
    created_at      BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    expires_at      BIGINT,
    delivery_tracking JSONB DEFAULT '{}'::JSONB,
    min_account_age BIGINT
);

-- ============================================================
-- notification_reads
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_reads (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL,
    read_at         BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    UNIQUE (notification_id, user_id)
);

-- ============================================================
-- notification_deletes
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_deletes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL,
    deleted_at      BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    UNIQUE (notification_id, user_id)
);

-- ============================================================
-- audit_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action       TEXT NOT NULL,
    performed_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    performed_by_name TEXT,
    target_id    TEXT,
    target_name  TEXT,
    details      JSONB DEFAULT '{}'::JSONB,
    fleet_id     UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    timestamp    BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- ============================================================
-- mfa_config  (replaces /admin_users/{id}/mfa/config subcollection)
-- ============================================================
CREATE TABLE IF NOT EXISTS mfa_config (
    user_id     UUID PRIMARY KEY REFERENCES admin_users(id) ON DELETE CASCADE,
    enabled     BOOLEAN NOT NULL DEFAULT FALSE,
    secret      TEXT,
    backup_codes TEXT[],
    updated_at  BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- ============================================================
-- password_history  (replaces /admin_users/{id}/password_history subcollection)
-- ============================================================
CREATE TABLE IF NOT EXISTS password_history (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    password    TEXT NOT NULL,
    changed_at  BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- ============================================================
-- sessions  (replaces /admin_users/{id}/sessions subcollection)
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    active              BOOLEAN NOT NULL DEFAULT TRUE,
    ip                  TEXT,
    user_agent          TEXT,
    created_at          BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    last_activity       BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    invalidated_at      BIGINT,
    invalidation_reason TEXT
);

-- ============================================================
-- Indexes for common queries
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_drivers_fleet         ON drivers(fleet_id);
CREATE INDEX IF NOT EXISTS idx_drivers_deleted        ON drivers(is_deleted);
CREATE INDEX IF NOT EXISTS idx_transactions_fleet     ON transactions(fleet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_driver    ON transactions(driver_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status    ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp   ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_created  ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_reads_user       ON notification_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_deletes_user     ON notification_deletes(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user          ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active        ON sessions(active);
CREATE INDEX IF NOT EXISTS idx_viewers_fleet          ON viewers(fleet_id);
CREATE INDEX IF NOT EXISTS idx_payment_reversals_fleet ON payment_reversals(fleet_id);

-- ============================================================
-- Row-Level Security (RLS)
-- By default, disable RLS so service-role key has full access.
-- Enable and configure per-table if you add user-facing Supabase Auth.
-- ============================================================
ALTER TABLE admin_users        DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_profile      DISABLE ROW LEVEL SECURITY;
ALTER TABLE fleet_metadata     DISABLE ROW LEVEL SECURITY;
ALTER TABLE viewers            DISABLE ROW LEVEL SECURITY;
ALTER TABLE drivers            DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions       DISABLE ROW LEVEL SECURITY;
ALTER TABLE driver_salaries    DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reversals  DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications      DISABLE ROW LEVEL SECURITY;
ALTER TABLE notification_reads DISABLE ROW LEVEL SECURITY;
ALTER TABLE notification_deletes DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs         DISABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_config         DISABLE ROW LEVEL SECURITY;
ALTER TABLE password_history   DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions           DISABLE ROW LEVEL SECURITY;
