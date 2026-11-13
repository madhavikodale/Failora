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
  interval_sec: number;
  timeout_ms: number;
  expected_status_codes: string;
  alert_threshold: number;
  is_active: boolean;
  created_at: string;
}

export interface MonitorHistory {
  id: string;
  monitor_id: string;
  is_up: number | null;
  status_code: number | null;
  latency_ms: number | null;
  error: string | null;
  checked_at: string;
}

export interface RepoScanFinding {
  id: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  file?: string;
  line?: number;
  evidence?: string;
  impact?: string;
  recommendation?: string;
  verification_status?: string;
}

export interface RepoScanCheck {
  name: string;
  description: string;
  severity: string;
  filesScanned: number;
  matchesFound: number;
  status: "passed" | "failed" | "skipped";
  languages: string[];
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
    analyzed: number;
    skipped: number;
    byLanguage: Record<string, number>;
    skippedReasons: {
      tooLarge: number;
      empty: number;
      overLimit: number;
    };
  };
  scan?: {
    durationMs: number;
    startedAt: string;
    completedAt: string;
    maxFilesLimit: number;
    maxFileSizeBytes: number;
    limitReached: boolean;
    coverage: number;
  };
  checks?: RepoScanCheck[];
}

export interface ScanStep {
  id: string;
  scan_id: string;
  step_name: string;
  step_key: string;
  status: string;
  duration_ms: number | null;
  details: string | null;
  started_at: string;
  completed_at: string | null;
  sort_order: number;
}

export interface Alert {
  id: string;
  monitor_id: string;
  severity: string;
  title: string;
  message: string;
  evidence: string | null;
  sent_at: string;
  acknowledged: number;
}

export interface ScenarioConfig {
  mode: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  fallbackUrl?: string;
  expectedBehavior?: string;
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
  schemaValid?: boolean;
}

export interface ScenarioResult {
  mode: string;
  target: TestTarget;
  attempts: AttemptResult[];
  totalDurationMs: number;
  recovered: boolean;
  usedRetry: boolean;
  initialFailure: boolean;
  usedFallback: boolean;
  behaviorValidated: boolean;
  recoveryEvidence?: {
    expectedBehavior: string;
    actualBehavior: string;
    validResponse: boolean;
    timestamp: string;
  };
  summary: string;
}

export interface TestTarget {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface RegressionTest {
  id: string;
  name: string;
  target: TestTarget;
  config: ScenarioConfig;
  baselineResult?: ScenarioResult;
  createdAt: string;
}

export interface RegressionResult {
  testId: string;
  baselinePassed: boolean;
  currentPassed: boolean;
  isRegression: boolean;
  degradationPoints: string[];
  improvementPoints: string[];
  comparedAt: string;
}

export interface ReliabilityScore {
  overall: number;
  retryEffectiveness: number;
  fallbackEffectiveness: number;
  recoverySpeedScore: number;
  schemaCompliance: number;
  performanceScore: number;
  evidence: string[];
}

export interface GapReport {
  target: TestTarget;
  scannedAt: string;
  reliabilityScore: ReliabilityScore;
  gaps: Array<{
    severity: string;
    category: string;
    description: string;
    evidence: string;
    recommendation: string;
  }>;
  summary: string;
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
  createScan: (data: { url: string; authorized?: boolean }) =>
    request<ScanResult>("/scans", { method: "POST", body: JSON.stringify(data) }),
  listScans: () => request<ScanResult[]>("/scans"),
  getScan: (id: string) => request<ScanResult>(`/scans/${id}`),
  getScanSteps: (id: string) => request<ScanStep[]>(`/scans/${id}/steps`),

  // ── Alerts ──────────────────────────────────────────────────────────
  getAlerts: (monitorId?: string) => {
    const qs = monitorId ? `?monitor_id=${encodeURIComponent(monitorId)}` : '';
    return request<Alert[]>(`/alerts${qs}`);
  },
  acknowledgeAlert: (id: string) =>
    request<{ acknowledged: boolean }>(`/alerts/${id}/acknowledge`, { method: 'POST' }),
  resolveAlert: (id: string) =>
    request<{ resolved: boolean }>(`/alerts/${id}/resolve`, { method: 'POST' }),

  // ── Monitors ──────────────────────────────────────────────────────
  createMonitor: (data: {
    name: string;
    url: string;
    interval_sec?: number;
    timeout_ms?: number;
    expected_status_codes?: number[];
    alert_threshold?: number;
  }) => request<Monitor>("/monitors", { method: "POST", body: JSON.stringify(data) }),
  listMonitors: () => request<Monitor[]>("/monitors"),
  getMonitor: (id: string) => request<Monitor>(`/monitors/${id}`),
  getMonitorHistory: (id: string, limit?: number) =>
    request<MonitorHistory[]>(`/monitors/${id}/history${limit ? `?limit=${limit}` : ''}`),
  toggleMonitor: (id: string, active: boolean) =>
    request<Monitor>(`/monitors/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: active }),
    }),
  deleteMonitor: (id: string) =>
    request<{ success: boolean }>(`/monitors/${id}`, { method: "DELETE" }),

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

  // ── Regression Testing ────────────────────────────────────────────
  createRegressionTest: (data: { name: string; target: TestTarget; config: ScenarioConfig }) =>
    request<{ test: RegressionTest; baseline: ScenarioResult }>("/regression-tests", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  listRegressionTests: () => request<RegressionTest[]>("/regression-tests"),
  getRegressionTest: (id: string) => request<RegressionTest>(`/regression-tests/${id}`),
  compareRegressionTest: (id: string) =>
    request<RegressionResult>(`/regression-tests/${id}/compare`, { method: "POST" }),
  deleteRegressionTest: (id: string) =>
    request<{ deleted: boolean }>(`/regression-tests/${id}`, { method: "DELETE" }),

  // ── Reliability & Gap Analysis ────────────────────────────────────
  calculateReliabilityScore: (results: ScenarioResult[]) =>
    request<ReliabilityScore>("/reliability-score", {
      method: "POST",
      body: JSON.stringify({ results }),
    }),
  generateGapReport: (target: TestTarget, results: ScenarioResult[]) =>
    request<GapReport>("/gap-report", {
      method: "POST",
      body: JSON.stringify({ target, results }),
    }),

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
