-- 012_create_supplier_returns.sql
-- Tracks items returned back to a supplier (e.g. short-expire / expired goods)

CREATE TABLE IF NOT EXISTS supplier_returns (
  id            BIGSERIAL PRIMARY KEY,
  supplier_id   BIGINT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  return_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  reason        TEXT,
  total_amount  NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_by    BIGINT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplier_return_items (
  id          BIGSERIAL PRIMARY KEY,
  return_id   BIGINT NOT NULL REFERENCES supplier_returns(id) ON DELETE CASCADE,
  product_id  BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  batch_id    BIGINT REFERENCES batches(id) ON DELETE SET NULL,
  qty         INTEGER NOT NULL DEFAULT 1,
  unit_cost   NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_cost  NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_returns_supplier ON supplier_returns(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_return_items_return ON supplier_return_items(return_id);
