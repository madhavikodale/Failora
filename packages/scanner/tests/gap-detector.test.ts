import { describe, it, expect } from "vitest";
import { detectGaps } from "../src/engine/gap-detector.ts";

const baseHealth = {
  url: "https://example.com",
  isUp: true,
  statusCode: 200,
  responseTimeMs: 500,
  headers: {},
  checkedAt: new Date().toISOString(),
};

const baseSSL = {
  valid: true,
  daysRemaining: 365,
};

const baseDNS = {
  domain: "example.com",
  records: {},
  hasMX: true,
  hasSPF: true,
  hasDMARC: false,
  checkedAt: new Date().toISOString(),
};

const baseHeaders = {
  present: {},
  missing: [],
  score: 100,
};

const basePerf = {
  url: "https://example.com",
  ttfbMs: 500,
  totalTimeMs: 1500,
  dnsLookupMs: 0,
  tcpConnectMs: 0,
  tlsHandshakeMs: 0,
  firstByteMs: 500,
  downloadMs: 1000,
  sizeBytes: 100000,
};

describe("detectGaps", () => {
  it("returns empty when everything is fine", () => {
    const findings = detectGaps("https://example.com", baseHealth, baseSSL, baseDNS, baseHeaders, basePerf);
    expect(findings).toHaveLength(0);
  });

  it("detects downtime as critical", () => {
    const findings = detectGaps("https://example.com", { ...baseHealth, isUp: false, statusCode: 503 }, baseSSL, baseDNS, baseHeaders, basePerf);
    const critical = findings.find((f) => f.severity === "critical");
    expect(critical).toBeDefined();
    expect(critical?.category).toBe("availability");
  });

  it("detects SSL expiry", () => {
    const findings = detectGaps("https://example.com", baseHealth, { ...baseSSL, daysRemaining: 5 }, baseDNS, baseHeaders, basePerf);
    const sslFinding = findings.find((f) => f.category === "ssl");
    expect(sslFinding).toBeDefined();
    expect(sslFinding?.severity).toBe("critical");
  });

  it("detects HTTP as high severity", () => {
    const findings = detectGaps("http://example.com", baseHealth, baseSSL, baseDNS, baseHeaders, basePerf);
    const httpFinding = findings.find((f) => f.title.includes("HTTP"));
    expect(httpFinding).toBeDefined();
    expect(httpFinding?.severity).toBe("high");
  });

  it("detects slow TTFB", () => {
    const findings = detectGaps("https://example.com", baseHealth, baseSSL, baseDNS, baseHeaders, { ...basePerf, ttfbMs: 3000 });
    const perfFinding = findings.find((f) => f.category === "performance");
    expect(perfFinding).toBeDefined();
    expect(perfFinding?.severity).toBe("medium");
  });

  it("detects missing security headers", () => {
    const findings = detectGaps("https://example.com", baseHealth, baseSSL, baseDNS, {
      present: {},
      missing: ["strict-transport-security", "x-frame-options"],
      score: 0,
    }, basePerf);
    const headerFindings = findings.filter((f) => f.category === "security_headers");
    expect(headerFindings.length).toBe(2);
  });
});
