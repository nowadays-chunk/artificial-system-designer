"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSimulationMetrics = isSimulationMetrics;
exports.isSimulationScorecard = isSimulationScorecard;
exports.isSimulationTick = isSimulationTick;
exports.isSimulationRun = isSimulationRun;
exports.validateSimulationRun = validateSimulationRun;
const validation_1 = require("./validation");
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
function isSimulationMetrics(value) {
    if (!(0, validation_1.isRecord)(value)) {
        return false;
    }
    return ((0, validation_1.isNumber)(value.latencyMsP50) &&
        (0, validation_1.isNumber)(value.latencyMsP95) &&
        (0, validation_1.isNumber)(value.throughputRps) &&
        (0, validation_1.isNumber)(value.errorRatePercent) &&
        (0, validation_1.isNumber)(value.saturationPercent) &&
        (0, validation_1.isNumber)(value.estimatedCostPerHourUsd));
}
function isSimulationScorecard(value) {
    if (!(0, validation_1.isRecord)(value)) {
        return false;
    }
    return ((0, validation_1.isNumber)(value.resilience) &&
        (0, validation_1.isNumber)(value.security) &&
        (0, validation_1.isNumber)(value.performance) &&
        (0, validation_1.isNumber)(value.cost) &&
        (0, validation_1.isNumber)(value.overall));
}
function isSimulationTick(value) {
    if (!(0, validation_1.isRecord)(value)) {
        return false;
    }
    return ((0, validation_1.isNumber)(value.tick) &&
        (0, validation_1.isString)(value.at) &&
        isSimulationMetrics(value.metrics) &&
        Array.isArray(value.events) &&
        value.events.every(validation_1.isString));
}
function isSimulationRun(value) {
    return validateSimulationRun(value).ok;
}
function validateSimulationRun(value) {
    if (!(0, validation_1.isRecord)(value)) {
        return { ok: false, errors: ["SimulationRun must be an object"] };
    }
    const errors = [];
    if (!(0, validation_1.isString)(value.id)) {
        errors.push("id must be a string");
    }
    if (!(0, validation_1.isString)(value.workspaceId)) {
        errors.push("workspaceId must be a string");
    }
    if (!(0, validation_1.isString)(value.versionId)) {
        errors.push("versionId must be a string");
    }
    if (!(0, validation_1.isString)(value.scenarioId)) {
        errors.push("scenarioId must be a string");
    }
    if (!(0, validation_1.isNumber)(value.seed)) {
        errors.push("seed must be a number");
    }
    if (!(0, validation_1.isString)(value.startedAt)) {
        errors.push("startedAt must be a string");
    }
    if (!(0, validation_1.isString)(value.profile) || !validProfiles.includes(value.profile)) {
        errors.push(`profile must be one of: ${validProfiles.join(", ")}`);
    }
    if (!(0, validation_1.isString)(value.status) || !validStatuses.includes(value.status)) {
        errors.push(`status must be one of: ${validStatuses.join(", ")}`);
    }
    if (value.finishedAt !== undefined && !(0, validation_1.isString)(value.finishedAt)) {
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
    return (0, validation_1.mergeValidationErrors)();
}
