"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const simulation_1 = require("./simulation");
const validRun = {
    id: "run_001",
    workspaceId: "ws_001",
    versionId: "v_001",
    scenarioId: "scenario_streaming",
    seed: 42,
    profile: "burst",
    status: "running",
    startedAt: "2026-03-11T00:00:00.000Z",
};
(0, node_test_1.default)("validateSimulationRun accepts valid run payload", () => {
    const result = (0, simulation_1.validateSimulationRun)(validRun);
    strict_1.default.equal(result.ok, true);
    strict_1.default.equal((0, simulation_1.isSimulationRun)(validRun), true);
});
(0, node_test_1.default)("validateSimulationRun rejects unsupported profile/status", () => {
    const invalid = {
        ...validRun,
        profile: "chaos_mode",
        status: "processing",
    };
    const result = (0, simulation_1.validateSimulationRun)(invalid);
    strict_1.default.equal(result.ok, false);
    if (!result.ok) {
        strict_1.default.ok(result.errors.some((error) => error.includes("profile")));
        strict_1.default.ok(result.errors.some((error) => error.includes("status")));
    }
});
