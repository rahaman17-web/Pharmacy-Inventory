-- 009_merge_missing_tables_and_columns.sql
-- Add missing tables/columns from previous single-file migration and the separate migrate_purchase_items.sql

-- Suppliers (if not created by other migrations)
CREATE TABLE IF NOT EXISTS suppliers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Batches table for lot-level tracking
CREATE TABLE IF NOT EXISTS batches (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  batch_no TEXT,
  expiry DATE,
  qty INTEGER DEFAULT 0,
  cost NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sale items (line items for sales) if missing
CREATE TABLE IF NOT EXISTS sale_items (
  id BIGSERIAL PRIMARY KEY,
  sale_id BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id),
  batch_id BIGINT,
  qty INTEGER,
  unit_price NUMERIC(12,2),
  unit_cost NUMERIC(12,2) DEFAULT 0,
  discount_percent NUMERIC(5,2) DEFAULT 0
);

-- Returns and return items
CREATE TABLE IF NOT EXISTS returns (
  id BIGSERIAL PRIMARY KEY,
  sale_id BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  user_id BIGINT,
  total NUMERIC(12,2) DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS return_items (
  id BIGSERIAL PRIMARY KEY,
  return_id BIGINT NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  sale_item_id BIGINT NOT NULL REFERENCES sale_items(id),
  product_id BIGINT NOT NULL REFERENCES products(id),
  batch_id BIGINT NOT NULL REFERENCES batches(id),
  qty INTEGER NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  unit_cost NUMERIC(12,2) DEFAULT 0
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT,
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add product columns present in legacy schema but missing in products migration
ALTER TABLE products ADD COLUMN IF NOT EXISTS formula TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS gst_percentage NUMERIC(5,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS mrp NUMERIC(12,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS selling_price NUMERIC(12,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS pack_size INTEGER DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Ensure purchase_items has historical columns from migrate_purchase_items.sql
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS original_sale_price NUMERIC(12,2);
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS discount1_percent NUMERIC(5,2) DEFAULT 0;
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS discount2_percent NUMERIC(5,2) DEFAULT 0;
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS gst_percent NUMERIC(5,2) DEFAULT 0;
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS pack_size INTEGER DEFAULT 1;
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Backfill purchase_items defaults for safety (idempotent)
UPDATE purchase_items SET 
  original_sale_price = COALESCE(original_sale_price, 0),
  discount1_percent = COALESCE(discount1_percent, 0),
  discount2_percent = COALESCE(discount2_percent, 0),
  gst_percent = COALESCE(gst_percent, 0),
  pack_size = COALESCE(pack_size, 1)
WHERE (original_sale_price IS NULL OR discount1_percent IS NULL OR discount2_percent IS NULL OR gst_percent IS NULL OR pack_size IS NULL);

-- Ensure products.supplier_id exists
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL;
