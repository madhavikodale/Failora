// ── Baseline Diff Engine ────────────────────────────────────────────
// Compare two scan results: which findings are new, fixed, or
// unchanged. ITADORI-style baseline diffs — per-URL posture tracking.

import type { ScanFinding } from "../types.ts";

export type FindingStatus = "new" | "fixed" | "unchanged";

export interface DiffEntry {
  finding: ScanFinding;
  status: FindingStatus;
  /** In the other scan: the matching finding (for unchanged) or null (new/fixed). */
  counterpart: ScanFinding | null;
}

export interface BaselineDiff {
  target: string;
  baseScanId: string;
  compareScanId: string;
  new: ScanFinding[];
  fixed: ScanFinding[];
  unchanged: ScanFinding[];
  entries: DiffEntry[];
  summary: {
    newCount: number;
    fixedCount: number;
    unchangedCount: number;
    totalBase: number;
    totalCompare: number;
  };
}

/** Stable identity for matching findings across scans. */
export function findingKey(f: ScanFinding): string {
  const url = f.evidence?.url ?? "";
  // normalize: strip query strings, trailing slash
  const normUrl = url.replace(/\?.*$/, "").replace(/\/$/, "");
  return `${f.category}|${f.title.toLowerCase().trim()}|${normUrl}`;
}

/**
 * Diff two finding sets.
 * `base` = earlier scan (what we had), `compare` = newer scan (current state).
 * - "new": in compare but not base (regressions / newly introduced issues)
 * - "fixed": in base but not compare
 * - "unchanged": in both
 */
export function diffFindings(
  base: ScanFinding[],
  compare: ScanFinding[],
  meta: { target: string; baseScanId: string; compareScanId: string }
): BaselineDiff {
  const baseMap = new Map<string, ScanFinding[]>();
  for (const f of base) {
    const k = findingKey(f);
    const arr = baseMap.get(k) ?? [];
    arr.push(f);
    baseMap.set(k, arr);
  }

  const matchedBase = new Set<ScanFinding>();
  const new_: ScanFinding[] = [];
  const unchanged: ScanFinding[] = [];
  const entries: DiffEntry[] = [];

  for (const f of compare) {
    const k = findingKey(f);
    const candidates = baseMap.get(k);
    const match = candidates?.find((c) => !matchedBase.has(c)) ?? null;
    if (match) {
      matchedBase.add(match);
      unchanged.push(f);
      entries.push({ finding: f, status: "unchanged", counterpart: match });
    } else {
      new_.push(f);
      entries.push({ finding: f, status: "new", counterpart: null });
    }
  }

  const fixed: ScanFinding[] = [];
  for (const f of base) {
    if (!matchedBase.has(f)) {
      fixed.push(f);
      entries.push({ finding: f, status: "fixed", counterpart: null });
    }
  }

  return {
    target: meta.target,
    baseScanId: meta.baseScanId,
    compareScanId: meta.compareScanId,
    new: new_,
    fixed,
    unchanged,
    entries,
    summary: {
      newCount: new_.length,
      fixedCount: fixed.length,
      unchangedCount: unchanged.length,
      totalBase: base.length,
      totalCompare: compare.length,
    },
  };
}

/** Convenience: is posture improving? fixed > new is good. */
export function isImproving(diff: BaselineDiff): boolean {
  return diff.summary.fixedCount > diff.summary.newCount;
}
