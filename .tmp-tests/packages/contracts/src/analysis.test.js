"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const analysis_1 = require("./analysis");
const validReport = {
    id: "report_001",
    workspaceId: "ws_001",
    versionId: "v_001",
    summary: "Topology has one critical path bottleneck.",
    createdAt: "2026-03-11T00:00:00.000Z",
    scorecard: {
        resilience: 72,
        security: 80,
        performance: 61,
        cost: 68,
        maintainability: 75,
        overall: 71,
    },
    findings: [
        {
            id: "finding_001",
            ruleCode: "SPOF_DB",
            severity: "error",
            rationale: "Primary DB has no replica in another zone.",
            evidencePath: {
                nodeIds: ["db_primary"],
                edgeIds: [],
            },
            remediation: [
                {
                    id: "action_001",
                    label: "Add read replica",
                    description: "Provision a replica in a different failure domain.",
                    command: "graph.node.addReplica",
                    params: { sourceNodeId: "db_primary" },
                },
            ],
        },
    ],
};
(0, node_test_1.default)("validateAnalysisReport accepts valid report payload", () => {
    const result = (0, analysis_1.validateAnalysisReport)(validReport);
    strict_1.default.equal(result.ok, true);
    strict_1.default.equal((0, analysis_1.isAnalysisReport)(validReport), true);
});
(0, node_test_1.default)("validateAnalysisReport rejects malformed findings", () => {
    const invalid = {
        ...validReport,
        findings: [
            {
                ...validReport.findings[0],
                severity: "critical",
            },
        ],
    };
    const result = (0, analysis_1.validateAnalysisReport)(invalid);
    strict_1.default.equal(result.ok, false);
    if (!result.ok) {
        strict_1.default.ok(result.errors.some((error) => error.includes("findings[0]")));
    }
});
