import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SqlAdapter } from "./adapter";
import type { DbConfig } from "./config";

type MigrationJournal = {
  appliedByTarget: Record<string, string[]>;
  updatedAt: string;
};

type MigrationRecord = {
  id: string;
  filename: string;
  sql: string;
};

export type MigrationRunResult = {
  provider: string;
  targetKey: string;
  applied: string[];
  skipped: string[];
};

const journalFilename = "migration-journal.json";

function compareMigrationFilenames(left: string, right: string) {
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
}

function escapeSqlLiteral(value: string) {
  return value.replace(/'/g, "''");
}

async function readMigrationFiles(migrationsDir: string): Promise<MigrationRecord[]> {
  const entries = await readdir(migrationsDir, { withFileTypes: true });
  const filenames = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".sql"))
    .map((entry) => entry.name)
    .sort(compareMigrationFilenames);

  const migrations: MigrationRecord[] = [];
  for (const filename of filenames) {
    const sql = await readFile(path.join(migrationsDir, filename), "utf8");
    const id = filename.replace(/\.sql$/i, "");
    migrations.push({ id, filename, sql });
  }
  return migrations;
}

async function loadJournal(stateDir: string): Promise<MigrationJournal> {
  const journalPath = path.join(stateDir, journalFilename);
  try {
    const raw = await readFile(journalPath, "utf8");
    const parsed = JSON.parse(raw) as MigrationJournal;
    if (!parsed.appliedByTarget || typeof parsed.appliedByTarget !== "object") {
      throw new Error("invalid_journal");
    }
    return parsed;
  } catch {
    return {
      appliedByTarget: {},
      updatedAt: new Date(0).toISOString(),
    };
  }
}

async function saveJournal(stateDir: string, journal: MigrationJournal) {
  await mkdir(stateDir, { recursive: true });
  const journalPath = path.join(stateDir, journalFilename);
  const payload: MigrationJournal = {
    ...journal,
    updatedAt: new Date().toISOString(),
  };
  await writeFile(journalPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function ensureSqlMigrationTable(adapter: SqlAdapter) {
  await adapter.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      target_key TEXT NOT NULL,
      migration_id TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (target_key, migration_id)
    );
  `);
}

async function loadAppliedIdsFromSql(adapter: SqlAdapter): Promise<Set<string>> {
  const escapedTarget = escapeSqlLiteral(adapter.targetKey);
  const rows = await adapter.query(`
    SELECT migration_id
    FROM schema_migrations
    WHERE target_key = '${escapedTarget}'
    ORDER BY migration_id ASC;
  `);
  return new Set(rows);
}

async function markAppliedInSql(adapter: SqlAdapter, migrationId: string) {
  const escapedTarget = escapeSqlLiteral(adapter.targetKey);
  const escapedId = escapeSqlLiteral(migrationId);
  await adapter.execute(`
    INSERT INTO schema_migrations (target_key, migration_id)
    VALUES ('${escapedTarget}', '${escapedId}')
    ON CONFLICT (target_key, migration_id) DO NOTHING;
  `);
}

export async function runPendingMigrations(input: {
  config: DbConfig;
  adapter: SqlAdapter;
}): Promise<MigrationRunResult> {
  const migrations = await readMigrationFiles(input.config.migrationsDir);
  const useSqlJournal = input.adapter.provider === "postgres_psql";
  const journal = useSqlJournal ? null : await loadJournal(input.config.stateDir);
  if (useSqlJournal) {
    await ensureSqlMigrationTable(input.adapter);
  }
  const appliedIds = useSqlJournal
    ? await loadAppliedIdsFromSql(input.adapter)
    : new Set(journal?.appliedByTarget[input.adapter.targetKey] ?? []);
  const applied: string[] = [];
  const skipped: string[] = [];

  for (const migration of migrations) {
    if (appliedIds.has(migration.id)) {
      skipped.push(migration.id);
      continue;
    }

    await input.adapter.execute(migration.sql);
    appliedIds.add(migration.id);
    if (useSqlJournal) {
      await markAppliedInSql(input.adapter, migration.id);
    }
    applied.push(migration.id);
  }

  if (!useSqlJournal && journal) {
    journal.appliedByTarget[input.adapter.targetKey] = [...appliedIds];
    await saveJournal(input.config.stateDir, journal);
  }

  return {
    provider: input.adapter.provider,
    targetKey: input.adapter.targetKey,
    applied,
    skipped,
  };
}
