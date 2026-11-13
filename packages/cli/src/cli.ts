// ── failora CLI entrypoint ──────────────────────────────────────────
// Runs under `node --experimental-transform-types`. Exit codes:
//   0 = gate pass, 1 = gate fail, 2 = scan/usage error.

import { writeFileSync } from "node:fs";
import { parseArgs, runCheck } from "./gate.ts";

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  if ("error" in parsed) {
    process.stderr.write(parsed.error + "\n");
    process.exit(2);
  }

  const outcome = await runCheck(parsed);
  process.stdout.write(outcome.stdout);

  if (outcome.sarif && parsed.sarifOut) {
    writeFileSync(parsed.sarifOut, outcome.sarif, "utf8");
  }

  process.exit(outcome.exitCode);
}

main();
