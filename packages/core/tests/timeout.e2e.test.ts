import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server } from "node:http";
import { runScenario } from "../src/index.js";

// ── End-to-end timeout test against a real local HTTP server ───────

let server: Server;
let port: number;

beforeAll(async () => {
  // Mock AI: /respond?mode=slow&delay=5000 simulates a slow endpoint
  server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const mode = url.searchParams.get("mode") ?? "ok";
    const delay = Number(url.searchParams.get("delay") ?? 0);

    if (mode === "slow") {
      setTimeout(() => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ mode: "slow", delayMs: delay }));
      }, delay);
    } else {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ mode: "ok" }));
    }
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (addr && typeof addr === "object") {
        port = addr.port;
      }
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

describe("Timeout Scenario (end-to-end)", () => {
  it("detects timeout when server is slower than timeoutMs", async () => {
    const result = await runScenario(
      { url: `http://127.0.0.1:${port}/respond?mode=slow&delay=5000` },
      { mode: "timeout", timeoutMs: 1000, maxRetries: 0 }
    );

    expect(result.mode).toBe("timeout");
    expect(result.recovered).toBe(false);
    expect(result.initialFailure).toBe(true);
    expect(result.attempts).toHaveLength(1);
    expect(result.attempts[0].errorType).toBe("timeout");
    expect(result.attempts[0].statusCode).toBe(0);
    expect(result.attempts[0].durationMs).toBeGreaterThanOrEqual(1000);
    expect(result.attempts[0].durationMs).toBeLessThan(3000); // should not wait for full 5000ms
    expect(result.summary).toContain("FAIL");
  });

  it("succeeds when server responds within timeoutMs", async () => {
    const result = await runScenario(
      { url: `http://127.0.0.1:${port}/respond?mode=ok` },
      { mode: "timeout", timeoutMs: 2000, maxRetries: 0 }
    );

    expect(result.recovered).toBe(true);
    expect(result.initialFailure).toBe(false);
    expect(result.attempts[0].success).toBe(true);
    expect(result.attempts[0].statusCode).toBe(200);
    expect(result.summary).toContain("PASS");
  });

  it("recovers via retry when first attempt times out but retry succeeds", async () => {
    // First call: slow (times out). Second call: fast (succeeds).
    let callCount = 0;
    const retryServer = createServer((req, res) => {
      callCount++;
      if (callCount === 1) {
        // First request: 2s delay, will timeout at 500ms
        setTimeout(() => {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ call: 1 }));
        }, 2000);
      } else {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ call: callCount }));
      }
    });

    const retryPort = await new Promise<number>((resolve) => {
      retryServer.listen(0, "127.0.0.1", () => {
        const addr = retryServer.address();
        resolve(addr && typeof addr === "object" ? addr.port : 0);
      });
    });

    const result = await runScenario(
      { url: `http://127.0.0.1:${retryPort}/` },
      { mode: "timeout", timeoutMs: 500, maxRetries: 1, retryDelayMs: 100 }
    );

    expect(result.initialFailure).toBe(true);
    expect(result.recovered).toBe(true);
    expect(result.usedRetry).toBe(true);
    expect(result.attempts).toHaveLength(2);
    expect(result.attempts[0].errorType).toBe("timeout");
    expect(result.attempts[1].success).toBe(true);
    expect(result.summary).toContain("RECOVERED");

    retryServer.close();
  });
});
