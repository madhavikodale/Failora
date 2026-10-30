import type { AttemptResult, TestTarget } from "../types.ts";

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

    // Validate schema if provided
    let schemaValid: boolean | undefined;
    if (target.expectedSchema && responseBody) {
      schemaValid = validateSchema(responseBody, target.expectedSchema);
      if (!schemaValid) {
        errorType = "schema_mismatch";
        errorMessage = "Response does not match expected schema";
      }
    }

    // Check response time threshold
    if (target.maxResponseTimeMs && durationMs > target.maxResponseTimeMs) {
      errorType = "slow_response";
      errorMessage = `Response took ${durationMs}ms, exceeded threshold of ${target.maxResponseTimeMs}ms`;
    }

    return {
      attempt: attemptNumber,
      success: success && schemaValid !== false,
      statusCode: res.status,
      durationMs,
      errorType,
      errorMessage,
      responseBody,
      rawBody,
      schemaValid,
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

// ── Simple Schema Validation ────────────────────────────────────────

function validateSchema(data: unknown, schema: Record<string, unknown>): boolean {
  if (typeof data !== "object" || data === null) return false;

  const obj = data as Record<string, unknown>;

  for (const [key, expectedType] of Object.entries(schema)) {
    if (!(key in obj)) return false;

    const actual = obj[key];
    const expected = expectedType as string;

    switch (expected) {
      case "string":
        if (typeof actual !== "string") return false;
        break;
      case "number":
        if (typeof actual !== "number") return false;
        break;
      case "boolean":
        if (typeof actual !== "boolean") return false;
        break;
      case "object":
        if (typeof actual !== "object" || actual === null) return false;
        break;
      case "array":
        if (!Array.isArray(actual)) return false;
        break;
      default:
        // For nested schemas, just check it exists
        if (actual === undefined || actual === null) return false;
    }
  }

  return true;
}
