-- 005_create_sales.sql
-- Sales (invoices)
CREATE TABLE IF NOT EXISTS sales (
  id BIGSERIAL PRIMARY KEY,
  invoice_no TEXT UNIQUE,
  customer_name TEXT,
  total_amount NUMERIC(14,2) DEFAULT 0,
  created_by BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add columns if table already existed from legacy schema
ALTER TABLE sales ADD COLUMN IF NOT EXISTS invoice_no TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS total_amount NUMERIC(14,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS created_by BIGINT;

CREATE UNIQUE INDEX IF NOT EXISTS ux_sales_invoice_no ON sales(invoice_no);
