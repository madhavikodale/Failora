import { describe, it, expect } from "vitest";
import type { ScanResult } from "@failora/scanner";
import {
  generateScanReport,
  generateScenarioReport,
  generateGapReportDocument,
  exportAsJSON,
  exportAsMarkdown,
  exportAsHTML,
} from "../src/index.ts";
import type { ScenarioResult, GapReport } from "@failora/core";

const mockScan: ScanResult = {
  url: "https://example.com",
  scannedAt: new Date().toISOString(),
  health: { isUp: true, statusCode: 200, responseTimeMs: 150 },
  ssl: {
    valid: true,
    issuer: "Let's Encrypt",
    expiresAt: "2025-06-01",
    daysUntilExpiry: 200,
    protocol: "TLSv1.3",
  },
  dns: {
    aRecords: ["93.184.216.34"],
    mxRecords: [],
    txtRecords: ["v=spf1 -all"],
    nsRecords: ["a.iana-servers.net"],
  },
  securityHeaders: {
    present: ["strict-transport-security"],
    missing: ["content-security-policy", "x-frame-options"],
    score: 40,
  },
  performance: {
    dnsMs: 10,
    connectMs: 20,
    tlsMs: 30,
    firstByteMs: 100,
    totalTimeMs: 150,
  },
  findings: [
    {
      severity: "high",
      category: "security_headers",
      title: "Missing Content Security Policy",
      description: "CSP header is missing",
      evidence: "Header not present in response",
      impact: "XSS vulnerability risk",
      recommendation: "Add CSP header",
    },
  ],
  overallScore: 72,
};

const mockScenario: ScenarioResult = {
  mode: "timeout",
  target: { url: "https://api.example.com" },
  attempts: [
    {
      attempt: 1,
      success: false,
      statusCode: 0,
      durationMs: 5000,
      errorType: "timeout",
      errorMessage: "Request timed out",
    },
    {
      attempt: 2,
      success: true,
      statusCode: 200,
      durationMs: 200,
    },
  ],
  totalDurationMs: 5700,
  recovered: true,
  usedRetry: true,
  initialFailure: true,
  usedFallback: false,
  behaviorValidated: true,
  recoveryEvidence: {
    expectedBehavior: "Should recover within 5 seconds",
    actualBehavior: "Recovered on retry 2",
    validResponse: true,
    timestamp: new Date().toISOString(),
  },
  summary: "RECOVERED after 2 attempts",
};

const mockGapReport: GapReport = {
  target: { url: "https://api.example.com" },
  scannedAt: new Date().toISOString(),
  reliabilityScore: {
    overall: 75,
    retryEffectiveness: 80,
    fallbackEffectiveness: 100,
    recoverySpeedScore: 70,
    schemaCompliance: 90,
    performanceScore: 60,
    evidence: ["Retry: 4/5 recovered"],
  },
  gaps: [
    {
      severity: "medium",
      category: "performance",
      description: "Slow response times detected",
      evidence: "Avg 2.5s response",
      recommendation: "Enable caching",
    },
  ],
  summary: "IMPROVEMENT: 1 gap found. Reliability score: 75/100",
};

describe("Report Generator", () => {
  it("generates scan report", () => {
    const report = generateScanReport(mockScan);
    expect(report.type).toBe("scan");
    expect(report.target).toBe("https://example.com");
    expect(report.score).toBe(72);
    expect(report.sections.length).toBeGreaterThan(3);
    expect(report.findings.high).toBe(1);
    expect(report.recommendations).toContain("Add CSP header");
  });

  it("generates scenario report", () => {
    const report = generateScenarioReport(mockScenario);
    expect(report.type).toBe("scenario");
    expect(report.target).toBe("https://api.example.com");
    expect(report.summary).toContain("RECOVERED");
  });

  it("generates gap report document", () => {
    const report = generateGapReportDocument(mockGapReport);
    expect(report.type).toBe("reliability");
    expect(report.score).toBe(75);
    expect(report.findings.medium).toBe(1);
  });
});

describe("Exporters", () => {
  it("exports JSON", () => {
    const report = generateScanReport(mockScan);
    const json = exportAsJSON(report);
    const parsed = JSON.parse(json);
    expect(parsed.id).toBe(report.id);
    expect(parsed.title).toBe(report.title);
  });

  it("exports Markdown", () => {
    const report = generateScanReport(mockScan);
    const md = exportAsMarkdown(report);
    expect(md).toContain(`# ${report.title}`);
    expect(md).toContain("## Summary");
    expect(md).toContain("## Findings Summary");
    expect(md).toContain("## Recommendations");
    expect(md).toContain("Add CSP header");
  });

  it("exports HTML", () => {
    const report = generateScanReport(mockScan);
    const html = exportAsHTML(report);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain(report.title);
    expect(html).toContain("Critical: 0");
    expect(html).toContain("High: 1");
  });

  it("escapes HTML in user content", () => {
    const scenarioWithXss: ScenarioResult = {
      ...mockScenario,
      summary: "<script>alert(1)</script>",
      recoveryEvidence: {
        expectedBehavior: "<img onerror=alert(1)>",
        actualBehavior: "Recovered",
        validResponse: true,
        timestamp: new Date().toISOString(),
      },
    };
    const report = generateScenarioReport(scenarioWithXss);
    const html = exportAsHTML(report);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<img onerror=alert(1)>");
    expect(html).toContain("&lt;img");
  });
});
