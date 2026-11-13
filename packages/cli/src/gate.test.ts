import { describe, it, expect } from "vitest";
import { evaluateGate, parseArgs, DEFAULT_THRESHOLDS } from "./gate.ts";
import type { ScanResult } from "@failora/scanner";

function mkScan(score: number, findings: Array<{ severity: string }>): Pick<ScanResult, "overallScore" | "findings"> {
  return {
    overallScore: score,
    findings: findings.map((f, i) => ({
      id: `f${i}`,
      category: "configuration" as const,
      severity: f.severity as "critical" | "high" | "medium" | "low",
      title: "t",
      description: "d",
      evidence: { timestamp: "2026-11-13" },
      impact: "i",
      recommendation: "r",
    })),
  };
}

describe("evaluateGate", () => {
  it("passes a clean scan with defaults", () => {
    const r = evaluateGate(mkScan(90, []));
    expect(r.verdict).toBe("pass");
    expect(r.reasons).toEqual([]);
  });

  it("fails on critical findings by default", () => {
    const r = evaluateGate(mkScan(90, [{ severity: "critical" }]));
    expect(r.verdict).toBe("fail");
    expect(r.reasons[0]).toContain("critical 1 > max-critical 0");
  });

  it("fails when score below min-score", () => {
    const r = evaluateGate(mkScan(50, []), { minScore: 80 });
    expect(r.verdict).toBe("fail");
    expect(r.reasons[0]).toContain("score 50 < min-score 80");
  });

  it("fails on high count over limit", () => {
    const r = evaluateGate(mkScan(90, [{ severity: "high" }, { severity: "high" }]), { maxHigh: 1 });
    expect(r.verdict).toBe("fail");
    expect(r.reasons[0]).toContain("high 2 > max-high 1");
  });

  it("multiple breach reasons accumulate", () => {
    const r = evaluateGate(mkScan(40, [{ severity: "critical" }, { severity: "high" }]), {
      minScore: 80,
      maxHigh: 0,
    });
    expect(r.reasons).toHaveLength(3);
  });

  it("ignores low/info findings", () => {
    const r = evaluateGate(mkScan(90, [{ severity: "low" }, { severity: "low" }]));
    expect(r.verdict).toBe("pass");
  });
});

describe("parseArgs", () => {
  it("requires --authorized", () => {
    const r = parseArgs(["https://example.com"]);
    expect("error" in r && r.error).toContain("authorized");
  });

  it("requires a URL", () => {
    const r = parseArgs(["--authorized"]);
    expect("error" in r && r.error).toContain("URL");
  });

  it("parses thresholds", () => {
    const r = parseArgs([
      "https://example.com", "--authorized",
      "--min-score", "80", "--max-critical", "2", "--max-high", "5",
    ]);
    expect("error" in r).toBe(false);
    if (!("error" in r)) {
      expect(r.url).toBe("https://example.com");
      expect(r.thresholds).toEqual({ minScore: 80, maxCritical: 2, maxHigh: 5 });
      expect(r.safety.authorized).toBe(true);
    }
  });

  it("parses sarif/json/localhost flags", () => {
    const r = parseArgs([
      "https://example.com", "--authorized",
      "--sarif", "out.sarif", "--json", "--allow-localhost",
    ]);
    if (!("error" in r)) {
      expect(r.sarifOut).toBe("out.sarif");
      expect(r.jsonOut).toBe(true);
      expect(r.safety.allowLocalhost).toBe(true);
    }
  });

  it("exposes defaults", () => {
    expect(DEFAULT_THRESHOLDS.maxCritical).toBe(0);
  });
});
