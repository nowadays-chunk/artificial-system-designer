"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const analysis_1 = require("../../packages/contracts/src/analysis");
const graph_1 = require("../../packages/contracts/src/graph");
const simulation_1 = require("../../packages/contracts/src/simulation");
(0, node_test_1.default)("GraphDocument contract accepts valid graph payload", () => {
    const graph = {
        schemaVersion: "1.0",
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
    const result = (0, graph_1.validateGraphDocument)(graph);
    strict_1.default.equal(result.ok, true);
});
(0, node_test_1.default)("SimulationRun contract validates required fields", () => {
    const run = {
        id: "run-1",
        workspaceId: "workspace-1",
        versionId: "version-1",
        scenarioId: "scenario-1",
        seed: 42,
        profile: "normal",
        status: "completed",
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
    const result = (0, simulation_1.validateSimulationRun)(run);
    strict_1.default.equal(result.ok, true);
});
(0, node_test_1.default)("AnalysisReport contract rejects malformed payload", () => {
    const result = (0, analysis_1.validateAnalysisReport)({
        id: "r1",
        workspaceId: "w1",
        versionId: "v1",
        summary: "bad payload",
        createdAt: new Date().toISOString(),
        findings: [{ id: "f1" }],
        scorecard: {},
    });
    strict_1.default.equal(result.ok, false);
    strict_1.default.ok(result.errors.length > 0);
});
