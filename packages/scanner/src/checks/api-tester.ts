// ── API Health Tester ───────────────────────────────────────────────

export interface APITestResult {
  endpoint: string;
  method: string;
  isHealthy: boolean;
  statusCode: number;
  responseTimeMs: number;
  expectedStatusCodes: number[];
  timeoutMs: number;
  responseSizeBytes: number;
  error?: string;
  checkedAt: string;
}

export interface APITestConfig {
  endpoint: string;
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: unknown;
  expectedStatusCodes?: number[];
  timeoutMs?: number;
}

export async function testAPIEndpoint(config: APITestConfig): Promise<APITestResult> {
  const method = config.method ?? "GET";
  const timeoutMs = config.timeoutMs ?? 10000;
  const expectedStatusCodes = config.expectedStatusCodes ?? [200, 201, 204];

  const start = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(config.endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...config.headers,
      },
      body: config.body !== undefined && method !== "GET" ? JSON.stringify(config.body) : undefined,
      signal: controller.signal,
    });

    const body = await res.text();
    const responseTimeMs = Math.round(performance.now() - start);
    clearTimeout(timer);

    return {
      endpoint: config.endpoint,
      method,
      isHealthy: expectedStatusCodes.includes(res.status),
      statusCode: res.status,
      responseTimeMs,
      expectedStatusCodes,
      timeoutMs,
      responseSizeBytes: new TextEncoder().encode(body).length,
      checkedAt: new Date().toISOString(),
    };
  } catch (err) {
    clearTimeout(timer);
    const responseTimeMs = Math.round(performance.now() - start);

    return {
      endpoint: config.endpoint,
      method,
      isHealthy: false,
      statusCode: 0,
      responseTimeMs,
      expectedStatusCodes,
      timeoutMs,
      responseSizeBytes: 0,
      error: err instanceof Error ? err.message : String(err),
      checkedAt: new Date().toISOString(),
    };
  }
}
