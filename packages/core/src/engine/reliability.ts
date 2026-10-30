import type { ReliabilityScore, GapReport, ScenarioResult, TestTarget } from "../types.ts";

// ── AI Reliability Scoring Engine ───────────────────────────────────

export function calculateReliabilityScore(results: ScenarioResult[]): ReliabilityScore {
  const evidence: string[] = [];

  // Retry effectiveness
  const withRetry = results.filter((r) => r.usedRetry);
  const retrySuccess = withRetry.filter((r) => r.recovered).length;
  const retryEffectiveness =
    withRetry.length > 0 ? Math.round((retrySuccess / withRetry.length) * 100) : 100;

  if (withRetry.length > 0) {
    evidence.push(
      `Retry: ${retrySuccess}/${withRetry.length} scenarios recovered via retry (${retryEffectiveness}%)`
    );
  }

  // Fallback effectiveness
  const withFallback = results.filter((r) => r.usedFallback);
  const fallbackSuccess = withFallback.filter((r) => r.recovered).length;
  const fallbackEffectiveness =
    withFallback.length > 0 ? Math.round((fallbackSuccess / withFallback.length) * 100) : 100;

  if (withFallback.length > 0) {
    evidence.push(
      `Fallback: ${fallbackSuccess}/${withFallback.length} scenarios recovered via fallback (${fallbackEffectiveness}%)`
    );
  }

  // Recovery speed
  const avgDuration =
    results.length > 0
      ? results.reduce((sum, r) => sum + r.totalDurationMs, 0) / results.length
      : 0;
  const recoverySpeedScore = Math.max(0, 100 - Math.round(avgDuration / 100));

  evidence.push(`Average recovery time: ${Math.round(avgDuration)}ms`);

  // Schema compliance
  const withSchema = results.filter((r) =>
    r.attempts.some((a) => a.schemaValid !== undefined)
  );
  const schemaPassed = withSchema.filter((r) =>
    r.attempts.every((a) => a.schemaValid !== false)
  ).length;
  const schemaCompliance =
    withSchema.length > 0 ? Math.round((schemaPassed / withSchema.length) * 100) : 100;

  if (withSchema.length > 0) {
    evidence.push(
      `Schema: ${schemaPassed}/${withSchema.length} scenarios passed schema validation (${schemaCompliance}%)`
    );
  }

  // Performance
  const allAttempts = results.flatMap((r) => r.attempts);
  const avgAttemptDuration =
    allAttempts.length > 0
      ? allAttempts.reduce((sum, a) => sum + a.durationMs, 0) / allAttempts.length
      : 0;
  const performanceScore = Math.max(0, 100 - Math.round(avgAttemptDuration / 50));

  evidence.push(`Average attempt duration: ${Math.round(avgAttemptDuration)}ms`);

  // Overall score
  const overall = Math.round(
    retryEffectiveness * 0.25 +
      fallbackEffectiveness * 0.2 +
      recoverySpeedScore * 0.2 +
      schemaCompliance * 0.2 +
      performanceScore * 0.15
  );

  return {
    overall,
    retryEffectiveness,
    fallbackEffectiveness,
    recoverySpeedScore,
    schemaCompliance,
    performanceScore,
    evidence,
  };
}

// ── Gap Detection from Results ──────────────────────────────────────

export function generateGapReport(
  target: TestTarget,
  results: ScenarioResult[]
): GapReport {
  const reliabilityScore = calculateReliabilityScore(results);
  const gaps: GapReport["gaps"] = [];

  // Check for no retry recovery
  const failedRetries = results.filter((r) => r.usedRetry && !r.recovered);
  if (failedRetries.length > 0) {
    gaps.push({
      severity: "critical",
      category: "retry_failure",
      description: `${failedRetries.length} scenarios failed to recover via retry`,
      evidence: failedRetries.map((r) => r.summary).join("; "),
      recommendation:
        "Improve retry logic with exponential backoff, jitter, and circuit breaker patterns.",
    });
  }

  // Check for no fallback
  const noFallback = results.filter((r) => !r.usedFallback && !r.recovered);
  if (noFallback.length > 0) {
    gaps.push({
      severity: "high",
      category: "missing_fallback",
      description: `${noFallback.length} scenarios had no fallback recovery`,
      evidence: noFallback.map((r) => r.summary).join("; "),
      recommendation:
        "Implement fallback endpoints, cached responses, or degraded mode for critical paths.",
    });
  }

  // Check for schema mismatches
  const schemaFailures = results.filter((r) =>
    r.attempts.some((a) => a.schemaValid === false)
  );
  if (schemaFailures.length > 0) {
    gaps.push({
      severity: "high",
      category: "schema_mismatch",
      description: `${schemaFailures.length} scenarios had schema validation failures`,
      evidence: schemaFailures.map((r) => r.summary).join("; "),
      recommendation:
        "Validate API contracts with schema testing. Use tools like Zod, Joi, or OpenAPI validation.",
    });
  }

  // Check for slow responses
  const slowResponses = results.filter((r) =>
    r.attempts.some((a) => a.errorType === "slow_response")
  );
  if (slowResponses.length > 0) {
    gaps.push({
      severity: "medium",
      category: "performance",
      description: `${slowResponses.length} scenarios had slow response times`,
      evidence: slowResponses.map((r) => r.summary).join("; "),
      recommendation:
        "Optimize response times through caching, CDN, database indexing, or async processing.",
    });
  }

  // Check for no recovery evidence
  const noEvidence = results.filter((r) => r.recovered && !r.recoveryEvidence);
  if (noEvidence.length > 0) {
    gaps.push({
      severity: "medium",
      category: "missing_evidence",
      description: `${noEvidence.length} recovered scenarios lack recovery evidence`,
      evidence: noEvidence.map((r) => r.summary).join("; "),
      recommendation:
        "Add structured logging and distributed tracing to capture recovery evidence.",
    });
  }

  const criticalGaps = gaps.filter((g) => g.severity === "critical").length;
  const highGaps = gaps.filter((g) => g.severity === "high").length;

  let summary: string;
  if (criticalGaps > 0) {
    summary = `CRITICAL: ${criticalGaps} critical gaps found. Reliability score: ${reliabilityScore.overall}/100`;
  } else if (highGaps > 0) {
    summary = `WARNING: ${highGaps} high-severity gaps found. Reliability score: ${reliabilityScore.overall}/100`;
  } else if (gaps.length > 0) {
    summary = `IMPROVEMENT: ${gaps.length} gaps found. Reliability score: ${reliabilityScore.overall}/100`;
  } else {
    summary = `EXCELLENT: No gaps found. Reliability score: ${reliabilityScore.overall}/100`;
  }

  return {
    target,
    scannedAt: new Date().toISOString(),
    reliabilityScore,
    gaps,
    summary,
  };
}
