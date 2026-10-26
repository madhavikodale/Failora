// ── Failora Core Types ──────────────────────────────────────────────

export type FailureMode =
  | "timeout"
  | "http_429"
  | "http_500"
  | "malformed_response";

export interface TestTarget {
  /** Full URL of the endpoint under test (must be http/https) */
  url: string;
  /** HTTP method to use */
  method?: "GET" | "POST" | "PUT" | "DELETE";
  /** Request headers */
  headers?: Record<string, string>;
  /** Request body (for POST/PUT) */
  body?: unknown;
}

export interface ScenarioConfig {
  mode: FailureMode;
  /** Request timeout in milliseconds (for timeout scenario) */
  timeoutMs?: number;
  /** How many times the runner should retry on failure */
  maxRetries?: number;
  /** Delay between retries in milliseconds */
  retryDelayMs?: number;
}

export interface AttemptResult {
  attempt: number;
  success: boolean;
  /** HTTP status code, or 0 if request never completed */
  statusCode: number;
  /** Total wall-clock time for this attempt */
  durationMs: number;
  /** Error classification */
  errorType?: "timeout" | "http_error" | "malformed_json" | "network_error";
  /** Human-readable error detail */
  errorMessage?: string;
  /** Parsed response body (if valid JSON) */
  responseBody?: unknown;
  /** Raw response body text */
  rawBody?: string;
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
  /** Summary for reports */
  summary: string;
}
