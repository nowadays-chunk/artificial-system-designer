import { type ValidationResult } from "./validation.ts";
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
export declare function isSimulationMetrics(value: unknown): value is SimulationMetrics;
export declare function isSimulationScorecard(value: unknown): value is SimulationScorecard;
export declare function isSimulationTick(value: unknown): value is SimulationTick;
export declare function isSimulationRun(value: unknown): value is SimulationRun;
export declare function validateSimulationRun(value: unknown): ValidationResult;
