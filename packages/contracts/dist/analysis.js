import { isRecord, isString, isStringArray, mergeValidationErrors, } from "./validation.ts";
const validSeverities = ["info", "warn", "error", "blocker"];
export function isEvidencePath(value) {
    if (!isRecord(value)) {
        return false;
    }
    return isStringArray(value.nodeIds) && isStringArray(value.edgeIds);
}
export function isRemediationAction(value) {
    if (!isRecord(value) || !isRecord(value.params)) {
        return false;
    }
    return (isString(value.id) &&
        isString(value.label) &&
        isString(value.description) &&
        isString(value.command) &&
        Object.values(value.params).every(isString));
}
export function isValidationFinding(value) {
    if (!isRecord(value) || !Array.isArray(value.remediation)) {
        return false;
    }
    return (isString(value.id) &&
        isString(value.ruleCode) &&
        isString(value.severity) &&
        validSeverities.includes(value.severity) &&
        isString(value.rationale) &&
        isEvidencePath(value.evidencePath) &&
        value.remediation.every(isRemediationAction));
}
function isAnalysisScorecard(value) {
    if (!isRecord(value)) {
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
export function isAnalysisReport(value) {
    return validateAnalysisReport(value).ok;
}
export function validateAnalysisReport(value) {
    if (!isRecord(value)) {
        return { ok: false, errors: ["AnalysisReport must be an object"] };
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
    if (!isString(value.summary)) {
        errors.push("summary must be a string");
    }
    if (!isString(value.createdAt)) {
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
    return mergeValidationErrors();
}
