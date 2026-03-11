CREATE TABLE IF NOT EXISTS analysis_reports (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  version_id UUID NULL REFERENCES diagram_versions(id) ON DELETE SET NULL,
  scenario_id TEXT NULL,
  summary TEXT NOT NULL,
  findings_json JSONB NOT NULL,
  scorecard_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analysis_reports_workspace_created
  ON analysis_reports (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analysis_reports_version
  ON analysis_reports (version_id);
