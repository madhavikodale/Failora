import type { ScenarioConfig, ScenarioResult, TestTarget } from "../types.js";
import { executeAttempt } from "./attempt.js";

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
  let summary: string;

  if (!initialFailure) {
    summary = `PASS: request succeeded on first attempt (${lastAttempt.durationMs}ms)`;
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
    summary,
  };
}
