import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

const PORT = Number(process.env.MOCK_AI_PORT ?? 4100);

function sendJson(res: ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(payload);
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

// Simulated latency (ms). Overridable via ?delay= query param.
function getDelayMs(url: string): number {
  const parsed = new URL(url, `http://localhost:${PORT}`);
  const raw = parsed.searchParams.get("delay");
  if (!raw) return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 30_000) return 0;
  return n;
}

// Simulated failure mode via ?mode= query param:
//   - "ok"      → 200 with valid JSON
//   - "slow"    → delays by ?delay= ms then 200 (useful for timeout tests)
//   - "429"     → 429 with Retry-After header
//   - "500"     → 500 with error JSON
//   - "malformed" → 200 with invalid JSON body
function getMode(url: string): string {
  const parsed = new URL(url, `http://localhost:${PORT}`);
  return parsed.searchParams.get("mode") ?? "ok";
}

const server = createServer(async (req, res) => {
  const url = req.url ?? "/";
  const method = req.method ?? "GET";

  // Health check — no failure injection
  if (url.startsWith("/health")) {
    return sendJson(res, 200, { status: "ok" });
  }

  // Main test endpoint: /respond?mode=slow&delay=5000
  if (url.startsWith("/respond")) {
    const mode = getMode(url);
    const delayMs = getDelayMs(url);

    await readBody(req); // consume body so connection closes cleanly

    if (mode === "slow") {
      await new Promise((r) => setTimeout(r, delayMs));
      return sendJson(res, 200, { mode, delayMs, message: "slow response completed" });
    }

    if (mode === "429") {
      res.setHeader("Retry-After", "2");
      return sendJson(res, 429, { error: "rate limited", mode });
    }

    if (mode === "500") {
      return sendJson(res, 500, { error: "internal server error", mode });
    }

    if (mode === "malformed") {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end('{"error": "broken json"'); // intentionally invalid
    }

    return sendJson(res, 200, { mode: "ok", message: "normal response" });
  }

  return sendJson(res, 404, { error: "not found", path: url, method });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[mock-ai] listening on http://127.0.0.1:${PORT}`);
  console.log(`[mock-ai] endpoints:`);
  console.log(`  GET /health`);
  console.log(`  ANY /respond?mode=ok|slow|429|500|malformed&delay=<ms>`);
});
