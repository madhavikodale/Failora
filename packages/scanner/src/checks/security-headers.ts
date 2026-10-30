import type { SecurityHeadersResult } from "../types.ts";

// ── Security Headers Check ──────────────────────────────────────────

const SECURITY_HEADERS: Record<string, { weight: number; description: string }> = {
  "strict-transport-security": { weight: 20, description: "HSTS — forces HTTPS connections" },
  "content-security-policy": { weight: 20, description: "CSP — prevents XSS and injection attacks" },
  "x-frame-options": { weight: 10, description: "Clickjacking protection" },
  "x-content-type-options": { weight: 10, description: "MIME sniffing protection" },
  "referrer-policy": { weight: 10, description: "Controls referrer information leakage" },
  "permissions-policy": { weight: 10, description: "Controls browser feature access" },
  "x-xss-protection": { weight: 5, description: "Legacy XSS filter (deprecated but still checked)" },
  "cross-origin-opener-policy": { weight: 5, description: "Isolates browsing context" },
  "cross-origin-resource-policy": { weight: 5, description: "Controls cross-origin resource loading" },
  "cross-origin-embedder-policy": { weight: 5, description: "Requires explicit permission for embedding" },
};

export function checkSecurityHeaders(
  headers: Record<string, string>
): SecurityHeadersResult {
  const lowerHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    lowerHeaders[k.toLowerCase()] = v;
  }

  const present: Record<string, string> = {};
  const missing: string[] = [];
  let score = 0;

  for (const [header, config] of Object.entries(SECURITY_HEADERS)) {
    const value = lowerHeaders[header];
    if (value) {
      present[header] = value;
      score += config.weight;
    } else {
      missing.push(header);
    }
  }

  return { present, missing, score };
}
