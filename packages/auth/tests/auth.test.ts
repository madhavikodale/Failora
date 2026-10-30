import { describe, it, expect } from "vitest";
import { AuthService, hashPassword, verifyPassword, signJWT, verifyJWT } from "../src/index.ts";

const config = { jwtSecret: "test-secret-key-12345", jwtExpirySeconds: 3600 };

describe("Password Hashing", () => {
  it("hashes and verifies passwords", () => {
    const hash = hashPassword("mySecurePassword123");
    expect(hash).toContain(":");
    expect(verifyPassword("mySecurePassword123", hash)).toBe(true);
    expect(verifyPassword("wrongPassword", hash)).toBe(false);
  });

  it("generates unique hashes for same password", () => {
    const hash1 = hashPassword("password123");
    const hash2 = hashPassword("password123");
    expect(hash1).not.toBe(hash2);
  });
});

describe("JWT", () => {
  it("signs and verifies tokens", () => {
    const token = signJWT({ userId: "usr-1", email: "test@example.com" }, config);
    expect(token.token).toContain(".");
    expect(token.token.split(".").length).toBe(3);

    const payload = verifyJWT(token.token, config);
    expect(payload).not.toBeNull();
    expect(payload!.userId).toBe("usr-1");
    expect(payload!.email).toBe("test@example.com");
  });

  it("rejects tampered tokens", () => {
    const token = signJWT({ userId: "usr-1", email: "test@example.com" }, config);
    const parts = token.token.split(".");
    const tampered = `${parts[0]}.${parts[1]}.tampered_signature`;
    expect(verifyJWT(tampered, config)).toBeNull();
  });

  it("rejects tokens with wrong secret", () => {
    const token = signJWT({ userId: "usr-1", email: "test@example.com" }, config);
    const wrongConfig = { jwtSecret: "wrong-secret" };
    expect(verifyJWT(token.token, wrongConfig)).toBeNull();
  });
});

describe("AuthService", () => {
  it("registers and logs in users", () => {
    const auth = new AuthService(config);

    const reg = auth.register("test@example.com", "Test User", "password123");
    expect(reg.success).toBe(true);
    expect(reg.user).toBeDefined();
    expect(reg.user!.email).toBe("test@example.com");
    expect(reg.token).toBeDefined();

    const login = auth.login("test@example.com", "password123");
    expect(login.success).toBe(true);
    expect(login.user).toBeDefined();
    expect(login.token).toBeDefined();
  });

  it("rejects duplicate registration", () => {
    const auth = new AuthService(config);
    auth.register("test@example.com", "Test", "password123");
    const dup = auth.register("test@example.com", "Test", "password123");
    expect(dup.success).toBe(false);
    expect(dup.error).toBe("User already exists");
  });

  it("rejects weak passwords", () => {
    const auth = new AuthService(config);
    const weak = auth.register("test@example.com", "Test", "short");
    expect(weak.success).toBe(false);
    expect(weak.error).toContain("8 characters");
  });

  it("rejects wrong password on login", () => {
    const auth = new AuthService(config);
    auth.register("test@example.com", "Test", "password123");
    const wrong = auth.login("test@example.com", "wrongpassword");
    expect(wrong.success).toBe(false);
    expect(wrong.error).toBe("Invalid credentials");
  });

  it("verifies tokens and returns user", () => {
    const auth = new AuthService(config);
    const reg = auth.register("test@example.com", "Test User", "password123");

    const user = auth.verifyToken(reg.token!);
    expect(user).not.toBeNull();
    expect(user!.email).toBe("test@example.com");
    expect(user!.name).toBe("Test User");
  });

  it("rejects invalid tokens", () => {
    const auth = new AuthService(config);
    expect(auth.verifyToken("invalid.token.here")).toBeNull();
  });
});
