// ── GitHub Repository Scanner Types ─────────────────────────────────

import type { ScanFinding } from "@failora/scanner";

export interface RepoConfig {
  owner: string;
  repo: string;
  branch?: string;
  token?: string; // optional, for private repos and higher rate limits
}

export interface RepoFile {
  path: string;
  name: string;
  size: number;
  type: "file" | "dir";
  content?: string; // for files we fetch
}

export interface RepoScanResult {
  repo: string;
  owner: string;
  branch: string;
  scannedAt: string;
  files: {
    total: number;
    byLanguage: Record<string, number>;
  };
  findings: ScanFinding[];
  score: number; // 0-100
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface CodePattern {
  name: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  pattern: RegExp;
  languages: string[]; // file extensions to check
  recommendation: string;
}

export interface DependencyCheck {
  name: string;
  version: string;
  latestVersion?: string;
  hasVulnerabilities: boolean;
  vulnerabilityCount?: number;
  severity?: "critical" | "high" | "moderate" | "low";
}
