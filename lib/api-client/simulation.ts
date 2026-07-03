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
  graph: GraphDocument;
  profile: SimulationProfile;
  prng: () => number;
  chaos?: string[];
}): SimulationMetrics {
  const nodeCount = input.graph.nodes.length;
  const edgeCount = input.graph.edges.length;

  const hasWaf = input.graph.nodes.some(n => n.type === "waf");
  const hasCdn = input.graph.nodes.some(n => n.type === "cdn");
  const hasCache = input.graph.nodes.some(n => n.type === "cache");
  const hasQueue = input.graph.nodes.some(n => n.type === "queue");

  const dbNodes = input.graph.nodes.filter(n => n.type === "database");
  const hasDbReplica = dbNodes.length > 1;

  let lambdaToDbDirect = false;
  input.graph.edges.forEach((edge) => {
    const src = input.graph.nodes.find(n => n.id === edge.sourceId);
    const tgt = input.graph.nodes.find(n => n.id === edge.targetId);
    if (src?.type === "lambda" && tgt?.type === "database") {
      lambdaToDbDirect = true;
    }
  });

  let totalReplicas = 0;
  let computeNodesCount = 0;
  let totalRam = 0;
  let totalIops = 0;
  let dbCount = 0;

  input.graph.nodes.forEach((n) => {
    const isCompute = /service|api|gateway|compute|worker|backend|auth|bff|function/i.test(`${n.type} ${n.label}`);
    const isStateful = /data|db|database|postgres|mysql|mongo|dynamo|spanner|redis|cache/i.test(`${n.type} ${n.label}`);
    if (isCompute) {
      computeNodesCount++;
      const reps = typeof n.settings?.replicas === "number" ? n.settings.replicas : 1;
      totalReplicas += reps;
    } else if (isStateful) {
      dbCount++;
      const r = typeof n.settings?.ram === "number" ? n.settings.ram : 4;
      const i = typeof n.settings?.iops === "number" ? n.settings.iops : 1000;
      totalRam += r;
      totalIops += i;
    }
  });

  const computeScaleFactor = computeNodesCount > 0 ? (totalReplicas / computeNodesCount) : 1;
  const averageRam = dbCount > 0 ? (totalRam / dbCount) : 4;
  const averageIops = dbCount > 0 ? (totalIops / dbCount) : 1000;

  const ramLatencyFactor = Math.max(0.4, 1 - (averageRam - 4) * 0.005);
  const iopsSaturationFactor = Math.max(0.3, 1 - (averageIops - 1000) * 0.0001);

  const profile = profileMultiplier(input.profile);
  const jitter = (input.prng() - 0.5) * 0.12;
  const pulse = (Math.sin(input.tick / 2.3) + 1) / 2;
  const complexity = clamp(1 + edgeCount / Math.max(1, nodeCount * 2.2), 1, 2.2);

  const isDbOutage = input.chaos?.includes("db_outage") ?? false;
  const isCacheEviction = input.chaos?.includes("cache_eviction") ?? false;
  const isNetworkDelay = input.chaos?.includes("network_delay") ?? false;

  let saturationBase = (input.baseTrafficRps / Math.max(1, nodeCount * 9500 * computeScaleFactor)) * 100;
  if (hasCdn) saturationBase *= 0.72;
  if (hasCache) saturationBase *= 0.85;
  if (!hasDbReplica && dbNodes.length > 0) saturationBase *= 1.22;
  saturationBase *= iopsSaturationFactor;
  if (isCacheEviction) saturationBase *= 1.35;
  if (isDbOutage) saturationBase = 100;

  const saturationPercent = Math.round(clamp(saturationBase * profile.load * (0.95 + jitter * 0.5), 2, 100));

  let baseLatency = 8 + complexity * 16 + pulse * 22;
  if (hasCdn) baseLatency *= 0.75;
  if (hasCache) baseLatency *= 0.60;
  if (lambdaToDbDirect) baseLatency += 180;
  baseLatency *= ramLatencyFactor;
  if (isCacheEviction) baseLatency *= 2.2;
  if (isNetworkDelay) baseLatency += 450;
  if (isDbOutage) baseLatency += 1500;

  const latencyMsP50 = Math.round(clamp(baseLatency, 5, 2500) * profile.latency);
  const latencyMsP95 = Math.round(clamp(latencyMsP50 * (1.5 + complexity * 0.45), 20, 5000));

  const throughputRps = Math.round(input.baseTrafficRps * profile.load * (0.88 + pulse * 0.24 + jitter));

  let errorRateBase = saturationPercent / 28;
  if (hasQueue) errorRateBase *= 0.65;
  if (hasWaf) errorRateBase *= 0.90;
  if (isDbOutage) errorRateBase = 90;

  const errorRatePercent = Number(clamp(errorRateBase * profile.error + jitter * 2.5, 0, 100).toFixed(2));

  let provisionedCost = 0;
  input.graph.nodes.forEach((n) => {
    const isCompute = /service|api|gateway|compute|worker|backend|auth|bff|function/i.test(`${n.type} ${n.label}`);
    const isStateful = /data|db|database|postgres|mysql|mongo|dynamo|spanner|redis|cache/i.test(`${n.type} ${n.label}`);
    if (isCompute) {
      const reps = typeof n.settings?.replicas === "number" ? n.settings.replicas : 1;
      provisionedCost += (reps * 15) / 730;
    } else if (isStateful) {
      const r = typeof n.settings?.ram === "number" ? n.settings.ram : 4;
      const i = typeof n.settings?.iops === "number" ? n.settings.iops : 1000;
      provisionedCost += (30 + (r * 4) + (i * 0.02)) / 730;
    } else {
      provisionedCost += 10 / 730;
    }
  });

  const estimatedCostPerHourUsd = Number(
    (provisionedCost + edgeCount * 0.34 + throughputRps / 12000 + saturationPercent * 0.07 + (hasWaf ? 0.85 : 0)).toFixed(2),
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

function buildScorecard(allMetrics: SimulationMetrics[], profile: SimulationProfile, graph: GraphDocument): SimulationScorecard {
  const p95 = allMetrics.reduce((acc, metric) => acc + metric.latencyMsP95, 0) / Math.max(1, allMetrics.length);
  const saturation = allMetrics.reduce((acc, metric) => acc + metric.saturationPercent, 0) / Math.max(1, allMetrics.length);
  const errors = allMetrics.reduce((acc, metric) => acc + metric.errorRatePercent, 0) / Math.max(1, allMetrics.length);
  const cost = allMetrics.reduce((acc, metric) => acc + metric.estimatedCostPerHourUsd, 0) / Math.max(1, allMetrics.length);
  const multiplier = profileMultiplier(profile);

  const hasWaf = graph.nodes.some(n => n.type === "waf");
  const hasDbReplica = graph.nodes.filter(n => n.type === "database").length > 1;
  const hasQueue = graph.nodes.some(n => n.type === "queue");

  const resilience = clamp(92 * multiplier.resilience - saturation * 0.4 - errors * 1.2 + (hasQueue ? 8 : 0) + (hasDbReplica ? 6 : 0), 0, 100);
  
  const maxSecurity = hasWaf ? 100 : 60;
  const security = clamp(Math.min(maxSecurity, 85 - errors * 1.1 + (hasWaf ? 12 : 0)), 0, 100);

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
  chaos?: string[];
  trafficProfile?: "flat" | "diurnal" | "spikes";
}): Promise<{ runId: string; status: "queued" | "running" | "completed" }> {
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
    let currentRps = trafficRps;
    if (input.trafficProfile === "diurnal") {
      currentRps = Math.round(trafficRps * (0.65 + Math.sin(tick / 3.8) * 0.35));
    } else if (input.trafficProfile === "spikes") {
      if (tick % 6 === 0) {
        currentRps = trafficRps * 3.2;
      } else {
        currentRps = Math.round(trafficRps * 0.75);
      }
    }

    const metrics = generateTickMetrics({
      tick,
      baseTrafficRps: currentRps,
      graph: input.graph,
      profile: input.profile,
      prng,
      chaos: input.chaos,
    });
    ticks.push({
      tick,
      at: new Date(Date.now() + tick * 1000).toISOString(),
      metrics,
      events: generateEvents(metrics, input.profile, tick),
    });
  }

  const scorecard = buildScorecard(ticks.map((item) => item.metrics), input.profile, input.graph);
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
