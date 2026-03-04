-- 014_add_panel_pin.sql
-- Separate PIN for unlocking the Admin Panel (User Management)
ALTER TABLE users ADD COLUMN IF NOT EXISTS panel_pin TEXT;
