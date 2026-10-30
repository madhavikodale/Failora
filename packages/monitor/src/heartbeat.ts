import type { HeartbeatResult, MonitorConfig } from "../types.ts";

// ── Heartbeat Checker ───────────────────────────────────────────────

export async function checkHeartbeat(
  config: MonitorConfig
): Promise<HeartbeatResult> {
  const start = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const res = await fetch(config.url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "FailoraMonitor/1.0",
        Accept: "*/*",
      },
    });

    const latencyMs = Math.round(performance.now() - start);
    clearTimeout(timer);

    const isUp = config.expectedStatusCodes.includes(res.status);

    return {
      monitorId: config.id,
      url: config.url,
      isUp,
      statusCode: res.status,
      latencyMs,
      checkedAt: new Date().toISOString(),
    };
  } catch (err) {
    clearTimeout(timer);
    const latencyMs = Math.round(performance.now() - start);

    return {
      monitorId: config.id,
      url: config.url,
      isUp: false,
      statusCode: 0,
      latencyMs,
      checkedAt: new Date().toISOString(),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
