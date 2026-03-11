import assert from "node:assert/strict";
import test from "node:test";
import { createDiagramVersionService, createWorkspaceService } from "./workspace.service";

test("createWorkspaceService creates workspace with id", () => {
  const workspace = createWorkspaceService("Platform Team", "tester");
  assert.ok(workspace.id);
  assert.equal(workspace.name, "Platform Team");
});

test("createDiagramVersionService validates graph and increments version", () => {
  const workspace = createWorkspaceService("Architecture", "tester");
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
        height: 50,
        settings: {},
      },
      {
        id: "n2",
        type: "postgresql",
        label: "DB",
        category: "Databases",
        x: 200,
        y: 100,
        width: 100,
        height: 50,
        settings: {},
      },
    ],
    edges: [
      {
        id: "e1",
        sourceId: "n1",
        targetId: "n2",
        protocol: "HTTPS",
        purpose: "query",
      },
    ],
  };

  const v1 = createDiagramVersionService({
    workspaceId: workspace.id,
    graph,
    message: "Initial",
  });
  const v2 = createDiagramVersionService({
    workspaceId: workspace.id,
    graph,
    message: "Second",
    baseVersionId: v1.id,
  });

  assert.equal(v1.number, 1);
  assert.equal(v2.number, 2);
  assert.equal(v2.baseVersionId, v1.id);
});
