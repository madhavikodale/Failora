// ── Report Types ────────────────────────────────────────────────────

import type { ScanResult } from "@failora/scanner";
import type { ScenarioResult, ReliabilityScore, GapReport } from "@failora/core";

export interface ReportSection {
  title: string;
  content: string;
  severity?: "critical" | "high" | "medium" | "low" | "info";
  data?: unknown;
}

export interface Report {
  id: string;
  title: string;
  generatedAt: string;
  target: string;
  type: "scan" | "scenario" | "reliability" | "comprehensive";
  summary: string;
  score?: number;
  sections: ReportSection[];
  findings: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  recommendations: string[];
  exportFormats: ("json" | "markdown" | "html")[];
}

export interface ReportOptions {
  title?: string;
  includeEvidence?: boolean;
  includeRecommendations?: boolean;
  maxFindingsPerSection?: number;
}
