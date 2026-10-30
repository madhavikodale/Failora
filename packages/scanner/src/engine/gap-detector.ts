import type {
  ScanFinding,
  Severity,
  HealthCheckResult,
  SSLCheckResult,
  DNSCheckResult,
  SecurityHeadersResult,
  PerformanceResult,
} from "../types.ts";

// ── Gap Detection Engine ────────────────────────────────────────────
// Converts raw check results into prioritized findings with evidence.

let findingId = 0;
function nextId(): string {
  return `finding-${Date.now()}-${++findingId}`;
}

function baseEvidence(url: string, extra?: Partial<ScanFinding["evidence"]>) {
  return {
    timestamp: new Date().toISOString(),
    url,
    ...extra,
  };
}

export function detectGaps(
  url: string,
  health: HealthCheckResult,
  ssl: SSLCheckResult,
  dns: DNSCheckResult,
  headers: SecurityHeadersResult,
  perf: PerformanceResult
): ScanFinding[] {
  const findings: ScanFinding[] = [];

  // ── Availability ──
  if (!health.isUp) {
    findings.push({
      id: nextId(),
      category: "availability",
      severity: "critical",
      title: "Website is down or unreachable",
      description: `The website at ${url} returned status ${health.statusCode} or failed to respond.`,
      evidence: baseEvidence(url, {
        statusCode: health.statusCode,
        responseTimeMs: health.responseTimeMs,
        body: health.error,
        reproduction: [
          `curl -I ${url}`,
          `Check server logs for ${new Date().toISOString()}`,
        ],
      }),
      impact: "Users cannot access the website. Revenue and reputation loss.",
      recommendation: "Check server status, DNS resolution, and network connectivity. Verify hosting provider status.",
    });
  }

  // ── SSL Issues ──
  if (!ssl.valid) {
    findings.push({
      id: nextId(),
      category: "ssl",
      severity: "critical",
      title: "SSL certificate is invalid or missing",
      description: `SSL check failed: ${ssl.error}`,
      evidence: baseEvidence(url, { body: ssl.error }),
      impact: "Browsers will show security warnings. Users will distrust the site.",
      recommendation: "Install a valid SSL certificate. Use Let's Encrypt for free certificates.",
    });
  } else if (ssl.daysRemaining !== undefined && ssl.daysRemaining < 30) {
    findings.push({
      id: nextId(),
      category: "ssl",
      severity: ssl.daysRemaining < 7 ? "critical" : "high",
      title: `SSL certificate expires in ${ssl.daysRemaining} days`,
      description: `Certificate issued by ${ssl.issuer} expires on ${ssl.validTo}.`,
      evidence: baseEvidence(url, {
        body: `Issuer: ${ssl.issuer}\nValid To: ${ssl.validTo}\nDays Remaining: ${ssl.daysRemaining}`,
      }),
      impact: "Website will show security warnings after expiry.",
      recommendation: "Renew SSL certificate immediately. Set up auto-renewal.",
    });
  }

  // ── HTTPS Enforcement ──
  if (url.startsWith("http://")) {
    findings.push({
      id: nextId(),
      category: "configuration",
      severity: "high",
      title: "Website not using HTTPS",
      description: "The URL uses HTTP instead of HTTPS. Data is transmitted in plain text.",
      evidence: baseEvidence(url),
      impact: "Sensitive data can be intercepted. Browsers mark HTTP sites as 'Not Secure'.",
      recommendation: "Enable HTTPS and redirect all HTTP traffic to HTTPS.",
    });
  }

  // ── Security Headers ──
  for (const header of headers.missing) {
    const severity: Severity = ["strict-transport-security", "content-security-policy"].includes(header)
      ? "high"
      : "medium";

    findings.push({
      id: nextId(),
      category: "security_headers",
      severity,
      title: `Missing security header: ${header}`,
      description: `The ${header} header is not set. This reduces protection against common attacks.`,
      evidence: baseEvidence(url, { headers: health.headers }),
      impact: "Increased vulnerability to XSS, clickjacking, or MITM attacks.",
      recommendation: `Add the ${header} header to your server configuration.`,
    });
  }

  // ── DNS Issues ──
  if (!dns.hasMX) {
    findings.push({
      id: nextId(),
      category: "dns",
      severity: "low",
      title: "No MX records found",
      description: "This domain cannot receive email.",
      evidence: baseEvidence(url, { body: `Domain: ${dns.domain}` }),
      impact: "Cannot receive email at this domain.",
      recommendation: "Add MX records if you need email for this domain.",
    });
  }

  if (!dns.hasSPF) {
    findings.push({
      id: nextId(),
      category: "dns",
      severity: "medium",
      title: "No SPF record found",
      description: "SPF record helps prevent email spoofing.",
      evidence: baseEvidence(url, { body: `Domain: ${dns.domain}` }),
      impact: "Emails from this domain may be marked as spam or spoofed.",
      recommendation: "Add a TXT record with v=spf1 include:_spf.google.com ~all (or your provider).",
    });
  }

  // ── Performance ──
  if (perf.ttfbMs > 2000) {
    findings.push({
      id: nextId(),
      category: "performance",
      severity: perf.ttfbMs > 5000 ? "high" : "medium",
      title: `Slow Time to First Byte: ${perf.ttfbMs}ms`,
      description: `Server takes ${perf.ttfbMs}ms to start sending data. Recommended: under 800ms.`,
      evidence: baseEvidence(url, { responseTimeMs: perf.ttfbMs }),
      impact: "Poor user experience. Higher bounce rate. Lower SEO ranking.",
      recommendation: "Optimize server response time. Use caching, CDN, or upgrade hosting.",
    });
  }

  if (perf.totalTimeMs > 10000) {
    findings.push({
      id: nextId(),
      category: "performance",
      severity: "medium",
      title: `Slow total page load: ${perf.totalTimeMs}ms`,
      description: `Full page load takes ${perf.totalTimeMs}ms. Recommended: under 3 seconds.`,
      evidence: baseEvidence(url, { responseTimeMs: perf.totalTimeMs }),
      impact: "Users may leave before page loads. Bad for conversion and SEO.",
      recommendation: "Optimize images, minify assets, use CDN, enable compression.",
    });
  }

  // ── Large Page Size ──
  if (perf.sizeBytes > 5 * 1024 * 1024) {
    findings.push({
      id: nextId(),
      category: "performance",
      severity: "medium",
      title: `Large page size: ${(perf.sizeBytes / 1024 / 1024).toFixed(1)}MB`,
      description: "Page is over 5MB. This slows loading on slow networks.",
      evidence: baseEvidence(url, { body: `Size: ${perf.sizeBytes} bytes` }),
      impact: "Slow on mobile networks. High data usage.",
      recommendation: "Compress images, minify CSS/JS, remove unused code.",
    });
  }

  return findings;
}
