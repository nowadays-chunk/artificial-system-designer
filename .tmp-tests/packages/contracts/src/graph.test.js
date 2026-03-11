"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const graph_1 = require("./graph");
const validGraph = {
    schemaVersion: "1.0",
    nodes: [
        {
            id: "n1",
            type: "api_gateway",
            label: "API Gateway",
            category: "Application Layer",
            x: 100,
            y: 100,
            width: 180,
            height: 100,
            settings: { redundancy: 2, waf: true },
        },
        {
            id: "n2",
            type: "postgresql",
            label: "Primary DB",
            category: "Databases",
            x: 350,
            y: 100,
            width: 180,
            height: 100,
            settings: { backups: "enabled" },
        },
    ],
    edges: [
        {
            id: "e1",
            sourceId: "n1",
            targetId: "n2",
            protocol: "HTTPS",
            purpose: "Query writes",
        },
    ],
};
(0, node_test_1.default)("validateGraphDocument accepts a valid graph", () => {
    const result = (0, graph_1.validateGraphDocument)(validGraph);
    strict_1.default.equal(result.ok, true);
    strict_1.default.equal((0, graph_1.isGraphDocument)(validGraph), true);
});
(0, node_test_1.default)("validateGraphDocument rejects edges with unknown node ids", () => {
    const invalid = {
        ...validGraph,
        edges: [
            {
                id: "e1",
                sourceId: "n1",
                targetId: "missing",
                protocol: "HTTPS",
                purpose: "Broken link",
            },
        ],
    };
    const result = (0, graph_1.validateGraphDocument)(invalid);
    strict_1.default.equal(result.ok, false);
    if (!result.ok) {
        strict_1.default.ok(result.errors.some((error) => error.includes("unknown node")));
    }
});
