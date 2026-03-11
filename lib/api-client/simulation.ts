import { isValidationFinding, type ValidationFinding } from "../../packages/contracts/src/analysis";
import { validateGraphDocument, type GraphDocument } from "../../packages/contracts/src/graph";
import {
  isSimulationMetrics,
  isSimulationScorecard,
  isSimulationTick,
  type SimulationMetrics,
  type SimulationProfile,
  type SimulationScorecard,
  type SimulationStatus,
  type SimulationTick,
} from "../../packages/contracts/src/simulation";

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

export async function createSimulationRun(input: {
  workspaceId: string;
  versionId: string;
  scenarioId: string;
  seed: number;
  profile: SimulationProfile;
  graph: GraphDocument;
  trafficRps: number;
}): Promise<{ runId: string; status: "queued" | "running" }> {
  const graphValidation = validateGraphDocument(input.graph);
  if (!graphValidation.ok) {
    throw new Error(`invalid_graph_document:${graphValidation.errors.join(";")}`);
  }

  const response = await fetch(`${apiBaseUrl()}/api/simulations/runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await parseJsonOrThrow(response);
  return {
    runId: String(payload.runId),
    status: payload.status === "queued" ? "queued" : "running",
  };
}

export async function getSimulationRun(runId: string): Promise<{
  runId: string;
  status: SimulationStatus;
  metrics: SimulationMetrics;
  scorecard: SimulationScorecard;
  ticks: SimulationTick[];
  findings: ValidationFinding[];
}> {
  const response = await fetch(`${apiBaseUrl()}/api/simulations/runs/${runId}`);
  const payload = await parseJsonOrThrow(response);

  const metrics = payload.metrics;
  const scorecard = payload.scorecard;
  const ticks = Array.isArray(payload.ticks) ? payload.ticks : [];
  const findings = Array.isArray(payload.findings) ? payload.findings : [];

  if (!isSimulationMetrics(metrics)) {
    throw new Error("invalid_simulation_payload:metrics");
  }
  if (!isSimulationScorecard(scorecard)) {
    throw new Error("invalid_simulation_payload:scorecard");
  }
  if (!ticks.every((tick) => isSimulationTick(tick))) {
    throw new Error("invalid_simulation_payload:ticks");
  }
  if (!findings.every((finding) => isValidationFinding(finding))) {
    throw new Error("invalid_simulation_payload:findings");
  }

  return {
    runId: String(payload.runId),
    status: String(payload.status) as SimulationStatus,
    metrics,
    scorecard,
    ticks,
    findings,
  };
}
