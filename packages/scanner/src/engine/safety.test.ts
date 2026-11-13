import { describe, it, expect, beforeEach } from "vitest";
import {
  assertSafeTarget,
  acquireRateSlot,
  resetRateLimiter,
  SafetyError,
} from "./safety.ts";

const AUTH = { authorized: true };

describe("assertSafeTarget", () => {
  it("rejects when authorization not acknowledged", () => {
    expect(() => assertSafeTarget("https://example.com", { authorized: false }))
      .toThrowError(SafetyError);
    try {
      assertSafeTarget("https://example.com", { authorized: false });
    } catch (e) {
      expect((e as SafetyError).code).toBe("NOT_AUTHORIZED");
    }
  });

  it("allows https public targets when authorized", () => {
    const url = assertSafeTarget("https://example.com/path", AUTH);
    expect(url.hostname).toBe("example.com");
  });

  it("rejects http by default", () => {
    try {
      assertSafeTarget("http://example.com", AUTH);
      expect.unreachable();
    } catch (e) {
      expect((e as SafetyError).code).toBe("INSECURE_SCHEME");
    }
  });

  it("allows http when allowInsecure set", () => {
    expect(() => assertSafeTarget("http://example.com", { ...AUTH, allowInsecure: true }))
      .not.toThrow();
  });

  it("blocks cloud metadata endpoint", () => {
    try {
      assertSafeTarget("http://169.254.169.254/latest/meta-data", { ...AUTH, allowInsecure: true });
      expect.unreachable();
    } catch (e) {
      expect((e as SafetyError).code).toBe("CLOUD_METADATA");
    }
  });

  it("blocks metadata hostnames", () => {
    try {
      assertSafeTarget("https://metadata.google.internal/computeMetadata/v1/", AUTH);
      expect.unreachable();
    } catch (e) {
      expect((e as SafetyError).code).toBe("CLOUD_METADATA");
    }
  });

  it.each([
    "http://10.0.0.1",
    "http://192.168.1.1",
    "http://172.16.0.1",
    "http://172.31.255.255",
    "http://127.0.0.1",
    "http://0.0.0.0",
    "http://100.64.0.1",
    "http://169.254.1.1",
    "http://224.0.0.1",
  ])("blocks private IPv4: %s", (u) => {
    try {
      assertSafeTarget(u, { ...AUTH, allowInsecure: true });
      expect.unreachable();
    } catch (e) {
      expect((e as SafetyError).code).toBe("PRIVATE_TARGET");
    }
  });

  it("blocks localhost by default", () => {
    try {
      assertSafeTarget("http://localhost:5173", { ...AUTH, allowInsecure: true });
      expect.unreachable();
    } catch (e) {
      expect((e as SafetyError).code).toBe("PRIVATE_TARGET");
    }
  });

  it("allows localhost with allowLocalhost (even over http)", () => {
    const url = assertSafeTarget("http://localhost:5173", { ...AUTH, allowLocalhost: true });
    expect(url.hostname).toBe("localhost");
  });

  it("rejects invalid URLs", () => {
    try {
      assertSafeTarget("not a url", AUTH);
      expect.unreachable();
    } catch (e) {
      expect((e as SafetyError).code).toBe("INSECURE_SCHEME");
    }
  });
});

describe("acquireRateSlot", () => {
  beforeEach(() => resetRateLimiter());

  it("allows requests within budget", () => {
    for (let i = 0; i < 5; i++) {
      expect(() => acquireRateSlot("example.com", { maxRequestsPerHost: 5, rateWindowMs: 10_000 }))
        .not.toThrow();
    }
  });

  it("throws RATE_LIMITED when budget exhausted", () => {
    const cfg = { maxRequestsPerHost: 3, rateWindowMs: 60_000 };
    for (let i = 0; i < 3; i++) acquireRateSlot("example.com", cfg);
    try {
      acquireRateSlot("example.com", cfg);
      expect.unreachable();
    } catch (e) {
      expect((e as SafetyError).code).toBe("RATE_LIMITED");
    }
  });

  it("tracks hosts independently", () => {
    const cfg = { maxRequestsPerHost: 1, rateWindowMs: 60_000 };
    acquireRateSlot("a.com", cfg);
    expect(() => acquireRateSlot("b.com", cfg)).not.toThrow();
  });
});
