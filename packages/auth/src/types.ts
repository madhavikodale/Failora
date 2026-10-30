// ── Auth Types ──────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

export interface AuthToken {
  token: string;
  expiresAt: string;
}

export interface AuthResult {
  success: boolean;
  user?: Omit<User, "passwordHash">;
  token?: string;
  error?: string;
}

export interface AuthConfig {
  jwtSecret: string;
  jwtExpirySeconds?: number;
  bcryptRounds?: number;
}
