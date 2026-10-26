import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server } from "node:http";
import { runScenario } from "../src/index.js";

// ── HTTP 429 / 500 / malformed end-to-end tests ────────────────────

let server: Server;
let port: number;

beforeAll(async () => {
  server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const mode = url.searchParams.get("mode") ?? "ok";

    if (mode === "429") {
      res.setHeader("Retry-After", "1");
      res.writeHead(429, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "rate limited" }));
      return;
    }

    if (mode === "500") {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "internal server error" }));
      return;
    }

    if (mode === "malformed") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end('{"broken": true'); // invalid JSON
      return;
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ mode: "ok" }));
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (addr && typeof addr === "object") port = addr.port;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

describe("HTTP 429 Scenario", () => {
  it("detects 429 and classifies as http_error", async () => {
    const result = await runScenario(
      { url: `http://127.0.0.1:${port}/respond?mode=429` },
      { mode: "http_429", maxRetries: 0 }
    );

    expect(result.recovered).toBe(false);
    expect(result.initialFailure).toBe(true);
    expect(result.attempts[0].statusCode).toBe(429);
    expect(result.attempts[0].errorType).toBe("http_error");
    expect(result.summary).toContain("FAIL");
  });

  it("recovers from 429 via retry", async () => {
    let call = 0;
    const srv = createServer((req, res) => {
      call++;
      if (call === 1) {
        res.writeHead(429, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "rate limited" }));
      } else {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      }
    });

    const p = await new Promise<number>((resolve) => {
      srv.listen(0, "127.0.0.1", () => {
        const a = srv.address();
        resolve(a && typeof a === "object" ? a.port : 0);
      });
    });

    const result = await runScenario(
      { url: `http://127.0.0.1:${p}/` },
      { mode: "http_429", maxRetries: 1, retryDelayMs: 50 }
    );

    expect(result.initialFailure).toBe(true);
    expect(result.recovered).toBe(true);
    expect(result.usedRetry).toBe(true);
    expect(result.attempts[0].statusCode).toBe(429);
    expect(result.attempts[1].success).toBe(true);
    srv.close();
  });
});

describe("HTTP 500 Scenario", () => {
  it("detects 500 and classifies as http_error", async () => {
    const result = await runScenario(
      { url: `http://127.0.0.1:${port}/respond?mode=500` },
      { mode: "http_500", maxRetries: 0 }
    );

    expect(result.recovered).toBe(false);
    expect(result.attempts[0].statusCode).toBe(500);
    expect(result.attempts[0].errorType).toBe("http_error");
  });
});

describe("Malformed Response Scenario", () => {
  it("detects invalid JSON and classifies as malformed_json", async () => {
    const result = await runScenario(
      { url: `http://127.0.0.1:${port}/respond?mode=malformed` },
      { mode: "malformed_response", maxRetries: 0 }
    );

    expect(result.recovered).toBe(false);
    expect(result.attempts[0].statusCode).toBe(200);
    expect(result.attempts[0].errorType).toBe("malformed_json");
    expect(result.attempts[0].errorMessage).toContain("not valid JSON");
  });
});
