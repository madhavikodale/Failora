import Fastify, { type FastifyInstance } from "fastify";
import { runScenario, type TestTarget, type ScenarioConfig, type FailureMode } from "@failora/core";
import {
  createTarget, listTargets, getTarget, removeTarget,
  createRun, getRun, listRuns, completeRun,
} from "./db.js";
import { createTargetSchema, createRunSchema } from "./schemas.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  app.get("/health", async () => ({ status: "ok" }));

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
