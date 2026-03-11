import { spawnSync } from "node:child_process";
import { readDbConfigFromEnv } from "../../lib/db/config";
import type { WorkspaceRole } from "./auth.types";

type AuthRepository = {
  assignWorkspaceRole(workspaceId: string, actorId: string, role: WorkspaceRole): void;
  getWorkspaceRole(workspaceId: string, actorId: string): WorkspaceRole | null;
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

function createMemoryAuthRepository(): AuthRepository {
  const rolesByWorkspace = new Map<string, Map<string, WorkspaceRole>>();
  return {
    assignWorkspaceRole(workspaceId: string, actorId: string, role: WorkspaceRole) {
      const existing = rolesByWorkspace.get(workspaceId) ?? new Map<string, WorkspaceRole>();
      existing.set(actorId, role);
      rolesByWorkspace.set(workspaceId, existing);
    },
    getWorkspaceRole(workspaceId: string, actorId: string): WorkspaceRole | null {
      const roles = rolesByWorkspace.get(workspaceId);
      if (!roles) {
        return null;
      }
      return roles.get(actorId) ?? null;
    },
  };
}

function createPostgresAuthRepository(databaseUrl: string): AuthRepository {
  return {
    assignWorkspaceRole(workspaceId: string, actorId: string, role: WorkspaceRole) {
      const escapedWorkspaceId = escapeSqlLiteral(workspaceId);
      const escapedActorId = escapeSqlLiteral(actorId);
      const escapedRole = escapeSqlLiteral(role);
      runPsql(
        databaseUrl,
        `
          INSERT INTO workspace_memberships (
            workspace_id,
            actor_id,
            role,
            created_at,
            updated_at
          )
          VALUES (
            '${escapedWorkspaceId}'::uuid,
            '${escapedActorId}',
            '${escapedRole}',
            NOW(),
            NOW()
          )
          ON CONFLICT (workspace_id, actor_id)
          DO UPDATE SET
            role = EXCLUDED.role,
            updated_at = NOW();
        `,
      );
    },
    getWorkspaceRole(workspaceId: string, actorId: string): WorkspaceRole | null {
      const escapedWorkspaceId = escapeSqlLiteral(workspaceId);
      const escapedActorId = escapeSqlLiteral(actorId);
      const rows = runPsql(
        databaseUrl,
        `
          SELECT role
          FROM workspace_memberships
          WHERE workspace_id = '${escapedWorkspaceId}'::uuid
            AND actor_id = '${escapedActorId}'
          LIMIT 1;
        `,
      );
      if (rows.length === 0) {
        return null;
      }
      const role = rows[0];
      return role === "owner" || role === "editor" || role === "viewer"
        ? role
        : null;
    },
  };
}

function createAuthRepository(): AuthRepository {
  const config = readDbConfigFromEnv();
  if (config.provider === "postgres_psql" && config.databaseUrl) {
    return createPostgresAuthRepository(config.databaseUrl);
  }
  return createMemoryAuthRepository();
}

const repository = createAuthRepository();

export function assignWorkspaceRole(workspaceId: string, actorId: string, role: WorkspaceRole) {
  repository.assignWorkspaceRole(workspaceId, actorId, role);
}

export function getWorkspaceRole(workspaceId: string, actorId: string): WorkspaceRole | null {
  return repository.getWorkspaceRole(workspaceId, actorId);
}

export type { AuthRepository };
