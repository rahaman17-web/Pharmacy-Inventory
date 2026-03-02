-- 011_add_supplier_opening_balance.sql
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0;
