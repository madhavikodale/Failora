// ── Failora Scanner Types ───────────────────────────────────────────

export type Severity = "critical" | "high" | "medium" | "low";

export interface ScanFinding {
  id: string;
  category:
    | "availability"
    | "ssl"
    | "dns"
    | "security_headers"
    | "performance"
    | "broken_links"
    | "api_health"
    | "configuration";
  severity: Severity;
  title: string;
  description: string;
  evidence: {
    timestamp: string;
    url?: string;
    statusCode?: number;
    responseTimeMs?: number;
    headers?: Record<string, string>;
    body?: string;
    reproduction?: string[];
  };
  impact: string;
  recommendation: string;
}

export interface HealthCheckResult {
  url: string;
  isUp: boolean;
  statusCode: number;
  responseTimeMs: number;
  redirectUrl?: string;
  headers: Record<string, string>;
  checkedAt: string;
  error?: string;
}

export interface SSLCheckResult {
  valid: boolean;
  issuer?: string;
  subject?: string;
  validFrom?: string;
  validTo?: string;
  daysRemaining?: number;
  fingerprint?: string;
  protocol?: string;
  cipher?: string;
  error?: string;
}

export interface DNSCheckResult {
  domain: string;
  records: {
    A?: string[];
    AAAA?: string[];
    MX?: string[];
    TXT?: string[];
    CNAME?: string[];
    NS?: string[];
  };
  hasMX: boolean;
  hasSPF: boolean;
  hasDMARC: boolean;
  checkedAt: string;
}

export interface SecurityHeadersResult {
  present: Record<string, string>;
  missing: string[];
  score: number; // 0-100
}

export interface PerformanceResult {
  url: string;
  ttfbMs: number;
  totalTimeMs: number;
  dnsLookupMs: number;
  tcpConnectMs: number;
  tlsHandshakeMs: number;
  firstByteMs: number;
  downloadMs: number;
  sizeBytes: number;
}

export interface ScanResult {
  id: string;
  url: string;
  scannedAt: string;
  overallScore: number; // 0-100
  health: HealthCheckResult;
  ssl: SSLCheckResult;
  dns: DNSCheckResult;
  securityHeaders: SecurityHeadersResult;
  performance: PerformanceResult;
  findings: ScanFinding[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}
