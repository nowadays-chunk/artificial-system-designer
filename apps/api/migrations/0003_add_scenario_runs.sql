CREATE TABLE IF NOT EXISTS ScenarioRun (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES Workspace(id),
  version_id UUID NOT NULL REFERENCES DiagramVersion(id),
  scenario_id TEXT NOT NULL,
  seed INTEGER NOT NULL,
  profile TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ NULL,
  metrics_json JSONB NULL
);

CREATE INDEX IF NOT EXISTS idx_scenariorun_workspace ON ScenarioRun(workspace_id);
CREATE INDEX IF NOT EXISTS idx_scenariorun_version ON ScenarioRun(version_id);
CREATE INDEX IF NOT EXISTS idx_scenariorun_status ON ScenarioRun(status);
