import { describe, it, expect } from "vitest";
import {
  decideVerification,
  verifyFinding,
  verifyFindings,
  partitionByStatus,
  type FindingRechecker,
} from "./verifier.ts";
import type { ScanFinding } from "../types.ts";

const finding: ScanFinding = {
  id: "f1",
  category: "security_headers",
  severity: "high",
  title: "Missing CSP",
  description: "d",
  evidence: { timestamp: "2026-11-13", url: "https://example.com" },
  impact: "i",
  recommendation: "r",
};

describe("decideVerification", () => {
  it("rejects when signal appears with control (false positive)", () => {
    const d = decideVerification({
      originalSignalPresent: true,
      signalPresentWithControl: true,
      controlValue: "ctrl",
    });
    expect(d.status).toBe("rejected");
    expect(d.notes[0]).toContain("baseline");
  });

  it("confirms when signal is differential (payload yes, control no)", () => {
    const d = decideVerification({
      originalSignalPresent: true,
      signalPresentWithControl: false,
      controlValue: "ctrl",
    });
    expect(d.status).toBe("confirmed");
  });

  it("inconclusive when original signal not reproducible", () => {
    const d = decideVerification({
      originalSignalPresent: false,
      signalPresentWithControl: false,
      controlValue: "ctrl",
    });
    expect(d.status).toBe("inconclusive");
  });
});

describe("verifyFinding", () => {
  const rechecker = (orig: boolean, ctrl: boolean): FindingRechecker => ({
    checkOriginal: async () => orig,
    checkWithControl: async () => ctrl,
  });

  it("produces a full evidence transcript", async () => {
    const r = await verifyFinding(finding, rechecker(true, false), "myctrl");
    expect(r.findingId).toBe("f1");
    expect(r.status).toBe("confirmed");
    expect(r.evidence.controlValue).toBe("myctrl");
    expect(r.evidence.originalSignalPresent).toBe(true);
    expect(r.evidence.verifiedAt).toBeTruthy();
  });

  it("rejects false positives", async () => {
    const r = await verifyFinding(finding, rechecker(true, true));
    expect(r.status).toBe("rejected");
  });

  it("inconclusive when signal vanished", async () => {
    const r = await verifyFinding(finding, rechecker(false, false));
    expect(r.status).toBe("inconclusive");
  });
});

describe("verifyFindings + partitionByStatus", () => {
  it("verifies a set and partitions by verdict", async () => {
    const mk = (id: string): ScanFinding => ({ ...finding, id });
    const rechecker: FindingRechecker = {
      checkOriginal: async (f) => f.id !== "gone",
      checkWithControl: async (f) => f.id === "fp",
    };
    const results = await verifyFindings(
      [mk("ok"), mk("fp"), mk("gone")],
      rechecker
    );
    const parts = partitionByStatus(results);
    expect(parts.confirmed.map((r) => r.findingId)).toEqual(["ok"]);
    expect(parts.rejected.map((r) => r.findingId)).toEqual(["fp"]);
    expect(parts.inconclusive.map((r) => r.findingId)).toEqual(["gone"]);
  });
});
