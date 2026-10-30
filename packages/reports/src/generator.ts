import type { ScanResult } from "@failora/scanner";
import type { ScenarioResult, GapReport } from "@failora/core";
import type { Report, ReportSection, ReportOptions } from "./types.ts";

// ── Report Generator ────────────────────────────────────────────────

function generateId(): string {
  return `rpt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function countBySeverity(findings: Array<{ severity: string }>) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of findings) {
    const sev = f.severity as keyof typeof counts;
    if (sev in counts) counts[sev]++;
  }
  return counts;
}

// ── Scan Report ─────────────────────────────────────────────────────

export function generateScanReport(
  scan: ScanResult,
  options: ReportOptions = {}
): Report {
  const sections: ReportSection[] = [];

  // Health section
  sections.push({
    title: "Availability & Health",
    severity: scan.health.isUp ? "info" : "critical",
    content: scan.health.isUp
      ? `Site is up. Status: ${scan.health.statusCode}, Response time: ${scan.health.responseTimeMs}ms`
      : `Site is DOWN. ${scan.health.error ?? "Unknown error"}`,
    data: scan.health,
  });

  // SSL section
  if (scan.ssl) {
    const daysUntilExpiry = scan.ssl.daysUntilExpiry;
    const sslSeverity =
      daysUntilExpiry !== null && daysUntilExpiry < 7
        ? "critical"
        : daysUntilExpiry !== null && daysUntilExpiry < 30
          ? "high"
          : "info";

    sections.push({
      title: "SSL/TLS Certificate",
      severity: sslSeverity,
      content: scan.ssl.valid
        ? `Certificate valid. Issuer: ${scan.ssl.issuer}, Expires: ${scan.ssl.expiresAt} (${daysUntilExpiry} days)`
        : `Certificate INVALID: ${scan.ssl.error ?? "Unknown"}`,
      data: scan.ssl,
    });
  }

  // DNS section
  if (scan.dns) {
    sections.push({
      title: "DNS Configuration",
      severity: "info",
      content: `A records: ${scan.dns.aRecords.length}, MX records: ${scan.dns.mxRecords.length}, TXT records: ${scan.dns.txtRecords.length}`,
      data: scan.dns,
    });
  }

  // Security headers
  if (scan.securityHeaders) {
    const score = scan.securityHeaders.score;
    const sev = score >= 80 ? "info" : score >= 50 ? "medium" : "high";
    sections.push({
      title: "Security Headers",
      severity: sev,
      content: `Score: ${score}/100. Missing: ${scan.securityHeaders.missing.join(", ") || "none"}`,
      data: scan.securityHeaders,
    });
  }

  // Performance
  if (scan.performance) {
    sections.push({
      title: "Performance",
      severity: scan.performance.totalTimeMs > 3000 ? "high" : scan.performance.totalTimeMs > 1000 ? "medium" : "info",
      content: `Total time: ${scan.performance.totalTimeMs}ms (DNS: ${scan.performance.dnsMs}ms, Connect: ${scan.performance.connectMs}ms, TLS: ${scan.performance.tlsMs}ms)`,
      data: scan.performance,
    });
  }

  // Findings
  const findings = scan.findings;
  const severityCounts = countBySeverity(findings);

  if (findings.length > 0) {
    const maxPerSection = options.maxFindingsPerSection ?? 10;
    const shown = findings.slice(0, maxPerSection);

    sections.push({
      title: "Findings & Gaps",
      severity: severityCounts.critical > 0 ? "critical" : severityCounts.high > 0 ? "high" : "medium",
      content: `Total findings: ${findings.length} (Critical: ${severityCounts.critical}, High: ${severityCounts.high}, Medium: ${severityCounts.medium}, Low: ${severityCounts.low})`,
      data: options.includeEvidence !== false ? shown : undefined,
    });
  }

  // Recommendations
  const recommendations = findings.map((f) => f.recommendation);
  const uniqueRecommendations = [...new Set(recommendations)];

  return {
    id: generateId(),
    title: options.title ?? `Scan Report: ${scan.url}`,
    generatedAt: new Date().toISOString(),
    target: scan.url,
    type: "scan",
    summary: `Overall score: ${scan.overallScore}/100. ${findings.length} findings.`,
    score: scan.overallScore,
    sections,
    findings: severityCounts,
    recommendations: options.includeRecommendations !== false ? uniqueRecommendations : [],
    exportFormats: ["json", "markdown", "html"],
  };
}

// ── Scenario Report ─────────────────────────────────────────────────

export function generateScenarioReport(
  scenario: ScenarioResult,
  options: ReportOptions = {}
): Report {
  const sections: ReportSection[] = [];

  sections.push({
    title: "Scenario Execution",
    severity: scenario.recovered ? "info" : "critical",
    content: scenario.summary,
    data: {
      mode: scenario.mode,
      attempts: scenario.attempts.length,
      duration: scenario.totalDurationMs,
      recovered: scenario.recovered,
      usedRetry: scenario.usedRetry,
      usedFallback: scenario.usedFallback,
    },
  });

  if (scenario.recoveryEvidence) {
    sections.push({
      title: "Recovery Evidence",
      severity: scenario.recoveryEvidence.validResponse ? "info" : "high",
      content: `Expected: ${scenario.recoveryEvidence.expectedBehavior}\nActual: ${scenario.recoveryEvidence.actualBehavior}`,
      data: scenario.recoveryEvidence,
    });
  }

  // Attempts breakdown
  sections.push({
    title: "Attempt Details",
    severity: "info",
    content: scenario.attempts
      .map(
        (a) =>
          `Attempt ${a.attempt}: ${a.success ? "SUCCESS" : "FAIL"} (${a.durationMs}ms) ${a.errorMessage ?? ""}`
      )
      .join("\n"),
    data: options.includeEvidence !== false ? scenario.attempts : undefined,
  });

  const severity = !scenario.recovered ? "critical" : scenario.initialFailure ? "high" : "info";

  return {
    id: generateId(),
    title: options.title ?? `Reliability Test: ${scenario.target.url}`,
    generatedAt: new Date().toISOString(),
    target: scenario.target.url,
    type: "scenario",
    summary: scenario.summary,
    sections,
    findings: { critical: severity === "critical" ? 1 : 0, high: severity === "high" ? 1 : 0, medium: 0, low: 0, info: severity === "info" ? 1 : 0 },
    recommendations: scenario.recovered
      ? []
      : ["Improve error handling and retry logic", "Add fallback mechanisms", "Validate response schemas"],
    exportFormats: ["json", "markdown", "html"],
  };
}

// ── Gap Report ──────────────────────────────────────────────────────

export function generateGapReportDocument(
  gapReport: GapReport,
  options: ReportOptions = {}
): Report {
  const sections: ReportSection[] = [];

  sections.push({
    title: "Reliability Score",
    severity: gapReport.reliabilityScore.overall >= 80 ? "info" : gapReport.reliabilityScore.overall >= 50 ? "medium" : "high",
    content: `Overall: ${gapReport.reliabilityScore.overall}/100\nRetry: ${gapReport.reliabilityScore.retryEffectiveness}%\nFallback: ${gapReport.reliabilityScore.fallbackEffectiveness}%\nRecovery Speed: ${gapReport.reliabilityScore.recoverySpeedScore}%\nSchema: ${gapReport.reliabilityScore.schemaCompliance}%\nPerformance: ${gapReport.reliabilityScore.performanceScore}%`,
    data: gapReport.reliabilityScore,
  });

  if (gapReport.gaps.length > 0) {
    sections.push({
      title: "Identified Gaps",
      severity: gapReport.gaps.some((g) => g.severity === "critical") ? "critical" : "high",
      content: gapReport.gaps
        .map((g) => `[${g.severity.toUpperCase()}] ${g.category}: ${g.description}`)
        .join("\n"),
      data: options.includeEvidence !== false ? gapReport.gaps : undefined,
    });
  }

  const severityCounts = countBySeverity(gapReport.gaps);

  return {
    id: generateId(),
    title: options.title ?? `Gap Report: ${gapReport.target.url}`,
    generatedAt: new Date().toISOString(),
    target: gapReport.target.url,
    type: "reliability",
    summary: gapReport.summary,
    score: gapReport.reliabilityScore.overall,
    sections,
    findings: severityCounts,
    recommendations: options.includeRecommendations !== false
      ? gapReport.gaps.map((g) => g.recommendation)
      : [],
    exportFormats: ["json", "markdown", "html"],
  };
}
