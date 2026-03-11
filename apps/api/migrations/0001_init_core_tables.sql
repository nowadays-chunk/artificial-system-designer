CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS diagram_versions (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  base_version_id UUID NULL,
  graph_json JSONB NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_workspace_version UNIQUE (workspace_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_diagram_versions_workspace_created
  ON diagram_versions (workspace_id, created_at DESC);

