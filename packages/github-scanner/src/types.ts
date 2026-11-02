// ── GitHub Repository Scanner Types ─────────────────────────────────

import type { Severity } from "@failora/scanner";

export interface RepoScanFinding {
  id: string;
  category: string;
  severity: Severity;
  title: string;
  description: string;
  file?: string;
  line?: number;
  evidence?: string;
  impact?: string;
  recommendation?: string;
}

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
    analyzed: number;
    skipped: number;
    byLanguage: Record<string, number>;
    skippedReasons: {
      tooLarge: number;
      empty: number;
      overLimit: number;
    };
  };
  scan: {
    durationMs: number;
    startedAt: string;
    completedAt: string;
    maxFilesLimit: number;
    maxFileSizeBytes: number;
    limitReached: boolean;
    coverage: number; // analyzed / total * 100
  };
  checks: ScanCheck[];
  findings: RepoScanFinding[];
  score: number; // 0-100
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface ScanCheck {
  name: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  filesScanned: number;
  matchesFound: number;
  status: "passed" | "failed" | "skipped";
  languages: string[];
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
