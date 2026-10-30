import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { User, AuthConfig, AuthResult, AuthToken, JWTPayload } from "./types.ts";

// ── Password Hashing (scrypt, no external deps) ─────────────────────

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const computed = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return computed.length === expected.length && timingSafeEqual(computed, expected);
}

// ── JWT Implementation (HMAC-SHA256, no external deps) ──────────────

function base64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecode(input: string): string {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
}

export function signJWT(payload: Omit<JWTPayload, "iat" | "exp">, config: AuthConfig): AuthToken {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (config.jwtExpirySeconds ?? 86400);

  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify({ ...payload, iat: now, exp }));

  const signature = createHash("sha256")
    .update(`${header}.${body}.${config.jwtSecret}`)
    .digest("base64url");

  return {
    token: `${header}.${body}.${signature}`,
    expiresAt: new Date(exp * 1000).toISOString(),
  };
}

export function verifyJWT(token: string, config: AuthConfig): JWTPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  const expectedSig = createHash("sha256")
    .update(`${header}.${body}.${config.jwtSecret}`)
    .digest("base64url");

  if (signature !== expectedSig) return null;

  try {
    const payload = JSON.parse(base64urlDecode(body)) as JWTPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ── Auth Service ────────────────────────────────────────────────────

export class AuthService {
  private users = new Map<string, User>();
  private config: AuthConfig;

  constructor(config: AuthConfig) {
    this.config = config;
  }

  register(email: string, name: string, password: string): AuthResult {
    if (this.users.has(email)) {
      return { success: false, error: "User already exists" };
    }

    if (password.length < 8) {
      return { success: false, error: "Password must be at least 8 characters" };
    }

    const user: User = {
      id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      email,
      name,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };

    this.users.set(email, user);

    const { passwordHash, ...publicUser } = user;
    const token = signJWT({ userId: user.id, email: user.email }, this.config);

    return { success: true, user: publicUser, token: token.token };
  }

  login(email: string, password: string): AuthResult {
    const user = this.users.get(email);
    if (!user) {
      return { success: false, error: "Invalid credentials" };
    }

    if (!verifyPassword(password, user.passwordHash)) {
      return { success: false, error: "Invalid credentials" };
    }

    user.lastLoginAt = new Date().toISOString();
    const { passwordHash, ...publicUser } = user;
    const token = signJWT({ userId: user.id, email: user.email }, this.config);

    return { success: true, user: publicUser, token: token.token };
  }

  verifyToken(token: string): Omit<User, "passwordHash"> | null {
    const payload = verifyJWT(token, this.config);
    if (!payload) return null;

    const user = this.users.get(payload.email);
    if (!user) return null;

    const { passwordHash, ...publicUser } = user;
    return publicUser;
  }

  getUser(email: string): Omit<User, "passwordHash"> | null {
    const user = this.users.get(email);
    if (!user) return null;
    const { passwordHash, ...publicUser } = user;
    return publicUser;
  }
}
