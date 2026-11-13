// ── CI Quality Gate ─────────────────────────────────────────────────
// `failora check <url> [--min-score N] [--max-critical N] [--max-high N]
//                      [--max-medium N] [--sarif out.sarif]`
//
// Exit codes: 0 = pass, 1 = threshold breach, 2 = scan error.
// CI-friendly: --sarif writes a SARIF file for code-scanning upload.

import { scanUrl, type ScanResult, type SafetyConfig } from "@failora/scanner";
import { generateScanReport, exportAsSARIF } from "@failora/reports";

export interface GateThresholds {
  minScore: number;
  maxCritical: number;
  maxHigh: number;
  maxMedium: number;
}

export const DEFAULT_THRESHOLDS: GateThresholds = {
  minScore: 0,     // no score floor by default
  maxCritical: 0,  // any critical finding fails the gate
  maxHigh: 999,
  maxMedium: 999,
};

export type GateVerdict = "pass" | "fail";

export interface GateResult {
  verdict: GateThresholds & { verdict: GateVerdict; reasons: string[] };
  scan: ScanResult;
}

/** Evaluate a scan against thresholds. Pure — no I/O. */
export function evaluateGate(
  scan: Pick<ScanResult, "overallScore" | "findings">,
  thresholds: Partial<GateThresholds> = {}
): { verdict: GateVerdict; reasons: string[] } {
  const t = { ...DEFAULT_THRESHOLDS, ...thresholds };
  const reasons: string[] = [];

  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of scan.findings) {
    const sev = f.severity as keyof typeof counts;
    if (sev in counts) counts[sev]++;
  }

  if ((scan.overallScore ?? 0) < t.minScore) {
    reasons.push(
      `score ${scan.overallScore} < min-score ${t.minScore}`
    );
  }
  if (counts.critical > t.maxCritical) {
    reasons.push(`critical ${counts.critical} > max-critical ${t.maxCritical}`);
  }
  if (counts.high > t.maxHigh) {
    reasons.push(`high ${counts.high} > max-high ${t.maxHigh}`);
  }
  if (counts.medium > t.maxMedium) {
    reasons.push(`medium ${counts.medium} > max-medium ${t.maxMedium}`);
  }

  return { verdict: reasons.length ? "fail" : "pass", reasons };
}

// ── CLI argument parsing ────────────────────────────────────────────

export interface CheckArgs {
  url: string;
  thresholds: Partial<GateThresholds>;
  sarifOut?: string;
  jsonOut?: boolean;
  safety: Pick<SafetyConfig, "authorized" | "allowInsecure" | "allowLocalhost">;
}

export function parseArgs(argv: string[]): CheckArgs | { error: string } {
  const args = [...argv];
  const thresholds: Partial<GateThresholds> = {};
  let url: string | undefined;
  let sarifOut: string | undefined;
  let jsonOut = false;
  let authorized = false;
  let allowInsecure = false;
  let allowLocalhost = false;

  while (args.length) {
    const a = args.shift()!;
    const take = (): string => args.shift() ?? "";
    switch (a) {
      case "--min-score": thresholds.minScore = Number(take()); break;
      case "--max-critical": thresholds.maxCritical = Number(take()); break;
      case "--max-high": thresholds.maxHigh = Number(take()); break;
      case "--max-medium": thresholds.maxMedium = Number(take()); break;
      case "--sarif": sarifOut = take(); break;
      case "--json": jsonOut = true; break;
      case "--authorized": authorized = true; break;
      case "--allow-insecure": allowInsecure = true; break;
      case "--allow-localhost": allowLocalhost = true; break;
      case "--help":
        return { error: usage() };
      default:
        if (!a.startsWith("--")) url = a;
    }
  }

  if (!url) return { error: `Missing target URL.\n\n${usage()}` };
  if (!authorized) {
    return {
      error:
        "Safety: pass --authorized to confirm you are authorized to test this target.",
    };
  }
  return { url, thresholds, sarifOut, jsonOut, safety: { authorized, allowInsecure, allowLocalhost } };
}

function usage(): string {
  return [
    "Usage: failora check <url> [options]",
    "",
    "Options:",
    "  --authorized          Acknowledge authorization to test the target (required)",
    "  --min-score N         Minimum overall score (0-100)",
    "  --max-critical N      Max allowed critical findings (default 0)",
    "  --max-high N          Max allowed high findings",
    "  --max-medium N        Max allowed medium findings",
    "  --sarif <file>        Also write SARIF 2.1.0 results to <file>",
    "  --json                Print scan result as JSON",
    "  --allow-insecure      Allow http:// targets",
    "  --allow-localhost     Allow localhost/127.0.0.1 targets",
    "",
    "Exit codes: 0=pass  1=threshold breach  2=scan error",
  ].join("\n");
}

// ── Main check (network I/O) ────────────────────────────────────────

export interface CheckOutcome {
  exitCode: 0 | 1 | 2;
  stdout: string;
  sarif?: string;
}

export async function runCheck(args: CheckArgs): Promise<CheckOutcome> {
  let scan: ScanResult;
  try {
    scan = await scanUrl(args.url, args.safety);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { exitCode: 2, stdout: `SCAN ERROR: ${msg}\n` };
  }

  const gate = evaluateGate(scan, args.thresholds);

  const lines: string[] = [];
  lines.push(`Target:    ${args.url}`);
  lines.push(`Score:     ${scan.overallScore}/100`);
  lines.push(`Findings:  ${scan.findings.length} total`);
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of scan.findings) {
    const sev = f.severity as keyof typeof counts;
    if (sev in counts) counts[sev]++;
  }
  lines.push(
    `           critical=${counts.critical} high=${counts.high} medium=${counts.medium} low=${counts.low}`
  );
  lines.push("");

  if (gate.verdict === "pass") {
    lines.push("GATE: PASS");
  } else {
    lines.push("GATE: FAIL");
    for (const r of gate.reasons) lines.push(`  - ${r}`);
  }

  let sarif: string | undefined;
  if (args.sarifOut) {
    const report = generateScanReport(scan);
    sarif = JSON.stringify(exportAsSARIF(report), null, 2);
    lines.push(`\nSARIF written to ${args.sarifOut}`);
  }

  return { exitCode: gate.verdict === "pass" ? 0 : 1, stdout: lines.join("\n") + "\n", sarif };
}
