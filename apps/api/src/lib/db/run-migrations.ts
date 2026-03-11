import { createSqlAdapter } from "./adapter";
import { readDbConfigFromEnv } from "./config";
import { runPendingMigrations } from "./migrations";

async function main() {
  const config = readDbConfigFromEnv();
  const adapter = createSqlAdapter(config);
  const result = await runPendingMigrations({ config, adapter });
  console.log(
    JSON.stringify(
      {
        message: "migrations.completed",
        provider: result.provider,
        targetKey: result.targetKey,
        applied: result.applied,
        skipped: result.skipped,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "unknown_error";
  console.error(JSON.stringify({ message: "migrations.failed", error: message }));
  process.exit(1);
});
