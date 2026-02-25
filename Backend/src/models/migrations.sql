-- Basic schema for pharmacy inventory

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  -- CNIC fields: `cnic` is the national ID number, `cnic_name` is the name printed on CNIC,
  -- `cnic_last3` stores the last 3 digits (used as default password) and is unique per requirement
  cnic TEXT UNIQUE,
  cnic_name TEXT,
  cnic_last3 TEXT UNIQUE,
  emp_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  formula TEXT,
  category TEXT,
  gst_percentage NUMERIC(5,2),
  mrp NUMERIC(12,2) DEFAULT 0,
  selling_price NUMERIC(12,2) DEFAULT 0,
  pack_size INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS batches (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  batch_no TEXT,
  expiry DATE,
  qty INTEGER DEFAULT 0,
  cost NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchases (
  id SERIAL PRIMARY KEY,
  supplier_id INTEGER REFERENCES suppliers(id),
  invoice_no TEXT,
  purchase_date DATE,
  received_date DATE,
  availability_type VARCHAR(20) DEFAULT 'owned',
  trial_end_date DATE,
  payment_status VARCHAR(20) DEFAULT 'pending',
  total NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_items (
  id SERIAL PRIMARY KEY,
  purchase_id INTEGER REFERENCES purchases(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  batch_id INTEGER REFERENCES batches(id),
  qty INTEGER,
  bonus_qty INTEGER DEFAULT 0,
  unit_price NUMERIC(12,2),
  line_total NUMERIC(12,2) DEFAULT 0,
  -- Store original input values for complete history
  original_sale_price NUMERIC(12,2),
  discount1_percent NUMERIC(5,2) DEFAULT 0,
  discount2_percent NUMERIC(5,2) DEFAULT 0,
  gst_percent NUMERIC(5,2) DEFAULT 0,
  pack_size INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sales (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  total NUMERIC(12,2) DEFAULT 0,
  discount NUMERIC(12,2) DEFAULT 0,
  net_total NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sale_items (
  id SERIAL PRIMARY KEY,
  sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  batch_id INTEGER REFERENCES batches(id),
  qty INTEGER,
  unit_price NUMERIC(12,2),
  unit_cost NUMERIC(12,2) DEFAULT 0,
  discount_percent NUMERIC(5,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS returns (
  id SERIAL PRIMARY KEY,
  sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  total NUMERIC(12,2) DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS return_items (
  id SERIAL PRIMARY KEY,
  return_id INTEGER NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  sale_item_id INTEGER NOT NULL REFERENCES sale_items(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  batch_id INTEGER NOT NULL REFERENCES batches(id),
  qty INTEGER NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  unit_cost NUMERIC(12,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add supplier_id to products (safe to run multiple times)
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL;
