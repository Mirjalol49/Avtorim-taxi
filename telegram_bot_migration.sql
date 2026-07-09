-- ============================================================
-- Migration: Telegram Bot Integration Tables
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Admin settings (stores per-admin Telegram chat ID, etc.)
CREATE TABLE IF NOT EXISTS admin_settings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id    TEXT NOT NULL UNIQUE,       -- maps to admin_users.id
    telegram_chat_id TEXT,                  -- Telegram chat/group ID for alerts
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- RLS: only the matching admin can read/update their own settings
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
-- Service role key bypasses RLS (server-side), so no extra policy needed.

-- 2. Bot sessions (persists driver conversation state across restarts)
CREATE TABLE IF NOT EXISTS bot_sessions (
    telegram_id     TEXT PRIMARY KEY,
    session_data    JSONB,
    updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE bot_sessions ENABLE ROW LEVEL SECURITY;

-- Grant service role full access (used by the backend)
-- (No additional grants needed when using service_role key)

-- ============================================================
-- Verify
-- ============================================================
SELECT 'admin_settings table ready' AS status;
SELECT 'bot_sessions table ready'   AS status;
