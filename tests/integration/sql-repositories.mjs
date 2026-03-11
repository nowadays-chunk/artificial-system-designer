import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
    ...options,
  });
  return result;
}

function runPsql(databaseUrl, sql) {
  const result = run(
    "psql",
    [databaseUrl, "-v", "ON_ERROR_STOP=1", "-t", "-A", "-q", "-c", sql],
    { windowsHide: true },
  );
  if (result.error) {
    throw new Error(`psql_exec_failed:${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`psql_exec_failed:${result.stderr || result.stdout}`);
  }
  return String(result.stdout ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function escapeSqlLiteral(value) {
  return value.replace(/'/g, "''");
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.log("[sql-integration] skipped: DATABASE_URL is not set");
  process.exit(0);
}

process.env.API_DB_PROVIDER = "postgres_psql";
process.env.API_AUTH_PROVIDER = "in_memory";

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const migrate = run(npmCmd, ["--prefix", "apps/api", "run", "migrate"]);
if (migrate.status !== 0) {
  console.error("[sql-integration] migration failed");
  console.error(migrate.stderr || migrate.stdout);
  process.exit(1);
}

const workspaceId = randomUUID();
const versionId = randomUUID();
const reportId = randomUUID();
const runId = randomUUID();
const tenantId = `tenant-${Date.now()}`;

try {
  runPsql(
    databaseUrl,
    `
      INSERT INTO workspaces (id, name)
      VALUES ('${workspaceId}'::uuid, 'SQL Test Workspace');

      INSERT INTO workspace_memberships (workspace_id, actor_id, role)
      VALUES ('${workspaceId}'::uuid, 'sql-user', 'editor');

      INSERT INTO diagram_versions (
        id, workspace_id, version_number, base_version_id, graph_json, message
      )
      VALUES (
        '${versionId}'::uuid,
        '${workspaceId}'::uuid,
        1,
        NULL,
        '{"schemaVersion":"1.0","nodes":[],"edges":[]}'::jsonb,
        'SQL integration seed'
      );

      INSERT INTO analysis_reports (
        id, workspace_id, version_id, scenario_id, summary, findings_json, scorecard_json
      )
      VALUES (
        '${reportId}'::uuid,
        '${workspaceId}'::uuid,
        '${versionId}'::uuid,
        'sql-integration',
        'Integration report',
        '[]'::jsonb,
        '{"resilience":80,"security":75,"performance":78,"cost":70,"maintainability":82,"overall":77}'::jsonb
      );

      INSERT INTO ScenarioRun (
        id, workspace_id, version_id, scenario_id, seed, profile, status, metrics_json
      )
      VALUES (
        '${runId}'::uuid,
        '${workspaceId}'::uuid,
        '${versionId}'::uuid,
        'sql-integration',
        42,
        'normal',
        'completed',
        '{"ticks":[],"findings":[]}'::jsonb
      );
    `,
  );

  const membershipRole = runPsql(
    databaseUrl,
    `
      SELECT role
      FROM workspace_memberships
      WHERE workspace_id = '${workspaceId}'::uuid AND actor_id = 'sql-user'
      LIMIT 1;
    `,
  )[0];
  if (membershipRole !== "editor") {
    throw new Error(`membership_assertion_failed:${membershipRole}`);
  }

  const reportCount = Number(
    runPsql(
      databaseUrl,
      `
        SELECT COUNT(*)
        FROM analysis_reports
        WHERE workspace_id = '${workspaceId}'::uuid;
      `,
    )[0] ?? "0",
  );
  if (reportCount < 1) {
    throw new Error("analysis_report_assertion_failed");
  }

  const prevHash = "GENESIS";
  const payloadJson = "{}";
  const action = "sql.integration.audit";
  const actorId = "sql-user";
  const resourceType = "workspace";
  const resourceId = workspaceId;
  const occurredAt = new Date().toISOString();
  const hashInput = [
    tenantId,
    actorId,
    action,
    resourceType,
    resourceId,
    occurredAt,
    prevHash,
    payloadJson,
  ].join("|");
  const hash = createHash("sha256").update(hashInput).digest("hex");

  runPsql(
    databaseUrl,
    `
      INSERT INTO AuditEvent (
        id, tenant_id, actor_id, action, resource_type, resource_id, payload_json, occurred_at, prev_hash, hash
      )
      VALUES (
        '${randomUUID()}'::uuid,
        '${tenantId}',
        '${actorId}',
        '${action}',
        '${resourceType}',
        '${resourceId}',
        '{}'::jsonb,
        '${occurredAt}'::timestamptz,
        '${prevHash}',
        '${hash}'
      );
    `,
  );

  console.log("[sql-integration] passed");
} finally {
  runPsql(
    databaseUrl,
    `
      DELETE FROM AuditEvent WHERE tenant_id = '${tenantId}';
      DELETE FROM ScenarioRun WHERE id = '${runId}'::uuid;
      DELETE FROM analysis_reports WHERE id = '${reportId}'::uuid;
      DELETE FROM diagram_versions WHERE id = '${versionId}'::uuid;
      DELETE FROM workspace_memberships WHERE workspace_id = '${workspaceId}'::uuid;
      DELETE FROM workspaces WHERE id = '${workspaceId}'::uuid;
    `,
  );
}
