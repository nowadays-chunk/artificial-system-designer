CREATE TABLE IF NOT EXISTS workspace_memberships (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, actor_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_memberships_actor
  ON workspace_memberships (actor_id);
