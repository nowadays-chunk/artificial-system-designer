import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, "..");
const migrationsDir = process.env.API_MIGRATIONS_DIR ?? path.join(apiRoot, "migrations");
const stateDir = process.env.API_STATE_DIR ?? path.join(apiRoot, ".state");
const provider = process.env.API_DB_PROVIDER === "postgres_psql" ? "postgres_psql" : "memory";
const databaseUrl = process.env.DATABASE_URL;

function hashDatabaseUrl(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function compareFilenames(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

async function readMigrations() {
  const entries = await readdir(migrationsDir, { withFileTypes: true });
  const sqlFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".sql"))
    .map((entry) => entry.name)
    .sort(compareFilenames);

  const migrations = [];
  for (const file of sqlFiles) {
    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    migrations.push({ id: file.replace(/\.sql$/i, ""), sql });
  }
  return migrations;
}

async function executeSql(sql) {
  if (provider === "memory") {
    return;
  }
  if (!databaseUrl) {
    throw new Error("database_url_required");
  }
  await new Promise((resolve, reject) => {
    const handle = spawn(
      "psql",
      [databaseUrl, "-v", "ON_ERROR_STOP=1", "-q"],
      { stdio: ["pipe", "pipe", "pipe"], windowsHide: true },
    );
    let stderr = "";
    handle.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    handle.on("error", reject);
    handle.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`migration_sql_failed:${stderr.trim() || code}`));
        return;
      }
      resolve();
    });
    handle.stdin.write(sql);
    handle.stdin.end();
  });
}

function escapeSqlLiteral(value) {
  return value.replace(/'/g, "''");
}

async function readJournal() {
  try {
    const raw = await readFile(path.join(stateDir, "migration-journal.json"), "utf8");
    return JSON.parse(raw);
  } catch {
    return { appliedByTarget: {}, updatedAt: new Date(0).toISOString() };
  }
}

async function writeJournal(journal) {
  await mkdir(stateDir, { recursive: true });
  await writeFile(
    path.join(stateDir, "migration-journal.json"),
    `${JSON.stringify({ ...journal, updatedAt: new Date().toISOString() }, null, 2)}\n`,
    "utf8",
  );
}

async function ensureSqlMigrationTable() {
  if (provider !== "postgres_psql") {
    return;
  }
  await executeSql(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      target_key TEXT NOT NULL,
      migration_id TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (target_key, migration_id)
    );
  `);
}

async function readAppliedFromSql(targetKey) {
  if (provider !== "postgres_psql") {
    return new Set();
  }
  const escapedTarget = escapeSqlLiteral(targetKey);
  const rows = [];
  await new Promise((resolve, reject) => {
    const handle = spawn(
      "psql",
      [databaseUrl, "-v", "ON_ERROR_STOP=1", "-t", "-A", "-q", "-c", `
        SELECT migration_id
        FROM schema_migrations
        WHERE target_key = '${escapedTarget}'
        ORDER BY migration_id ASC;
      `],
      { stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
    );
    let stderr = "";
    handle.stdout.on("data", (chunk) => {
      const lines = String(chunk).split("\\n").map((line) => line.trim()).filter(Boolean);
      rows.push(...lines);
    });
    handle.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    handle.on("error", reject);
    handle.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`migration_sql_failed:${stderr.trim() || code}`));
        return;
      }
      resolve();
    });
  });
  return new Set(rows);
}

async function markAppliedInSql(targetKey, migrationId) {
  if (provider !== "postgres_psql") {
    return;
  }
  const escapedTarget = escapeSqlLiteral(targetKey);
  const escapedId = escapeSqlLiteral(migrationId);
  await executeSql(`
    INSERT INTO schema_migrations (target_key, migration_id)
    VALUES ('${escapedTarget}', '${escapedId}')
    ON CONFLICT (target_key, migration_id) DO NOTHING;
  `);
}

async function main() {
  const targetKey = provider === "memory" ? "memory" : `postgres:${hashDatabaseUrl(databaseUrl)}`;
  const migrations = await readMigrations();
  const useSqlJournal = provider === "postgres_psql";
  if (useSqlJournal) {
    await ensureSqlMigrationTable();
  }
  const journal = useSqlJournal ? null : await readJournal();
  const appliedSet = useSqlJournal
    ? await readAppliedFromSql(targetKey)
    : new Set(journal.appliedByTarget[targetKey] ?? []);
  const applied = [];
  const skipped = [];

  for (const migration of migrations) {
    if (appliedSet.has(migration.id)) {
      skipped.push(migration.id);
      continue;
    }
    await executeSql(migration.sql);
    appliedSet.add(migration.id);
    if (useSqlJournal) {
      await markAppliedInSql(targetKey, migration.id);
    }
    applied.push(migration.id);
  }

  if (!useSqlJournal) {
    journal.appliedByTarget[targetKey] = [...appliedSet];
    await writeJournal(journal);
  }

  console.log(
    JSON.stringify(
      {
        message: "migrations.completed",
        provider,
        targetKey,
        applied,
        skipped,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      message: "migrations.failed",
      error: error instanceof Error ? error.message : "unknown_error",
    }),
  );
  process.exit(1);
});
