import assert from "node:assert/strict";
import test from "node:test";
import { createEmptyTimeline, executeGraphCommand } from "../../app/modeler/commands/command-bus";
import type { GraphSnapshot } from "../../app/modeler/commands/types";

type Node = { id: string; label: string };
type Edge = { id: string; sourceId: string; targetId: string };

test("command execution benchmark stays within budget", () => {
  const initial: GraphSnapshot<Node, Edge, null> = {
    nodes: [],
    edges: [],
    selection: null,
    pendingConnectionSourceId: null,
  };

  let current = initial;
  let timeline = createEmptyTimeline<Node, Edge, null>();
  const iterations = 1000;
  const startedAt = performance.now();

  for (let i = 0; i < iterations; i += 1) {
    const result = executeGraphCommand(current, timeline, {
      id: `add-${i}`,
      kind: "add_node",
      payload: { node: { id: `n-${i}`, label: `Node ${i}` } },
    });
    current = result.next;
    timeline = result.timeline;
  }

  const elapsedMs = performance.now() - startedAt;
  const avgPerCommandMs = elapsedMs / iterations;

  assert.ok(avgPerCommandMs < 0.5, `Average command time too high: ${avgPerCommandMs.toFixed(4)}ms`);
});
