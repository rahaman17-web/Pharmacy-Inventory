-- 007_create_audit_logs.sql
-- Audit trail for important operations
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  entity_type TEXT,
  entity_id BIGINT,
  action TEXT,
  changed_by BIGINT,
  change_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add columns if table already existed from legacy schema
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id BIGINT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS changed_by BIGINT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS change_data JSONB;

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
