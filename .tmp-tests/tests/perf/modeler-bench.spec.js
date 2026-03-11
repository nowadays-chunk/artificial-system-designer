"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const command_bus_1 = require("../../app/modeler/commands/command-bus");
(0, node_test_1.default)("command execution benchmark stays within budget", () => {
    const initial = {
        nodes: [],
        edges: [],
        selection: null,
        pendingConnectionSourceId: null,
    };
    let current = initial;
    let timeline = (0, command_bus_1.createEmptyTimeline)();
    const iterations = 1000;
    const startedAt = performance.now();
    for (let i = 0; i < iterations; i += 1) {
        const result = (0, command_bus_1.executeGraphCommand)(current, timeline, {
            id: `add-${i}`,
            kind: "add_node",
            payload: { node: { id: `n-${i}`, label: `Node ${i}` } },
        });
        current = result.next;
        timeline = result.timeline;
    }
    const elapsedMs = performance.now() - startedAt;
    const avgPerCommandMs = elapsedMs / iterations;
    strict_1.default.ok(avgPerCommandMs < 0.5, `Average command time too high: ${avgPerCommandMs.toFixed(4)}ms`);
});
