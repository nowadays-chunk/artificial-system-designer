ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';

CREATE INDEX IF NOT EXISTS idx_workspaces_tenant_created
  ON workspaces (tenant_id, created_at DESC);
