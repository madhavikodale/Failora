import type { ScenarioConfig, ScenarioResult, TestTarget } from "../types.ts";
import { executeAttempt } from "./attempt.ts";

// ── Scenario Runner ─────────────────────────────────────────────────
// Executes a failure scenario against a target with optional retries.
// Records every attempt and evaluates recovery behavior.

export async function runScenario(
  target: TestTarget,
  config: ScenarioConfig
): Promise<ScenarioResult> {
  const start = performance.now();
  const attempts = [];
  const maxRetries = config.maxRetries ?? 0;
  const maxAttempts = 1 + maxRetries;
  const timeoutMs = config.timeoutMs ?? 5000;
  const retryDelayMs = config.retryDelayMs ?? 500;

  let recovered = false;
  let usedRetry = false;
  let initialFailure = false;

  for (let i = 1; i <= maxAttempts; i++) {
    const result = await executeAttempt(target, i, timeoutMs);
    attempts.push(result);

    if (i === 1 && !result.success) {
      initialFailure = true;
    }

    if (result.success) {
      if (i > 1) {
        usedRetry = true;
      }
      recovered = true;
      break;
    }

    // Wait before next retry
    if (i < maxAttempts) {
      await new Promise((r) => setTimeout(r, retryDelayMs));
    }
  }

  const totalDurationMs = Math.round(performance.now() - start);

  const lastAttempt = attempts[attempts.length - 1];
  let usedFallback = false;
  let behaviorValidated = false;
  let recoveryEvidence: ScenarioResult["recoveryEvidence"];

  // Try fallback if all attempts failed and fallback URL provided
  if (!recovered && config.fallbackUrl) {
    const fallbackTarget: TestTarget = { ...target, url: config.fallbackUrl };
    const fallbackResult = await executeAttempt(fallbackTarget, attempts.length + 1, timeoutMs);
    fallbackResult.usedFallback = true;
    attempts.push(fallbackResult);
    usedFallback = true;

    if (fallbackResult.success) {
      recovered = true;
    }
  }

  // Validate expected behavior
  if (config.expectedBehavior && lastAttempt) {
    const actualBehavior = lastAttempt.success
      ? `Request succeeded with status ${lastAttempt.statusCode} in ${lastAttempt.durationMs}ms`
      : `Request failed: ${lastAttempt.errorMessage ?? "unknown error"}`;

    behaviorValidated = lastAttempt.success;
    recoveryEvidence = {
      expectedBehavior: config.expectedBehavior,
      actualBehavior,
      validResponse: lastAttempt.success,
      timestamp: new Date().toISOString(),
    };
  }

  let summary: string;

  if (!initialFailure) {
    summary = `PASS: request succeeded on first attempt (${lastAttempt.durationMs}ms)`;
  } else if (recovered && usedFallback) {
    summary = `RECOVERED VIA FALLBACK: primary failed, fallback succeeded after ${attempts.length} attempts`;
  } else if (recovered && usedRetry) {
    summary = `RECOVERED: initial failure, succeeded after ${attempts.length} attempts`;
  } else if (recovered) {
    summary = `PASS: request succeeded`;
  } else {
    summary = `FAIL: all ${attempts.length} attempts failed. Last error: ${lastAttempt.errorMessage ?? "unknown"}`;
  }

  return {
    mode: config.mode,
    target,
    attempts,
    totalDurationMs,
    recovered,
    usedRetry,
    initialFailure,
    usedFallback,
    behaviorValidated,
    recoveryEvidence,
    summary,
  };
}
