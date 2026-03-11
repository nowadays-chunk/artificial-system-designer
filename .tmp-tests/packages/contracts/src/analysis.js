"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEvidencePath = isEvidencePath;
exports.isRemediationAction = isRemediationAction;
exports.isValidationFinding = isValidationFinding;
exports.isAnalysisReport = isAnalysisReport;
exports.validateAnalysisReport = validateAnalysisReport;
const validation_1 = require("./validation");
const validSeverities = ["info", "warn", "error", "blocker"];
function isEvidencePath(value) {
    if (!(0, validation_1.isRecord)(value)) {
        return false;
    }
    return (0, validation_1.isStringArray)(value.nodeIds) && (0, validation_1.isStringArray)(value.edgeIds);
}
function isRemediationAction(value) {
    if (!(0, validation_1.isRecord)(value) || !(0, validation_1.isRecord)(value.params)) {
        return false;
    }
    return ((0, validation_1.isString)(value.id) &&
        (0, validation_1.isString)(value.label) &&
        (0, validation_1.isString)(value.description) &&
        (0, validation_1.isString)(value.command) &&
        Object.values(value.params).every(validation_1.isString));
}
function isValidationFinding(value) {
    if (!(0, validation_1.isRecord)(value) || !Array.isArray(value.remediation)) {
        return false;
    }
    return ((0, validation_1.isString)(value.id) &&
        (0, validation_1.isString)(value.ruleCode) &&
        (0, validation_1.isString)(value.severity) &&
        validSeverities.includes(value.severity) &&
        (0, validation_1.isString)(value.rationale) &&
        isEvidencePath(value.evidencePath) &&
        value.remediation.every(isRemediationAction));
}
function isAnalysisScorecard(value) {
    if (!(0, validation_1.isRecord)(value)) {
        return false;
    }
    const numericFields = [
        value.resilience,
        value.security,
        value.performance,
        value.cost,
        value.maintainability,
        value.overall,
    ];
    return numericFields.every((field) => typeof field === "number" && Number.isFinite(field));
}
function isAnalysisReport(value) {
    return validateAnalysisReport(value).ok;
}
function validateAnalysisReport(value) {
    if (!(0, validation_1.isRecord)(value)) {
        return { ok: false, errors: ["AnalysisReport must be an object"] };
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
    if (!(0, validation_1.isString)(value.summary)) {
        errors.push("summary must be a string");
    }
    if (!(0, validation_1.isString)(value.createdAt)) {
        errors.push("createdAt must be a string");
    }
    if (!Array.isArray(value.findings)) {
        errors.push("findings must be an array");
    }
    if (!isAnalysisScorecard(value.scorecard)) {
        errors.push("scorecard must be a valid AnalysisScorecard");
    }
    if (Array.isArray(value.findings)) {
        value.findings.forEach((finding, index) => {
            if (!isValidationFinding(finding)) {
                errors.push(`findings[${index}] is not a valid ValidationFinding`);
            }
        });
    }
    if (errors.length > 0) {
        return { ok: false, errors };
    }
    return (0, validation_1.mergeValidationErrors)();
}
