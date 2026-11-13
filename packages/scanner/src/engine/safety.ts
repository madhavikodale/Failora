// ── Failora Scanner Safety Layer ────────────────────────────────────
// Inspired by ITADORI's safety model: no traffic without explicit
// authorization, scope enforcement, private-network blocking, and
// per-host rate limiting. Scans only systems we own or are explicitly
// authorized to test.

export interface SafetyConfig {
  /** Explicit acknowledgment that the operator is authorized to test the target. */
  authorized: boolean;
  /** Allow http:// (default false — https only, matching ITADORI). */
  allowInsecure?: boolean;
  /** Allow localhost/loopback targets (default false). Needed for mock-ai e2e tests. */
  allowLocalhost?: boolean;
  /** Max requests per host per window (default 30). */
  maxRequestsPerHost?: number;
  /** Rate-limit window in ms (default 10_000). */
  rateWindowMs?: number;
}

export class SafetyError extends Error {
  readonly code:
    | "NOT_AUTHORIZED"
    | "INSECURE_SCHEME"
    | "PRIVATE_TARGET"
    | "CLOUD_METADATA"
    | "RATE_LIMITED";
  constructor(
    code: SafetyError["code"],
    message: string
  ) {
    super(message);
    this.name = "SafetyError";
    this.code = code;
  }
}

// ── Private / reserved ranges (IPv4) ────────────────────────────────

const PRIVATE_IPV4 = [
  /^0\./,                                  // "this network"
  /^10\./,                                  // RFC 1918
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // CGNAT 100.64/10
  /^127\./,                                 // loopback
  /^169\.254\./,                            // link-local + cloud metadata
  /^172\.(1[6-9]|2\d|3[01])\./,            // RFC 1918
  /^192\.168\./,                            // RFC 1918
  /^198\.(18|19)\./,                        // benchmarking
  /^22[4-9]\./, /^23\d\./,                  // multicast/reserved
  /^24[0-9]\./, /^25[0-5]\./,
];

const PRIVATE_IPV6 = [
  /^::1$/,
  /^::$/,
  /^f[cd]/i,                                // unique local fc00::/7
  /^fe[89ab]/i,                             // link-local fe80::/10
];

const METADATA_HOSTNAMES = [
  "metadata.google.internal",
  "metadata.goog",
  "instance-data",
];

function isPrivateIPv4(host: string): boolean {
  return PRIVATE_IPV4.some((re) => re.test(host));
}

function isPrivateIPv6(host: string): boolean {
  const bare = host.replace(/^\[|\]$/g, "");
  return PRIVATE_IPV6.some((re) => re.test(bare));
}

function isIpv4(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

// ── Target validation ───────────────────────────────────────────────

/**
 * Validate a scan target against the safety policy. Throws SafetyError
 * on violation. Call this BEFORE any network traffic is sent.
 */
export function assertSafeTarget(rawUrl: string, config: SafetyConfig): URL {
  if (!config.authorized) {
    throw new SafetyError(
      "NOT_AUTHORIZED",
      "Authorization not acknowledged. You may only scan systems you own or are explicitly authorized to test."
    );
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SafetyError("INSECURE_SCHEME", `Invalid URL: ${rawUrl}`);
  }

  const host = url.hostname.toLowerCase();
  const isLocalhostName =
    host === "localhost" || host.endsWith(".localhost") || host === "::1" || host === "[::1]";

  // Localhost http testing: allowInsecure implied when allowLocalhost is set
  if (
    url.protocol === "http:" &&
    !config.allowInsecure &&
    !(isLocalhostName && config.allowLocalhost)
  ) {
    throw new SafetyError(
      "INSECURE_SCHEME",
      "Only https:// targets are allowed by default. Pass allowInsecure to scan http:// (localhost testing only)."
    );
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new SafetyError("INSECURE_SCHEME", `Unsupported scheme: ${url.protocol}`);
  }

  if (METADATA_HOSTNAMES.includes(host) || host === "169.254.169.254") {
    throw new SafetyError(
      "CLOUD_METADATA",
      "Cloud metadata endpoints are permanently blocked."
    );
  }

  if (isLocalhostName) {
    if (!config.allowLocalhost) {
      throw new SafetyError(
        "PRIVATE_TARGET",
        "Localhost targets are blocked by default. Pass allowLocalhost for local testing."
      );
    }
    return url;
  }

  if (isIpv4(host) && isPrivateIPv4(host)) {
    throw new SafetyError(
      "PRIVATE_TARGET",
      `Private/reserved IPv4 range blocked: ${host}`
    );
  }
  if (!isIpv4(host) && host.includes(":") && isPrivateIPv6(host)) {
    throw new SafetyError(
      "PRIVATE_TARGET",
      `Private/reserved IPv6 range blocked: ${host}`
    );
  }

  return url;
}

// ── Per-host rate limiter (token bucket) ────────────────────────────

interface HostBucket {
  tokens: number;
  lastRefill: number;
}

const hostBuckets = new Map<string, HostBucket>();

/**
 * Acquire permission for one request to a host. Throws SafetyError
 * RATE_LIMITED when the per-host budget is exhausted.
 */
export function acquireRateSlot(
  host: string,
  config: Pick<SafetyConfig, "maxRequestsPerHost" | "rateWindowMs">
): void {
  const max = config.maxRequestsPerHost ?? 30;
  const windowMs = config.rateWindowMs ?? 10_000;
  const now = Date.now();

  let bucket = hostBuckets.get(host);
  if (!bucket) {
    bucket = { tokens: max, lastRefill: now };
    hostBuckets.set(host, bucket);
  }

  // Refill proportional to elapsed time
  const elapsed = now - bucket.lastRefill;
  if (elapsed > 0) {
    bucket.tokens = Math.min(max, bucket.tokens + (elapsed / windowMs) * max);
    bucket.lastRefill = now;
  }

  if (bucket.tokens < 1) {
    throw new SafetyError(
      "RATE_LIMITED",
      `Rate limit exceeded for ${host} (${max} requests / ${windowMs}ms). Slow down.`
    );
  }
  bucket.tokens -= 1;
}

/** Test-only: reset rate-limit state. */
export function resetRateLimiter(): void {
  hostBuckets.clear();
}
