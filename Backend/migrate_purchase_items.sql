-- Migration script to add historical data columns to purchase_items table
-- Run this in your database to enable complete purchase history

ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS original_sale_price NUMERIC(12,2);
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS discount1_percent NUMERIC(5,2) DEFAULT 0;
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS discount2_percent NUMERIC(5,2) DEFAULT 0;
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS gst_percent NUMERIC(5,2) DEFAULT 0;
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS pack_size INTEGER DEFAULT 1;
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Update existing records to have default values (optional)
UPDATE purchase_items SET 
  original_sale_price = 0,
  discount1_percent = 0,
  discount2_percent = 0,
  gst_percent = 0,
  pack_size = 1
WHERE original_sale_price IS NULL;

-- Verification query - run this to confirm migration worked
SELECT 
  id, 
  qty, 
  bonus_qty, 
  unit_price, 
  original_sale_price, 
  discount1_percent, 
  discount2_percent, 
  gst_percent 
FROM purchase_items 
LIMIT 5;