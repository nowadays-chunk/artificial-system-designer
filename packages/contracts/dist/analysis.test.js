import test from "node:test";
import assert from "node:assert/strict";
import { isAnalysisReport, validateAnalysisReport } from "./analysis";
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
test("validateAnalysisReport accepts valid report payload", () => {
    const result = validateAnalysisReport(validReport);
    assert.equal(result.ok, true);
    assert.equal(isAnalysisReport(validReport), true);
});
test("validateAnalysisReport rejects malformed findings", () => {
    const invalid = {
        ...validReport,
        findings: [
            {
                ...validReport.findings[0],
                severity: "critical",
            },
        ],
    };
    const result = validateAnalysisReport(invalid);
    assert.equal(result.ok, false);
    if (!result.ok) {
        assert.ok(result.errors.some((error) => error.includes("findings[0]")));
    }
});
