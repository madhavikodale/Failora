const API_BASE = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:4200";

export interface Target {
  id: string;
  name: string;
  url: string;
  method: string;
  headers: string | null;
  body: string | null;
  created_at: string;
}

export interface Run {
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

export interface ScanResult {
  id: string;
  url: string;
  status: string;
  overall_score: number | null;
  result: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface Monitor {
  id: string;
  name: string;
  url: string;
  method: string;
  interval_seconds: number;
  is_active: boolean;
  created_at: string;
}

export interface MonitorHistory {
  id: string;
  monitor_id: string;
  is_up: boolean;
  status_code: number | null;
  response_time_ms: number | null;
  checked_at: string;
}

export interface RepoScanFinding {
  severity: string;
  title: string;
  file?: string;
  line?: number;
  category?: string;
  description?: string;
  evidence?: string;
  impact?: string;
  recommendation?: string;
}

export interface RepoScanResult {
  owner: string;
  repo: string;
  branch?: string;
  score?: number;
  summary?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  findings?: RepoScanFinding[];
  scannedAt?: string;
  files?: {
    total: number;
    byLanguage: Record<string, number>;
  };
}

export interface AuthResult {
  success: boolean;
  user?: { id: string; email: string; name: string };
  token?: string;
  error?: string;
}

export interface Report {
  id: string;
  title: string;
  generatedAt: string;
  target: string;
  type: string;
  summary: string;
  score?: number;
  sections: Array<{
    title: string;
    content: string;
    severity?: string;
    data?: unknown;
  }>;
  findings: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  recommendations: string[];
}

export interface AttemptResult {
  attempt: number;
  success: boolean;
  statusCode?: number;
  durationMs: number;
  errorType?: string;
  errorMessage?: string;
}

export interface RunResult {
  scenario: string;
  target: string;
  totalAttempts: number;
  initialFailure: boolean;
  recovered: boolean;
  usedRetry: boolean;
  attempts: AttemptResult[];
  summary: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = (body as { error?: string }).error ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

function authHeaders(token: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export const api = {
  health: () => request<{ status: string }>("/health"),
  listTargets: () => request<Target[]>("/targets"),
  createTarget: (data: { name: string; url: string; method?: string }) =>
    request<Target>("/targets", { method: "POST", body: JSON.stringify(data) }),
  deleteTarget: (id: string) =>
    request<{ deleted: boolean }>(`/targets/${id}`, { method: "DELETE" }),
  listRuns: (targetId?: string) =>
    request<Run[]>(`/runs${targetId ? `?target_id=${targetId}` : ""}`),
  getRun: (id: string) => request<Run>(`/runs/${id}`),
  createRun: (data: {
    target_id: string;
    mode: string;
    timeout_ms?: number;
    max_retries?: number;
    retry_delay_ms?: number;
  }) => request<Run>("/runs", { method: "POST", body: JSON.stringify(data) }),

  // ── Scans ─────────────────────────────────────────────────────────
  createScan: (data: { url: string }) =>
    request<ScanResult>("/scans", { method: "POST", body: JSON.stringify(data) }),
  listScans: () => request<ScanResult[]>("/scans"),
  getScan: (id: string) => request<ScanResult>(`/scans/${id}`),

  // ── Monitors ──────────────────────────────────────────────────────
  createMonitor: (data: {
    name: string;
    url: string;
    method?: string;
    interval_seconds?: number;
  }) => request<Monitor>("/monitors", { method: "POST", body: JSON.stringify(data) }),
  listMonitors: () => request<Monitor[]>("/monitors"),
  getMonitor: (id: string) =>
    request<Monitor & { history: MonitorHistory[] }>(`/monitors/${id}`),
  toggleMonitor: (id: string, active: boolean) =>
    request<Monitor>(`/monitors/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: active }),
    }),

  // ── API Testing ───────────────────────────────────────────────────
  testAPI: (data: {
    name: string;
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
  }) => request<unknown>("/test-api", { method: "POST", body: JSON.stringify(data) }),
  checkLinks: (data: { url: string; max_links?: number }) =>
    request<unknown>("/check-links", { method: "POST", body: JSON.stringify(data) }),

  // ── GitHub Repo ───────────────────────────────────────────────────
  scanRepo: (data: { owner: string; repo: string; branch?: string; token?: string }) =>
    request<RepoScanResult>("/scan-repo", { method: "POST", body: JSON.stringify(data) }),

  // ── Auth ──────────────────────────────────────────────────────────
  register: (data: { email: string; name: string; password: string }) =>
    request<AuthResult>("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    request<AuthResult>("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  getMe: (token: string) =>
    request<{ id: string; email: string; name: string }>("/auth/me", {
      headers: authHeaders(token),
    }),

  // ── Reports ───────────────────────────────────────────────────────
  listReports: () => request<Array<{ id: number; name: string; period: string; format: string }>>("/reports"),
  getScanReport: (id: string, format?: string) =>
    request<Report>(`/reports/scan/${id}${format ? `?format=${format}` : ""}`),
  getRunReport: (id: string, format?: string) =>
    request<Report>(`/reports/run/${id}${format ? `?format=${format}` : ""}`),
};
