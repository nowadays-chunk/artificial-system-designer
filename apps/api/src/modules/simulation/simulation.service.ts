import { randomUUID } from "node:crypto";
import type { ValidationFinding } from "@asd/contracts/analysis";
import { validateGraphDocument } from "@asd/contracts/graph";
import type {
  SimulationMetrics,
  SimulationProfile,
  SimulationScorecard,
  SimulationTick,
} from "@asd/contracts/simulation";
import { completeSimulationRun, createSimulationRun, getSimulationRunEnvelope } from "./simulation.repository";
import type { CreateSimulationRunInput, SimulationRunEnvelope } from "./simulation.types";

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
      id: randomUUID(),
      ruleCode: "SIM_SATURATION_HIGH",
      severity: "warn",
      rationale: "Simulation indicates sustained saturation above 80%.",
      evidencePath: { nodeIds: [], edgeIds: [] },
      remediation: [
        {
          id: randomUUID(),
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
      id: randomUUID(),
      ruleCode: "SIM_ERROR_BUDGET_RISK",
      severity: "error",
      rationale: "Simulation error rate crosses 10% under the current profile.",
      evidencePath: { nodeIds: [], edgeIds: [] },
      remediation: [
        {
          id: randomUUID(),
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

export function createSimulationRunService(input: {
  workspaceId: unknown;
  versionId: unknown;
  scenarioId: unknown;
  seed: unknown;
  profile: unknown;
  graph: unknown;
  trafficRps?: unknown;
}): { runId: string; status: "queued" | "running" } {
  if (typeof input.workspaceId !== "string" || input.workspaceId.length === 0) {
    throw new Error("invalid_workspace_id");
  }
  if (typeof input.versionId !== "string" || input.versionId.length === 0) {
    throw new Error("invalid_version_id");
  }
  if (typeof input.scenarioId !== "string" || input.scenarioId.length === 0) {
    throw new Error("invalid_scenario_id");
  }
  if (typeof input.seed !== "number" || !Number.isFinite(input.seed)) {
    throw new Error("invalid_seed");
  }
  if (typeof input.profile !== "string" || !validProfiles.includes(input.profile as SimulationProfile)) {
    throw new Error("invalid_profile");
  }

  const graphValidation = validateGraphDocument(input.graph);
  if (!graphValidation.ok) {
    throw new Error(`invalid_graph_document:${graphValidation.errors.join(";")}`);
  }

  const trafficRps =
    typeof input.trafficRps === "number" && Number.isFinite(input.trafficRps)
      ? clamp(input.trafficRps, 100, 2_000_000)
      : 20_000;

  const run = createSimulationRun({
    workspaceId: input.workspaceId,
    versionId: input.versionId,
    scenarioId: input.scenarioId,
    seed: input.seed,
    profile: input.profile as SimulationProfile,
    graph: input.graph as CreateSimulationRunInput["graph"],
    trafficRps,
  });

  const prng = createPrng(input.seed);
  const ticks: SimulationTick[] = [];
  for (let tick = 1; tick <= 24; tick += 1) {
    const metrics = generateTickMetrics({
      tick,
      baseTrafficRps: trafficRps,
      nodeCount: run.graph.nodes.length,
      edgeCount: run.graph.edges.length,
      profile: run.profile,
      prng,
    });
    ticks.push({
      tick,
      at: new Date(Date.now() + tick * 1000).toISOString(),
      metrics,
      events: generateEvents(metrics, run.profile, tick),
    });
  }

  const scorecard = buildScorecard(ticks.map((item) => item.metrics), run.profile);
  const finalMetrics = ticks[ticks.length - 1]?.metrics ?? {
    latencyMsP50: 0,
    latencyMsP95: 0,
    throughputRps: 0,
    errorRatePercent: 0,
    saturationPercent: 0,
    estimatedCostPerHourUsd: 0,
  };
  const findings = buildFindings(ticks);

  completeSimulationRun(run.id, {
    metrics: finalMetrics,
    scorecard,
    ticks,
    findings,
  });

  return {
    runId: run.id,
    status: "running",
  };
}

export function getSimulationRunService(runId: string): SimulationRunEnvelope {
  const envelope = getSimulationRunEnvelope(runId);
  if (!envelope) {
    throw new Error("simulation_run_not_found");
  }
  return envelope;
}
