import { describe, expect, test, jest } from "@jest/globals";
import { signAccessToken, signRefreshToken, verifyToken } from "../src/utils/jwt.js";
import { UserRole } from "@prisma/client";

describe("JWT Utility", () => {
  const payload = {
    sub: "user-123",
    role: "USER" as UserRole,
    githubHandle: "testuser"
  };

  test("should sign and verify an access token", () => {
    const token = signAccessToken(payload);
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    const decoded = verifyToken(token);
    expect(decoded.sub).toBe(payload.sub);
    expect(decoded.role).toBe(payload.role);
    expect(decoded.githubHandle).toBe(payload.githubHandle);
  });

  test("should sign a refresh token", () => {
    const token = signRefreshToken({ sub: payload.sub });
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    const decoded = verifyToken(token);
    expect(decoded.sub).toBe(payload.sub);
  });

  test("should throw error for invalid token", () => {
    expect(() => verifyToken("invalid-token")).toThrow();
  });
});
