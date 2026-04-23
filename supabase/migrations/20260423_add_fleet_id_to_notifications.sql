-- Isolate notifications per fleet/account
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS fleet_id UUID REFERENCES admin_users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_notifications_fleet_id ON notifications(fleet_id);

-- Remove any orphaned cross-account notifications (no fleet owner)
DELETE FROM notifications WHERE fleet_id IS NULL;
