import {
  isRecord,
  isString,
  isStringArray,
  mergeValidationErrors,
  type ValidationResult,
} from "./validation.ts";

export type FindingSeverity = "info" | "warn" | "error" | "blocker";

export type EvidencePath = {
  nodeIds: string[];
  edgeIds: string[];
};

export type RemediationAction = {
  id: string;
  label: string;
  description: string;
  command: string;
  params: Record<string, string>;
};

export type ValidationFinding = {
  id: string;
  ruleCode: string;
  severity: FindingSeverity;
  rationale: string;
  evidencePath: EvidencePath;
  remediation: RemediationAction[];
};

export type AnalysisScorecard = {
  resilience: number;
  security: number;
  performance: number;
  cost: number;
  maintainability: number;
  overall: number;
};

export type AnalysisReport = {
  id: string;
  workspaceId: string;
  versionId: string;
  summary: string;
  findings: ValidationFinding[];
  scorecard: AnalysisScorecard;
  createdAt: string;
};

const validSeverities: readonly FindingSeverity[] = ["info", "warn", "error", "blocker"] as const;

export function isEvidencePath(value: unknown): value is EvidencePath {
  if (!isRecord(value)) {
    return false;
  }
  return isStringArray(value.nodeIds) && isStringArray(value.edgeIds);
}

export function isRemediationAction(value: unknown): value is RemediationAction {
  if (!isRecord(value) || !isRecord(value.params)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.label) &&
    isString(value.description) &&
    isString(value.command) &&
    Object.values(value.params).every(isString)
  );
}

export function isValidationFinding(value: unknown): value is ValidationFinding {
  if (!isRecord(value) || !Array.isArray(value.remediation)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.ruleCode) &&
    isString(value.severity) &&
    validSeverities.includes(value.severity as FindingSeverity) &&
    isString(value.rationale) &&
    isEvidencePath(value.evidencePath) &&
    value.remediation.every(isRemediationAction)
  );
}

function isAnalysisScorecard(value: unknown): value is AnalysisScorecard {
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

export function isAnalysisReport(value: unknown): value is AnalysisReport {
  return validateAnalysisReport(value).ok;
}

export function validateAnalysisReport(value: unknown): ValidationResult {
  if (!isRecord(value)) {
    return { ok: false, errors: ["AnalysisReport must be an object"] };
  }

  const errors: string[] = [];

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
