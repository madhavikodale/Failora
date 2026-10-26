import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import { closeDb } from "../src/db.js";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
  closeDb();
});

describe("API Health", () => {
  it("GET /health returns ok", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });
});

describe("Targets CRUD", () => {
  let targetId: string;

  it("POST /targets creates a target", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/targets",
      payload: { name: "test-api", url: "http://127.0.0.1:4100/respond" },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.name).toBe("test-api");
    expect(body.id).toBeDefined();
    targetId = body.id;
  });

  it("GET /targets lists targets", async () => {
    const res = await app.inject({ method: "GET", url: "/targets" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  it("GET /targets/:id returns target", async () => {
    const res = await app.inject({ method: "GET", url: `/targets/${targetId}` });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(targetId);
  });

  it("POST /targets rejects invalid URL", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/targets",
      payload: { name: "bad", url: "not-a-url" },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("Runs", () => {
  it("POST /runs creates a run for existing target", async () => {
    // Create target first
    const t = await app.inject({
      method: "POST",
      url: "/targets",
      payload: { name: "run-target", url: "http://127.0.0.1:4100/respond?mode=ok" },
    });
    const targetId = t.json().id;

    const res = await app.inject({
      method: "POST",
      url: "/runs",
      payload: { target_id: targetId, mode: "timeout", timeout_ms: 2000 },
    });
    expect(res.statusCode).toBe(202);
    const body = res.json();
    expect(body.id).toBeDefined();
    expect(body.status).toBe("pending");
  });

  it("POST /runs rejects invalid target", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/runs",
      payload: { target_id: "00000000-0000-0000-0000-000000000000", mode: "timeout" },
    });
    expect(res.statusCode).toBe(404);
  });

  it("POST /runs rejects invalid mode", async () => {
    const t = await app.inject({
      method: "POST",
      url: "/targets",
      payload: { name: "bad-mode", url: "http://127.0.0.1:4100/respond" },
    });
    const res = await app.inject({
      method: "POST",
      url: "/runs",
      payload: { target_id: t.json().id, mode: "invalid_mode" },
    });
    expect(res.statusCode).toBe(400);
  });
});
