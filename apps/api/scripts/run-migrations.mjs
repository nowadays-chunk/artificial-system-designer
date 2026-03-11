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

async function main() {
  const targetKey = provider === "memory" ? "memory" : `postgres:${hashDatabaseUrl(databaseUrl)}`;
  const migrations = await readMigrations();
  const journal = await readJournal();
  const appliedSet = new Set(journal.appliedByTarget[targetKey] ?? []);
  const applied = [];
  const skipped = [];

  for (const migration of migrations) {
    if (appliedSet.has(migration.id)) {
      skipped.push(migration.id);
      continue;
    }
    await executeSql(migration.sql);
    appliedSet.add(migration.id);
    applied.push(migration.id);
  }

  journal.appliedByTarget[targetKey] = [...appliedSet];
  await writeJournal(journal);

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
