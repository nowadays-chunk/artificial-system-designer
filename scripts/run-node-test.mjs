import { spawnSync } from "node:child_process";
import path from "node:path";

const target = process.argv[2];

if (!target) {
  console.error("Missing test target path");
  process.exit(1);
}

const absoluteTarget = path.resolve(process.cwd(), target);
const result = spawnSync(
  process.execPath,
  ["--test", "--test-isolation=none", absoluteTarget],
  { stdio: "inherit" },
);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
