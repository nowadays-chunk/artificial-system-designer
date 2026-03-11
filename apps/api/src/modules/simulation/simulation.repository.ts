import { randomUUID } from "node:crypto";
import type { ValidationFinding } from "../../../../../packages/contracts/src/analysis";
import type { SimulationMetrics, SimulationRun, SimulationScorecard, SimulationTick } from "../../../../../packages/contracts/src/simulation";
import type { CreateSimulationRunInput, SimulationRunEnvelope, StoredSimulationRun } from "./simulation.types";

type SimulationRepository = {
  createSimulationRun(input: CreateSimulationRunInput): StoredSimulationRun;
  completeSimulationRun(
    runId: string,
    payload: { metrics: SimulationMetrics; scorecard: SimulationScorecard; ticks: SimulationTick[]; findings: ValidationFinding[] },
  ): StoredSimulationRun;
  getSimulationRunById(runId: string): StoredSimulationRun | null;
  getSimulationRunEnvelope(runId: string): SimulationRunEnvelope | null;
};

function createMemorySimulationRepository(): SimulationRepository {
  const runs = new Map<string, StoredSimulationRun>();
  const runSnapshots = new Map<string, SimulationTick[]>();
  const runFindings = new Map<string, ValidationFinding[]>();

  return {
    createSimulationRun(input: CreateSimulationRunInput): StoredSimulationRun {
      const now = new Date().toISOString();
      const run: StoredSimulationRun = {
        id: randomUUID(),
        workspaceId: input.workspaceId,
        versionId: input.versionId,
        scenarioId: input.scenarioId,
        seed: input.seed,
        profile: input.profile,
        status: "running",
        startedAt: now,
        graph: input.graph,
        trafficRps: input.trafficRps,
      };

      runs.set(run.id, run);
      runSnapshots.set(run.id, []);
      runFindings.set(run.id, []);
      return run;
    },
    completeSimulationRun(
      runId: string,
      payload: { metrics: SimulationMetrics; scorecard: SimulationScorecard; ticks: SimulationTick[]; findings: ValidationFinding[] },
    ) {
      const run = runs.get(runId);
      if (!run) {
        throw new Error("simulation_run_not_found");
      }

      const completed: StoredSimulationRun = {
        ...run,
        status: "completed",
        finishedAt: new Date().toISOString(),
        metrics: payload.metrics,
        scorecard: payload.scorecard,
      };

      runs.set(runId, completed);
      runSnapshots.set(runId, payload.ticks);
      runFindings.set(runId, payload.findings);
      return completed;
    },
    getSimulationRunById(runId: string): StoredSimulationRun | null {
      return runs.get(runId) ?? null;
    },
    getSimulationRunEnvelope(runId: string): SimulationRunEnvelope | null {
      const run = runs.get(runId);
      if (!run || !run.metrics || !run.scorecard) {
        return null;
      }

      return {
        run: run as SimulationRun,
        metrics: run.metrics,
        scorecard: run.scorecard,
        ticks: runSnapshots.get(runId) ?? [],
        findings: runFindings.get(runId) ?? [],
      };
    },
  };
}

const repository = createMemorySimulationRepository();

export function createSimulationRun(input: CreateSimulationRunInput): StoredSimulationRun {
  return repository.createSimulationRun(input);
}

export function completeSimulationRun(
  runId: string,
  payload: { metrics: SimulationMetrics; scorecard: SimulationScorecard; ticks: SimulationTick[]; findings: ValidationFinding[] },
) {
  return repository.completeSimulationRun(runId, payload);
}

export function getSimulationRunById(runId: string): StoredSimulationRun | null {
  return repository.getSimulationRunById(runId);
}

export function getSimulationRunEnvelope(runId: string): SimulationRunEnvelope | null {
  return repository.getSimulationRunEnvelope(runId);
}

export type { SimulationRepository };
