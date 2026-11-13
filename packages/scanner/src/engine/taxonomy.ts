// ── CWE / OWASP / Priority Taxonomy ─────────────────────────────────
// Static mapping: finding category → standard taxonomy + P1–P4 priority.
// No external API needed. Aligned with ITADORI's CWE/OWASP + SOC2/ISO
// compliance mapping model.

import type { ScanFinding, Severity } from "../types.ts";

export type Priority = "P1" | "P2" | "P3" | "P4";

export interface TaxonomyEntry {
  /** CWE identifiers, e.g. ["CWE-319"] */
  cwe: string[];
  /** OWASP category, e.g. "A05:2021 – Security Misconfiguration" */
  owasp: string[];
  /** P1 (critical) → P4 (informational) */
  priority: Priority;
  /** Compliance frameworks this category touches. */
  compliance: string[];
}

// Severity → priority fallback when no specific mapping exists
export function priorityFromSeverity(severity: Severity): Priority {
  switch (severity) {
    case "critical": return "P1";
    case "high": return "P2";
    case "medium": return "P3";
    case "low": return "P4";
  }
}

const TAXONOMY: Record<string, TaxonomyEntry> = {
  availability: {
    cwe: ["CWE-400", "CWE-770"], // uncontrolled resource consumption
    owasp: ["A04:2021 – Insecure Design"],
    priority: "P2",
    compliance: ["SOC 2 CC7.1", "ISO 27001 A.8.14"],
  },
  ssl: {
    cwe: ["CWE-295", "CWE-326"], // improper cert validation, inadequate crypto strength
    owasp: ["A02:2021 – Cryptographic Failures"],
    priority: "P1",
    compliance: ["SOC 2 CC6.7", "ISO 27001 A.8.24"],
  },
  dns: {
    cwe: ["CWE-1104"], // use of externally-controlled (DNS) — SPF/DMARC gaps
    owasp: ["A05:2021 – Security Misconfiguration"],
    priority: "P3",
    compliance: ["ISO 27001 A.8.20"],
  },
  security_headers: {
    cwe: ["CWE-693", "CWE-1021"], // protection mechanism failure
    owasp: ["A05:2021 – Security Misconfiguration"],
    priority: "P2",
    compliance: ["SOC 2 CC6.1", "ISO 27001 A.8.12"],
  },
  performance: {
    cwe: ["CWE-400"],
    owasp: ["A04:2021 – Insecure Design"],
    priority: "P3",
    compliance: ["SOC 2 CC7.2"],
  },
  broken_links: {
    cwe: [],
    owasp: [],
    priority: "P4",
    compliance: [],
  },
  api_health: {
    cwe: ["CWE-400"],
    owasp: ["A04:2021 – Insecure Design"],
    priority: "P2",
    compliance: ["SOC 2 CC7.1"],
  },
  configuration: {
    cwe: ["CWE-16", "CWE-1188"], // configuration, insecure default
    owasp: ["A05:2021 – Security Misconfiguration"],
    priority: "P2",
    compliance: ["SOC 2 CC6.1", "ISO 27001 A.8.9"],
  },
};

export interface ClassifiedFinding extends ScanFinding {
  cwe: string[];
  owasp: string[];
  priority: Priority;
  compliance: string[];
}

/** Attach CWE/OWASP/priority/compliance to a finding based on its category. */
export function classifyFinding(finding: ScanFinding): ClassifiedFinding {
  const entry = TAXONOMY[finding.category];
  return {
    ...finding,
    cwe: entry?.cwe ?? [],
    owasp: entry?.owasp ?? [],
    priority: entry?.priority ?? priorityFromSeverity(finding.severity),
    compliance: entry?.compliance ?? [],
  };
}

export function classifyFindings(findings: ScanFinding[]): ClassifiedFinding[] {
  return findings.map(classifyFinding);
}

/** Priority distribution across a finding set (for report headers). */
export function priorityDistribution(findings: ClassifiedFinding[]): Record<Priority, number> {
  const dist: Record<Priority, number> = { P1: 0, P2: 0, P3: 0, P4: 0 };
  for (const f of findings) dist[f.priority] = (dist[f.priority] ?? 0) + 1;
  return dist;
}

export const PRIORITY_ORDER: Priority[] = ["P1", "P2", "P3", "P4"];
