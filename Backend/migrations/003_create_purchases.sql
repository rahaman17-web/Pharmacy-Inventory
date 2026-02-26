-- 003_create_purchases.sql
-- Purchase headers (one per purchase order)
CREATE TABLE IF NOT EXISTS purchases (
  id BIGSERIAL PRIMARY KEY,
  supplier_id BIGINT,
  invoice_no TEXT,
  total_amount NUMERIC(14,2) DEFAULT 0,
  created_by BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchases_invoice_no ON purchases(invoice_no);
