// ── Failora Core Types ──────────────────────────────────────────────

export type FailureMode =
  | "timeout"
  | "http_429"
  | "http_500"
  | "malformed_response"
  | "network_error"
  | "dns_failure"
  | "ssl_expired"
  | "partial_response"
  | "slow_response"
  | "content_mismatch";

export interface TestTarget {
  /** Full URL of the endpoint under test (must be http/https) */
  url: string;
  /** HTTP method to use */
  method?: "GET" | "POST" | "PUT" | "DELETE";
  /** Request headers */
  headers?: Record<string, string>;
  /** Request body (for POST/PUT) */
  body?: unknown;
  /** Expected response schema for validation */
  expectedSchema?: Record<string, unknown>;
  /** Expected response time threshold */
  maxResponseTimeMs?: number;
}

export interface ScenarioConfig {
  mode: FailureMode;
  /** Request timeout in milliseconds (for timeout scenario) */
  timeoutMs?: number;
  /** How many times the runner should retry on failure */
  maxRetries?: number;
  /** Delay between retries in milliseconds */
  retryDelayMs?: number;
  /** Fallback URL to try if primary fails */
  fallbackUrl?: string;
  /** Expected behavior description for validation */
  expectedBehavior?: string;
}

export interface AttemptResult {
  attempt: number;
  success: boolean;
  /** HTTP status code, or 0 if request never completed */
  statusCode: number;
  /** Total wall-clock time for this attempt */
  durationMs: number;
  /** Error classification */
  errorType?: "timeout" | "http_error" | "malformed_json" | "network_error" | "schema_mismatch" | "slow_response" | "content_mismatch";
  /** Human-readable error detail */
  errorMessage?: string;
  /** Parsed response body (if valid JSON) */
  responseBody?: unknown;
  /** Raw response body text */
  rawBody?: string;
  /** Whether fallback was used */
  usedFallback?: boolean;
  /** Whether response matched expected schema */
  schemaValid?: boolean;
  /** Response time breakdown */
  timingBreakdown?: {
    dnsMs?: number;
    connectMs?: number;
    tlsMs?: number;
    firstByteMs?: number;
    totalMs: number;
  };
}

export interface ScenarioResult {
  mode: FailureMode;
  target: TestTarget;
  attempts: AttemptResult[];
  totalDurationMs: number;
  /** Final verdict */
  recovered: boolean;
  /** True if any retry attempt succeeded after a failure */
  usedRetry: boolean;
  /** True if the first attempt failed */
  initialFailure: boolean;
  /** Whether fallback was used at any point */
  usedFallback: boolean;
  /** Whether expected behavior was validated */
  behaviorValidated: boolean;
  /** Evidence for recovery claims */
  recoveryEvidence?: {
    expectedBehavior: string;
    actualBehavior: string;
    validResponse: boolean;
    timestamp: string;
  };
  /** Summary for reports */
  summary: string;
}

// ── Regression Testing ──────────────────────────────────────────────

export interface RegressionTest {
  id: string;
  name: string;
  target: TestTarget;
  config: ScenarioConfig;
  baselineResult: ScenarioResult;
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

// ── AI Reliability Types ────────────────────────────────────────────

export interface ReliabilityScore {
  overall: number; // 0-100
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
    severity: "critical" | "high" | "medium" | "low";
    category: string;
    description: string;
    evidence: string;
    recommendation: string;
  }>;
  summary: string;
}
