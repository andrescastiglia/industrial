import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateTokenPair,
  extractTokenFromHeader,
  isValidBearerToken,
  AUTH_ERRORS,
  type JWTPayload,
  type UserRole,
} from "@/lib/auth";
import jwt from "jsonwebtoken";

// Mock environment variables
const JWT_SECRET = "test-secret-key";
const JWT_REFRESH_SECRET = "test-refresh-secret-key";

// Override env vars for testing
process.env.JWT_SECRET = JWT_SECRET;
process.env.JWT_REFRESH_SECRET = JWT_REFRESH_SECRET;

describe("auth.ts - Password Hashing", () => {
  describe("hashPassword", () => {
    it("should hash a password successfully", async () => {
      const password = "testPassword123";
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should generate different hashes for same password (salt)", async () => {
      const password = "testPassword123";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it("should hash empty string", async () => {
      const hash = await hashPassword("");
      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
    });
  });

  describe("verifyPassword", () => {
    it("should verify correct password", async () => {
      const password = "testPassword123";
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it("should reject incorrect password", async () => {
      const password = "testPassword123";
      const wrongPassword = "wrongPassword456";
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(wrongPassword, hash);

      expect(isValid).toBe(false);
    });

    it("should reject password against invalid hash", async () => {
      const password = "testPassword123";
      const invalidHash = "not-a-valid-hash";

      // bcrypt returns false for invalid hash format instead of throwing
      const isValid = await verifyPassword(password, invalidHash).catch(
        () => false
      );
      expect(isValid).toBe(false);
    });
  });
});

describe("auth.ts - JWT Access Tokens", () => {
  const mockPayload: Omit<JWTPayload, "iat" | "exp"> = {
    userId: 1,
    email: "test@example.com",
    role: "admin" as UserRole,
  };

  describe("generateAccessToken", () => {
    it("should generate valid JWT token", () => {
      const token = generateAccessToken(mockPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(3); // JWT has 3 parts
    });

    it("should include payload data in token", () => {
      const token = generateAccessToken(mockPayload);
      const decoded = jwt.decode(token) as JWTPayload;

      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.role).toBe(mockPayload.role);
    });

    it("should set expiration time", () => {
      const token = generateAccessToken(mockPayload);
      const decoded = jwt.decode(token) as JWTPayload;

      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp! > decoded.iat!).toBe(true);
    });

    it("should generate different tokens for different payloads", () => {
      const payload1 = { ...mockPayload, userId: 1 };
      const payload2 = { ...mockPayload, userId: 2 };

      const token1 = generateAccessToken(payload1);
      const token2 = generateAccessToken(payload2);

      expect(token1).not.toBe(token2);
    });
  });

  describe("verifyAccessToken", () => {
    it("should verify valid access token", () => {
      const token = generateAccessToken(mockPayload);
      const decoded = verifyAccessToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(mockPayload.userId);
      expect(decoded?.email).toBe(mockPayload.email);
      expect(decoded?.role).toBe(mockPayload.role);
    });

    it("should return null for invalid token", () => {
      const invalidToken = "invalid.token.here";
      const decoded = verifyAccessToken(invalidToken);

      expect(decoded).toBeNull();
    });

    it("should return null for expired token", () => {
      // Create token that expires immediately
      const expiredToken = jwt.sign(mockPayload, JWT_SECRET, {
        expiresIn: "0s",
      });

      // Wait a bit to ensure expiration
      const decoded = verifyAccessToken(expiredToken);
      expect(decoded).toBeNull();
    });

    it("should return null for token with wrong secret", () => {
      const wrongSecretToken = jwt.sign(mockPayload, "wrong-secret", {
        expiresIn: "15m",
      });
      const decoded = verifyAccessToken(wrongSecretToken);

      expect(decoded).toBeNull();
    });

    it("should return null for empty token", () => {
      const decoded = verifyAccessToken("");
      expect(decoded).toBeNull();
    });
  });
});

describe("auth.ts - JWT Refresh Tokens", () => {
  const mockPayload: Omit<JWTPayload, "iat" | "exp"> = {
    userId: 2,
    email: "refresh@example.com",
    role: "gerente" as UserRole,
  };

  describe("generateRefreshToken", () => {
    it("should generate valid refresh token", () => {
      const token = generateRefreshToken(mockPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(3);
    });

    it("should include payload data", () => {
      const token = generateRefreshToken(mockPayload);
      const decoded = jwt.decode(token) as JWTPayload;

      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.role).toBe(mockPayload.role);
    });

    it("should have longer expiry than access token", () => {
      const refreshToken = generateRefreshToken(mockPayload);
      const accessToken = generateAccessToken(mockPayload);

      const refreshDecoded = jwt.decode(refreshToken) as JWTPayload;
      const accessDecoded = jwt.decode(accessToken) as JWTPayload;

      const refreshExpiry = refreshDecoded.exp! - refreshDecoded.iat!;
      const accessExpiry = accessDecoded.exp! - accessDecoded.iat!;

      expect(refreshExpiry).toBeGreaterThan(accessExpiry);
    });
  });

  describe("verifyRefreshToken", () => {
    it("should verify valid refresh token", () => {
      const token = generateRefreshToken(mockPayload);
      const decoded = verifyRefreshToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(mockPayload.userId);
      expect(decoded?.email).toBe(mockPayload.email);
    });

    it("should return null for invalid refresh token", () => {
      const invalidToken = "invalid.refresh.token";
      const decoded = verifyRefreshToken(invalidToken);

      expect(decoded).toBeNull();
    });

    it("should return null for access token used as refresh token", () => {
      // Access token signed with different secret
      const accessToken = generateAccessToken(mockPayload);
      const decoded = verifyRefreshToken(accessToken);

      expect(decoded).toBeNull();
    });
  });
});

describe("auth.ts - Token Pair Generation", () => {
  const mockPayload: Omit<JWTPayload, "iat" | "exp"> = {
    userId: 3,
    email: "pair@example.com",
    role: "operario" as UserRole,
  };

  describe("generateTokenPair", () => {
    it("should generate both access and refresh tokens", () => {
      const { accessToken, refreshToken } = generateTokenPair(mockPayload);

      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();
      expect(typeof accessToken).toBe("string");
      expect(typeof refreshToken).toBe("string");
    });

    it("should generate verifiable tokens", () => {
      const { accessToken, refreshToken } = generateTokenPair(mockPayload);

      const accessDecoded = verifyAccessToken(accessToken);
      const refreshDecoded = verifyRefreshToken(refreshToken);

      expect(accessDecoded).not.toBeNull();
      expect(refreshDecoded).not.toBeNull();
      expect(accessDecoded?.userId).toBe(mockPayload.userId);
      expect(refreshDecoded?.userId).toBe(mockPayload.userId);
    });

    it("should generate tokens with same payload data", () => {
      const { accessToken, refreshToken } = generateTokenPair(mockPayload);

      const accessDecoded = jwt.decode(accessToken) as JWTPayload;
      const refreshDecoded = jwt.decode(refreshToken) as JWTPayload;

      expect(accessDecoded.userId).toBe(refreshDecoded.userId);
      expect(accessDecoded.email).toBe(refreshDecoded.email);
      expect(accessDecoded.role).toBe(refreshDecoded.role);
    });

    it("should generate different tokens each time", async () => {
      const pair1 = generateTokenPair(mockPayload);
      // Wait 1100ms to ensure different iat timestamp (JWT uses seconds)
      await new Promise((resolve) => setTimeout(resolve, 1100));
      const pair2 = generateTokenPair(mockPayload);

      expect(pair1.accessToken).not.toBe(pair2.accessToken);
      expect(pair1.refreshToken).not.toBe(pair2.refreshToken);
    });
  });
});

describe("auth.ts - Token Header Utilities", () => {
  describe("extractTokenFromHeader", () => {
    it("should extract token from valid Bearer header", () => {
      const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token";
      const header = `Bearer ${token}`;
      const extracted = extractTokenFromHeader(header);

      expect(extracted).toBe(token);
    });

    it("should return null for null header", () => {
      const extracted = extractTokenFromHeader(null);
      expect(extracted).toBeNull();
    });

    it("should return null for empty header", () => {
      const extracted = extractTokenFromHeader("");
      expect(extracted).toBeNull();
    });

    it("should return null for header without Bearer", () => {
      const extracted = extractTokenFromHeader("SomeToken");
      expect(extracted).toBeNull();
    });

    it("should return null for malformed Bearer header", () => {
      const extracted = extractTokenFromHeader("Bearer");
      expect(extracted).toBeNull();
    });

    it("should return null for wrong auth scheme", () => {
      const extracted = extractTokenFromHeader("Basic dGVzdDp0ZXN0");
      expect(extracted).toBeNull();
    });

    it("should handle Bearer with extra spaces", () => {
      const token = "test.token.here";
      const header = `Bearer  ${token}`;
      const extracted = extractTokenFromHeader(header);

      // Should return null due to extra space creating 3 parts
      expect(extracted).toBeNull();
    });
  });

  describe("isValidBearerToken", () => {
    const mockPayload: Omit<JWTPayload, "iat" | "exp"> = {
      userId: 4,
      email: "bearer@example.com",
      role: "admin" as UserRole,
    };

    it("should return true for valid token", () => {
      const token = generateAccessToken(mockPayload);
      const isValid = isValidBearerToken(token);

      expect(isValid).toBe(true);
    });

    it("should return false for invalid token", () => {
      const invalidToken = "invalid.token.here";
      const isValid = isValidBearerToken(invalidToken);

      expect(isValid).toBe(false);
    });

    it("should return false for null token", () => {
      const isValid = isValidBearerToken(null);
      expect(isValid).toBe(false);
    });

    it("should return false for empty token", () => {
      const isValid = isValidBearerToken("");
      expect(isValid).toBe(false);
    });

    it("should return false for expired token", () => {
      const expiredToken = jwt.sign(mockPayload, JWT_SECRET, {
        expiresIn: "0s",
      });
      const isValid = isValidBearerToken(expiredToken);

      expect(isValid).toBe(false);
    });

    it("should return false for token with wrong secret", () => {
      const wrongToken = jwt.sign(mockPayload, "wrong-secret", {
        expiresIn: "15m",
      });
      const isValid = isValidBearerToken(wrongToken);

      expect(isValid).toBe(false);
    });
  });
});

describe("auth.ts - Auth Error Constants", () => {
  it("should have INVALID_CREDENTIALS error", () => {
    expect(AUTH_ERRORS.INVALID_CREDENTIALS).toBeDefined();
    expect(AUTH_ERRORS.INVALID_CREDENTIALS.statusCode).toBe(401);
    expect(AUTH_ERRORS.INVALID_CREDENTIALS.error).toContain("Email");
  });

  it("should have MISSING_TOKEN error", () => {
    expect(AUTH_ERRORS.MISSING_TOKEN).toBeDefined();
    expect(AUTH_ERRORS.MISSING_TOKEN.statusCode).toBe(401);
    expect(AUTH_ERRORS.MISSING_TOKEN.error).toContain("Token");
  });

  it("should have INVALID_TOKEN error", () => {
    expect(AUTH_ERRORS.INVALID_TOKEN).toBeDefined();
    expect(AUTH_ERRORS.INVALID_TOKEN.statusCode).toBe(401);
  });

  it("should have INSUFFICIENT_PERMISSIONS error", () => {
    expect(AUTH_ERRORS.INSUFFICIENT_PERMISSIONS).toBeDefined();
    expect(AUTH_ERRORS.INSUFFICIENT_PERMISSIONS.statusCode).toBe(403);
  });

  it("should have USER_NOT_FOUND error", () => {
    expect(AUTH_ERRORS.USER_NOT_FOUND).toBeDefined();
    expect(AUTH_ERRORS.USER_NOT_FOUND.statusCode).toBe(404);
  });

  it("should have USER_ALREADY_EXISTS error", () => {
    expect(AUTH_ERRORS.USER_ALREADY_EXISTS).toBeDefined();
    expect(AUTH_ERRORS.USER_ALREADY_EXISTS.statusCode).toBe(409);
  });

  it("should have INVALID_ROLE error", () => {
    expect(AUTH_ERRORS.INVALID_ROLE).toBeDefined();
    expect(AUTH_ERRORS.INVALID_ROLE.statusCode).toBe(400);
  });

  it("should have all error objects with correct structure", () => {
    Object.values(AUTH_ERRORS).forEach((error) => {
      expect(error).toHaveProperty("error");
      expect(error).toHaveProperty("statusCode");
      expect(typeof error.error).toBe("string");
      expect(typeof error.statusCode).toBe("number");
    });
  });
});

describe("auth.ts - User Roles", () => {
  it("should accept admin role", () => {
    const payload: Omit<JWTPayload, "iat" | "exp"> = {
      userId: 1,
      email: "admin@test.com",
      role: "admin",
    };
    const token = generateAccessToken(payload);
    const decoded = verifyAccessToken(token);

    expect(decoded?.role).toBe("admin");
  });

  it("should accept gerente role", () => {
    const payload: Omit<JWTPayload, "iat" | "exp"> = {
      userId: 2,
      email: "gerente@test.com",
      role: "gerente",
    };
    const token = generateAccessToken(payload);
    const decoded = verifyAccessToken(token);

    expect(decoded?.role).toBe("gerente");
  });

  it("should accept operario role", () => {
    const payload: Omit<JWTPayload, "iat" | "exp"> = {
      userId: 3,
      email: "operario@test.com",
      role: "operario",
    };
    const token = generateAccessToken(payload);
    const decoded = verifyAccessToken(token);

    expect(decoded?.role).toBe("operario");
  });
});

describe("auth.ts - Edge Cases", () => {
  it("should handle special characters in email", () => {
    const payload: Omit<JWTPayload, "iat" | "exp"> = {
      userId: 100,
      email: "test+special@example.com",
      role: "admin",
    };
    const token = generateAccessToken(payload);
    const decoded = verifyAccessToken(token);

    expect(decoded?.email).toBe(payload.email);
  });

  it("should handle large userId", () => {
    const payload: Omit<JWTPayload, "iat" | "exp"> = {
      userId: 999999999,
      email: "largeid@example.com",
      role: "admin",
    };
    const token = generateAccessToken(payload);
    const decoded = verifyAccessToken(token);

    expect(decoded?.userId).toBe(payload.userId);
  });

  it("should handle unicode characters in password hash", async () => {
    const unicodePassword = "contraseña123üöä";
    const hash = await hashPassword(unicodePassword);
    const isValid = await verifyPassword(unicodePassword, hash);

    expect(isValid).toBe(true);
  });

  it("should handle very long passwords", async () => {
    const longPassword = "a".repeat(1000);
    const hash = await hashPassword(longPassword);
    const isValid = await verifyPassword(longPassword, hash);

    expect(isValid).toBe(true);
  });
});
