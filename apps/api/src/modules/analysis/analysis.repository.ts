import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import type { AnalysisScorecard, ValidationFinding } from "@asd/contracts/analysis";
import { readDbConfigFromEnv } from "../../lib/db/config";

type AnalysisRepository = {
  saveReport(input: {
    workspaceId: string;
    versionId?: string;
    scenarioId?: string;
    summary: string;
    findings: ValidationFinding[];
    scorecard: AnalysisScorecard;
  }): { reportId: string };
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

function createMemoryAnalysisRepository(): AnalysisRepository {
  const reports = new Map<string, unknown>();
  return {
    saveReport(input: {
      workspaceId: string;
      versionId?: string;
      scenarioId?: string;
      summary: string;
      findings: ValidationFinding[];
      scorecard: AnalysisScorecard;
    }) {
      const reportId = randomUUID();
      reports.set(reportId, { ...input, reportId, createdAt: new Date().toISOString() });
      return { reportId };
    },
  };
}

function createPostgresAnalysisRepository(databaseUrl: string): AnalysisRepository {
  return {
    saveReport(input: {
      workspaceId: string;
      versionId?: string;
      scenarioId?: string;
      summary: string;
      findings: ValidationFinding[];
      scorecard: AnalysisScorecard;
    }) {
      const reportId = randomUUID();
      const escapedReportId = escapeSqlLiteral(reportId);
      const escapedWorkspaceId = escapeSqlLiteral(input.workspaceId);
      const versionValue = input.versionId ? `'${escapeSqlLiteral(input.versionId)}'::uuid` : "NULL";
      const scenarioValue = input.scenarioId ? `'${escapeSqlLiteral(input.scenarioId)}'` : "NULL";
      const escapedSummary = escapeSqlLiteral(input.summary);
      const escapedFindings = escapeSqlLiteral(JSON.stringify(input.findings));
      const escapedScorecard = escapeSqlLiteral(JSON.stringify(input.scorecard));

      const sql = `
        WITH inserted AS (
          INSERT INTO analysis_reports (
            id,
            workspace_id,
            version_id,
            scenario_id,
            summary,
            findings_json,
            scorecard_json
          )
          VALUES (
            '${escapedReportId}'::uuid,
            '${escapedWorkspaceId}'::uuid,
            ${versionValue},
            ${scenarioValue},
            '${escapedSummary}',
            '${escapedFindings}'::jsonb,
            '${escapedScorecard}'::jsonb
          )
          RETURNING id
        )
        SELECT row_to_json(mapped)::text
        FROM (
          SELECT id::text AS "reportId"
          FROM inserted
        ) mapped;
      `;

      const row = querySingleJson<{ reportId: string }>(databaseUrl, sql);
      if (!row) {
        throw new Error("analysis_report_create_failed");
      }
      return row;
    },
  };
}

function createAnalysisRepository(): AnalysisRepository {
  const config = readDbConfigFromEnv();
  if (config.provider === "postgres_psql" && config.databaseUrl) {
    return createPostgresAnalysisRepository(config.databaseUrl);
  }
  return createMemoryAnalysisRepository();
}

const repository = createAnalysisRepository();

export function saveAnalysisReport(input: {
  workspaceId: string;
  versionId?: string;
  scenarioId?: string;
  summary: string;
  findings: ValidationFinding[];
  scorecard: AnalysisScorecard;
}) {
  return repository.saveReport(input);
}

export type { AnalysisRepository };
