import path from "node:path";
import fs from "node:fs";

export type DbProvider = "memory" | "postgres_psql";

export type DbConfig = {
  provider: DbProvider;
  databaseUrl?: string;
  migrationsDir: string;
  stateDir: string;
  runMigrationsOnBoot: boolean;
};

function resolveApiRoot(cwd: string) {
  const directApiRoot = path.join(cwd, "apps", "api");
  if (fs.existsSync(path.join(directApiRoot, "migrations"))) {
    return directApiRoot;
  }
  if (fs.existsSync(path.join(cwd, "migrations"))) {
    return cwd;
  }
  return directApiRoot;
}

export function readDbConfigFromEnv(env: NodeJS.ProcessEnv = process.env): DbConfig {
  const apiRoot = resolveApiRoot(process.cwd());
  const provider = env.API_DB_PROVIDER === "postgres_psql" ? "postgres_psql" : "memory";
  const migrationsDir = env.API_MIGRATIONS_DIR ?? path.join(apiRoot, "migrations");
  const stateDir = env.API_STATE_DIR ?? path.join(apiRoot, ".state");
  const runMigrationsOnBoot = env.API_RUN_MIGRATIONS_ON_BOOT === "1";

  return {
    provider,
    databaseUrl: env.DATABASE_URL,
    migrationsDir,
    stateDir,
    runMigrationsOnBoot,
  };
}
