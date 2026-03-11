import { type ValidationResult } from "./validation.ts";
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
export declare function isEvidencePath(value: unknown): value is EvidencePath;
export declare function isRemediationAction(value: unknown): value is RemediationAction;
export declare function isValidationFinding(value: unknown): value is ValidationFinding;
export declare function isAnalysisReport(value: unknown): value is AnalysisReport;
export declare function validateAnalysisReport(value: unknown): ValidationResult;
