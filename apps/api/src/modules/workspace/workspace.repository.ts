import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readDbConfigFromEnv } from "../../lib/db/config";
import type { DiagramVersion, GraphDocument, Workspace } from "./workspace.types";

type WorkspaceRepository = {
  createWorkspace(name: string): Workspace;
  getWorkspaceById(workspaceId: string): Workspace | null;
  createDiagramVersion(input: {
    workspaceId: string;
    baseVersionId?: string;
    graph: GraphDocument;
    message: string;
  }): DiagramVersion;
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

function createMemoryWorkspaceRepository(): WorkspaceRepository {
  const workspaces = new Map<string, Workspace>();
  const versionsByWorkspace = new Map<string, DiagramVersion[]>();

  return {
    createWorkspace(name: string): Workspace {
      const now = new Date().toISOString();
      const workspace: Workspace = {
        id: randomUUID(),
        name,
        createdAt: now,
      };
      workspaces.set(workspace.id, workspace);
      versionsByWorkspace.set(workspace.id, []);
      return workspace;
    },
    getWorkspaceById(workspaceId: string): Workspace | null {
      return workspaces.get(workspaceId) ?? null;
    },
    createDiagramVersion(input: {
      workspaceId: string;
      baseVersionId?: string;
      graph: GraphDocument;
      message: string;
    }): DiagramVersion {
      const workspaceVersions = versionsByWorkspace.get(input.workspaceId);
      if (!workspaceVersions) {
        throw new Error("workspace_not_found");
      }

      const nextNumber = workspaceVersions.length + 1;
      const version: DiagramVersion = {
        id: randomUUID(),
        workspaceId: input.workspaceId,
        number: nextNumber,
        baseVersionId: input.baseVersionId,
        graph: input.graph,
        message: input.message,
        createdAt: new Date().toISOString(),
      };
      workspaceVersions.push(version);
      return version;
    },
  };
}

function createPostgresWorkspaceRepository(databaseUrl: string): WorkspaceRepository {
  return {
    createWorkspace(name: string): Workspace {
      const escapedName = escapeSqlLiteral(name);
      const workspaceId = randomUUID();
      const sql = `
        WITH inserted AS (
          INSERT INTO workspaces (id, name)
          VALUES ('${workspaceId}'::uuid, '${escapedName}')
          RETURNING id, name, created_at
        )
        SELECT row_to_json(mapped)::text
        FROM (
          SELECT
            id::text AS id,
            name,
            created_at::text AS "createdAt"
          FROM inserted
        ) mapped;
      `;
      const created = querySingleJson<Workspace>(databaseUrl, sql);
      if (!created) {
        throw new Error("workspace_create_failed");
      }
      return created;
    },
    getWorkspaceById(workspaceId: string): Workspace | null {
      const escapedId = escapeSqlLiteral(workspaceId);
      const sql = `
        SELECT row_to_json(mapped)::text
        FROM (
          SELECT
            id::text AS id,
            name,
            created_at::text AS "createdAt"
          FROM workspaces
          WHERE id = '${escapedId}'::uuid
          LIMIT 1
        ) mapped;
      `;
      return querySingleJson<Workspace>(databaseUrl, sql);
    },
    createDiagramVersion(input: {
      workspaceId: string;
      baseVersionId?: string;
      graph: GraphDocument;
      message: string;
    }): DiagramVersion {
      const escapedWorkspaceId = escapeSqlLiteral(input.workspaceId);
      const existsSql = `
        SELECT row_to_json(mapped)::text
        FROM (
          SELECT id::text AS id
          FROM workspaces
          WHERE id = '${escapedWorkspaceId}'::uuid
          LIMIT 1
        ) mapped;
      `;
      const workspace = querySingleJson<{ id: string }>(databaseUrl, existsSql);
      if (!workspace) {
        throw new Error("workspace_not_found");
      }

      const versionId = randomUUID();
      const escapedMessage = escapeSqlLiteral(input.message);
      const escapedGraph = escapeSqlLiteral(JSON.stringify(input.graph));
      const baseVersionValue = input.baseVersionId
        ? `'${escapeSqlLiteral(input.baseVersionId)}'::uuid`
        : "NULL";

      const sql = `
        WITH next_number AS (
          SELECT COALESCE(MAX(version_number), 0) + 1 AS value
          FROM diagram_versions
          WHERE workspace_id = '${escapedWorkspaceId}'::uuid
        ),
        inserted AS (
          INSERT INTO diagram_versions (
            id,
            workspace_id,
            version_number,
            base_version_id,
            graph_json,
            message
          )
          SELECT
            '${versionId}'::uuid,
            '${escapedWorkspaceId}'::uuid,
            next_number.value,
            ${baseVersionValue},
            '${escapedGraph}'::jsonb,
            '${escapedMessage}'
          FROM next_number
          RETURNING id, workspace_id, version_number, base_version_id, graph_json, message, created_at
        )
        SELECT row_to_json(mapped)::text
        FROM (
          SELECT
            id::text AS id,
            workspace_id::text AS "workspaceId",
            version_number AS number,
            base_version_id::text AS "baseVersionId",
            graph_json AS graph,
            message,
            created_at::text AS "createdAt"
          FROM inserted
        ) mapped;
      `;

      const version = querySingleJson<DiagramVersion>(databaseUrl, sql);
      if (!version) {
        throw new Error("diagram_version_create_failed");
      }
      return version;
    },
  };
}

function createWorkspaceRepository(): WorkspaceRepository {
  const config = readDbConfigFromEnv();
  if (config.provider === "postgres_psql" && config.databaseUrl) {
    return createPostgresWorkspaceRepository(config.databaseUrl);
  }
  return createMemoryWorkspaceRepository();
}

const repository = createWorkspaceRepository();

export function createWorkspace(name: string): Workspace {
  return repository.createWorkspace(name);
}

export function getWorkspaceById(workspaceId: string): Workspace | null {
  return repository.getWorkspaceById(workspaceId);
}

export function createDiagramVersion(input: {
  workspaceId: string;
  baseVersionId?: string;
  graph: GraphDocument;
  message: string;
}): DiagramVersion {
  return repository.createDiagramVersion(input);
}
