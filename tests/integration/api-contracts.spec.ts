import assert from "node:assert/strict";
import test from "node:test";
import { validateAnalysisReport } from "../../packages/contracts/src/analysis";
import { validateGraphDocument } from "../../packages/contracts/src/graph";
import { validateSimulationRun } from "../../packages/contracts/src/simulation";

test("GraphDocument contract accepts valid graph payload", () => {
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
        width: 120,
        height: 80,
        settings: {},
      },
      {
        id: "n2",
        type: "service",
        label: "Service",
        category: "Application Layer",
        x: 250,
        y: 20,
        width: 120,
        height: 80,
        settings: {},
      },
    ],
    edges: [{ id: "e1", sourceId: "n1", targetId: "n2", protocol: "HTTPS", purpose: "request" }],
  };

  const result = validateGraphDocument(graph);
  assert.equal(result.ok, true);
});

test("SimulationRun contract validates required fields", () => {
  const run = {
    id: "run-1",
    workspaceId: "workspace-1",
    versionId: "version-1",
    scenarioId: "scenario-1",
    seed: 42,
    profile: "normal" as const,
    status: "completed" as const,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    metrics: {
      latencyMsP50: 40,
      latencyMsP95: 120,
      throughputRps: 10000,
      errorRatePercent: 0.5,
      saturationPercent: 62,
      estimatedCostPerHourUsd: 16.2,
    },
    scorecard: {
      resilience: 82,
      security: 75,
      performance: 78,
      cost: 70,
      overall: 76,
    },
  };

  const result = validateSimulationRun(run);
  assert.equal(result.ok, true);
});

test("AnalysisReport contract rejects malformed payload", () => {
  const result = validateAnalysisReport({
    id: "r1",
    workspaceId: "w1",
    versionId: "v1",
    summary: "bad payload",
    createdAt: new Date().toISOString(),
    findings: [{ id: "f1" }],
    scorecard: {},
  });

  assert.equal(result.ok, false);
  assert.ok(result.errors.length > 0);
});
