import type { Report } from "./types.ts";

// ── Report Exporters ────────────────────────────────────────────────

export function exportAsJSON(report: Report): string {
  return JSON.stringify(report, null, 2);
}

export function exportAsMarkdown(report: Report): string {
  const lines: string[] = [];

  lines.push(`# ${report.title}`);
  lines.push("");
  lines.push(`**Generated:** ${report.generatedAt}`);
  lines.push(`**Target:** ${report.target}`);
  lines.push(`**Type:** ${report.type}`);
  if (report.score !== undefined) {
    lines.push(`**Score:** ${report.score}/100`);
  }
  lines.push("");
  lines.push(`## Summary`);
  lines.push("");
  lines.push(report.summary);
  lines.push("");

  // Findings summary
  lines.push(`## Findings Summary`);
  lines.push("");
  lines.push(`- Critical: ${report.findings.critical}`);
  lines.push(`- High: ${report.findings.high}`);
  lines.push(`- Medium: ${report.findings.medium}`);
  lines.push(`- Low: ${report.findings.low}`);
  lines.push(`- Info: ${report.findings.info}`);
  lines.push("");

  // Sections
  for (const section of report.sections) {
    lines.push(`## ${section.title}`);
    lines.push("");
    if (section.severity) {
      lines.push(`**Severity:** ${section.severity.toUpperCase()}`);
      lines.push("");
    }
    lines.push(section.content);
    lines.push("");
  }

  // Recommendations
  if (report.recommendations.length > 0) {
    lines.push(`## Recommendations`);
    lines.push("");
    for (const rec of report.recommendations) {
      lines.push(`- ${rec}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function exportAsHTML(report: Report): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const severityColor: Record<string, string> = {
    critical: "#dc2626",
    high: "#ea580c",
    medium: "#d97706",
    low: "#65a30d",
    info: "#2563eb",
  };

  const sections = report.sections
    .map((s) => {
      const color = s.severity ? severityColor[s.severity] ?? "#666" : "#666";
      return `
    <section class="report-section">
      <h2>${esc(s.title)}</h2>
      ${s.severity ? `<span class="badge" style="background:${color}">${esc(s.severity.toUpperCase())}</span>` : ""}
      <pre>${esc(s.content)}</pre>
    </section>`;
    })
    .join("\n");

  const recs = report.recommendations
    .map((r) => `<li>${esc(r)}</li>`)
    .join("\n      ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${esc(report.title)}</title>
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; color: #1f2937; }
    h1 { border-bottom: 3px solid #2563eb; padding-bottom: 0.5rem; }
    .meta { color: #6b7280; margin-bottom: 2rem; }
    .score { font-size: 2.5rem; font-weight: bold; color: #2563eb; }
    .report-section { margin: 2rem 0; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 8px; }
    .report-section h2 { margin-top: 0; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 9999px; color: white; font-size: 0.75rem; font-weight: bold; margin-bottom: 0.5rem; }
    pre { background: #f3f4f6; padding: 1rem; border-radius: 6px; overflow-x: auto; white-space: pre-wrap; }
    .findings-summary { display: flex; gap: 1rem; flex-wrap: wrap; margin: 1rem 0; }
    .finding-chip { padding: 0.5rem 1rem; border-radius: 6px; color: white; font-weight: 600; }
  </style>
</head>
<body>
  <h1>${esc(report.title)}</h1>
  <div class="meta">
    <p>Generated: ${esc(report.generatedAt)} | Target: ${esc(report.target)}</p>
    ${report.score !== undefined ? `<div class="score">${report.score}/100</div>` : ""}
  </div>

  <h2>Summary</h2>
  <p>${esc(report.summary)}</p>

  <h2>Findings</h2>
  <div class="findings-summary">
    <span class="finding-chip" style="background:#dc2626">Critical: ${report.findings.critical}</span>
    <span class="finding-chip" style="background:#ea580c">High: ${report.findings.high}</span>
    <span class="finding-chip" style="background:#d97706">Medium: ${report.findings.medium}</span>
    <span class="finding-chip" style="background:#65a30d">Low: ${report.findings.low}</span>
    <span class="finding-chip" style="background:#2563eb">Info: ${report.findings.info}</span>
  </div>

  ${sections}

  ${report.recommendations.length > 0 ? `
  <h2>Recommendations</h2>
  <ul>
      ${recs}
  </ul>` : ""}
</body>
</html>`;
}
