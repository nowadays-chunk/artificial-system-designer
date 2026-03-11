import { isNumber, isRecord, isString, mergeValidationErrors } from "./validation.ts";
const validProfiles = [
    "normal",
    "burst",
    "regional_outage",
    "dependency_failure",
];
const validStatuses = [
    "queued",
    "running",
    "completed",
    "failed",
];
export function isSimulationMetrics(value) {
    if (!isRecord(value)) {
        return false;
    }
    return (isNumber(value.latencyMsP50) &&
        isNumber(value.latencyMsP95) &&
        isNumber(value.throughputRps) &&
        isNumber(value.errorRatePercent) &&
        isNumber(value.saturationPercent) &&
        isNumber(value.estimatedCostPerHourUsd));
}
export function isSimulationScorecard(value) {
    if (!isRecord(value)) {
        return false;
    }
    return (isNumber(value.resilience) &&
        isNumber(value.security) &&
        isNumber(value.performance) &&
        isNumber(value.cost) &&
        isNumber(value.overall));
}
export function isSimulationTick(value) {
    if (!isRecord(value)) {
        return false;
    }
    return (isNumber(value.tick) &&
        isString(value.at) &&
        isSimulationMetrics(value.metrics) &&
        Array.isArray(value.events) &&
        value.events.every(isString));
}
export function isSimulationRun(value) {
    return validateSimulationRun(value).ok;
}
export function validateSimulationRun(value) {
    if (!isRecord(value)) {
        return { ok: false, errors: ["SimulationRun must be an object"] };
    }
    const errors = [];
    if (!isString(value.id)) {
        errors.push("id must be a string");
    }
    if (!isString(value.workspaceId)) {
        errors.push("workspaceId must be a string");
    }
    if (!isString(value.versionId)) {
        errors.push("versionId must be a string");
    }
    if (!isString(value.scenarioId)) {
        errors.push("scenarioId must be a string");
    }
    if (!isNumber(value.seed)) {
        errors.push("seed must be a number");
    }
    if (!isString(value.startedAt)) {
        errors.push("startedAt must be a string");
    }
    if (!isString(value.profile) || !validProfiles.includes(value.profile)) {
        errors.push(`profile must be one of: ${validProfiles.join(", ")}`);
    }
    if (!isString(value.status) || !validStatuses.includes(value.status)) {
        errors.push(`status must be one of: ${validStatuses.join(", ")}`);
    }
    if (value.finishedAt !== undefined && !isString(value.finishedAt)) {
        errors.push("finishedAt must be a string when provided");
    }
    if (value.metrics !== undefined && !isSimulationMetrics(value.metrics)) {
        errors.push("metrics must be a valid SimulationMetrics object");
    }
    if (value.scorecard !== undefined && !isSimulationScorecard(value.scorecard)) {
        errors.push("scorecard must be a valid SimulationScorecard object");
    }
    if (errors.length > 0) {
        return { ok: false, errors };
    }
    return mergeValidationErrors();
}
