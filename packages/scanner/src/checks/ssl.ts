import { connect } from "node:tls";
import type { SSLCheckResult } from "../types.ts";

// ── SSL Certificate Check ───────────────────────────────────────────

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function getPort(url: string): number {
  try {
    return new URL(url).port ? Number(new URL(url).port) : 443;
  } catch {
    return 443;
  }
}

export async function checkSSL(url: string, timeoutMs = 10000): Promise<SSLCheckResult> {
  const hostname = getHostname(url);
  const port = getPort(url);

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve({ valid: false, error: `SSL check timed out after ${timeoutMs}ms` });
    }, timeoutMs);

    try {
      const socket = connect(
        { host: hostname, port, servername: hostname, rejectUnauthorized: false },
        () => {
          const cert = socket.getPeerCertificate();
          const protocol = socket.getProtocol();
          const cipher = socket.getCipher()?.name;

          clearTimeout(timer);
          socket.end();

          if (!cert || Object.keys(cert).length === 0) {
            return resolve({ valid: false, error: "No certificate presented" });
          }

          const validTo = cert.valid_to ? new Date(cert.valid_to) : undefined;
          const now = new Date();
          const daysRemaining = validTo
            ? Math.floor((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : undefined;

          resolve({
            valid: true,
            issuer: cert.issuer?.O || cert.issuer?.CN,
            subject: cert.subject?.CN,
            validFrom: cert.valid_from,
            validTo: cert.valid_to,
            daysRemaining,
            fingerprint: cert.fingerprint,
            protocol,
            cipher,
          });
        }
      );

      socket.on("error", (err) => {
        clearTimeout(timer);
        resolve({ valid: false, error: err.message });
      });
    } catch (err) {
      clearTimeout(timer);
      resolve({ valid: false, error: err instanceof Error ? err.message : String(err) });
    }
  });
}
