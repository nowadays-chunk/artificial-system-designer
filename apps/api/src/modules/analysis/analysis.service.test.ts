import assert from "node:assert/strict";
import test from "node:test";
import { validateArchitectureService } from "./analysis.service";

test("validateArchitectureService returns findings and scorecard", () => {
  const graph = {
    schemaVersion: "1.0" as const,
    nodes: [
      {
        id: "n1",
        type: "browser_client",
        label: "Web Client",
        category: "Clients",
        x: 10,
        y: 10,
        width: 120,
        height: 80,
        settings: {},
      },
      {
        id: "n2",
        type: "postgresql",
        label: "Primary DB",
        category: "Databases",
        x: 240,
        y: 10,
        width: 120,
        height: 80,
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

  const result = validateArchitectureService({ graph, scenarioId: "global-saas" });
  assert.ok(result.reportId);
  assert.ok(result.findings.length > 0);
  assert.equal(typeof result.scorecard.overall, "number");
});

test("validateArchitectureService rejects invalid graph", () => {
  assert.throws(
    () =>
      validateArchitectureService({
        graph: { schemaVersion: "1.0", nodes: [], edges: [{ id: "e1" }] },
      }),
    /invalid_graph_document:/,
  );
});
