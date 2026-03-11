import {
  isValidationFinding,
  type AnalysisScorecard,
  type ValidationFinding,
} from "../../packages/contracts/src/analysis";
import { validateGraphDocument, type GraphDocument } from "../../packages/contracts/src/graph";
import { authHeaders } from "./auth-headers";

const defaultApiBase = "http://localhost:4010";

function apiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? defaultApiBase;
}

async function parseJsonOrThrow(response: Response) {
  const payload = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(String(payload.error ?? "request_failed"));
  }
  return payload;
}

function isScorecard(value: unknown): value is AnalysisScorecard {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const fields = [
    candidate.resilience,
    candidate.security,
    candidate.performance,
    candidate.cost,
    candidate.maintainability,
    candidate.overall,
  ];
  return fields.every((field) => typeof field === "number" && Number.isFinite(field));
}

export async function validateArchitectureAnalysis(input: {
  graph: GraphDocument;
  workspaceId: string;
  scenarioId?: string;
}): Promise<{ reportId: string; findings: ValidationFinding[]; scorecard: AnalysisScorecard }> {
  const graphValidation = validateGraphDocument(input.graph);
  if (!graphValidation.ok) {
    throw new Error(`invalid_graph_document:${graphValidation.errors.join(";")}`);
  }

  const response = await fetch(`${apiBaseUrl()}/api/analysis/validate`, {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      graph: input.graph,
      workspaceId: input.workspaceId,
      scenarioId: input.scenarioId,
    }),
  });
  const payload = await parseJsonOrThrow(response);

  const reportId = String(payload.reportId ?? "");
  if (!reportId) {
    throw new Error("invalid_analysis_payload:missing_report_id");
  }

  const findingsRaw = Array.isArray(payload.findings) ? payload.findings : [];
  if (!findingsRaw.every((finding) => isValidationFinding(finding))) {
    throw new Error("invalid_analysis_payload:findings");
  }

  if (!isScorecard(payload.scorecard)) {
    throw new Error("invalid_analysis_payload:scorecard");
  }

  return {
    reportId,
    findings: findingsRaw,
    scorecard: payload.scorecard,
  };
}
