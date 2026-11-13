import { describe, it, expect } from "vitest";
import {
  classifyFinding,
  classifyFindings,
  priorityFromSeverity,
  priorityDistribution,
} from "./taxonomy.ts";
import type { ScanFinding } from "../types.ts";

function mkFinding(category: ScanFinding["category"], severity: ScanFinding["severity"] = "high"): ScanFinding {
  return {
    id: "f1",
    category,
    severity,
    title: "t",
    description: "d",
    evidence: { timestamp: "2026-11-13" },
    impact: "i",
    recommendation: "r",
  };
}

describe("classifyFinding", () => {
  it("maps ssl findings to CWE-295 + A02:2021 + P1", () => {
    const f = classifyFinding(mkFinding("ssl", "low")); // even low-sev SSL is P1
    expect(f.cwe).toContain("CWE-295");
    expect(f.owasp).toContain("A02:2021 – Cryptographic Failures");
    expect(f.priority).toBe("P1");
  });

  it("maps security_headers to A05 + P2", () => {
    const f = classifyFinding(mkFinding("security_headers"));
    expect(f.owasp[0]).toMatch(/^A05/);
    expect(f.priority).toBe("P2");
    expect(f.compliance.length).toBeGreaterThan(0);
  });

  it("broken_links is informational P4", () => {
    const f = classifyFinding(mkFinding("broken_links", "critical"));
    expect(f.priority).toBe("P4"); // category overrides severity
  });

  it("fallback for unknown category uses severity", () => {
    const f = classifyFinding({ ...mkFinding("configuration"), category: "unknown" as never });
    expect(f.priority).toBe(priorityFromSeverity("high"));
  });
});

describe("priorityFromSeverity", () => {
  it("maps correctly", () => {
    expect(priorityFromSeverity("critical")).toBe("P1");
    expect(priorityFromSeverity("high")).toBe("P2");
    expect(priorityFromSeverity("medium")).toBe("P3");
    expect(priorityFromSeverity("low")).toBe("P4");
  });
});

describe("classifyFindings + priorityDistribution", () => {
  it("classifies a set and counts priorities", () => {
    const fs = classifyFindings([
      mkFinding("ssl", "low"),        // P1
      mkFinding("availability"),      // P2
      mkFinding("dns"),               // P3
      mkFinding("broken_links"),      // P4
    ]);
    const dist = priorityDistribution(fs);
    expect(dist).toEqual({ P1: 1, P2: 1, P3: 1, P4: 1 });
  });
});
