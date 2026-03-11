ALTER TABLE diagram_versions
  ADD CONSTRAINT fk_diagram_versions_base_version
  FOREIGN KEY (base_version_id) REFERENCES diagram_versions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_diagram_versions_base
  ON diagram_versions (base_version_id);

