import test from "node:test";
import assert from "node:assert/strict";
import { isSimulationRun, validateSimulationRun } from "./simulation";
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
test("validateSimulationRun accepts valid run payload", () => {
    const result = validateSimulationRun(validRun);
    assert.equal(result.ok, true);
    assert.equal(isSimulationRun(validRun), true);
});
test("validateSimulationRun rejects unsupported profile/status", () => {
    const invalid = {
        ...validRun,
        profile: "chaos_mode",
        status: "processing",
    };
    const result = validateSimulationRun(invalid);
    assert.equal(result.ok, false);
    if (!result.ok) {
        assert.ok(result.errors.some((error) => error.includes("profile")));
        assert.ok(result.errors.some((error) => error.includes("status")));
    }
});
