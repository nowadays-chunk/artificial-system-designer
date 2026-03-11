import { randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.log("[rbac-integration] skipped: DATABASE_URL is not set");
  process.exit(0);
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
    ...options,
  });
}

function runPsql(sql) {
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

async function waitForHealth(baseUrl, attempts = 50) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // retry
    }
    await sleep(200);
  }
  throw new Error("api_health_timeout");
}

async function postJson(baseUrl, path, body, headers = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }
  return { status: response.status, payload };
}

async function getJson(baseUrl, path, headers = {}) {
  const response = await fetch(`${baseUrl}${path}`, { headers });
  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }
  return { status: response.status, payload };
}

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const migrate = run(npmCmd, ["--prefix", "apps/api", "run", "migrate"]);
if (migrate.status !== 0) {
  console.error("[rbac-integration] migration failed");
  console.error(migrate.stderr || migrate.stdout);
  process.exit(1);
}

const port = 4200 + Math.floor(Math.random() * 400);
const baseUrl = `http://127.0.0.1:${port}`;
const workspaceName = `RBAC-${Date.now()}`;
const ownerActor = "rbac-owner";
const editorActor = "rbac-editor";
const viewerActor = "rbac-viewer";
const tenantId = "default";

const apiProcess = spawn(
  process.execPath,
  ["--experimental-strip-types", "--experimental-specifier-resolution=node", "apps/api/src/main.ts"],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      API_DB_PROVIDER: "postgres_psql",
      API_AUTH_PROVIDER: "header",
      API_AUTH_SIMULATION: "0",
      API_RUN_MIGRATIONS_ON_BOOT: "0",
      DATABASE_URL: databaseUrl,
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  },
);

let serverLogs = "";
apiProcess.stdout.on("data", (chunk) => {
  serverLogs += String(chunk);
});
apiProcess.stderr.on("data", (chunk) => {
  serverLogs += String(chunk);
});

let workspaceId = "";
let createdRunId = "";

try {
  await waitForHealth(baseUrl);

  const ownerHeaders = {
    "x-actor-id": ownerActor,
    "x-tenant-id": tenantId,
    "x-actor-type": "user",
  };
  const editorHeaders = {
    "x-actor-id": editorActor,
    "x-tenant-id": tenantId,
    "x-actor-type": "user",
  };
  const viewerHeaders = {
    "x-actor-id": viewerActor,
    "x-tenant-id": tenantId,
    "x-actor-type": "user",
  };
  const unknownHeaders = {
    "x-actor-id": "rbac-unknown",
    "x-tenant-id": tenantId,
    "x-actor-type": "user",
  };
  const crossTenantOwnerHeaders = {
    "x-actor-id": ownerActor,
    "x-tenant-id": "other-tenant",
    "x-actor-type": "user",
  };

  const createWorkspace = await postJson(baseUrl, "/api/workspaces", { name: workspaceName }, ownerHeaders);
  if (createWorkspace.status !== 201 || typeof createWorkspace.payload.workspaceId !== "string") {
    throw new Error(`workspace_create_failed:${createWorkspace.status}`);
  }
  workspaceId = createWorkspace.payload.workspaceId;

  const escapedWorkspaceId = escapeSqlLiteral(workspaceId);
  runPsql(`
    INSERT INTO workspace_memberships (workspace_id, actor_id, role)
    VALUES
      ('${escapedWorkspaceId}'::uuid, '${escapeSqlLiteral(editorActor)}', 'editor'),
      ('${escapedWorkspaceId}'::uuid, '${escapeSqlLiteral(viewerActor)}', 'viewer')
    ON CONFLICT (workspace_id, actor_id) DO UPDATE SET role = EXCLUDED.role, updated_at = NOW();
  `);

  const graph = {
    schemaVersion: "1.0",
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
        x: 240,
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
        protocol: "HTTPS",
        purpose: "request",
      },
    ],
  };

  const getWorkspaceViewer = await getJson(baseUrl, `/api/workspaces/${workspaceId}`, viewerHeaders);
  if (getWorkspaceViewer.status !== 200) {
    throw new Error(`viewer_workspace_read_failed:${getWorkspaceViewer.status}`);
  }

  const getWorkspaceCrossTenant = await getJson(baseUrl, `/api/workspaces/${workspaceId}`, crossTenantOwnerHeaders);
  if (getWorkspaceCrossTenant.status !== 403) {
    throw new Error(`cross_tenant_workspace_read_should_forbid:${getWorkspaceCrossTenant.status}`);
  }

  const createVersionViewer = await postJson(
    baseUrl,
    `/api/workspaces/${workspaceId}/diagram-versions`,
    { graph, message: "viewer-create-version" },
    viewerHeaders,
  );
  if (createVersionViewer.status !== 403) {
    throw new Error(`viewer_version_write_should_forbid:${createVersionViewer.status}`);
  }

  const createVersionEditor = await postJson(
    baseUrl,
    `/api/workspaces/${workspaceId}/diagram-versions`,
    { graph, message: "editor-create-version" },
    editorHeaders,
  );
  if (createVersionEditor.status !== 201 || typeof createVersionEditor.payload.versionId !== "string") {
    throw new Error(`editor_version_write_failed:${createVersionEditor.status}`);
  }
  const versionId = createVersionEditor.payload.versionId;

  const analysisViewer = await postJson(
    baseUrl,
    "/api/analysis/validate",
    { workspaceId, versionId, graph, scenarioId: "rbac-test" },
    viewerHeaders,
  );
  if (analysisViewer.status !== 200) {
    throw new Error(`viewer_analysis_read_failed:${analysisViewer.status}`);
  }

  const analysisUnknown = await postJson(
    baseUrl,
    "/api/analysis/validate",
    { workspaceId, versionId, graph, scenarioId: "rbac-test" },
    unknownHeaders,
  );
  if (analysisUnknown.status !== 403) {
    throw new Error(`unknown_analysis_should_forbid:${analysisUnknown.status}`);
  }

  const simulationViewer = await postJson(
    baseUrl,
    "/api/simulations/runs",
    {
      workspaceId,
      versionId,
      scenarioId: "rbac-test",
      seed: 7,
      profile: "normal",
      graph,
      trafficRps: 4000,
    },
    viewerHeaders,
  );
  if (simulationViewer.status !== 403) {
    throw new Error(`viewer_simulation_write_should_forbid:${simulationViewer.status}`);
  }

  const simulationEditor = await postJson(
    baseUrl,
    "/api/simulations/runs",
    {
      workspaceId,
      versionId,
      scenarioId: "rbac-test",
      seed: 11,
      profile: "normal",
      graph,
      trafficRps: 8000,
    },
    editorHeaders,
  );
  if (simulationEditor.status !== 201 || typeof simulationEditor.payload.runId !== "string") {
    throw new Error(`editor_simulation_write_failed:${simulationEditor.status}`);
  }
  createdRunId = simulationEditor.payload.runId;

  const getRunViewer = await getJson(baseUrl, `/api/simulations/runs/${createdRunId}`, viewerHeaders);
  if (getRunViewer.status !== 200) {
    throw new Error(`viewer_simulation_read_failed:${getRunViewer.status}`);
  }

  const getRunUnknown = await getJson(baseUrl, `/api/simulations/runs/${createdRunId}`, unknownHeaders);
  if (getRunUnknown.status !== 403) {
    throw new Error(`unknown_simulation_read_should_forbid:${getRunUnknown.status}`);
  }

  console.log("[rbac-integration] passed");
} catch (error) {
  console.error("[rbac-integration] failed");
  console.error(error instanceof Error ? error.message : String(error));
  console.error(serverLogs);
  process.exitCode = 1;
} finally {
  try {
    if (workspaceId) {
      runPsql(`
        DELETE FROM workspaces
        WHERE id = '${escapeSqlLiteral(workspaceId)}'::uuid;
      `);
    }
  } catch {
    // best effort cleanup
  }

  apiProcess.kill();
  await sleep(150);
}
