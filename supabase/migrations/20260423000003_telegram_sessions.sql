-- Telegram bot session state table
CREATE TABLE IF NOT EXISTS telegram_sessions (
    chat_id       BIGINT       PRIMARY KEY,
    state         TEXT         NOT NULL DEFAULT 'start',
    language      TEXT         NOT NULL DEFAULT 'uz',
    driver_id     UUID         REFERENCES drivers(id) ON DELETE SET NULL,
    driver_name   TEXT,
    driver_avatar TEXT,
    fleet_id      UUID,
    pending_amount NUMERIC,
    updated_at    BIGINT       NOT NULL
);

-- Create cheques storage bucket (run this in Supabase dashboard or via CLI)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('cheques', 'cheques', true)
-- ON CONFLICT DO NOTHING;
