import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { runScenario, type TestTarget, type ScenarioConfig, type FailureMode } from "@failora/core";
import {
  createTarget, listTargets, getTarget, removeTarget,
  createRun, getRun, listRuns, completeRun,
  createScan, getScan, listScans, completeScan,
  createMonitor, getMonitor, listMonitors, setMonitorActive, removeMonitor,
  addMonitorHistory, getMonitorHistory, createAlert, getAlerts, acknowledgeAlert,
} from "./db.ts";
import { createTargetSchema, createRunSchema, createScanSchema, createMonitorSchema } from "./schemas.ts";
import { scanUrl, testAPIEndpoint, checkBrokenLinks } from "@failora/scanner";
import { scanRepo } from "@failora/github-scanner";
import { MonitorEngine } from "@failora/monitor";
import { AuthService } from "@failora/auth";
import { generateScanReport, generateScenarioReport, exportAsJSON, exportAsMarkdown, exportAsHTML } from "@failora/reports";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  await app.register(cors, {
    origin: (origin, cb) => {
      // Allow localhost dev servers (any port) and no-origin (curl, same-origin)
      if (!origin || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        cb(null, true);
      } else {
        cb(null, false);
      }
    },
  });

  app.get("/health", async () => ({ status: "ok" }));

  const monitorEngine = new MonitorEngine();
  const authService = new AuthService({ jwtSecret: "failora-secret-key-change-in-production" });

  // ── Targets CRUD ──────────────────────────────────────────────────

  app.post("/targets", async (req, reply) => {
    const parsed = createTargetSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation failed", details: parsed.error.issues });
    }
    const target = createTarget(parsed.data);
    return reply.status(201).send(target);
  });

  app.get("/targets", async () => {
    return listTargets();
  });

  app.get("/targets/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const target = getTarget(id);
    if (!target) return reply.status(404).send({ error: "Target not found" });
    return target;
  });

  app.delete("/targets/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const removed = removeTarget(id);
    if (!removed) return reply.status(404).send({ error: "Target not found" });
    return { deleted: true };
  });

  // ── Runs ──────────────────────────────────────────────────────────

  app.post("/runs", async (req, reply) => {
    const parsed = createRunSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation failed", details: parsed.error.issues });
    }

    const target = getTarget(parsed.data.target_id);
    if (!target) return reply.status(404).send({ error: "Target not found" });

    const run = createRun(parsed.data);

    // Execute scenario async (don't block response)
    executeScenario(run.id, target, parsed.data).catch((err) => {
      completeRun(run.id, "error", { error: String(err) });
    });

    return reply.status(202).send(run);
  });

  app.get("/runs", async (req) => {
    const { target_id } = req.query as { target_id?: string };
    return listRuns(target_id);
  });

  app.get("/runs/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const run = getRun(id);
    if (!run) return reply.status(404).send({ error: "Run not found" });
    return run;
  });

  // ── Scans ─────────────────────────────────────────────────────────

  app.post("/scans", async (req, reply) => {
    const parsed = createScanSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation failed", details: parsed.error.issues });
    }

    const scan = createScan(parsed.data.url);

    // Execute scan async
    executeScan(scan.id, parsed.data.url).catch((err) => {
      completeScan(scan.id, "error", { error: String(err) });
    });

    return reply.status(202).send(scan);
  });

  app.get("/scans", async () => {
    return listScans();
  });

  app.get("/scans/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const scan = getScan(id);
    if (!scan) return reply.status(404).send({ error: "Scan not found" });
    return scan;
  });

  // ── Monitors ──────────────────────────────────────────────────────

  app.post("/monitors", async (req, reply) => {
    const parsed = createMonitorSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation failed", details: parsed.error.issues });
    }
    const monitor = createMonitor(parsed.data);
    return reply.status(201).send(monitor);
  });

  app.get("/monitors", async () => {
    return listMonitors();
  });

  app.get("/monitors/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const monitor = getMonitor(id);
    if (!monitor) return reply.status(404).send({ error: "Monitor not found" });
    const history = getMonitorHistory(id, 50);
    return { ...monitor, history };
  });

  app.post("/monitors/:id/start", async (req, reply) => {
    const { id } = req.params as { id: string };
    const monitor = getMonitor(id);
    if (!monitor) return reply.status(404).send({ error: "Monitor not found" });
    setMonitorActive(id, true);
    return { started: true };
  });

  app.post("/monitors/:id/stop", async (req, reply) => {
    const { id } = req.params as { id: string };
    const monitor = getMonitor(id);
    if (!monitor) return reply.status(404).send({ error: "Monitor not found" });
    setMonitorActive(id, false);
    return { stopped: true };
  });

  app.delete("/monitors/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const removed = removeMonitor(id);
    if (!removed) return reply.status(404).send({ error: "Monitor not found" });
    return { deleted: true };
  });

  app.get("/monitors/:id/history", async (req, reply) => {
    const { id } = req.params as { id: string };
    const monitor = getMonitor(id);
    if (!monitor) return reply.status(404).send({ error: "Monitor not found" });
    const history = getMonitorHistory(id, 100);
    return history;
  });

  // ── Alerts ────────────────────────────────────────────────────────

  app.get("/alerts", async (req) => {
    const { monitor_id } = req.query as { monitor_id?: string };
    return getAlerts(monitor_id);
  });

  app.post("/alerts/:id/acknowledge", async (req, reply) => {
    const { id } = req.params as { id: string };
    const success = acknowledgeAlert(id);
    if (!success) return reply.status(404).send({ error: "Alert not found" });
    return { acknowledged: true };
  });

  // ── API Testing ───────────────────────────────────────────────────

  app.post("/test-api", async (req, reply) => {
    const { endpoint, method, headers, body, expected_status_codes, timeout_ms } = req.body as {
      endpoint: string;
      method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
      headers?: Record<string, string>;
      body?: unknown;
      expected_status_codes?: number[];
      timeout_ms?: number;
    };

    if (!endpoint) {
      return reply.status(400).send({ error: "endpoint is required" });
    }

    const result = await testAPIEndpoint({
      endpoint,
      method,
      headers,
      body,
      expectedStatusCodes: expected_status_codes,
      timeoutMs: timeout_ms,
    });

    return result;
  });

  // ── Broken Links ──────────────────────────────────────────────────

  app.post("/check-links", async (req, reply) => {
    const { url, max_links } = req.body as { url: string; max_links?: number };
    if (!url) {
      return reply.status(400).send({ error: "url is required" });
    }

    try {
      const result = await checkBrokenLinks(url, max_links ?? 50);
      return result;
    } catch (err) {
      return reply.status(500).send({ error: String(err) });
    }
  });

  // ── Auth Routes ───────────────────────────────────────────────────

  app.post("/auth/register", async (req, reply) => {
    const { email, name, password } = req.body as { email: string; name: string; password: string };
    if (!email || !name || !password) {
      return reply.status(400).send({ error: "email, name, and password are required" });
    }
    const result = authService.register(email, name, password);
    if (!result.success) {
      return reply.status(400).send({ error: result.error });
    }
    return reply.status(201).send(result);
  });

  app.post("/auth/login", async (req, reply) => {
    const { email, password } = req.body as { email: string; password: string };
    if (!email || !password) {
      return reply.status(400).send({ error: "email and password are required" });
    }
    const result = authService.login(email, password);
    if (!result.success) {
      return reply.status(401).send({ error: result.error });
    }
    return result;
  });

  app.get("/auth/me", async (req, reply) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      return reply.status(401).send({ error: "Missing or invalid Authorization header" });
    }
    const token = auth.slice(7);
    const user = authService.verifyToken(token);
    if (!user) {
      return reply.status(401).send({ error: "Invalid or expired token" });
    }
    return user;
  });

  // ── Report Routes ─────────────────────────────────────────────────

  app.get("/reports/scan/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const scan = getScan(id);
    if (!scan) return reply.status(404).send({ error: "Scan not found" });

    const scanResult = JSON.parse(scan.result ?? "{}");
    const report = generateScanReport(scanResult);

    const format = (req.query as { format?: string }).format ?? "json";
    if (format === "markdown") {
      return reply.type("text/plain").send(exportAsMarkdown(report));
    }
    if (format === "html") {
      return reply.type("text/html").send(exportAsHTML(report));
    }
    return report;
  });

  app.get("/reports/run/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const run = getRun(id);
    if (!run) return reply.status(404).send({ error: "Run not found" });

    const scenarioResult = JSON.parse(run.result ?? "{}");
    const report = generateScenarioReport(scenarioResult);

    const format = (req.query as { format?: string }).format ?? "json";
    if (format === "markdown") {
      return reply.type("text/plain").send(exportAsMarkdown(report));
    }
    if (format === "html") {
      return reply.type("text/html").send(exportAsHTML(report));
    }
    return report;
  });

  // ── GitHub Repo Scan ──────────────────────────────────────────────

  app.post("/scan-repo", async (req, reply) => {
    const { owner, repo, branch, token } = req.body as {
      owner: string;
      repo: string;
      branch?: string;
      token?: string;
    };

    if (!owner || !repo) {
      return reply.status(400).send({ error: "owner and repo are required" });
    }

    try {
      const result = await scanRepo({ owner, repo, branch, token });
      return result;
    } catch (err) {
      return reply.status(500).send({ error: String(err) });
    }
  });

  return app;
}

// ── Scenario Execution ──────────────────────────────────────────────

async function executeScenario(
  runId: string,
  targetRow: { url: string; method: string; headers: string | null; body: string | null },
  config: { mode: string; timeout_ms?: number; max_retries?: number; retry_delay_ms?: number }
): Promise<void> {
  const testTarget: TestTarget = {
    url: targetRow.url,
    method: targetRow.method as TestTarget["method"],
    headers: targetRow.headers ? JSON.parse(targetRow.headers) : undefined,
    body: targetRow.body ? JSON.parse(targetRow.body) : undefined,
  };

  const scenarioConfig: ScenarioConfig = {
    mode: config.mode as FailureMode,
    timeoutMs: config.timeout_ms,
    maxRetries: config.max_retries,
    retryDelayMs: config.retry_delay_ms,
  };

  const result = await runScenario(testTarget, scenarioConfig);
  const status = result.recovered ? "completed" : "failed";
  completeRun(runId, status, result);
}

// ── Scan Execution ──────────────────────────────────────────────────

async function executeScan(scanId: string, url: string): Promise<void> {
  const result = await scanUrl(url);
  const status = result.health.isUp ? "completed" : "failed";
  completeScan(scanId, status, result, result.overallScore);
}
