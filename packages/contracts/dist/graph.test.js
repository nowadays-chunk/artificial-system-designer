import test from "node:test";
import assert from "node:assert/strict";
import { isGraphDocument, validateGraphDocument } from "./graph";
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
test("validateGraphDocument accepts a valid graph", () => {
    const result = validateGraphDocument(validGraph);
    assert.equal(result.ok, true);
    assert.equal(isGraphDocument(validGraph), true);
});
test("validateGraphDocument rejects edges with unknown node ids", () => {
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
    const result = validateGraphDocument(invalid);
    assert.equal(result.ok, false);
    if (!result.ok) {
        assert.ok(result.errors.some((error) => error.includes("unknown node")));
    }
});
