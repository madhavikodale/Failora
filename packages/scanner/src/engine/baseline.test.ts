import { describe, it, expect } from "vitest";
import { diffFindings, findingKey, isImproving } from "./baseline.ts";
import type { ScanFinding } from "../types.ts";

let n = 0;
function mk(category: ScanFinding["category"], title: string, url = "https://example.com/"): ScanFinding {
  return {
    id: `f${++n}`,
    category,
    severity: "medium",
    title,
    description: "d",
    evidence: { timestamp: "2026-11-13", url },
    impact: "i",
    recommendation: "r",
  };
}

describe("findingKey", () => {
  it("normalizes query strings and trailing slashes", () => {
    const a = mk("ssl", "Cert expiring", "https://example.com/page?x=1");
    const b = mk("ssl", "Cert expiring", "https://example.com/page/");
    expect(findingKey(a)).toBe(findingKey(b));
  });

  it("is case-insensitive on title", () => {
    const a = mk("ssl", "Missing HSTS");
    const b = mk("ssl", "missing hsts");
    expect(findingKey(a)).toBe(findingKey(b));
  });
});

describe("diffFindings", () => {
  const base = [mk("ssl", "Missing HSTS"), mk("dns", "No DMARC")];
  const compare = [mk("ssl", "Missing HSTS"), mk("security_headers", "No CSP")];

  it("classifies new/fixed/unchanged", () => {
    const d = diffFindings(base, compare, { target: "https://example.com", baseScanId: "a", compareScanId: "b" });
    expect(d.unchanged.map((f) => f.title)).toEqual(["Missing HSTS"]);
    expect(d.new.map((f) => f.title)).toEqual(["No CSP"]);
    expect(d.fixed.map((f) => f.title)).toEqual(["No DMARC"]);
    expect(d.summary).toEqual({ newCount: 1, fixedCount: 1, unchangedCount: 1, totalBase: 2, totalCompare: 2 });
  });

  it("isImproving: fixed > new", () => {
    const d = diffFindings(base, compare, { target: "t", baseScanId: "a", compareScanId: "b" });
    expect(isImproving(d)).toBe(false); // 1 vs 1
    const better = diffFindings(base, [mk("ssl", "Missing HSTS")], { target: "t", baseScanId: "a", compareScanId: "b" });
    expect(isImproving(better)).toBe(true); // fixed=1, new=0
  });

  it("empty base → all new", () => {
    const d = diffFindings([], compare, { target: "t", baseScanId: "a", compareScanId: "b" });
    expect(d.new).toHaveLength(2);
    expect(d.fixed).toHaveLength(0);
  });

  it("identical scans → all unchanged", () => {
    const d = diffFindings(base, base.map((f) => ({ ...f })), { target: "t", baseScanId: "a", compareScanId: "b" });
    expect(d.unchanged).toHaveLength(2);
    expect(d.new).toHaveLength(0);
    expect(d.fixed).toHaveLength(0);
  });
});
