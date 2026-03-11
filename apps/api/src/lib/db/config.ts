import path from "node:path";
import { fileURLToPath } from "node:url";

export type DbProvider = "memory" | "postgres_psql";

export type DbConfig = {
  provider: DbProvider;
  databaseUrl?: string;
  migrationsDir: string;
  stateDir: string;
  runMigrationsOnBoot: boolean;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, "../../..");

export function readDbConfigFromEnv(env: NodeJS.ProcessEnv = process.env): DbConfig {
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
