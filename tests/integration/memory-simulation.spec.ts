import assert from "node:assert/strict";
import test from "node:test";

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

async function runMemorySimulationCase(input: {
  authProvider: "in_memory" | "header";
  authSimulation: "0" | "1";
  simActorId: string;
  headers?: Record<string, string>;
}) {
  const port = 4700 + Math.floor(Math.random() * 250);
  const baseUrl = `http://127.0.0.1:${port}`;

  Object.assign(process.env, {
    NODE_ENV: "test",
    API_DB_PROVIDER: "memory",
    API_AUTH_PROVIDER: input.authProvider,
    API_AUTH_SIMULATION: input.authSimulation,
    API_AUTH_SIM_ACTOR_ID: input.simActorId,
    API_AUTH_SIM_TENANT_ID: "sim-tenant",
    API_AUTH_SIM_ACTOR_TYPE: "user",
    API_RUN_MIGRATIONS_ON_BOOT: "0",
  });

  const { bootstrapApiServer } = await import("../../apps/api/src/main");
  const server = await bootstrapApiServer(port);

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

    const headers = input.headers ?? {};

    const workspaceCreate = await postJson(baseUrl, "/api/workspaces", { name: "Memory Workspace" }, headers);
    assert.equal(workspaceCreate.status, 201);
    assert.equal(typeof workspaceCreate.payload.workspaceId, "string");
    const workspaceId = workspaceCreate.payload.workspaceId as string;

    const versionCreate = await postJson(
      baseUrl,
      `/api/workspaces/${workspaceId}/diagram-versions`,
      { graph, message: "memory-version" },
      headers,
    );
    assert.equal(versionCreate.status, 201);
    assert.equal(typeof versionCreate.payload.versionId, "string");
    const versionId = versionCreate.payload.versionId as string;

    const runCreate = await postJson(
      baseUrl,
      "/api/simulations/runs",
      {
        workspaceId,
        versionId,
        scenarioId: "memory-sim",
        seed: 99,
        profile: "normal",
        graph,
        trafficRps: 5000,
      },
      headers,
    );
    assert.equal(runCreate.status, 201);
    assert.equal(typeof runCreate.payload.runId, "string");
    const runId = runCreate.payload.runId as string;

    const runRead = await getJson(baseUrl, `/api/simulations/runs/${runId}`, headers);
    assert.equal(runRead.status, 200);

    const analysis = await postJson(
      baseUrl,
      "/api/analysis/validate",
      { workspaceId, versionId, scenarioId: "memory-sim", graph },
      headers,
    );
    assert.equal(analysis.status, 200);
    assert.equal(typeof analysis.payload.reportId, "string");
  } finally {
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
}

test("memory DB + in-memory auth simulation works end-to-end", async () => {
  await runMemorySimulationCase({
    authProvider: "in_memory",
    authSimulation: "1",
    simActorId: "sim-default",
  });
});

test("memory DB + forced auth simulation overrides header mode", async () => {
  await runMemorySimulationCase({
    authProvider: "header",
    authSimulation: "1",
    simActorId: "forced-sim-user",
    headers: {
      "x-actor-id": "header-user-ignored",
      "x-tenant-id": "header-tenant-ignored",
      "x-actor-type": "service",
    },
  });
});
