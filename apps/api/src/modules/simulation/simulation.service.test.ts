import assert from "node:assert/strict";
import test from "node:test";
import { createSimulationRunService, getSimulationRunService } from "./simulation.service";

const graph = {
  schemaVersion: "1.0" as const,
  nodes: [
    {
      id: "n1",
      type: "api_gateway",
      label: "Gateway",
      category: "Application Layer",
      x: 10,
      y: 10,
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
      y: 10,
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

test("createSimulationRunService creates deterministic run payload", () => {
  const created = createSimulationRunService({
    workspaceId: "w1",
    versionId: "v1",
    scenarioId: "saas",
    seed: 42,
    profile: "normal",
    graph,
    trafficRps: 8000,
  });

  assert.ok(created.runId);
  const run = getSimulationRunService(created.runId);
  assert.equal(run.run.id, created.runId);
  assert.equal(run.ticks.length, 24);
  assert.equal(run.run.status, "completed");
});

test("createSimulationRunService validates input", () => {
  assert.throws(
    () =>
      createSimulationRunService({
        workspaceId: "w1",
        versionId: "v1",
        scenarioId: "saas",
        seed: 1,
        profile: "invalid",
        graph,
      }),
    /invalid_profile/,
  );
});
