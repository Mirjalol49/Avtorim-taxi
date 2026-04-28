-- Bot session state for Telegram webhook
CREATE TABLE IF NOT EXISTS bot_sessions (
    telegram_id   BIGINT PRIMARY KEY,
    lang          TEXT NOT NULL DEFAULT 'uz',
    step          TEXT NOT NULL DEFAULT 'idle',
    temp_amount   INTEGER,
    type          TEXT,
    driver_id     TEXT,
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Allow anon key to read/write bot_sessions (bot uses anon key)
ALTER TABLE bot_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bot_sessions_all" ON bot_sessions FOR ALL USING (true) WITH CHECK (true);
