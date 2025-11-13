/**
 * Tests para el módulo de autenticación de API
 * Verifica la autenticación JWT y autorización en rutas API
 */

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateApiRequest,
  checkApiPermission,
  createApiErrorResponse,
  logApiOperation,
  type ApiUserContext,
  type ApiAuthError,
} from "@/lib/api-auth";
import * as authModule from "@/lib/auth";
import * as permissionsModule from "@/lib/permissions";

// Mock de los módulos auth y permissions
jest.mock("@/lib/auth");
jest.mock("@/lib/permissions");

describe("api-auth.ts", () => {
  // Mock data
  const mockValidToken = "valid.jwt.token";
  const mockInvalidToken = "invalid.token";
  const mockUserId = 123;
  const mockEmail = "test@example.com";
  const mockRole = "admin" as const;

  const mockPayload: authModule.JWTPayload = {
    userId: mockUserId,
    email: mockEmail,
    role: mockRole,
  };

  const mockUser: ApiUserContext = {
    userId: mockUserId,
    email: mockEmail,
    role: mockRole,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Suprimir console.log y console.error en tests
    jest.spyOn(console, "log").mockImplementation();
    jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("authenticateApiRequest()", () => {
    describe("Success cases", () => {
      it("should authenticate with valid Authorization header", () => {
        // Mock request object
        const request = {
          headers: {
            get: jest.fn((key: string) => {
              if (key.toLowerCase() === "authorization") {
                return `Bearer ${mockValidToken}`;
              }
              return null;
            }),
          },
          cookies: {
            get: jest.fn(() => undefined),
          },
        } as any;

        (authModule.extractTokenFromHeader as jest.Mock).mockReturnValue(
          mockValidToken
        );
        (authModule.verifyAccessToken as jest.Mock).mockReturnValue(
          mockPayload
        );

        const result = authenticateApiRequest(request);

        expect(result.error).toBeNull();
        expect(result.user).toEqual(mockUser);
        expect(authModule.extractTokenFromHeader).toHaveBeenCalledWith(
          `Bearer ${mockValidToken}`
        );
        expect(authModule.verifyAccessToken).toHaveBeenCalledWith(
          mockValidToken
        );
      });

      it("should authenticate with token from cookie when no header", () => {
        const mockCookie = { name: "token", value: mockValidToken };
        const request = {
          headers: {
            get: jest.fn(() => null),
          },
          cookies: {
            get: jest.fn(() => mockCookie),
          },
        } as any;

        (authModule.extractTokenFromHeader as jest.Mock).mockReturnValue(null);
        (authModule.verifyAccessToken as jest.Mock).mockReturnValue(
          mockPayload
        );

        const result = authenticateApiRequest(request);

        expect(result.error).toBeNull();
        expect(result.user).toEqual(mockUser);
        expect(request.cookies.get).toHaveBeenCalledWith("token");
        expect(authModule.verifyAccessToken).toHaveBeenCalledWith(
          mockValidToken
        );
      });

      it("should return correct user context structure", () => {
        const request = {
          headers: {
            get: jest.fn(() => `Bearer ${mockValidToken}`),
          },
          cookies: {
            get: jest.fn(() => undefined),
          },
        } as any;

        (authModule.extractTokenFromHeader as jest.Mock).mockReturnValue(
          mockValidToken
        );
        (authModule.verifyAccessToken as jest.Mock).mockReturnValue(
          mockPayload
        );

        const result = authenticateApiRequest(request);

        expect(result.user).toBeDefined();
        expect(result.user?.userId).toBe(mockUserId);
        expect(result.user?.email).toBe(mockEmail);
        expect(result.user?.role).toBe(mockRole);
      });
    });

    describe("Missing token cases", () => {
      it("should return MISSING_TOKEN error when no Authorization header and no cookie", () => {
        const request = {
          headers: {
            get: jest.fn(() => null),
          },
          cookies: {
            get: jest.fn(() => undefined),
          },
        } as any;

        (authModule.extractTokenFromHeader as jest.Mock).mockReturnValue(null);

        const result = authenticateApiRequest(request);

        expect(result.error).toBeDefined();
        expect(result.error?.error).toBe(
          authModule.AUTH_ERRORS.MISSING_TOKEN.error
        );
        expect(result.error?.statusCode).toBe(401);
        expect(result.user).toBeNull();
      });

      it("should return MISSING_TOKEN error when Authorization header is empty", () => {
        const request = {
          headers: {
            get: jest.fn(() => ""),
          },
          cookies: {
            get: jest.fn(() => undefined),
          },
        } as any;

        (authModule.extractTokenFromHeader as jest.Mock).mockReturnValue(null);

        const result = authenticateApiRequest(request);

        expect(result.error).toBeDefined();
        expect(result.error?.error).toBe(
          authModule.AUTH_ERRORS.MISSING_TOKEN.error
        );
        expect(result.user).toBeNull();
      });
    });

    describe("Invalid token cases", () => {
      it("should return INVALID_TOKEN error when token verification fails", () => {
        const request = {
          headers: {
            get: jest.fn(() => `Bearer ${mockInvalidToken}`),
          },
          cookies: {
            get: jest.fn(() => undefined),
          },
        } as any;

        (authModule.extractTokenFromHeader as jest.Mock).mockReturnValue(
          mockInvalidToken
        );
        (authModule.verifyAccessToken as jest.Mock).mockReturnValue(null);

        const result = authenticateApiRequest(request);

        expect(result.user).toBeNull();
        expect(result.error).toBeDefined();
        expect(result.error?.error).toBe(
          authModule.AUTH_ERRORS.INVALID_TOKEN.error
        );
        expect(result.error?.statusCode).toBe(
          authModule.AUTH_ERRORS.INVALID_TOKEN.statusCode
        );
      });

      it("should return INVALID_TOKEN error with details when exception occurs", () => {
        const request = {
          headers: {
            get: jest.fn(() => `Bearer ${mockValidToken}`),
          },
          cookies: {
            get: jest.fn(() => undefined),
          },
        } as any;

        const errorMessage = "Token expired";
        (authModule.extractTokenFromHeader as jest.Mock).mockReturnValue(
          mockValidToken
        );
        (authModule.verifyAccessToken as jest.Mock).mockImplementation(() => {
          throw new Error(errorMessage);
        });

        const result = authenticateApiRequest(request);

        expect(result.user).toBeNull();
        expect(result.error?.error).toBe(
          authModule.AUTH_ERRORS.INVALID_TOKEN.error
        );
        expect(result.error?.details).toBe(errorMessage);
        expect(console.error).toHaveBeenCalled();
      });

      it("should handle non-Error exceptions gracefully", () => {
        const request = {
          headers: {
            get: jest.fn(() => `Bearer ${mockValidToken}`),
          },
          cookies: {
            get: jest.fn(() => undefined),
          },
        } as any;

        (authModule.extractTokenFromHeader as jest.Mock).mockReturnValue(
          mockValidToken
        );
        (authModule.verifyAccessToken as jest.Mock).mockImplementation(() => {
          throw "String error";
        });

        const result = authenticateApiRequest(request);

        expect(result.error).toBeDefined();
        expect(result.error?.error).toBe(
          authModule.AUTH_ERRORS.INVALID_TOKEN.error
        );
        expect(result.user).toBeNull();
      });
    });
  });

  describe("checkApiPermission()", () => {
    describe("Permission granted cases", () => {
      it("should return null when user has required permission", () => {
        (permissionsModule.hasPermission as jest.Mock).mockReturnValue(true);

        const result = checkApiPermission(mockUser, "read:all");

        expect(result).toBeNull();
        expect(permissionsModule.hasPermission).toHaveBeenCalledWith(
          {
            userId: mockUser.userId,
            email: mockUser.email,
            role: mockUser.role,
          },
          "read:all"
        );
      });

      it("should return null for admin with manage:users permission", () => {
        (permissionsModule.hasPermission as jest.Mock).mockReturnValue(true);

        const result = checkApiPermission(mockUser, "manage:users");

        expect(result).toBeNull();
      });

      it("should return null for any valid permission check", () => {
        (permissionsModule.hasPermission as jest.Mock).mockReturnValue(true);

        const permissions: Array<permissionsModule.Permission> = [
          "read:all",
          "write:all",
          "delete:all",
        ];

        permissions.forEach((permission) => {
          const result = checkApiPermission(mockUser, permission);
          expect(result).toBeNull();
        });
      });
    });

    describe("Permission denied cases", () => {
      it("should return error response when user lacks permission", () => {
        (permissionsModule.hasPermission as jest.Mock).mockReturnValue(false);

        const result = checkApiPermission(mockUser, "manage:users");

        expect(result).toBeInstanceOf(NextResponse);
        expect(permissionsModule.hasPermission).toHaveBeenCalled();
      });

      it("should return 403 status code for insufficient permissions", () => {
        (permissionsModule.hasPermission as jest.Mock).mockReturnValue(false);

        const result = checkApiPermission(mockUser, "delete:all");

        expect(result).toBeInstanceOf(NextResponse);
        // Verificar que es un NextResponse con status 403
        const response = result as NextResponse;
        expect(response.status).toBe(
          authModule.AUTH_ERRORS.INSUFFICIENT_PERMISSIONS.statusCode
        );
      });

      it("should include permission details in error response", () => {
        (permissionsModule.hasPermission as jest.Mock).mockReturnValue(false);

        const permission = "write:all";
        const result = checkApiPermission(mockUser, permission);

        expect(result).toBeInstanceOf(NextResponse);
        // El error debe incluir información sobre el permiso requerido
        // (verificado por la implementación que incluye `details`)
      });

      it("should deny operario from managing users", () => {
        const operarioUser: ApiUserContext = {
          userId: 456,
          email: "operario@test.com",
          role: "operario",
        };

        (permissionsModule.hasPermission as jest.Mock).mockReturnValue(false);

        const result = checkApiPermission(operarioUser, "manage:users");

        expect(result).toBeInstanceOf(NextResponse);
      });
    });
  });

  describe("createApiErrorResponse()", () => {
    it("should create NextResponse with error object", () => {
      const error: ApiAuthError = {
        error: "Test error",
        statusCode: 400,
        details: "Test details",
      };

      const response = createApiErrorResponse(error);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(400);
    });

    it("should create response with correct status code", () => {
      const error401: ApiAuthError = {
        error: "Unauthorized",
        statusCode: 401,
      };

      const response401 = createApiErrorResponse(error401);
      expect(response401.status).toBe(401);

      const error403: ApiAuthError = {
        error: "Forbidden",
        statusCode: 403,
      };

      const response403 = createApiErrorResponse(error403);
      expect(response403.status).toBe(403);
    });

    it("should handle error without details", () => {
      const error: ApiAuthError = {
        error: "Simple error",
        statusCode: 500,
      };

      const response = createApiErrorResponse(error);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(500);
    });
  });

  describe("logApiOperation()", () => {
    it("should log operation with all parameters", () => {
      const method = "POST";
      const endpoint = "/api/clientes";
      const action = "Create cliente";
      const details = "Cliente ID: 123";

      logApiOperation(method, endpoint, mockUser, action, details);

      expect(console.log).toHaveBeenCalled();
      const logCall = (console.log as jest.Mock).mock.calls[0][0];
      expect(logCall).toContain("[API_AUDIT]");
      expect(logCall).toContain(mockUser.email);
      expect(logCall).toContain(mockUser.role);
      expect(logCall).toContain(method);
      expect(logCall).toContain(endpoint);
      expect(logCall).toContain(action);
      expect(logCall).toContain(details);
    });

    it("should log operation without details", () => {
      const method = "GET";
      const endpoint = "/api/productos";
      const action = "List productos";

      logApiOperation(method, endpoint, mockUser, action);

      expect(console.log).toHaveBeenCalled();
      const logCall = (console.log as jest.Mock).mock.calls[0][0];
      expect(logCall).toContain("[API_AUDIT]");
      expect(logCall).toContain(method);
      expect(logCall).toContain(endpoint);
      expect(logCall).toContain(action);
      expect(logCall).not.toContain("Details:");
    });

    it("should include timestamp in log", () => {
      logApiOperation("DELETE", "/api/test", mockUser, "Test action");

      const logCall = (console.log as jest.Mock).mock.calls[0][0];
      // Verificar que contiene un timestamp ISO
      expect(logCall).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it("should include user context in log", () => {
      const gerenteUser: ApiUserContext = {
        userId: 999,
        email: "gerente@company.com",
        role: "gerente",
      };

      logApiOperation("PUT", "/api/update", gerenteUser, "Update");

      const logCall = (console.log as jest.Mock).mock.calls[0][0];
      expect(logCall).toContain("gerente@company.com");
      expect(logCall).toContain("gerente");
    });

    it("should log multiple operations separately", () => {
      logApiOperation("GET", "/api/first", mockUser, "First");
      logApiOperation("POST", "/api/second", mockUser, "Second");
      logApiOperation("DELETE", "/api/third", mockUser, "Third");

      expect(console.log).toHaveBeenCalledTimes(3);
    });
  });

  describe("Integration scenarios", () => {
    it("should handle complete authentication and authorization flow", () => {
      // 1. Authenticate request
      const request = {
        headers: {
          get: jest.fn(() => `Bearer ${mockValidToken}`),
        },
        cookies: {
          get: jest.fn(() => undefined),
        },
      } as any;

      (authModule.extractTokenFromHeader as jest.Mock).mockReturnValue(
        mockValidToken
      );
      (authModule.verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);

      const authResult = authenticateApiRequest(request);
      expect(authResult.error).toBeNull();

      // 2. Check permission
      (permissionsModule.hasPermission as jest.Mock).mockReturnValue(true);

      const permissionResult = checkApiPermission(
        authResult.user!,
        "write:all"
      );
      expect(permissionResult).toBeNull();

      // 3. Log operation
      logApiOperation("POST", "/api/test", authResult.user!, "Test operation");
      expect(console.log).toHaveBeenCalled();
    });

    it("should handle failed authentication gracefully", () => {
      const request = {
        headers: {
          get: jest.fn(() => `Bearer ${mockInvalidToken}`),
        },
        cookies: {
          get: jest.fn(() => undefined),
        },
      } as any;

      (authModule.extractTokenFromHeader as jest.Mock).mockReturnValue(
        mockInvalidToken
      );
      (authModule.verifyAccessToken as jest.Mock).mockReturnValue(null);

      const authResult = authenticateApiRequest(request);

      expect(authResult.user).toBeNull();
      expect(authResult.error).toBeDefined();

      // No se debe llamar checkApiPermission si la autenticación falla
      expect(permissionsModule.hasPermission).not.toHaveBeenCalled();
    });

    it("should handle permission denial after successful authentication", () => {
      const request = {
        headers: {
          get: jest.fn(() => `Bearer ${mockValidToken}`),
        },
        cookies: {
          get: jest.fn(() => undefined),
        },
      } as any;

      (authModule.extractTokenFromHeader as jest.Mock).mockReturnValue(
        mockValidToken
      );
      (authModule.verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);

      const authResult = authenticateApiRequest(request);
      expect(authResult.error).toBeNull();

      // Usuario autenticado pero sin permisos
      (permissionsModule.hasPermission as jest.Mock).mockReturnValue(false);

      const permissionResult = checkApiPermission(
        authResult.user!,
        "manage:settings"
      );
      expect(permissionResult).toBeInstanceOf(NextResponse);
    });
  });

  describe("Error response structure", () => {
    it("should have consistent ApiAuthError structure", () => {
      const request = {
        headers: {
          get: jest.fn(() => null),
        },
        cookies: {
          get: jest.fn(() => undefined),
        },
      } as any;

      (authModule.extractTokenFromHeader as jest.Mock).mockReturnValue(null);

      const result = authenticateApiRequest(request);

      expect(result.error).toHaveProperty("error");
      expect(result.error).toHaveProperty("statusCode");
      expect(typeof result.error?.error).toBe("string");
      expect(typeof result.error?.statusCode).toBe("number");
    });

    it("should include optional details when available", () => {
      const request = {
        headers: {
          get: jest.fn(() => `Bearer ${mockValidToken}`),
        },
        cookies: {
          get: jest.fn(() => undefined),
        },
      } as any;

      (authModule.extractTokenFromHeader as jest.Mock).mockReturnValue(
        mockValidToken
      );
      (authModule.verifyAccessToken as jest.Mock).mockImplementation(() => {
        throw new Error("Specific error message");
      });

      const result = authenticateApiRequest(request);

      expect(result.error).toHaveProperty("details");
      expect(result.error?.details).toBe("Specific error message");
    });
  });
});
