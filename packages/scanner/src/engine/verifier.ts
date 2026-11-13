// ── Proof-Based Verification Engine ─────────────────────────────────
// ITADORI's core principle: report a vulnerability ONLY when
// reproducible evidence exists. Every finding is re-tested with a
// HARMLESS control; if the signal persists with the control, the
// finding is a false positive and gets rejected. Never guess.

import type { ScanFinding } from "../types.ts";

export type VerificationStatus = "confirmed" | "rejected" | "inconclusive";

export interface VerificationResult {
  findingId: string;
  status: VerificationStatus;
  /** Replay transcript: what we sent, what came back. */
  evidence: {
    verifiedAt: string;
    controlValue: string;
    signalPresentWithControl: boolean;
    originalSignalPresent: boolean;
    notes: string[];
  };
}

/**
 * Pure verification decision logic (network-free, unit-testable):
 *
 * - originalSignal=false  → inconclusive (can't even reproduce the original
 *   finding right now — transient or already fixed)
 * - signalWithControl=true → rejected (the "signal" appears regardless of
 *   input → it's baseline noise, not a vulnerability)
 * - else → confirmed
 */
export function decideVerification(input: {
  originalSignalPresent: boolean;
  signalPresentWithControl: boolean;
  controlValue: string;
}): { status: VerificationStatus; notes: string[] } {
  const notes: string[] = [];

  if (!input.originalSignalPresent) {
    notes.push("Original signal not reproducible at verification time (transient or already remediated).");
    return { status: "inconclusive", notes };
  }

  if (input.signalPresentWithControl) {
    notes.push(
      `Signal also present with harmless control value "${input.controlValue}" — baseline behavior, not a vulnerability.`
    );
    return { status: "rejected", notes };
  }

  notes.push("Signal present with payload, absent with control — differential confirms the finding.");
  return { status: "confirmed", notes };
}

/** A re-checker: given a finding, re-run its detection and with a control. */
export interface FindingRechecker {
  /** Did the original finding's signal reproduce right now? */
  checkOriginal(finding: ScanFinding): Promise<boolean>;
  /** Does the same signal appear when we substitute a harmless control? */
  checkWithControl(finding: ScanFinding, controlValue: string): Promise<boolean>;
}

const DEFAULT_CONTROL = "failora-control-0000";

/**
 * Verify one finding via differential re-testing. Network I/O is injected
 * through `rechecker` so this stays unit-testable.
 */
export async function verifyFinding(
  finding: ScanFinding,
  rechecker: FindingRechecker,
  controlValue: string = DEFAULT_CONTROL
): Promise<VerificationResult> {
  const [originalSignalPresent, signalPresentWithControl] = await Promise.all([
    rechecker.checkOriginal(finding),
    rechecker.checkWithControl(finding, controlValue),
  ]);

  const { status, notes } = decideVerification({
    originalSignalPresent,
    signalPresentWithControl,
    controlValue,
  });

  return {
    findingId: finding.id,
    status,
    evidence: {
      verifiedAt: new Date().toISOString(),
      controlValue,
      signalPresentWithControl,
      originalSignalPresent,
      notes,
    },
  };
}

/** Verify a full finding set. Order preserved. */
export async function verifyFindings(
  findings: ScanFinding[],
  rechecker: FindingRechecker,
  controlValue?: string
): Promise<VerificationResult[]> {
  return Promise.all(findings.map((f) => verifyFinding(f, rechecker, controlValue)));
}

/** Attach verification outcome onto a finding (for reports/UI). */
export interface VerifiedFinding extends ScanFinding {
  verification: VerificationResult;
}

export function attachVerification(
  finding: ScanFinding,
  result: VerificationResult
): VerifiedFinding {
  return { ...finding, verification: result };
}

/** Split results by verdict — handy for report sections. */
export function partitionByStatus(results: VerificationResult[]): {
  confirmed: VerificationResult[];
  rejected: VerificationResult[];
  inconclusive: VerificationResult[];
} {
  return {
    confirmed: results.filter((r) => r.status === "confirmed"),
    rejected: results.filter((r) => r.status === "rejected"),
    inconclusive: results.filter((r) => r.status === "inconclusive"),
  };
}
