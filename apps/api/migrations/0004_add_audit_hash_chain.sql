CREATE TABLE IF NOT EXISTS AuditEvent (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  prev_hash TEXT NOT NULL,
  hash TEXT NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_auditevent_tenant_time ON AuditEvent(tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditevent_actor_time ON AuditEvent(actor_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditevent_resource ON AuditEvent(resource_type, resource_id);
