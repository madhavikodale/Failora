import { randomUUID } from "node:crypto";
import type { ScanResult, ScanFinding } from "../types.ts";
import { checkHealth } from "../checks/health.ts";
import { checkSSL } from "../checks/ssl.ts";
import { checkDNS } from "../checks/dns.ts";
import { checkSecurityHeaders } from "../checks/security-headers.ts";
import { analyzePerformance } from "../checks/performance.ts";
import { detectGaps } from "../engine/gap-detector.ts";

// ── URL Scanner Orchestrator ────────────────────────────────────────

export async function scanUrl(url: string): Promise<ScanResult> {
  // Normalize URL
  if (!/^https?:\/\//.test(url)) {
    url = `https://${url}`;
  }

  // Run all checks in parallel
  const [health, ssl, dns] = await Promise.all([
    checkHealth(url),
    checkSSL(url).catch((err) => ({ valid: false, error: String(err) })),
    checkDNS(url).catch((err) => ({
      domain: url,
      records: {},
      hasMX: false,
      hasSPF: false,
      hasDMARC: false,
      checkedAt: new Date().toISOString(),
    })),
  ]);

  // Performance check (only if site is up)
  let perf = {
    url,
    ttfbMs: 0,
    totalTimeMs: 0,
    dnsLookupMs: 0,
    tcpConnectMs: 0,
    tlsHandshakeMs: 0,
    firstByteMs: 0,
    downloadMs: 0,
    sizeBytes: 0,
  };
  if (health.isUp) {
    perf = await analyzePerformance(url).catch(() => perf);
  }

  const securityHeaders = checkSecurityHeaders(health.headers);
  const findings = detectGaps(url, health, ssl, dns, securityHeaders, perf);

  // Calculate overall score
  const severityWeights: Record<string, number> = {
    critical: 25,
    high: 15,
    medium: 8,
    low: 3,
  };
  const totalPenalty = findings.reduce((sum, f) => sum + (severityWeights[f.severity] ?? 0), 0);
  const overallScore = Math.max(0, 100 - totalPenalty);

  // Summary
  const summary = {
    total: findings.length,
    critical: findings.filter((f) => f.severity === "critical").length,
    high: findings.filter((f) => f.severity === "high").length,
    medium: findings.filter((f) => f.severity === "medium").length,
    low: findings.filter((f) => f.severity === "low").length,
  };

  return {
    id: randomUUID(),
    url,
    scannedAt: new Date().toISOString(),
    overallScore,
    health,
    ssl,
    dns,
    securityHeaders,
    performance: perf,
    findings,
    summary,
  };
}
