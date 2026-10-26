import type { AttemptResult, TestTarget } from "../types.js";

// ── Single HTTP attempt ─────────────────────────────────────────────

export async function executeAttempt(
  target: TestTarget,
  attemptNumber: number,
  timeoutMs: number
): Promise<AttemptResult> {
  const start = performance.now();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const method = target.method ?? "GET";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...target.headers,
    };

    const res = await fetch(target.url, {
      method,
      headers,
      body:
        target.body !== undefined && method !== "GET"
          ? JSON.stringify(target.body)
          : undefined,
      signal: controller.signal,
    });

    const rawBody = await res.text();
    const durationMs = Math.round(performance.now() - start);
    clearTimeout(timer);

    // Try to parse JSON
    let responseBody: unknown;
    let errorType: AttemptResult["errorType"];
    let errorMessage: string | undefined;

    try {
      responseBody = JSON.parse(rawBody);
    } catch {
      errorType = "malformed_json";
      errorMessage = `Response is not valid JSON (status ${res.status})`;
    }

    const success = res.ok && errorType === undefined;

    if (!res.ok && !errorType) {
      errorType = "http_error";
      errorMessage = `HTTP ${res.status}: ${res.statusText}`;
    }

    return {
      attempt: attemptNumber,
      success,
      statusCode: res.status,
      durationMs,
      errorType,
      errorMessage,
      responseBody,
      rawBody,
    };
  } catch (err) {
    clearTimeout(timer);
    const durationMs = Math.round(performance.now() - start);

    if (err instanceof Error && err.name === "AbortError") {
      return {
        attempt: attemptNumber,
        success: false,
        statusCode: 0,
        durationMs,
        errorType: "timeout",
        errorMessage: `Request timed out after ${timeoutMs}ms`,
      };
    }

    return {
      attempt: attemptNumber,
      success: false,
      statusCode: 0,
      durationMs,
      errorType: "network_error",
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  }
}
