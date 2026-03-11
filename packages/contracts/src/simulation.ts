import { isNumber, isRecord, isString, mergeValidationErrors, type ValidationResult } from "./validation.ts";

export type SimulationProfile = "normal" | "burst" | "regional_outage" | "dependency_failure";
export type SimulationStatus = "queued" | "running" | "completed" | "failed";

export type SimulationScorecard = {
  resilience: number;
  security: number;
  performance: number;
  cost: number;
  overall: number;
};

export type SimulationMetrics = {
  latencyMsP50: number;
  latencyMsP95: number;
  throughputRps: number;
  errorRatePercent: number;
  saturationPercent: number;
  estimatedCostPerHourUsd: number;
};

export type SimulationTick = {
  tick: number;
  at: string;
  metrics: SimulationMetrics;
  events: string[];
};

export type SimulationRun = {
  id: string;
  workspaceId: string;
  versionId: string;
  scenarioId: string;
  seed: number;
  profile: SimulationProfile;
  status: SimulationStatus;
  startedAt: string;
  finishedAt?: string;
  metrics?: SimulationMetrics;
  scorecard?: SimulationScorecard;
};

const validProfiles: readonly SimulationProfile[] = [
  "normal",
  "burst",
  "regional_outage",
  "dependency_failure",
] as const;

const validStatuses: readonly SimulationStatus[] = [
  "queued",
  "running",
  "completed",
  "failed",
] as const;

export function isSimulationMetrics(value: unknown): value is SimulationMetrics {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNumber(value.latencyMsP50) &&
    isNumber(value.latencyMsP95) &&
    isNumber(value.throughputRps) &&
    isNumber(value.errorRatePercent) &&
    isNumber(value.saturationPercent) &&
    isNumber(value.estimatedCostPerHourUsd)
  );
}

export function isSimulationScorecard(value: unknown): value is SimulationScorecard {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNumber(value.resilience) &&
    isNumber(value.security) &&
    isNumber(value.performance) &&
    isNumber(value.cost) &&
    isNumber(value.overall)
  );
}

export function isSimulationTick(value: unknown): value is SimulationTick {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNumber(value.tick) &&
    isString(value.at) &&
    isSimulationMetrics(value.metrics) &&
    Array.isArray(value.events) &&
    value.events.every(isString)
  );
}

export function isSimulationRun(value: unknown): value is SimulationRun {
  return validateSimulationRun(value).ok;
}

export function validateSimulationRun(value: unknown): ValidationResult {
  if (!isRecord(value)) {
    return { ok: false, errors: ["SimulationRun must be an object"] };
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
  if (!isString(value.scenarioId)) {
    errors.push("scenarioId must be a string");
  }
  if (!isNumber(value.seed)) {
    errors.push("seed must be a number");
  }
  if (!isString(value.startedAt)) {
    errors.push("startedAt must be a string");
  }

  if (!isString(value.profile) || !validProfiles.includes(value.profile as SimulationProfile)) {
    errors.push(`profile must be one of: ${validProfiles.join(", ")}`);
  }

  if (!isString(value.status) || !validStatuses.includes(value.status as SimulationStatus)) {
    errors.push(`status must be one of: ${validStatuses.join(", ")}`);
  }

  if (value.finishedAt !== undefined && !isString(value.finishedAt)) {
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

  return mergeValidationErrors();
}
