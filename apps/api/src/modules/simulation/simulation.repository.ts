import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import type { ValidationFinding } from "../../../../../packages/contracts/src/analysis";
import type {
  SimulationMetrics,
  SimulationRun,
  SimulationScorecard,
  SimulationTick,
} from "../../../../../packages/contracts/src/simulation";
import { readDbConfigFromEnv } from "../../lib/db/config";
import type {
  CreateSimulationRunInput,
  SimulationRunEnvelope,
  StoredSimulationRun,
} from "./simulation.types";

type SimulationRepository = {
  createSimulationRun(input: CreateSimulationRunInput): StoredSimulationRun;
  completeSimulationRun(
    runId: string,
    payload: {
      metrics: SimulationMetrics;
      scorecard: SimulationScorecard;
      ticks: SimulationTick[];
      findings: ValidationFinding[];
    },
  ): StoredSimulationRun;
  getSimulationRunById(runId: string): StoredSimulationRun | null;
  getSimulationRunEnvelope(runId: string): SimulationRunEnvelope | null;
};

function escapeSqlLiteral(value: string) {
  return value.replace(/'/g, "''");
}

function runPsql(databaseUrl: string, sql: string): string[] {
  const result = spawnSync(
    "psql",
    [databaseUrl, "-v", "ON_ERROR_STOP=1", "-t", "-A", "-q", "-c", sql],
    { encoding: "utf8", windowsHide: true },
  );

  if (result.error) {
    throw new Error(`db_exec_failed:${result.error.message}`);
  }
  if (result.status !== 0) {
    const stderr = String(result.stderr ?? "").trim();
    throw new Error(`db_exec_failed:${stderr || `exit_${result.status}`}`);
  }

  return String(result.stdout ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function querySingleJson<T>(databaseUrl: string, sql: string): T | null {
  const rows = runPsql(databaseUrl, sql);
  if (rows.length === 0) {
    return null;
  }
  return JSON.parse(rows[0]) as T;
}

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
      payload: {
        metrics: SimulationMetrics;
        scorecard: SimulationScorecard;
        ticks: SimulationTick[];
        findings: ValidationFinding[];
      },
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

type SimulationRow = {
  id: string;
  workspaceId: string;
  versionId: string;
  scenarioId: string;
  seed: number;
  profile: StoredSimulationRun["profile"];
  status: StoredSimulationRun["status"];
  startedAt: string;
  finishedAt?: string;
  metricsJson?: Record<string, unknown>;
};

function querySimulationRowById(databaseUrl: string, runId: string): SimulationRow | null {
  const escapedRunId = escapeSqlLiteral(runId);
  const sql = `
    SELECT row_to_json(mapped)::text
    FROM (
      SELECT
        id::text AS id,
        workspace_id::text AS "workspaceId",
        version_id::text AS "versionId",
        scenario_id AS "scenarioId",
        seed,
        profile,
        status,
        started_at::text AS "startedAt",
        finished_at::text AS "finishedAt",
        metrics_json AS "metricsJson"
      FROM ScenarioRun
      WHERE id = '${escapedRunId}'::uuid
      LIMIT 1
    ) mapped;
  `;
  return querySingleJson<SimulationRow>(databaseUrl, sql);
}

function parseStoredGraph(value: unknown): StoredSimulationRun["graph"] {
  if (value && typeof value === "object") {
    return value as StoredSimulationRun["graph"];
  }
  return { schemaVersion: "1.0", nodes: [], edges: [] };
}

function parseTrafficRps(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function createPostgresSimulationRepository(databaseUrl: string): SimulationRepository {
  return {
    createSimulationRun(input: CreateSimulationRunInput): StoredSimulationRun {
      const runId = randomUUID();
      const escapedRunId = escapeSqlLiteral(runId);
      const escapedWorkspaceId = escapeSqlLiteral(input.workspaceId);
      const escapedVersionId = escapeSqlLiteral(input.versionId);
      const escapedScenarioId = escapeSqlLiteral(input.scenarioId);
      const escapedProfile = escapeSqlLiteral(input.profile);
      const initialMetricsJson = escapeSqlLiteral(
        JSON.stringify({
          graph: input.graph,
          trafficRps: input.trafficRps,
          ticks: [],
          findings: [],
        }),
      );

      const sql = `
        WITH inserted AS (
          INSERT INTO ScenarioRun (
            id,
            workspace_id,
            version_id,
            scenario_id,
            seed,
            profile,
            status,
            metrics_json
          )
          VALUES (
            '${escapedRunId}'::uuid,
            '${escapedWorkspaceId}'::uuid,
            '${escapedVersionId}'::uuid,
            '${escapedScenarioId}',
            ${input.seed},
            '${escapedProfile}',
            'running',
            '${initialMetricsJson}'::jsonb
          )
          RETURNING id, workspace_id, version_id, scenario_id, seed, profile, status, started_at, finished_at, metrics_json
        )
        SELECT row_to_json(mapped)::text
        FROM (
          SELECT
            id::text AS id,
            workspace_id::text AS "workspaceId",
            version_id::text AS "versionId",
            scenario_id AS "scenarioId",
            seed,
            profile,
            status,
            started_at::text AS "startedAt",
            finished_at::text AS "finishedAt",
            metrics_json AS "metricsJson"
          FROM inserted
        ) mapped;
      `;

      const row = querySingleJson<SimulationRow>(databaseUrl, sql);
      if (!row) {
        throw new Error("simulation_run_create_failed");
      }

      return {
        id: row.id,
        workspaceId: row.workspaceId,
        versionId: row.versionId,
        scenarioId: row.scenarioId,
        seed: row.seed,
        profile: row.profile,
        status: row.status,
        startedAt: row.startedAt,
        finishedAt: row.finishedAt ?? undefined,
        graph: input.graph,
        trafficRps: input.trafficRps,
      };
    },
    completeSimulationRun(
      runId: string,
      payload: {
        metrics: SimulationMetrics;
        scorecard: SimulationScorecard;
        ticks: SimulationTick[];
        findings: ValidationFinding[];
      },
    ) {
      const existing = querySimulationRowById(databaseUrl, runId);
      if (!existing) {
        throw new Error("simulation_run_not_found");
      }

      const graph = parseStoredGraph(existing.metricsJson?.graph);
      const trafficRps = parseTrafficRps(existing.metricsJson?.trafficRps);

      const nextMetricsJson = escapeSqlLiteral(
        JSON.stringify({
          graph,
          trafficRps,
          metrics: payload.metrics,
          scorecard: payload.scorecard,
          ticks: payload.ticks,
          findings: payload.findings,
        }),
      );

      const updateSql = `
        WITH updated AS (
          UPDATE ScenarioRun
          SET
            status = 'completed',
            finished_at = NOW(),
            metrics_json = '${nextMetricsJson}'::jsonb
          WHERE id = '${escapedRunId}'::uuid
          RETURNING id, workspace_id, version_id, scenario_id, seed, profile, status, started_at, finished_at, metrics_json
        )
        SELECT row_to_json(mapped)::text
        FROM (
          SELECT
            id::text AS id,
            workspace_id::text AS "workspaceId",
            version_id::text AS "versionId",
            scenario_id AS "scenarioId",
            seed,
            profile,
            status,
            started_at::text AS "startedAt",
            finished_at::text AS "finishedAt",
            metrics_json AS "metricsJson"
          FROM updated
        ) mapped;
      `;

      const updated = querySingleJson<SimulationRow>(databaseUrl, updateSql);
      if (!updated) {
        throw new Error("simulation_run_not_found");
      }

      return {
        id: updated.id,
        workspaceId: updated.workspaceId,
        versionId: updated.versionId,
        scenarioId: updated.scenarioId,
        seed: updated.seed,
        profile: updated.profile,
        status: updated.status,
        startedAt: updated.startedAt,
        finishedAt: updated.finishedAt ?? undefined,
        graph,
        trafficRps,
        metrics: payload.metrics,
        scorecard: payload.scorecard,
      };
    },
    getSimulationRunById(runId: string): StoredSimulationRun | null {
      const row = querySimulationRowById(databaseUrl, runId);
      if (!row) {
        return null;
      }

      const graph = parseStoredGraph(row.metricsJson?.graph);
      const trafficRps = parseTrafficRps(row.metricsJson?.trafficRps);
      const metrics =
        row.metricsJson && typeof row.metricsJson.metrics === "object" && row.metricsJson.metrics !== null
          ? (row.metricsJson.metrics as SimulationMetrics)
          : undefined;
      const scorecard =
        row.metricsJson && typeof row.metricsJson.scorecard === "object" && row.metricsJson.scorecard !== null
          ? (row.metricsJson.scorecard as SimulationScorecard)
          : undefined;

      return {
        id: row.id,
        workspaceId: row.workspaceId,
        versionId: row.versionId,
        scenarioId: row.scenarioId,
        seed: row.seed,
        profile: row.profile,
        status: row.status,
        startedAt: row.startedAt,
        finishedAt: row.finishedAt ?? undefined,
        graph,
        trafficRps,
        metrics,
        scorecard,
      };
    },
    getSimulationRunEnvelope(runId: string): SimulationRunEnvelope | null {
      const run = querySimulationRowById(databaseUrl, runId);
      if (!run || !run.metrics || !run.scorecard) {
        return null;
      }

      const escapedRunId = escapeSqlLiteral(runId);
      const sql = `
        SELECT row_to_json(mapped)::text
        FROM (
          SELECT metrics_json AS "metricsJson"
          FROM ScenarioRun
          WHERE id = '${escapedRunId}'::uuid
          LIMIT 1
        ) mapped;
      `;
      const row = querySingleJson<{ metricsJson?: Record<string, unknown> }>(databaseUrl, sql);
      const ticks =
        row?.metricsJson && Array.isArray(row.metricsJson.ticks)
          ? (row.metricsJson.ticks as SimulationTick[])
          : [];
      const findings =
        row?.metricsJson && Array.isArray(row.metricsJson.findings)
          ? (row.metricsJson.findings as ValidationFinding[])
          : [];

      return {
        run: {
          id: run.id,
          workspaceId: run.workspaceId,
          versionId: run.versionId,
          scenarioId: run.scenarioId,
          seed: run.seed,
          profile: run.profile,
          status: run.status,
          startedAt: run.startedAt,
          finishedAt: run.finishedAt ?? undefined,
          metrics: run.metrics as SimulationMetrics,
          scorecard: run.scorecard as SimulationScorecard,
        },
        metrics: run.metrics as SimulationMetrics,
        scorecard: run.scorecard as SimulationScorecard,
        ticks,
        findings,
      };
    },
  };
}

function createSimulationRepository(): SimulationRepository {
  const config = readDbConfigFromEnv();
  if (config.provider === "postgres_psql" && config.databaseUrl) {
    return createPostgresSimulationRepository(config.databaseUrl);
  }
  return createMemorySimulationRepository();
}

const repository = createSimulationRepository();

export function createSimulationRun(input: CreateSimulationRunInput): StoredSimulationRun {
  return repository.createSimulationRun(input);
}

export function completeSimulationRun(
  runId: string,
  payload: {
    metrics: SimulationMetrics;
    scorecard: SimulationScorecard;
    ticks: SimulationTick[];
    findings: ValidationFinding[];
  },
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
