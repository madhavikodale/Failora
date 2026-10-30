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
