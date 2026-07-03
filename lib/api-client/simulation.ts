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
import { getActiveTenantId } from "./auth-headers";
import { appendAuditEvent } from "./audit";

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

const validProfiles: readonly SimulationProfile[] = [
  "normal",
  "burst",
  "regional_outage",
  "dependency_failure",
] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function createPrng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function profileMultiplier(profile: SimulationProfile) {
  if (profile === "burst") {
    return { load: 1.42, error: 1.24, latency: 1.26, resilience: 0.92 };
  }
  if (profile === "regional_outage") {
    return { load: 1.18, error: 1.48, latency: 1.44, resilience: 0.75 };
  }
  if (profile === "dependency_failure") {
    return { load: 1.08, error: 1.66, latency: 1.36, resilience: 0.8 };
  }
  return { load: 1, error: 1, latency: 1, resilience: 1 };
}

function generateTickMetrics(input: {
  tick: number;
  baseTrafficRps: number;
  nodeCount: number;
  edgeCount: number;
  profile: SimulationProfile;
  prng: () => number;
}): SimulationMetrics {
  const profile = profileMultiplier(input.profile);
  const jitter = (input.prng() - 0.5) * 0.12;
  const pulse = (Math.sin(input.tick / 2.3) + 1) / 2;
  const complexity = clamp(1 + input.edgeCount / Math.max(1, input.nodeCount * 2.2), 1, 2.2);
  const throughputRps = Math.round(input.baseTrafficRps * profile.load * (0.88 + pulse * 0.24 + jitter));
  const latencyMsP50 = Math.round(clamp(8 + complexity * 16 + pulse * 22, 5, 900) * profile.latency);
  const latencyMsP95 = Math.round(clamp(latencyMsP50 * (1.5 + complexity * 0.45), 20, 1800));
  const saturationPercent = Math.round(clamp((throughputRps / Math.max(1, input.nodeCount * 9500)) * 100, 2, 100));
  const errorRatePercent = Number(clamp((saturationPercent / 28) * profile.error + jitter * 2.5, 0, 45).toFixed(2));
  const estimatedCostPerHourUsd = Number(
    (input.nodeCount * 1.9 + input.edgeCount * 0.34 + throughputRps / 12000 + saturationPercent * 0.07).toFixed(2),
  );

  return {
    latencyMsP50,
    latencyMsP95,
    throughputRps,
    errorRatePercent,
    saturationPercent,
    estimatedCostPerHourUsd,
  };
}

function generateEvents(metrics: SimulationMetrics, profile: SimulationProfile, tick: number): string[] {
  const events: string[] = [];

  if (metrics.saturationPercent >= 90) {
    events.push("Critical saturation detected in primary path.");
  } else if (metrics.saturationPercent >= 70) {
    events.push("Hot path nearing saturation threshold.");
  } else {
    events.push("Traffic remains within operating envelope.");
  }

  if (metrics.errorRatePercent >= 8) {
    events.push("Error budget burn accelerating.");
  } else {
    events.push("Error rate remains stable.");
  }

  if (profile !== "normal") {
    events.push(`Profile ${profile} perturbation active at tick ${tick}.`);
  }

  return events.slice(0, 3);
}

function buildScorecard(allMetrics: SimulationMetrics[], profile: SimulationProfile): SimulationScorecard {
  const p95 = allMetrics.reduce((acc, metric) => acc + metric.latencyMsP95, 0) / Math.max(1, allMetrics.length);
  const saturation = allMetrics.reduce((acc, metric) => acc + metric.saturationPercent, 0) / Math.max(1, allMetrics.length);
  const errors = allMetrics.reduce((acc, metric) => acc + metric.errorRatePercent, 0) / Math.max(1, allMetrics.length);
  const cost = allMetrics.reduce((acc, metric) => acc + metric.estimatedCostPerHourUsd, 0) / Math.max(1, allMetrics.length);
  const multiplier = profileMultiplier(profile);

  const resilience = clamp(92 * multiplier.resilience - saturation * 0.4 - errors * 1.2, 0, 100);
  const security = clamp(85 - errors * 1.1, 0, 100);
  const performance = clamp(100 - p95 * 0.12 - saturation * 0.45, 0, 100);
  const costScore = clamp(100 - cost * 1.4, 0, 100);
  const overall = (resilience + security + performance + costScore) / 4;

  return {
    resilience: Number(resilience.toFixed(1)),
    security: Number(security.toFixed(1)),
    performance: Number(performance.toFixed(1)),
    cost: Number(costScore.toFixed(1)),
    overall: Number(overall.toFixed(1)),
  };
}

function buildFindings(ticks: SimulationTick[]): ValidationFinding[] {
  const latest = ticks[ticks.length - 1];
  if (!latest) {
    return [];
  }

  const findings: ValidationFinding[] = [];
  if (latest.metrics.saturationPercent >= 80) {
    findings.push({
      id: generateUUID(),
      ruleCode: "SIM_SATURATION_HIGH",
      severity: "warn",
      rationale: "Simulation indicates sustained saturation above 80%.",
      evidencePath: { nodeIds: [], edgeIds: [] },
      remediation: [
        {
          id: generateUUID(),
          label: "Scale services",
          description: "Increase capacity in the busiest path or add buffering.",
          command: "graph.scale",
          params: { mode: "horizontal" },
        },
      ],
    });
  }
  if (latest.metrics.errorRatePercent >= 10) {
    findings.push({
      id: generateUUID(),
      ruleCode: "SIM_ERROR_BUDGET_RISK",
      severity: "error",
      rationale: "Simulation error rate crosses 10% under the current profile.",
      evidencePath: { nodeIds: [], edgeIds: [] },
      remediation: [
        {
          id: generateUUID(),
          label: "Add resilience controls",
          description: "Introduce retries/backoff/circuit breakers for failing dependencies.",
          command: "graph.addNode",
          params: { suggestedType: "resilience_control" },
        },
      ],
    });
  }

  return findings;
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
  if (typeof window === "undefined") {
    return { runId: "ssr-run", status: "running" };
  }

  const graphValidation = validateGraphDocument(input.graph);
  if (!graphValidation.ok) {
    throw new Error(`invalid_graph_document:${graphValidation.errors.join(";")}`);
  }

  // Tenant Isolation check
  const tenantId = getActiveTenantId();
  const rawWorkspaces = window.localStorage.getItem("asd_sim_workspaces");
  const workspaces = rawWorkspaces ? JSON.parse(rawWorkspaces) : [];
  const workspace = workspaces.find((w: any) => w.id === input.workspaceId);
  if (workspace && workspace.tenantId !== tenantId) {
    throw new Error(`Security Exception: Access Denied to Workspace ${input.workspaceId} under Tenant ${tenantId}`);
  }

  const runId = generateUUID();
  const now = new Date().toISOString();

  // Run the simulation logic synchronously
  const trafficRps = clamp(input.trafficRps, 100, 2_000_000);
  const prng = createPrng(input.seed);
  const ticks: SimulationTick[] = [];
  for (let tick = 1; tick <= 24; tick += 1) {
    const metrics = generateTickMetrics({
      tick,
      baseTrafficRps: trafficRps,
      nodeCount: input.graph.nodes.length,
      edgeCount: input.graph.edges.length,
      profile: input.profile,
      prng,
    });
    ticks.push({
      tick,
      at: new Date(Date.now() + tick * 1000).toISOString(),
      metrics,
      events: generateEvents(metrics, input.profile, tick),
    });
  }

  const scorecard = buildScorecard(ticks.map((item) => item.metrics), input.profile);
  const finalMetrics = ticks[ticks.length - 1]?.metrics;
  const findings = buildFindings(ticks);

  const runEnvelope = {
    runId,
    workspaceId: input.workspaceId,
    tenantId,
    status: "completed" as SimulationStatus,
    metrics: finalMetrics,
    scorecard,
    ticks,
    findings,
    createdAt: now,
  };

  const rawRuns = window.localStorage.getItem("asd_sim_runs");
  const runs = rawRuns ? JSON.parse(rawRuns) : [];
  runs.push(runEnvelope);
  window.localStorage.setItem("asd_sim_runs", JSON.stringify(runs));

  // Log audit event
  appendAuditEvent("simulation.run", { workspaceId: input.workspaceId, versionId: input.versionId, runId, profile: input.profile });

  return {
    runId,
    status: "completed",
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
  if (typeof window === "undefined") {
    throw new Error("Local simulation not available in SSR mode.");
  }

  const rawRuns = window.localStorage.getItem("asd_sim_runs");
  const runs = rawRuns ? JSON.parse(rawRuns) : [];
  const envelope = runs.find((r: any) => r.runId === runId);
  if (!envelope) {
    throw new Error("simulation_run_not_found");
  }

  // Tenant Isolation check
  const tenantId = getActiveTenantId();
  if (envelope.tenantId !== tenantId) {
    throw new Error(`Security Exception: Access Denied to Simulation Run ${runId} under Tenant ${tenantId}`);
  }

  return {
    runId: envelope.runId,
    status: envelope.status,
    metrics: envelope.metrics,
    scorecard: envelope.scorecard,
    ticks: envelope.ticks,
    findings: envelope.findings,
  };
}
