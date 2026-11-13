export * from "./types.ts";
export { scanUrl } from "./engine/scanner.ts";
export { checkHealth } from "./checks/health.ts";
export { checkSSL } from "./checks/ssl.ts";
export { checkDNS } from "./checks/dns.ts";
export { checkSecurityHeaders } from "./checks/security-headers.ts";
export { analyzePerformance } from "./checks/performance.ts";
export { testAPIEndpoint } from "./checks/api-tester.ts";
export { checkBrokenLinks } from "./checks/broken-links.ts";
export { detectGaps } from "./engine/gap-detector.ts";
export {
  assertSafeTarget,
  acquireRateSlot,
  resetRateLimiter,
  SafetyError,
  type SafetyConfig,
} from "./engine/safety.ts";
export {
  classifyFinding,
  classifyFindings,
  priorityFromSeverity,
  priorityDistribution,
  type ClassifiedFinding,
  type Priority,
} from "./engine/taxonomy.ts";
export {
  diffFindings,
  findingKey,
  isImproving,
  type BaselineDiff,
  type DiffEntry,
  type FindingStatus,
} from "./engine/baseline.ts";
export {
  verifyFinding,
  verifyFindings,
  partitionByStatus,
  decideVerification,
  type FindingRechecker,
  type VerificationResult,
  type VerificationStatus,
  type VerifiedFinding,
} from "./engine/verifier.ts";
