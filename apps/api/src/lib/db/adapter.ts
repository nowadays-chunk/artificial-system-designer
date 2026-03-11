import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import type { DbConfig } from "./config";

export type SqlAdapter = {
  provider: "memory" | "postgres_psql";
  targetKey: string;
  execute(sql: string): Promise<void>;
};

function hashDatabaseUrl(databaseUrl: string) {
  return createHash("sha256").update(databaseUrl).digest("hex").slice(0, 12);
}

function createMemoryAdapter(): SqlAdapter {
  return {
    provider: "memory",
    targetKey: "memory",
    async execute() {
      return;
    },
  };
}

function createPostgresPsqlAdapter(databaseUrl: string): SqlAdapter {
  return {
    provider: "postgres_psql",
    targetKey: `postgres:${hashDatabaseUrl(databaseUrl)}`,
    async execute(sql: string) {
      const processHandle = spawn(
        "psql",
        [databaseUrl, "-v", "ON_ERROR_STOP=1", "-q"],
        {
          stdio: ["pipe", "pipe", "pipe"],
          windowsHide: true,
        },
      );

      let stderr = "";
      processHandle.stderr.on("data", (chunk) => {
        stderr += String(chunk);
      });

      processHandle.stdin.write(sql);
      processHandle.stdin.end();

      const [code] = (await once(processHandle, "close")) as [number | null];
      if (code !== 0) {
        throw new Error(`migration_sql_failed:${stderr.trim() || `exit_${code ?? "unknown"}`}`);
      }
    },
  };
}

export function createSqlAdapter(config: DbConfig): SqlAdapter {
  if (config.provider === "memory") {
    return createMemoryAdapter();
  }

  if (!config.databaseUrl) {
    throw new Error("database_url_required");
  }
  return createPostgresPsqlAdapter(config.databaseUrl);
}
