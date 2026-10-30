import { describe, it, expect } from "vitest";
import { checkSecurityHeaders } from "../src/checks/security-headers.ts";

describe("checkSecurityHeaders", () => {
  it("scores 100 when all headers present", () => {
    const headers = {
      "strict-transport-security": "max-age=31536000",
      "content-security-policy": "default-src 'self'",
      "x-frame-options": "DENY",
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin",
      "permissions-policy": "camera=()",
      "x-xss-protection": "1; mode=block",
      "cross-origin-opener-policy": "same-origin",
      "cross-origin-resource-policy": "same-origin",
      "cross-origin-embedder-policy": "require-corp",
    };

    const result = checkSecurityHeaders(headers);
    expect(result.score).toBe(100);
    expect(result.missing).toHaveLength(0);
  });

  it("detects missing headers", () => {
    const headers = {
      "x-frame-options": "DENY",
    };

    const result = checkSecurityHeaders(headers);
    expect(result.score).toBeLessThan(100);
    expect(result.missing).toContain("strict-transport-security");
    expect(result.missing).toContain("content-security-policy");
  });

  it("is case insensitive", () => {
    const headers = {
      "Strict-Transport-Security": "max-age=31536000",
      "Content-Security-Policy": "default-src 'self'",
    };

    const result = checkSecurityHeaders(headers);
    expect(result.present["strict-transport-security"]).toBeDefined();
    expect(result.present["content-security-policy"]).toBeDefined();
  });
});
