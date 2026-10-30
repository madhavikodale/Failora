import type { PerformanceResult } from "../types.ts";

// ── Performance Analysis ────────────────────────────────────────────
// Measures timing breakdown using Node.js fetch with manual timing.

export async function analyzePerformance(
  url: string,
  timeoutMs = 30000
): Promise<PerformanceResult> {
  const start = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // We use a manual approach since Node fetch doesn't expose detailed timing
  // For MVP we measure total time + TTFB approximation
  const dnsStart = performance.now();

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

    const firstByteMs = Math.round(performance.now() - start);

    // Read body to measure download
    const bodyStart = performance.now();
    const body = await res.text();
    const downloadMs = Math.round(performance.now() - bodyStart);
    const totalTimeMs = Math.round(performance.now() - start);

    clearTimeout(timer);

    return {
      url,
      ttfbMs: firstByteMs,
      totalTimeMs,
      dnsLookupMs: 0, // Would need lower-level socket access
      tcpConnectMs: 0,
      tlsHandshakeMs: 0,
      firstByteMs,
      downloadMs,
      sizeBytes: new TextEncoder().encode(body).length,
    };
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}
