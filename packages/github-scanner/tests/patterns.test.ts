import { describe, it, expect } from "vitest";
import { CODE_PATTERNS, LANGUAGE_MAP } from "../src/patterns.ts";
import type { CodePattern } from "../src/types.ts";

describe("CODE_PATTERNS", () => {
  it("has patterns for all severity levels", () => {
    const severities = new Set(CODE_PATTERNS.map((p: CodePattern) => p.severity));
    expect(severities.has("critical")).toBe(true);
    expect(severities.has("high")).toBe(true);
    expect(severities.has("medium")).toBe(true);
    expect(severities.has("low")).toBe(true);
  });

  it("every pattern has required fields", () => {
    for (const pattern of CODE_PATTERNS) {
      expect(pattern.name).toBeTruthy();
      expect(pattern.description).toBeTruthy();
      expect(pattern.severity).toBeTruthy();
      expect(pattern.pattern).toBeInstanceOf(RegExp);
      expect(pattern.languages.length).toBeGreaterThan(0);
      expect(pattern.recommendation).toBeTruthy();
    }
  });

  it("detects hardcoded secrets", () => {
    const pattern = CODE_PATTERNS.find((p) => p.name === "hardcoded-secret");
    expect(pattern).toBeDefined();
    expect(pattern!.pattern.test('const apiKey = "sk_live_51H7gJKL123456789"')).toBe(true);
    expect(pattern!.pattern.test('const password = "mySecretPass123"')).toBe(true);
  });

  it("detects eval usage", () => {
    const pattern = CODE_PATTERNS.find((p) => p.name === "eval-usage");
    expect(pattern).toBeDefined();
    expect(pattern!.pattern.test("eval(userCode)")).toBe(true);
    expect(pattern!.pattern.test("new Function('return 1')")).toBe(true);
  });

  it("detects console.log", () => {
    const pattern = CODE_PATTERNS.find((p) => p.name === "console-log-production");
    expect(pattern).toBeDefined();
    expect(pattern!.pattern.test("console.log('debug')")).toBe(true);
    expect(pattern!.pattern.test("console.info('info')")).toBe(true);
  });

  it("detects TODO comments", () => {
    const pattern = CODE_PATTERNS.find((p) => p.name === "todo-fixme");
    expect(pattern).toBeDefined();
    expect(pattern!.pattern.test("// TODO: fix this")).toBe(true);
    expect(pattern!.pattern.test("// FIXME: broken")).toBe(true);
  });

  it("detects weak crypto", () => {
    const pattern = CODE_PATTERNS.find((p) => p.name === "weak-crypto");
    expect(pattern).toBeDefined();
    expect(pattern!.pattern.test("md5(password)")).toBe(true);
    expect(pattern!.pattern.test("sha1(data)")).toBe(true);
  });
});

describe("LANGUAGE_MAP", () => {
  it("maps common extensions", () => {
    expect(LANGUAGE_MAP[".js"]).toBe("JavaScript");
    expect(LANGUAGE_MAP[".ts"]).toBe("TypeScript");
    expect(LANGUAGE_MAP[".py"]).toBe("Python");
    expect(LANGUAGE_MAP[".go"]).toBe("Go");
    expect(LANGUAGE_MAP[".rs"]).toBe("Rust");
  });
});
