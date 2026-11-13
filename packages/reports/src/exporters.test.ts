import { describe, it, expect } from "vitest";
import { exportAsSARIF } from "./sarif.ts";
import { exportAsPDF } from "./pdf.ts";
import type { Report } from "./types.ts";

const report: Report = {
  id: "rpt-1",
  title: "Failora Scan Report — example.com",
  generatedAt: "2026-11-13T00:00:00Z",
  target: "https://example.com",
  type: "scan",
  summary: "Site is up. 3 findings detected across security headers and SSL.",
  score: 72,
  sections: [
    {
      title: "Security Headers",
      severity: "high",
      content: "Missing Content-Security-Policy, Strict-Transport-Security. Score: 40/100.",
    },
    {
      title: "SSL/TLS Certificate",
      severity: "info",
      content: "Certificate valid. Expires in 300 days.",
    },
  ],
  findings: { critical: 0, high: 1, medium: 0, low: 2, info: 0 },
  recommendations: ["Add CSP header", "Enable HSTS"],
  exportFormats: ["json", "markdown", "html"],
};

describe("exportAsSARIF", () => {
  it("produces valid SARIF 2.1.0 structure", () => {
    const sarif = exportAsSARIF(report);
    expect(sarif.version).toBe("2.1.0");
    expect(sarif.$schema).toContain("sarif-2.1.0");
    expect(sarif.runs).toHaveLength(1);
    const run = sarif.runs[0];
    expect(run.tool.driver.name).toBe("Failora");
    expect(run.tool.driver.rules).toHaveLength(2);
    expect(run.results).toHaveLength(2);
  });

  it("maps severities to SARIF levels", () => {
    const sarif = exportAsSARIF(report);
    const [hdr, ssl] = sarif.runs[0].results;
    expect(hdr.level).toBe("error"); // high
    expect(ssl.level).toBe("note"); // info
  });

  it("rule ids are stable slugs", () => {
    const sarif = exportAsSARIF(report);
    expect(sarif.runs[0].tool.driver.rules[0].id).toBe("failora/security-headers");
  });
});

describe("exportAsPDF", () => {
  it("produces a PDF starting with %PDF-1.4 and ending with %%EOF", () => {
    const bytes = exportAsPDF(report);
    const text = new TextDecoder("latin1").decode(bytes);
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(text).toContain("/Type /Catalog");
    expect(text).toContain("Failora Scan Report");
  });

  it("paginates long reports", () => {
    const long: Report = {
      ...report,
      sections: Array.from({ length: 30 }, (_, i) => ({
        title: `Section ${i}`,
        severity: "info" as const,
        content: "x ".repeat(200),
      })),
    };
    const bytes = exportAsPDF(long);
    const text = new TextDecoder("latin1").decode(bytes);
    const pageCount = (text.match(/\/Type \/Page[^s]/g) ?? []).length;
    expect(pageCount).toBeGreaterThan(1);
  });
});
