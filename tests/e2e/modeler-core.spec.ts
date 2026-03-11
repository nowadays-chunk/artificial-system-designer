import assert from "node:assert/strict";
import test from "node:test";
import {
  createEmptyTimeline,
  executeGraphCommand,
  redoGraphCommand,
  undoGraphCommand,
} from "../../app/modeler/commands/command-bus";
import type { GraphSnapshot } from "../../app/modeler/commands/types";

type Node = { id: string; label: string };
type Edge = { id: string; sourceId: string; targetId: string };
type Selection = { kind: "node"; id: string } | null;

function baseSnapshot(): GraphSnapshot<Node, Edge, Selection> {
  return {
    nodes: [],
    edges: [],
    selection: null,
    pendingConnectionSourceId: null,
  };
}

test("modeler core flow supports execute -> undo -> redo", () => {
  const snapshot = baseSnapshot();
  const timeline = createEmptyTimeline<Node, Edge, Selection>();

  const nodeCommand = {
    id: "c1",
    kind: "add_node" as const,
    payload: { node: { id: "n1", label: "Gateway" } },
  };

  const executed = executeGraphCommand(snapshot, timeline, nodeCommand);
  assert.equal(executed.next.nodes.length, 1);
  assert.equal(executed.timeline.cursor, 0);

  const undone = undoGraphCommand(executed.next, executed.timeline);
  assert.equal(undone.next.nodes.length, 0);
  assert.equal(undone.timeline.cursor, -1);

  const redone = redoGraphCommand(undone.next, undone.timeline);
  assert.equal(redone.next.nodes.length, 1);
  assert.equal(redone.timeline.cursor, 0);
});

test("removing node also removes connected edges", () => {
  const snapshot: GraphSnapshot<Node, Edge, Selection> = {
    nodes: [
      { id: "n1", label: "Client" },
      { id: "n2", label: "Service" },
    ],
    edges: [{ id: "e1", sourceId: "n1", targetId: "n2" }],
    selection: null,
    pendingConnectionSourceId: null,
  };
  const timeline = createEmptyTimeline<Node, Edge, Selection>();

  const removed = executeGraphCommand(snapshot, timeline, {
    id: "c-remove",
    kind: "remove_node",
    payload: { nodeId: "n1" },
  });

  assert.equal(removed.next.nodes.length, 1);
  assert.equal(removed.next.edges.length, 0);
});
