import { promises as dns } from "node:dns";
import type { DNSCheckResult } from "../types.ts";

// ── DNS Records Check ───────────────────────────────────────────────

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

async function safeResolve<T>(fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn();
  } catch {
    return undefined;
  }
}

export async function checkDNS(url: string): Promise<DNSCheckResult> {
  const domain = getDomain(url);

  const [a, aaaa, mx, txt, ns, cname] = await Promise.all([
    safeResolve(() => dns.resolve4(domain)),
    safeResolve(() => dns.resolve6(domain)),
    safeResolve(() => dns.resolveMx(domain)),
    safeResolve(() => dns.resolveTxt(domain)),
    safeResolve(() => dns.resolveNs(domain)),
    safeResolve(() => dns.resolveCname(domain)),
  ]);

  const txtRecords = txt?.map((r) => r.join("")) ?? [];
  const hasSPF = txtRecords.some((r) => r.startsWith("v=spf1"));
  const hasDMARC = txtRecords.some((r) => r.startsWith("v=DMARC1"));

  return {
    domain,
    records: {
      A: a,
      AAAA: aaaa,
      MX: mx?.map((r) => `${r.priority} ${r.exchange}`),
      TXT: txtRecords,
      CNAME: cname,
      NS: ns,
    },
    hasMX: !!mx && mx.length > 0,
    hasSPF,
    hasDMARC,
    checkedAt: new Date().toISOString(),
  };
}
