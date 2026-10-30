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

CREATE TABLE IF NOT EXISTS scans (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  overall_score INTEGER,
  status TEXT DEFAULT 'pending',
  result TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS monitors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  interval_sec INTEGER DEFAULT 60,
  timeout_ms INTEGER DEFAULT 10000,
  expected_status_codes TEXT DEFAULT '[200]',
  alert_threshold INTEGER DEFAULT 3,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS monitor_history (
  id TEXT PRIMARY KEY,
  monitor_id TEXT NOT NULL,
  is_up INTEGER,
  status_code INTEGER,
  latency_ms INTEGER,
  error TEXT,
  checked_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (monitor_id) REFERENCES monitors(id)
);

CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  monitor_id TEXT NOT NULL,
  rule_id TEXT,
  severity TEXT,
  title TEXT,
  message TEXT,
  evidence TEXT,
  sent_at TEXT DEFAULT (datetime('now')),
  acknowledged INTEGER DEFAULT 0,
  FOREIGN KEY (monitor_id) REFERENCES monitors(id)
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

export interface ScanRow {
  id: string;
  url: string;
  overall_score: number | null;
  status: string;
  result: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface MonitorRow {
  id: string;
  name: string;
  url: string;
  interval_sec: number;
  timeout_ms: number;
  expected_status_codes: string;
  alert_threshold: number;
  is_active: number;
  created_at: string;
}

export interface MonitorHistoryRow {
  id: string;
  monitor_id: string;
  is_up: number | null;
  status_code: number | null;
  latency_ms: number | null;
  error: string | null;
  checked_at: string;
}

export interface AlertRow {
  id: string;
  monitor_id: string;
  rule_id: string | null;
  severity: string;
  title: string;
  message: string;
  evidence: string;
  sent_at: string;
  acknowledged: number;
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

// ── Scan Queries ────────────────────────────────────────────────────

const insertScan = db.prepare(`
  INSERT INTO scans (id, url, status)
  VALUES (@id, @url, 'pending')
`);

const getScanById = db.prepare(`SELECT * FROM scans WHERE id = ?`);
const getAllScans = db.prepare(`SELECT * FROM scans ORDER BY created_at DESC`);
const updateScanStatus = db.prepare(`
  UPDATE scans SET status = @status, result = @result, overall_score = @overall_score, completed_at = datetime('now')
  WHERE id = @id
`);

// ── Monitor Queries ─────────────────────────────────────────────────

const insertMonitor = db.prepare(`
  INSERT INTO monitors (id, name, url, interval_sec, timeout_ms, expected_status_codes, alert_threshold, is_active)
  VALUES (@id, @name, @url, @interval_sec, @timeout_ms, @expected_status_codes, @alert_threshold, @is_active)
`);

const getMonitorById = db.prepare(`SELECT * FROM monitors WHERE id = ?`);
const getAllMonitors = db.prepare(`SELECT * FROM monitors ORDER BY created_at DESC`);
const updateMonitorActive = db.prepare(`UPDATE monitors SET is_active = ? WHERE id = ?`);
const deleteMonitor = db.prepare(`DELETE FROM monitors WHERE id = ?`);

const insertMonitorHistory = db.prepare(`
  INSERT INTO monitor_history (id, monitor_id, is_up, status_code, latency_ms, error)
  VALUES (@id, @monitor_id, @is_up, @status_code, @latency_ms, @error)
`);

const queryMonitorHistory = db.prepare(`
  SELECT * FROM monitor_history WHERE monitor_id = ? ORDER BY checked_at DESC LIMIT ?
`);

const insertAlert = db.prepare(`
  INSERT INTO alerts (id, monitor_id, rule_id, severity, title, message, evidence)
  VALUES (@id, @monitor_id, @rule_id, @severity, @title, @message, @evidence)
`);

const getAlertsByMonitor = db.prepare(`SELECT * FROM alerts WHERE monitor_id = ? ORDER BY sent_at DESC`);
const getAllAlerts = db.prepare(`SELECT * FROM alerts ORDER BY sent_at DESC`);
const acknowledgeAlertQuery = db.prepare(`UPDATE alerts SET acknowledged = 1 WHERE id = ?`);

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

// ── Scan Functions ──────────────────────────────────────────────────

export function createScan(url: string): ScanRow {
  const id = randomUUID();
  insertScan.run({ id, url });
  return getScanById.get(id) as ScanRow;
}

export function getScan(id: string): ScanRow | undefined {
  return getScanById.get(id) as ScanRow | undefined;
}

export function listScans(): ScanRow[] {
  return getAllScans.all() as ScanRow[];
}

export function completeScan(id: string, status: string, result: unknown, overallScore?: number): void {
  updateScanStatus.run({
    id,
    status,
    result: JSON.stringify(result),
    overall_score: overallScore ?? null,
  });
}

// ── Monitor Functions ───────────────────────────────────────────────

export function createMonitor(data: {
  name: string;
  url: string;
  interval_sec?: number;
  timeout_ms?: number;
  expected_status_codes?: number[];
  alert_threshold?: number;
}): MonitorRow {
  const id = randomUUID();
  insertMonitor.run({
    id,
    name: data.name,
    url: data.url,
    interval_sec: data.interval_sec ?? 60,
    timeout_ms: data.timeout_ms ?? 10000,
    expected_status_codes: JSON.stringify(data.expected_status_codes ?? [200]),
    alert_threshold: data.alert_threshold ?? 3,
    is_active: 1,
  });
  return getMonitorById.get(id) as MonitorRow;
}

export function getMonitor(id: string): MonitorRow | undefined {
  return getMonitorById.get(id) as MonitorRow | undefined;
}

export function listMonitors(): MonitorRow[] {
  return getAllMonitors.all() as MonitorRow[];
}

export function setMonitorActive(id: string, isActive: boolean): void {
  updateMonitorActive.run(isActive ? 1 : 0, id);
}

export function removeMonitor(id: string): boolean {
  return deleteMonitor.run(id).changes > 0;
}

export function addMonitorHistory(data: {
  monitor_id: string;
  is_up: boolean;
  status_code: number;
  latency_ms: number;
  error?: string;
}): void {
  insertMonitorHistory.run({
    id: randomUUID(),
    monitor_id: data.monitor_id,
    is_up: data.is_up ? 1 : 0,
    status_code: data.status_code,
    latency_ms: data.latency_ms,
    error: data.error ?? null,
  });
}

export function getMonitorHistory(monitorId: string, limit = 100): MonitorHistoryRow[] {
  return queryMonitorHistory.all(monitorId, limit) as MonitorHistoryRow[];
}

// ── Alert Functions ─────────────────────────────────────────────────

export function createAlert(data: {
  monitor_id: string;
  rule_id?: string;
  severity: string;
  title: string;
  message: string;
  evidence: unknown;
}): AlertRow {
  const id = randomUUID();
  insertAlert.run({
    id,
    monitor_id: data.monitor_id,
    rule_id: data.rule_id ?? null,
    severity: data.severity,
    title: data.title,
    message: data.message,
    evidence: JSON.stringify(data.evidence),
  });
  return { id, ...data, evidence: JSON.stringify(data.evidence), sent_at: new Date().toISOString(), acknowledged: 0 } as AlertRow;
}

export function getAlerts(monitorId?: string): AlertRow[] {
  if (monitorId) {
    return getAlertsByMonitor.all(monitorId) as AlertRow[];
  }
  return getAllAlerts.all() as AlertRow[];
}

export function acknowledgeAlert(id: string): boolean {
  return acknowledgeAlertQuery.run(id).changes > 0;
}
