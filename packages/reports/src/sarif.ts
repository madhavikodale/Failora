// ── SARIF 2.1.0 Exporter ────────────────────────────────────────────
// Standard format for CI/security-tool integration (GitHub code
// scanning, Azure DevOps, etc.). Schema: https://json.schemastore.org/sarif-2.1.0

import type { Report, ReportSection } from "./types.ts";

interface SarifRule {
  id: string;
  name?: string;
  shortDescription?: { text: string };
  fullDescription?: { text: string };
  defaultConfiguration?: { level: "error" | "warning" | "note" };
  properties?: Record<string, unknown>;
}

interface SarifResult {
  ruleId: string;
  level: "error" | "warning" | "note";
  message: { text: string };
  locations?: Array<{
    physicalLocation?: {
      artifactLocation?: { uri: string };
      region?: { startLine?: number };
    };
  }>;
  properties?: Record<string, unknown>;
}

export interface SarifLog {
  $schema: string;
  version: "2.1.0";
  runs: Array<{
    tool: {
      driver: {
        name: string;
        version?: string;
        informationUri?: string;
        rules: SarifRule[];
      };
    };
    results: SarifResult[];
  }>;
}

function severityToLevel(sev?: ReportSection["severity"]): "error" | "warning" | "note" {
  switch (sev) {
    case "critical":
    case "high":
      return "error";
    case "medium":
      return "warning";
    default:
      return "note";
  }
}

function slug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** Export a Report as a SARIF 2.1.0 log. One rule per section, one result per section. */
export function exportAsSARIF(report: Report): SarifLog {
  const rules: SarifRule[] = [];
  const results: SarifResult[] = [];

  for (const section of report.sections) {
    const ruleId = `failora/${slug(section.title)}`;
    const level = severityToLevel(section.severity);

    rules.push({
      id: ruleId,
      name: section.title,
      shortDescription: { text: section.title },
      fullDescription: { text: section.content.slice(0, 500) },
      defaultConfiguration: { level },
      properties: {
        severity: section.severity ?? "info",
        ...(section.data && typeof section.data === "object"
          ? { data: section.data as Record<string, unknown> }
          : {}),
      },
    });

    results.push({
      ruleId,
      level,
      message: { text: `[${section.severity ?? "info"}] ${section.title}: ${section.content.slice(0, 200)}` },
      locations: [
        {
          physicalLocation: {
            artifactLocation: { uri: report.target },
          },
        },
      ],
      properties: {
        target: report.target,
        reportType: report.type,
        generatedAt: report.generatedAt,
      },
    });
  }

  return {
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "Failora",
            version: "0.1.0",
            informationUri: "https://github.com/madhavikodale/Failora",
            rules,
          },
        },
        results,
      },
    ],
  };
}
