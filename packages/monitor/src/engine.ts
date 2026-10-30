import { EventEmitter } from "node:events";
import type {
  MonitorConfig,
  MonitorState,
  HeartbeatResult,
  Alert,
  AlertRule,
} from "../types.ts";
import { checkHeartbeat } from "./heartbeat.ts";

// ── Monitor Engine ──────────────────────────────────────────────────
// Manages active monitors, runs heartbeat checks on intervals,
// tracks state, and emits alerts.

export class MonitorEngine extends EventEmitter {
  private monitors = new Map<string, MonitorState>();
  private intervals = new Map<string, NodeJS.Timeout>();
  private alertRules = new Map<string, AlertRule[]>();
  private alerts: Alert[] = [];
  private historyLimit = 100; // per monitor

  // ── Monitor Management ──

  addMonitor(config: MonitorConfig): MonitorState {
    const state: MonitorState = {
      config,
      consecutiveFailures: 0,
      totalChecks: 0,
      totalFailures: 0,
      uptimePercent: 100,
      history: [],
    };
    this.monitors.set(config.id, state);
    if (config.isActive) {
      this.startMonitor(config.id);
    }
    return state;
  }

  removeMonitor(id: string): boolean {
    this.stopMonitor(id);
    this.monitors.delete(id);
    this.alertRules.delete(id);
    return true;
  }

  startMonitor(id: string): void {
    const state = this.monitors.get(id);
    if (!state || this.intervals.has(id)) return;

    const interval = setInterval(async () => {
      await this.runCheck(id);
    }, state.config.intervalSec * 1000);

    this.intervals.set(id, interval);
    state.config.isActive = true;

    // Run first check immediately
    this.runCheck(id);
  }

  stopMonitor(id: string): void {
    const interval = this.intervals.get(id);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(id);
    }
    const state = this.monitors.get(id);
    if (state) state.config.isActive = false;
  }

  getMonitor(id: string): MonitorState | undefined {
    return this.monitors.get(id);
  }

  listMonitors(): MonitorState[] {
    return Array.from(this.monitors.values());
  }

  // ── Heartbeat Execution ──

  async runCheck(id: string): Promise<HeartbeatResult | undefined> {
    const state = this.monitors.get(id);
    if (!state) return undefined;

    const result = await checkHeartbeat(state.config);
    this.updateState(state, result);
    this.checkAlertRules(state, result);
    this.emit("heartbeat", result);

    return result;
  }

  private updateState(state: MonitorState, result: HeartbeatResult): void {
    state.lastCheckAt = result.checkedAt;
    state.totalChecks++;

    if (result.isUp) {
      state.lastSuccessAt = result.checkedAt;
      state.consecutiveFailures = 0;
    } else {
      state.consecutiveFailures++;
      state.totalFailures++;
    }

    state.uptimePercent =
      state.totalChecks > 0
        ? Math.round(((state.totalChecks - state.totalFailures) / state.totalChecks) * 100)
        : 100;

    // Add to history with rolling window
    state.history.unshift(result);
    if (state.history.length > this.historyLimit) {
      state.history.pop();
    }
  }

  // ── Alert Rules ──

  addAlertRule(rule: AlertRule): void {
    const rules = this.alertRules.get(rule.monitorId) ?? [];
    rules.push(rule);
    this.alertRules.set(rule.monitorId, rules);
  }

  removeAlertRule(monitorId: string, ruleId: string): void {
    const rules = this.alertRules.get(monitorId) ?? [];
    this.alertRules.set(monitorId, rules.filter((r) => r.id !== ruleId));
  }

  private checkAlertRules(state: MonitorState, result: HeartbeatResult): void {
    const rules = this.alertRules.get(state.config.id) ?? [];
    for (const rule of rules) {
      if (!rule.isActive) continue;

      let triggered = false;
      let severity: Alert["severity"] = "warning";

      switch (rule.condition) {
        case "down":
          if (state.consecutiveFailures >= state.config.alertThreshold) {
            triggered = true;
            severity = "critical";
          }
          break;
        case "latency_above":
          if (result.latencyMs > (rule.threshold ?? 5000)) {
            triggered = true;
            severity = "warning";
          }
          break;
        case "failure_rate_above":
          const failureRate = state.totalChecks > 0 ? (state.totalFailures / state.totalChecks) * 100 : 0;
          if (failureRate > (rule.threshold ?? 50)) {
            triggered = true;
            severity = "warning";
          }
          break;
      }

      if (triggered) {
        const alert: Alert = {
          id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          monitorId: state.config.id,
          ruleId: rule.id,
          severity,
          title: `Monitor ${state.config.name} triggered: ${rule.condition}`,
          message: `URL: ${state.config.url}\nStatus: ${result.statusCode}\nLatency: ${result.latencyMs}ms\nConsecutive failures: ${state.consecutiveFailures}`,
          evidence: result,
          sentAt: new Date().toISOString(),
          acknowledged: false,
        };
        this.alerts.unshift(alert);
        this.emit("alert", alert, rule.channels);
      }
    }
  }

  getAlerts(monitorId?: string, unacknowledgedOnly = false): Alert[] {
    let filtered = this.alerts;
    if (monitorId) {
      filtered = filtered.filter((a) => a.monitorId === monitorId);
    }
    if (unacknowledgedOnly) {
      filtered = filtered.filter((a) => !a.acknowledged);
    }
    return filtered;
  }

  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (!alert) return false;
    alert.acknowledged = true;
    return true;
  }

  // ── Cleanup ──

  stopAll(): void {
    for (const id of this.intervals.keys()) {
      this.stopMonitor(id);
    }
  }
}
