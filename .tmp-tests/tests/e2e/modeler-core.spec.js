"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const command_bus_1 = require("../../app/modeler/commands/command-bus");
function baseSnapshot() {
    return {
        nodes: [],
        edges: [],
        selection: null,
        pendingConnectionSourceId: null,
    };
}
(0, node_test_1.default)("modeler core flow supports execute -> undo -> redo", () => {
    const snapshot = baseSnapshot();
    const timeline = (0, command_bus_1.createEmptyTimeline)();
    const nodeCommand = {
        id: "c1",
        kind: "add_node",
        payload: { node: { id: "n1", label: "Gateway" } },
    };
    const executed = (0, command_bus_1.executeGraphCommand)(snapshot, timeline, nodeCommand);
    strict_1.default.equal(executed.next.nodes.length, 1);
    strict_1.default.equal(executed.timeline.cursor, 0);
    const undone = (0, command_bus_1.undoGraphCommand)(executed.next, executed.timeline);
    strict_1.default.equal(undone.next.nodes.length, 0);
    strict_1.default.equal(undone.timeline.cursor, -1);
    const redone = (0, command_bus_1.redoGraphCommand)(undone.next, undone.timeline);
    strict_1.default.equal(redone.next.nodes.length, 1);
    strict_1.default.equal(redone.timeline.cursor, 0);
});
(0, node_test_1.default)("removing node also removes connected edges", () => {
    const snapshot = {
        nodes: [
            { id: "n1", label: "Client" },
            { id: "n2", label: "Service" },
        ],
        edges: [{ id: "e1", sourceId: "n1", targetId: "n2" }],
        selection: null,
        pendingConnectionSourceId: null,
    };
    const timeline = (0, command_bus_1.createEmptyTimeline)();
    const removed = (0, command_bus_1.executeGraphCommand)(snapshot, timeline, {
        id: "c-remove",
        kind: "remove_node",
        payload: { nodeId: "n1" },
    });
    strict_1.default.equal(removed.next.nodes.length, 1);
    strict_1.default.equal(removed.next.edges.length, 0);
});
