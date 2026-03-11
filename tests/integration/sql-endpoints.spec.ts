import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

function runPsql(databaseUrl: string, sql: string): string[] {
  const result = spawnSync(
    "psql",
    [databaseUrl, "-v", "ON_ERROR_STOP=1", "-t", "-A", "-q", "-c", sql],
    { encoding: "utf8", windowsHide: true },
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

function escapeSqlLiteral(value: string) {
  return value.replace(/'/g, "''");
}

async function waitForHealth(baseUrl: string, attempts = 50) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("api_health_timeout");
}

async function postJson(baseUrl: string, path: string, body: unknown, headers: Record<string, string> = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: response.status, payload };
}

async function getJson(baseUrl: string, path: string, headers: Record<string, string> = {}) {
  const response = await fetch(`${baseUrl}${path}`, { headers });
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: response.status, payload };
}

test(
  "sql DB endpoint flow persists workspace/version/simulation/analysis/audit",
  { skip: !process.env.DATABASE_URL },
  async () => {
    const databaseUrl = process.env.DATABASE_URL;
    assert.ok(databaseUrl);

    const actorId = "sql-endpoint-user";
    const tenantId = `sql-tenant-${Date.now()}`;
    const startedAt = new Date().toISOString();

    Object.assign(process.env, {
      NODE_ENV: "test",
      API_DB_PROVIDER: "postgres_psql",
      DATABASE_URL: databaseUrl,
      API_AUTH_PROVIDER: "in_memory",
      API_AUTH_SIMULATION: "1",
      API_AUTH_SIM_ACTOR_ID: actorId,
      API_AUTH_SIM_TENANT_ID: tenantId,
      API_AUTH_SIM_ACTOR_TYPE: "user",
      API_RUN_MIGRATIONS_ON_BOOT: "1",
    });

    const { bootstrapApiServer } = await import("../../apps/api/src/main");
    const port = 4950 + Math.floor(Math.random() * 200);
    const baseUrl = `http://127.0.0.1:${port}`;
    const server = await bootstrapApiServer(port);
    let workspaceId = "";

    try {
      await waitForHealth(baseUrl);

      const graph = {
        schemaVersion: "1.0" as const,
        nodes: [
          {
            id: "n1",
            type: "api_gateway",
            label: "Gateway",
            category: "Application Layer",
            x: 20,
            y: 20,
            width: 100,
            height: 60,
            settings: {},
          },
          {
            id: "n2",
            type: "service",
            label: "Service",
            category: "Application Layer",
            x: 220,
            y: 20,
            width: 100,
            height: 60,
            settings: {},
          },
        ],
        edges: [
          {
            id: "e1",
            sourceId: "n1",
            targetId: "n2",
            protocol: "HTTPS" as const,
            purpose: "request",
          },
        ],
      };

      const workspaceCreate = await postJson(baseUrl, "/api/workspaces", { name: "SQL Endpoint Workspace" });
      assert.equal(workspaceCreate.status, 201);
      assert.equal(typeof workspaceCreate.payload.workspaceId, "string");
      workspaceId = String(workspaceCreate.payload.workspaceId);

      const workspaceRead = await getJson(baseUrl, `/api/workspaces/${workspaceId}`);
      assert.equal(workspaceRead.status, 200);

      const versionCreate = await postJson(baseUrl, `/api/workspaces/${workspaceId}/diagram-versions`, {
        graph,
        message: "sql-version",
      });
      assert.equal(versionCreate.status, 201);
      assert.equal(typeof versionCreate.payload.versionId, "string");
      const versionId = String(versionCreate.payload.versionId);

      const runCreate = await postJson(baseUrl, "/api/simulations/runs", {
        workspaceId,
        versionId,
        scenarioId: "sql-endpoint-sim",
        seed: 42,
        profile: "normal",
        graph,
        trafficRps: 7000,
      });
      assert.equal(runCreate.status, 201);
      assert.equal(typeof runCreate.payload.runId, "string");
      const runId = String(runCreate.payload.runId);

      const runRead = await getJson(baseUrl, `/api/simulations/runs/${runId}`);
      assert.equal(runRead.status, 200);

      const analysis = await postJson(baseUrl, "/api/analysis/validate", {
        workspaceId,
        versionId,
        scenarioId: "sql-endpoint-sim",
        graph,
      });
      assert.equal(analysis.status, 200);
      assert.equal(typeof analysis.payload.reportId, "string");

      const auditVerify = await getJson(baseUrl, "/api/audit/verify-chain");
      assert.equal(auditVerify.status, 200);
      assert.equal(auditVerify.payload.valid, true);
      assert.ok(Number(auditVerify.payload.checked ?? 0) >= 1);

      const escapedWorkspaceId = escapeSqlLiteral(workspaceId);
      const escapedActorId = escapeSqlLiteral(actorId);
      const escapedTenantId = escapeSqlLiteral(tenantId);
      const escapedStartedAt = escapeSqlLiteral(startedAt);
      const membershipRole =
        runPsql(
          databaseUrl,
          `
            SELECT role
            FROM workspace_memberships
            WHERE workspace_id = '${escapedWorkspaceId}'::uuid
              AND actor_id = '${escapedActorId}'
            LIMIT 1;
          `,
        )[0] ?? "";
      assert.equal(membershipRole, "owner");

      const versionsCount = Number(
        runPsql(
          databaseUrl,
          `
            SELECT COUNT(*)
            FROM diagram_versions
            WHERE workspace_id = '${escapedWorkspaceId}'::uuid;
          `,
        )[0] ?? "0",
      );
      assert.ok(versionsCount >= 1);

      const scenarioRunsCompleted = Number(
        runPsql(
          databaseUrl,
          `
            SELECT COUNT(*)
            FROM ScenarioRun
            WHERE workspace_id = '${escapedWorkspaceId}'::uuid
              AND status = 'completed';
          `,
        )[0] ?? "0",
      );
      assert.ok(scenarioRunsCompleted >= 1);

      const reportsCount = Number(
        runPsql(
          databaseUrl,
          `
            SELECT COUNT(*)
            FROM analysis_reports
            WHERE workspace_id = '${escapedWorkspaceId}'::uuid;
          `,
        )[0] ?? "0",
      );
      assert.ok(reportsCount >= 1);

      const auditCount = Number(
        runPsql(
          databaseUrl,
          `
            SELECT COUNT(*)
            FROM AuditEvent
            WHERE tenant_id = '${escapedTenantId}'
              AND actor_id = '${escapedActorId}'
              AND occurred_at >= '${escapedStartedAt}'::timestamptz;
          `,
        )[0] ?? "0",
      );
      assert.ok(auditCount >= 5);
    } finally {
      if (workspaceId) {
        const escapedWorkspaceId = escapeSqlLiteral(workspaceId);
        runPsql(
          databaseUrl,
          `
            DELETE FROM analysis_reports
            WHERE workspace_id = '${escapedWorkspaceId}'::uuid;
            DELETE FROM ScenarioRun
            WHERE workspace_id = '${escapedWorkspaceId}'::uuid;
            DELETE FROM workspace_memberships
            WHERE workspace_id = '${escapedWorkspaceId}'::uuid;
            DELETE FROM diagram_versions
            WHERE workspace_id = '${escapedWorkspaceId}'::uuid;
            DELETE FROM workspaces
            WHERE id = '${escapedWorkspaceId}'::uuid;
          `,
        );
      }
      runPsql(
        databaseUrl,
        `
          DELETE FROM AuditEvent
          WHERE tenant_id = '${escapeSqlLiteral(tenantId)}'
            AND actor_id = '${escapeSqlLiteral(actorId)}';
        `,
      );

      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
  },
);

