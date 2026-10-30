import type { HealthCheckResult } from "../types.ts";

// ── Website Health Check ────────────────────────────────────────────
// Probes a URL and reports availability, status code, response time.

export async function checkHealth(
  url: string,
  timeoutMs = 10000
): Promise<HealthCheckResult> {
  const start = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "FailoraScanner/1.0 (+https://failora.dev)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    const responseTimeMs = Math.round(performance.now() - start);
    clearTimeout(timer);

    const headers: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return {
      url,
      isUp: res.ok,
      statusCode: res.status,
      responseTimeMs,
      redirectUrl: res.redirected ? res.url : undefined,
      headers,
      checkedAt: new Date().toISOString(),
    };
  } catch (err) {
    clearTimeout(timer);
    const responseTimeMs = Math.round(performance.now() - start);

    return {
      url,
      isUp: false,
      statusCode: 0,
      responseTimeMs,
      headers: {},
      checkedAt: new Date().toISOString(),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
