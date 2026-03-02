-- 010_add_product_extra_columns.sql
-- Add extended product fields

ALTER TABLE products ADD COLUMN IF NOT EXISTS ac_unit          TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS purchase_percent  NUMERIC(5,2)  DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS pack_sale_price   NUMERIC(12,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS purchase_price    NUMERIC(12,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS opening_qty       INTEGER       DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_level         INTEGER       DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand             TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS batch_no          TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS expiry_date       DATE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS shelf             TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS active            BOOLEAN       DEFAULT TRUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS def_discount      NUMERIC(5,2)  DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode           TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS from_date         DATE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS to_date           DATE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS expiry_by_brand   TEXT;
