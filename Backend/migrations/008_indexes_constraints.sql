-- 008_indexes_constraints.sql
-- Additional indexes and constraints

-- Example: ensure product name uniqueness per SKU if required
ALTER TABLE IF EXISTS products
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Ensure purchases.invoice_no nullable unique constraint handled by partial index
CREATE UNIQUE INDEX IF NOT EXISTS ux_purchases_invoice_no ON purchases(invoice_no) WHERE invoice_no IS NOT NULL;

-- Ensure sales.invoice_no uniqueness handled earlier; add performance indexes
CREATE INDEX IF NOT EXISTS idx_purchase_items_product_qty ON purchase_items(product_id, qty);
