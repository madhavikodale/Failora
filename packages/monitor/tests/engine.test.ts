import { describe, it, expect } from "vitest";
import { MonitorEngine } from "../src/engine.ts";
import type { MonitorConfig } from "../src/types.ts";

function makeConfig(overrides?: Partial<MonitorConfig>): MonitorConfig {
  return {
    id: "test-monitor",
    name: "Test Monitor",
    url: "http://127.0.0.1:9999/nonexistent", // Will fail
    intervalSec: 3600, // Long interval so we control checks manually
    timeoutMs: 1000,
    expectedStatusCodes: [200],
    alertThreshold: 2,
    createdAt: new Date().toISOString(),
    isActive: false,
    ...overrides,
  };
}

describe("MonitorEngine", () => {
  it("adds and retrieves monitors", () => {
    const engine = new MonitorEngine();
    const config = makeConfig();
    engine.addMonitor(config);

    const retrieved = engine.getMonitor("test-monitor");
    expect(retrieved).toBeDefined();
    expect(retrieved?.config.name).toBe("Test Monitor");
    expect(retrieved?.consecutiveFailures).toBe(0);
    expect(retrieved?.uptimePercent).toBe(100);
  });

  it("removes monitors", () => {
    const engine = new MonitorEngine();
    engine.addMonitor(makeConfig());
    expect(engine.removeMonitor("test-monitor")).toBe(true);
    expect(engine.getMonitor("test-monitor")).toBeUndefined();
  });

  it("tracks consecutive failures", async () => {
    const engine = new MonitorEngine();
    engine.addMonitor(makeConfig());

    await engine.runCheck("test-monitor");
    let state = engine.getMonitor("test-monitor");
    expect(state?.consecutiveFailures).toBe(1);
    expect(state?.totalChecks).toBe(1);
    expect(state?.totalFailures).toBe(1);
    expect(state?.uptimePercent).toBe(0);

    await engine.runCheck("test-monitor");
    state = engine.getMonitor("test-monitor");
    expect(state?.consecutiveFailures).toBe(2);
    expect(state?.totalFailures).toBe(2);
  });

  it("calculates uptime percentage", async () => {
    const engine = new MonitorEngine();
    // Use a real endpoint that will succeed — we'll simulate by checking state directly
    const config = makeConfig({ url: "http://127.0.0.1:9999/nonexistent" });
    engine.addMonitor(config);

    // All failures
    await engine.runCheck("test-monitor");
    await engine.runCheck("test-monitor");
    let state = engine.getMonitor("test-monitor");
    expect(state?.uptimePercent).toBe(0);
  });

  it("emits heartbeat events", async () => {
    const engine = new MonitorEngine();
    engine.addMonitor(makeConfig());

    const events: unknown[] = [];
    engine.on("heartbeat", (result) => events.push(result));

    await engine.runCheck("test-monitor");
    expect(events.length).toBe(1);
  });

  it("creates alerts when threshold reached", async () => {
    const engine = new MonitorEngine();
    engine.addMonitor(makeConfig({ alertThreshold: 2 }));

    engine.addAlertRule({
      id: "rule-1",
      monitorId: "test-monitor",
      condition: "down",
      channels: [{ type: "webhook", url: "http://localhost/test" }],
      isActive: true,
    });

    const alerts: unknown[] = [];
    engine.on("alert", (alert) => alerts.push(alert));

    await engine.runCheck("test-monitor");
    expect(alerts.length).toBe(0); // Below threshold

    await engine.runCheck("test-monitor");
    expect(alerts.length).toBe(1); // Threshold reached
  });

  it("acknowledges alerts", async () => {
    const engine = new MonitorEngine();
    engine.addMonitor(makeConfig({ alertThreshold: 1 }));
    engine.addAlertRule({
      id: "rule-1",
      monitorId: "test-monitor",
      condition: "down",
      channels: [{ type: "webhook", url: "http://localhost/test" }],
      isActive: true,
    });

    await engine.runCheck("test-monitor");
    const alerts = engine.getAlerts("test-monitor");
    expect(alerts.length).toBe(1);
    expect(alerts[0].acknowledged).toBe(false);

    expect(engine.acknowledgeAlert(alerts[0].id)).toBe(true);
    expect(engine.getAlerts("test-monitor")[0].acknowledged).toBe(true);
  });

  it("lists monitors", () => {
    const engine = new MonitorEngine();
    engine.addMonitor(makeConfig({ id: "m1" }));
    engine.addMonitor(makeConfig({ id: "m2" }));
    engine.addMonitor(makeConfig({ id: "m3" }));

    expect(engine.listMonitors().length).toBe(3);
  });
});
