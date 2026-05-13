-- Add phone column to admin_users for phone-based login
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS phone TEXT;

-- Unique index: only one account per phone number (ignore nulls/empty)
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_phone
  ON admin_users (phone)
  WHERE phone IS NOT NULL AND phone != '';

-- Set mirjalol's phone number
UPDATE admin_users
SET phone = '+998937489141'
WHERE username = 'mirjalol';
