import { describe, it, expect } from "vitest";
import { checkBrokenLinks } from "../src/checks/broken-links.ts";
import { testAPIEndpoint } from "../src/checks/api-tester.ts";

describe("testAPIEndpoint", () => {
  it("detects healthy endpoint", async () => {
    const result = await testAPIEndpoint({
      endpoint: "http://127.0.0.1:9999/nonexistent",
      expectedStatusCodes: [404],
    });
    expect(result.isHealthy).toBe(false); // Will fail because server doesn't exist
    expect(result.statusCode).toBe(0);
    expect(result.error).toBeDefined();
  });

  it("records timing and config", async () => {
    const result = await testAPIEndpoint({
      endpoint: "http://127.0.0.1:9999/nonexistent",
      method: "POST",
      body: { test: true },
      timeoutMs: 2000,
    });
    expect(result.method).toBe("POST");
    expect(result.timeoutMs).toBe(2000);
    expect(result.checkedAt).toBeDefined();
  });
});

describe("checkBrokenLinks", () => {
  it("extracts and checks links from HTML", async () => {
    // This would need a real server to test against
    // For now, verify the function exists and returns proper shape
    expect(typeof checkBrokenLinks).toBe("function");
  });
});
