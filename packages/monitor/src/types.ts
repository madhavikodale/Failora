// ── Failora Monitor Types ───────────────────────────────────────────

export interface HeartbeatResult {
  monitorId: string;
  url: string;
  isUp: boolean;
  statusCode: number;
  latencyMs: number;
  checkedAt: string;
  error?: string;
}

export interface MonitorConfig {
  id: string;
  name: string;
  url: string;
  intervalSec: number;
  timeoutMs: number;
  expectedStatusCodes: number[];
  alertThreshold: number; // consecutive failures before alert
  createdAt: string;
  isActive: boolean;
}

export interface MonitorState {
  config: MonitorConfig;
  lastCheckAt?: string;
  lastSuccessAt?: string;
  consecutiveFailures: number;
  totalChecks: number;
  totalFailures: number;
  uptimePercent: number;
  history: HeartbeatResult[]; // rolling window
}

export interface AlertRule {
  id: string;
  monitorId: string;
  condition: "down" | "latency_above" | "failure_rate_above";
  threshold?: number; // ms for latency, percent for failure_rate
  channels: AlertChannel[];
  isActive: boolean;
}

export type AlertChannel =
  | { type: "webhook"; url: string }
  | { type: "email"; to: string }
  | { type: "slack"; webhookUrl: string };

export interface Alert {
  id: string;
  monitorId: string;
  ruleId: string;
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  evidence: HeartbeatResult;
  sentAt: string;
  acknowledged: boolean;
}
