import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";

const db = new Database("failora.db");
db.pragma("journal_mode = WAL");

// ── Schema ──────────────────────────────────────────────────────────

db.exec(`
CREATE TABLE IF NOT EXISTS targets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  method TEXT DEFAULT 'GET',
  headers TEXT,
  body TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  target_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  timeout_ms INTEGER,
  max_retries INTEGER DEFAULT 0,
  retry_delay_ms INTEGER DEFAULT 500,
  status TEXT DEFAULT 'pending',
  result TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (target_id) REFERENCES targets(id)
);
`);

// ── Types ───────────────────────────────────────────────────────────

export interface TargetRow {
  id: string;
  name: string;
  url: string;
  method: string;
  headers: string | null;
  body: string | null;
  created_at: string;
}

export interface RunRow {
  id: string;
  target_id: string;
  mode: string;
  timeout_ms: number | null;
  max_retries: number;
  retry_delay_ms: number;
  status: string;
  result: string | null;
  created_at: string;
  completed_at: string | null;
}

// ── Target Queries ──────────────────────────────────────────────────

const insertTarget = db.prepare(`
  INSERT INTO targets (id, name, url, method, headers, body)
  VALUES (@id, @name, @url, @method, @headers, @body)
`);

const getAllTargets = db.prepare(`SELECT * FROM targets ORDER BY created_at DESC`);
const getTargetById = db.prepare(`SELECT * FROM targets WHERE id = ?`);
const deleteTarget = db.prepare(`DELETE FROM targets WHERE id = ?`);

// ── Run Queries ─────────────────────────────────────────────────────

const insertRun = db.prepare(`
  INSERT INTO runs (id, target_id, mode, timeout_ms, max_retries, retry_delay_ms, status)
  VALUES (@id, @target_id, @mode, @timeout_ms, @max_retries, @retry_delay_ms, 'pending')
`);

const getRunById = db.prepare(`SELECT * FROM runs WHERE id = ?`);
const getAllRuns = db.prepare(`SELECT * FROM runs ORDER BY created_at DESC`);
const getRunsByTarget = db.prepare(`SELECT * FROM runs WHERE target_id = ? ORDER BY created_at DESC`);
const updateRunStatus = db.prepare(`
  UPDATE runs SET status = @status, result = @result, completed_at = datetime('now')
  WHERE id = @id
`);

// ── Exported Functions ──────────────────────────────────────────────

export function createTarget(data: {
  name: string;
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}): TargetRow {
  const id = randomUUID();
  insertTarget.run({
    id,
    name: data.name,
    url: data.url,
    method: data.method ?? "GET",
    headers: data.headers ? JSON.stringify(data.headers) : null,
    body: data.body !== undefined ? JSON.stringify(data.body) : null,
  });
  return getTargetById.get(id) as TargetRow;
}

export function listTargets(): TargetRow[] {
  return getAllTargets.all() as TargetRow[];
}

export function getTarget(id: string): TargetRow | undefined {
  return getTargetById.get(id) as TargetRow | undefined;
}

export function removeTarget(id: string): boolean {
  return deleteTarget.run(id).changes > 0;
}

export function createRun(data: {
  target_id: string;
  mode: string;
  timeout_ms?: number;
  max_retries?: number;
  retry_delay_ms?: number;
}): RunRow {
  const id = randomUUID();
  insertRun.run({
    id,
    target_id: data.target_id,
    mode: data.mode,
    timeout_ms: data.timeout_ms ?? null,
    max_retries: data.max_retries ?? 0,
    retry_delay_ms: data.retry_delay_ms ?? 500,
  });
  return getRunById.get(id) as RunRow;
}

export function getRun(id: string): RunRow | undefined {
  return getRunById.get(id) as RunRow | undefined;
}

export function listRuns(targetId?: string): RunRow[] {
  if (targetId) {
    return getRunsByTarget.all(targetId) as RunRow[];
  }
  return getAllRuns.all() as RunRow[];
}

export function completeRun(id: string, status: string, result: unknown): void {
  updateRunStatus.run({
    id,
    status,
    result: JSON.stringify(result),
  });
}

export function closeDb(): void {
  db.close();
}
