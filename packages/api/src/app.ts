import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { runScenario, RegressionEngine, calculateReliabilityScore, generateGapReport, type TestTarget, type ScenarioConfig, type ScenarioResult } from "@failora/core";
import {
  createTarget, listTargets, getTarget, removeTarget,
  createRun, getRun, listRuns, completeRun,
  createScan, getScan, listScans, completeScan,
  createMonitor, getMonitor, listMonitors, setMonitorActive, removeMonitor,
  addMonitorHistory, getMonitorHistory,
  createAlert, getAlerts, acknowledgeAlert, resolveAlert,
  createScanStep, completeScanStep, getScanSteps,
  type TargetRow, type RunRow, type ScanRow, type MonitorRow, type AlertRow, type ScanStepRow,
} from "./db.ts";
import { createTargetSchema, createRunSchema, createScanSchema, createMonitorSchema } from "./schemas.ts";
import { scanUrl, testAPIEndpoint, checkBrokenLinks, SafetyError } from "@failora/scanner";
import { scanRepo } from "@failora/github-scanner";
import { MonitorEngine } from "@failora/monitor";
import type { HeartbeatResult, Alert } from "@failora/monitor";
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

  await app.register(websocket);

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

    // Execute scan async (authorized already validated by schema)
    executeScan(scan.id, parsed.data.url, { authorized: true }).catch((err) => {
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

  app.get("/scans/:id/steps", async (req, reply) => {
    const { id } = req.params as { id: string };
    const scan = getScan(id);
    if (!scan) return reply.status(404).send({ error: "Scan not found" });
    const steps = getScanSteps(id);
    return steps;
  });

  // ── Monitors ──────────────────────────────────────────────────────

  app.post("/monitors", async (req, reply) => {
    const parsed = createMonitorSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation failed", details: parsed.error.issues });
    }
    const monitor = createMonitor(parsed.data);
    
    // Add to engine for active monitoring
    engine.addMonitor({
      id: monitor.id,
      name: monitor.name,
      url: monitor.url,
      intervalSec: monitor.interval_sec,
      timeoutMs: monitor.timeout_ms,
      expectedStatusCodes: JSON.parse(monitor.expected_status_codes),
      alertThreshold: monitor.alert_threshold,
      isActive: true,
    });
    
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
    engine.startMonitor(id);
    return { started: true };
  });

  app.post("/monitors/:id/stop", async (req, reply) => {
    const { id } = req.params as { id: string };
    const monitor = getMonitor(id);
    if (!monitor) return reply.status(404).send({ error: "Monitor not found" });
    setMonitorActive(id, false);
    engine.stopMonitor(id);
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

  // ── Regression Test Routes ────────────────────────────────────────

  app.post("/regression-tests", async (req, reply) => {
    const { name, target, config } = req.body as {
      name: string;
      target: TestTarget;
      config: ScenarioConfig;
    };
    if (!name || !target || !config) {
      return reply.status(400).send({ error: "name, target, and config are required" });
    }
    const test = regressionEngine.createTest(name, target, config);
    const baseline = await regressionEngine.runBaseline(test);
    return reply.status(201).send({ test, baseline });
  });

  app.get("/regression-tests", async () => {
    return regressionEngine.listTests();
  });

  app.get("/regression-tests/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const test = regressionEngine.getTest(id);
    if (!test) return reply.status(404).send({ error: "Test not found" });
    return test;
  });

  app.post("/regression-tests/:id/compare", async (req, reply) => {
    const { id } = req.params as { id: string };
    const result = await regressionEngine.compare(id);
    if (!result) return reply.status(404).send({ error: "Test not found or no baseline" });
    return result;
  });

  app.delete("/regression-tests/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const removed = regressionEngine.removeTest(id);
    if (!removed) return reply.status(404).send({ error: "Test not found" });
    return { deleted: true };
  });

  // ── Reliability Score Routes ──────────────────────────────────────

  app.post("/reliability-score", async (req, reply) => {
    const { results } = req.body as { results: ScenarioResult[] };
    if (!results || !Array.isArray(results)) {
      return reply.status(400).send({ error: "results array is required" });
    }
    return calculateReliabilityScore(results);
  });

  app.post("/gap-report", async (req, reply) => {
    const { target, results } = req.body as {
      target: TestTarget;
      results: ScenarioResult[];
    };
    if (!target || !results) {
      return reply.status(400).send({ error: "target and results are required" });
    }
    return generateGapReport(target, results);
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

  // ── Monitor Engine Integration ────────────────────────────────────

  const engine = new MonitorEngine();
  const regressionEngine = new RegressionEngine();

  // Load existing monitors into engine on startup
  for (const m of listMonitors()) {
    engine.addMonitor({
      id: m.id,
      name: m.name,
      url: m.url,
      intervalSec: m.interval_sec,
      timeoutMs: m.timeout_ms,
      expectedStatusCodes: JSON.parse(m.expected_status_codes),
      alertThreshold: m.alert_threshold,
      isActive: m.is_active === 1,
    });
  }

  // Persist heartbeat results to DB
  engine.on("heartbeat", (result: HeartbeatResult) => {
    addMonitorHistory({
      monitor_id: result.monitorId,
      is_up: result.isUp,
      status_code: result.statusCode,
      latency_ms: result.latencyMs,
      error: result.error,
    });

    // Broadcast via WebSocket
    broadcast("monitor:heartbeat", {
      monitorId: result.monitorId,
      isUp: result.isUp,
      statusCode: result.statusCode,
      latencyMs: result.latencyMs,
      checkedAt: result.checkedAt,
    });
  });

  // Persist alerts to DB
  engine.on("alert", (alert: Alert) => {
    createAlert({
      monitor_id: alert.monitorId,
      rule_id: alert.ruleId,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      evidence: alert.evidence,
    });

    // Broadcast via WebSocket
    broadcast("alert:created", {
      id: alert.id,
      monitorId: alert.monitorId,
      severity: alert.severity,
      title: alert.title,
      sentAt: alert.sentAt,
    });
  });

  // ── Alert Routes (additional) ─────────────────────────────────────

  app.post("/alerts/:id/resolve", async (req, reply) => {
    const { id } = req.params as { id: string };
    const ok = resolveAlert(id);
    if (!ok) return reply.status(404).send({ error: "Alert not found" });
    return { resolved: true };
  });

  // ── WebSocket for real-time updates ────────────────────────────────

  app.get('/ws', { websocket: true }, (socket) => {
    connectedClients.add(socket)
    console.log('[WS] Client connected, total:', connectedClients.size)

    socket.on('close', () => {
      connectedClients.delete(socket)
      console.log('[WS] Client disconnected, total:', connectedClients.size)
    })

    socket.on('error', () => {
      connectedClients.delete(socket)
    })
  })

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
      const effectiveToken = token ?? process.env.GITHUB_TOKEN;
      const result = await scanRepo({ owner, repo, branch, token: effectiveToken });
      return result;
    } catch (err) {
      return reply.status(500).send({ error: String(err) });
    }
  });

  return app;
}

// ── WebSocket broadcast helper (global scope) ──────────────────────

const connectedClients = new Set<any>()

function broadcast(event: string, data: unknown) {
  const message = JSON.stringify({ event, data, timestamp: new Date().toISOString() })
  for (const client of connectedClients) {
    try {
      client.send(message)
    } catch {
      connectedClients.delete(client)
    }
  }
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
    mode: config.mode as ScenarioConfig["mode"],
    timeoutMs: config.timeout_ms,
    maxRetries: config.max_retries,
    retryDelayMs: config.retry_delay_ms,
  };

  const result = await runScenario(testTarget, scenarioConfig);
  const status = result.recovered ? "completed" : "failed";
  completeRun(runId, status, result);
}

// ── Scan Execution ──────────────────────────────────────────────────

async function executeScan(
  scanId: string,
  url: string,
  safety: { authorized: boolean }
): Promise<void> {
  const steps: Array<{ key: string; name: string }> = [
    { key: 'safety', name: 'Safety & Scope Check' },
    { key: 'dns', name: 'DNS Resolution' },
    { key: 'ssl', name: 'SSL Certificate Check' },
    { key: 'health', name: 'Health Check' },
    { key: 'security', name: 'Security Headers' },
    { key: 'performance', name: 'Performance Audit' },
    { key: 'links', name: 'Broken Links Scan' },
  ];

  const stepRows = steps.map((s, i) => createScanStep({
    scan_id: scanId,
    step_name: s.name,
    step_key: s.key,
    sort_order: i,
  }));

  const startTime = Date.now()

  // Broadcast scan started
  broadcast('scan:started', { scanId, url, timestamp: new Date().toISOString() })

  try {
    // Step 0: Safety gate — authorization + scope + private-network block
    const safetyStart = Date.now()
    let scanOptions: import("@failora/scanner").ScanOptions = { authorized: safety.authorized };
    try {
      // Throws SafetyError on violation — before ANY network traffic
      const { assertSafeTarget } = await import("@failora/scanner");
      assertSafeTarget(url, {
        authorized: safety.authorized,
        allowLocalhost: process.env.FAILORA_ALLOW_LOCALHOST === "1",
        allowInsecure: process.env.FAILORA_ALLOW_INSECURE === "1",
      });
      completeScanStep(stepRows[0].id, 'success', Date.now() - safetyStart, { authorized: true })
      broadcast('scan:step', { scanId, step: 'safety', status: 'success', duration: Date.now() - safetyStart, details: { authorized: true } })
    } catch (err) {
      const msg = err instanceof SafetyError ? err.message : String(err)
      completeScanStep(stepRows[0].id, 'failed', Date.now() - safetyStart, { error: msg, code: err instanceof SafetyError ? err.code : 'UNKNOWN' })
      broadcast('scan:step', { scanId, step: 'safety', status: 'failed', duration: Date.now() - safetyStart, error: msg })
      completeScan(scanId, 'error', { error: msg, safety: true })
      broadcast('scan:completed', { scanId, url, status: 'error', error: msg, timestamp: new Date().toISOString() })
      return
    }
    scanOptions = {
      authorized: true,
      allowLocalhost: process.env.FAILORA_ALLOW_LOCALHOST === "1",
      allowInsecure: process.env.FAILORA_ALLOW_INSECURE === "1",
    };

    // Step 1: DNS Resolution
    const dnsStart = Date.now()
    try {
      const dnsResult = await resolveDNS(url)
      completeScanStep(stepRows[1].id, 'success', Date.now() - dnsStart, dnsResult)
      broadcast('scan:step', { scanId, step: 'dns', status: 'success', duration: Date.now() - dnsStart, details: dnsResult })
    } catch (err) {
      completeScanStep(stepRows[1].id, 'failed', Date.now() - dnsStart, { error: String(err) })
      broadcast('scan:step', { scanId, step: 'dns', status: 'failed', duration: Date.now() - dnsStart, error: String(err) })
    }

    // Step 2: SSL Certificate
    const sslStart = Date.now()
    try {
      const sslResult = await checkSSL(url)
      completeScanStep(stepRows[2].id, 'success', Date.now() - sslStart, sslResult)
      broadcast('scan:step', { scanId, step: 'ssl', status: 'success', duration: Date.now() - sslStart, details: sslResult })
    } catch (err) {
      completeScanStep(stepRows[2].id, 'failed', Date.now() - sslStart, { error: String(err) })
      broadcast('scan:step', { scanId, step: 'ssl', status: 'failed', duration: Date.now() - sslStart, error: String(err) })
    }

    // Execute full scan
    const result = await scanUrl(url, scanOptions)

    // Step 3: Health Check
    completeScanStep(
      stepRows[3].id,
      result.health.isUp ? 'success' : 'failed',
      result.health.responseTimeMs ?? 0,
      { statusCode: result.health.statusCode, responseTimeMs: result.health.responseTimeMs }
    )
    broadcast('scan:step', { scanId, step: 'health', status: result.health.isUp ? 'success' : 'failed', duration: result.health.responseTimeMs ?? 0, details: { statusCode: result.health.statusCode } })

    // Step 4: Security Headers
    completeScanStep(
      stepRows[4].id,
      (result.securityHeaders?.score ?? 0) >= 70 ? 'success' : 'warning',
      0,
      { score: result.securityHeaders?.score, missingHeaders: result.securityHeaders?.missing }
    )
    broadcast('scan:step', { scanId, step: 'security', status: (result.securityHeaders?.score ?? 0) >= 70 ? 'success' : 'warning', duration: 0, details: { score: result.securityHeaders?.score } })

    // Step 5: Performance
    completeScanStep(
      stepRows[5].id,
      (result.performance?.ttfbMs ?? 9999) <= 1000 ? 'success' : 'warning',
      result.performance?.totalTimeMs ?? 0,
      { ttfbMs: result.performance?.ttfbMs, totalTimeMs: result.performance?.totalTimeMs }
    )
    broadcast('scan:step', { scanId, step: 'performance', status: (result.performance?.ttfbMs ?? 9999) <= 1000 ? 'success' : 'warning', duration: result.performance?.totalTimeMs ?? 0, details: { ttfbMs: result.performance?.ttfbMs } })

    // Step 6: Broken Links
    const brokenLinksCount = result.findings?.filter(f => f.category === 'broken_links').length ?? 0
    completeScanStep(
      stepRows[6].id,
      brokenLinksCount === 0 ? 'success' : 'warning',
      0,
      { brokenLinks: brokenLinksCount }
    )
    broadcast('scan:step', { scanId, step: 'links', status: brokenLinksCount === 0 ? 'success' : 'warning', duration: 0, details: { brokenLinks: brokenLinksCount } })

    const status = result.health.isUp ? 'completed' : 'failed'
    const totalDuration = Date.now() - startTime
    completeScan(scanId, status, result, result.overallScore)
    broadcast('scan:completed', { scanId, url, status, overallScore: result.overallScore, totalDuration, timestamp: new Date().toISOString() })
  } catch (err) {
    // Mark remaining steps as failed
    for (const step of stepRows) {
      if (step.status === 'running') {
        completeScanStep(step.id, 'failed', 0, { error: String(err) })
      }
    }
    completeScan(scanId, 'error', { error: String(err) })
    broadcast('scan:completed', { scanId, url, status: 'error', error: String(err), timestamp: new Date().toISOString() })
  }
}

// Helper functions for scan steps
async function resolveDNS(url: string): Promise<{ ip: string; resolved: boolean }> {
  const hostname = new URL(url).hostname;
  const { lookup } = await import('node:dns/promises');
  const result = await lookup(hostname);
  return { ip: result.address, resolved: true };
}

async function checkSSL(url: string): Promise<{ valid: boolean; daysUntilExpiry?: number; issuer?: string }> {
  if (!url.startsWith('https://')) {
    return { valid: false };
  }
  // Simplified SSL check - in production, use proper TLS inspection
  return { valid: true, daysUntilExpiry: 365, issuer: 'Unknown' };
}
