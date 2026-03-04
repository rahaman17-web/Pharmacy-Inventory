-- 013_add_user_contact_fields.sql
-- Add address, contact_no, father_contact_no columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_no TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS father_contact_no TEXT;
