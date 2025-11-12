/**
 * Tests unitarios para el sistema de manejo de errores
 *
 * Cubre:
 * - Todas las clases de error
 * - Códigos de error estandarizados
 * - Funciones de utilidad
 * - Mapeo de errores de PostgreSQL
 */

import { describe, it, expect } from "@jest/globals";
import {
  ApiError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  ConflictError,
  ResourceInUseError,
  DatabaseError,
  BusinessError,
  SystemError,
  ERROR_CODES,
  createErrorResponse,
  isOperationalError,
  mapDatabaseError,
  assertExists,
  assertPermission,
  assertBusinessRule,
} from "@/lib/error-handler";

describe("Error Handler", () => {
  describe("ApiError (base class)", () => {
    it("should create ApiError with all properties", () => {
      const error = new ApiError(
        ERROR_CODES.SYS_001,
        "Test error",
        500,
        { detail: "test" },
        true
      );

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("ApiError");
      expect(error.code).toBe(ERROR_CODES.SYS_001);
      expect(error.message).toBe("Test error");
      expect(error.statusCode).toBe(500);
      expect(error.details).toEqual({ detail: "test" });
      expect(error.isOperational).toBe(true);
    });

    it("should have correct default values", () => {
      const error = new ApiError(ERROR_CODES.SYS_001, "Test error");

      expect(error.statusCode).toBe(500);
      expect(error.details).toBeUndefined();
      expect(error.isOperational).toBe(true);
    });

    it("should serialize to JSON correctly", () => {
      const error = new ApiError(ERROR_CODES.VAL_001, "Validation error", 400, {
        field: "email",
      });

      const json = error.toJSON();

      expect(json).toHaveProperty("code", ERROR_CODES.VAL_001);
      expect(json).toHaveProperty("message", "Validation error");
      expect(json).toHaveProperty("statusCode", 400);
      expect(json).toHaveProperty("details", { field: "email" });
    });

    it("should include stack trace in development", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const error = new ApiError(ERROR_CODES.SYS_001, "Test");
      const json = error.toJSON();

      expect(json.stack).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });

    it("should not include stack trace in production", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const error = new ApiError(ERROR_CODES.SYS_001, "Test");
      const json = error.toJSON();

      expect(json.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("AuthenticationError", () => {
    it("should create with default message and code", () => {
      const error = new AuthenticationError();

      expect(error).toBeInstanceOf(ApiError);
      expect(error.message).toBe("Error de autenticación");
      expect(error.code).toBe(ERROR_CODES.AUTH_001);
      expect(error.statusCode).toBe(401);
    });

    it("should create with custom message and code", () => {
      const error = new AuthenticationError(
        "Token expirado",
        ERROR_CODES.AUTH_005,
        { userId: "123" }
      );

      expect(error.message).toBe("Token expirado");
      expect(error.code).toBe(ERROR_CODES.AUTH_005);
      expect(error.details).toEqual({ userId: "123" });
    });
  });

  describe("AuthorizationError", () => {
    it("should create with correct status code", () => {
      const error = new AuthorizationError();

      expect(error.statusCode).toBe(403);
      expect(error.code).toBe(ERROR_CODES.AUTH_004);
    });
  });

  describe("ValidationError", () => {
    it("should create validation error", () => {
      const error = new ValidationError("Email inválido", ERROR_CODES.VAL_003, {
        field: "email",
        value: "invalid",
      });

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe(ERROR_CODES.VAL_003);
      expect(error.details).toEqual({ field: "email", value: "invalid" });
    });
  });

  describe("NotFoundError", () => {
    it("should create with resource name", () => {
      const error = new NotFoundError("Cliente");

      expect(error.message).toBe("Cliente no encontrado");
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe(ERROR_CODES.RES_001);
    });

    it("should create with custom details", () => {
      const error = new NotFoundError("Producto", ERROR_CODES.RES_001, {
        productoId: 123,
      });

      expect(error.details).toEqual({ productoId: 123 });
    });
  });

  describe("ConflictError", () => {
    it("should create conflict error", () => {
      const error = new ConflictError("Email duplicado");

      expect(error.statusCode).toBe(409);
      expect(error.code).toBe(ERROR_CODES.RES_002);
    });
  });

  describe("ResourceInUseError", () => {
    it("should create resource in use error", () => {
      const error = new ResourceInUseError("Cliente", ERROR_CODES.RES_003, {
        ventas: 5,
      });

      expect(error.message).toBe(
        "Cliente está en uso y no puede ser eliminado"
      );
      expect(error.statusCode).toBe(409);
      expect(error.details).toEqual({ ventas: 5 });
    });
  });

  describe("DatabaseError", () => {
    it("should create database error", () => {
      const error = new DatabaseError("Timeout", ERROR_CODES.DB_003);

      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(false);
    });
  });

  describe("BusinessError", () => {
    it("should create business error", () => {
      const error = new BusinessError(
        "Stock insuficiente",
        ERROR_CODES.BIZ_004
      );

      expect(error.statusCode).toBe(422);
      expect(error.code).toBe(ERROR_CODES.BIZ_004);
    });
  });

  describe("SystemError", () => {
    it("should create system error", () => {
      const error = new SystemError();

      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(false);
    });
  });

  describe("createErrorResponse", () => {
    it("should create formatted response from ApiError", () => {
      const error = new NotFoundError("Cliente", ERROR_CODES.RES_001, {
        clienteId: 123,
      });

      const response = createErrorResponse(error, "/api/clientes/123");

      expect(response).toEqual({
        success: false,
        error: {
          code: ERROR_CODES.RES_001,
          message: "Cliente no encontrado",
          details: { clienteId: 123 },
          timestamp: expect.any(String),
          path: "/api/clientes/123",
        },
      });
    });

    it("should create formatted response from generic Error", () => {
      const error = new Error("Generic error");

      const response = createErrorResponse(error);

      expect(response).toEqual({
        success: false,
        error: {
          code: ERROR_CODES.SYS_001,
          message: expect.any(String),
          timestamp: expect.any(String),
        },
      });
    });

    it("should hide error details in production", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const error = new Error("Internal error");
      const response = createErrorResponse(error);

      expect(response.error.message).toBe("Error interno del servidor");
      expect(response.error.details).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    it("should show error details in development", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const error = new Error("Internal error");
      const response = createErrorResponse(error);

      expect(response.error.message).toBe("Internal error");
      expect(response.error.details).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("isOperationalError", () => {
    it("should return true for operational errors", () => {
      const error = new ValidationError("Test");
      expect(isOperationalError(error)).toBe(true);
    });

    it("should return false for non-operational errors", () => {
      const error = new DatabaseError("Test");
      expect(isOperationalError(error)).toBe(false);
    });

    it("should return false for generic Error", () => {
      const error = new Error("Test");
      expect(isOperationalError(error)).toBe(false);
    });
  });

  describe("mapDatabaseError", () => {
    it("should map unique constraint violation (23505)", () => {
      const pgError = {
        code: "23505",
        detail: "Key (email)=(test@test.com) already exists.",
        constraint: "clientes_email_unique",
      };

      const error = mapDatabaseError(pgError);

      expect(error).toBeInstanceOf(ConflictError);
      expect(error.code).toBe(ERROR_CODES.VAL_006);
      expect(error.message).toContain("email");
    });

    it("should map foreign key violation (23503)", () => {
      const pgError = {
        code: "23503",
        detail: "Key (cliente_id)=(999) is not present.",
        constraint: "ventas_cliente_fk",
      };

      const error = mapDatabaseError(pgError);

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.code).toBe(ERROR_CODES.VAL_007);
      expect(error.message).toContain("Referencia inválida");
    });

    it("should map not null violation (23502)", () => {
      const pgError = {
        code: "23502",
        column: "nombre",
      };

      const error = mapDatabaseError(pgError);

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.code).toBe(ERROR_CODES.VAL_002);
      expect(error.message).toContain("nombre");
      expect(error.message).toContain("requerido");
    });

    it("should map check constraint violation (23514)", () => {
      const pgError = {
        code: "23514",
        constraint: "precio_positivo",
      };

      const error = mapDatabaseError(pgError);

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.code).toBe(ERROR_CODES.VAL_005);
    });

    it("should map connection refused error", () => {
      const pgError = {
        code: "ECONNREFUSED",
        message: "Connection refused",
      };

      const error = mapDatabaseError(pgError);

      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.code).toBe(ERROR_CODES.DB_001);
      expect(error.message).toContain("conectar");
    });

    it("should map timeout error", () => {
      const pgError = {
        code: "ETIMEDOUT",
        message: "Query timeout",
      };

      const error = mapDatabaseError(pgError);

      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.code).toBe(ERROR_CODES.DB_003);
      expect(error.message).toContain("Timeout");
    });

    it("should map deadlock error (40P01)", () => {
      const pgError = {
        code: "40P01",
        message: "Deadlock detected",
      };

      const error = mapDatabaseError(pgError);

      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.code).toBe(ERROR_CODES.DB_007);
      expect(error.message).toContain("concurrencia");
    });

    it("should map unknown database error", () => {
      const pgError = {
        code: "UNKNOWN",
        message: "Unknown error",
      };

      const error = mapDatabaseError(pgError);

      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.code).toBe(ERROR_CODES.DB_001);
    });

    it("should include original error in development", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const pgError = {
        code: "TEST",
        message: "Test error",
      };

      const error = mapDatabaseError(pgError);

      expect(error.message).toContain("Test error");
      expect(error.details).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("assertExists", () => {
    it("should not throw for valid value", () => {
      expect(() => assertExists("value")).not.toThrow();
      expect(() => assertExists(0)).not.toThrow();
      expect(() => assertExists(false)).not.toThrow();
    });

    it("should throw NotFoundError for null", () => {
      expect(() => assertExists(null)).toThrow(NotFoundError);
    });

    it("should throw NotFoundError for undefined", () => {
      expect(() => assertExists(undefined)).toThrow(NotFoundError);
    });

    it("should use custom resource name", () => {
      try {
        assertExists(null, "Cliente");
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundError);
        expect((error as NotFoundError).message).toContain("Cliente");
      }
    });

    it("should use custom error code", () => {
      try {
        assertExists(null, "Producto", ERROR_CODES.RES_001);
      } catch (error) {
        expect((error as NotFoundError).code).toBe(ERROR_CODES.RES_001);
      }
    });
  });

  describe("assertPermission", () => {
    it("should not throw when permission is true", () => {
      expect(() => assertPermission(true)).not.toThrow();
    });

    it("should throw AuthorizationError when permission is false", () => {
      expect(() => assertPermission(false)).toThrow(AuthorizationError);
    });

    it("should use custom message", () => {
      try {
        assertPermission(false, "Custom permission message");
      } catch (error) {
        expect(error).toBeInstanceOf(AuthorizationError);
        expect((error as AuthorizationError).message).toBe(
          "Custom permission message"
        );
      }
    });
  });

  describe("assertBusinessRule", () => {
    it("should not throw when condition is true", () => {
      expect(() => assertBusinessRule(true, "Test rule")).not.toThrow();
    });

    it("should throw BusinessError when condition is false", () => {
      expect(() => assertBusinessRule(false, "Rule violated")).toThrow(
        BusinessError
      );
    });

    it("should include custom code and details", () => {
      try {
        assertBusinessRule(false, "Stock insuficiente", ERROR_CODES.BIZ_004, {
          stock: 0,
          required: 10,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessError);
        expect((error as BusinessError).code).toBe(ERROR_CODES.BIZ_004);
        expect((error as BusinessError).details).toEqual({
          stock: 0,
          required: 10,
        });
      }
    });
  });

  describe("ERROR_CODES", () => {
    it("should have all AUTH codes", () => {
      expect(ERROR_CODES.AUTH_001).toBe("AUTH_001");
      expect(ERROR_CODES.AUTH_002).toBe("AUTH_002");
      expect(ERROR_CODES.AUTH_003).toBe("AUTH_003");
      expect(ERROR_CODES.AUTH_004).toBe("AUTH_004");
      expect(ERROR_CODES.AUTH_005).toBe("AUTH_005");
      expect(ERROR_CODES.AUTH_006).toBe("AUTH_006");
    });

    it("should have all VAL codes", () => {
      expect(ERROR_CODES.VAL_001).toBe("VAL_001");
      expect(ERROR_CODES.VAL_002).toBe("VAL_002");
      expect(ERROR_CODES.VAL_003).toBe("VAL_003");
      expect(ERROR_CODES.VAL_004).toBe("VAL_004");
      expect(ERROR_CODES.VAL_005).toBe("VAL_005");
      expect(ERROR_CODES.VAL_006).toBe("VAL_006");
      expect(ERROR_CODES.VAL_007).toBe("VAL_007");
      expect(ERROR_CODES.VAL_008).toBe("VAL_008");
    });

    it("should have all DB codes", () => {
      expect(ERROR_CODES.DB_001).toBe("DB_001");
      expect(ERROR_CODES.DB_002).toBe("DB_002");
      expect(ERROR_CODES.DB_003).toBe("DB_003");
      expect(ERROR_CODES.DB_004).toBe("DB_004");
      expect(ERROR_CODES.DB_005).toBe("DB_005");
      expect(ERROR_CODES.DB_006).toBe("DB_006");
      expect(ERROR_CODES.DB_007).toBe("DB_007");
    });

    it("should have all RES codes", () => {
      expect(ERROR_CODES.RES_001).toBe("RES_001");
      expect(ERROR_CODES.RES_002).toBe("RES_002");
      expect(ERROR_CODES.RES_003).toBe("RES_003");
      expect(ERROR_CODES.RES_004).toBe("RES_004");
    });

    it("should have all SYS codes", () => {
      expect(ERROR_CODES.SYS_001).toBe("SYS_001");
      expect(ERROR_CODES.SYS_002).toBe("SYS_002");
      expect(ERROR_CODES.SYS_003).toBe("SYS_003");
      expect(ERROR_CODES.SYS_004).toBe("SYS_004");
      expect(ERROR_CODES.SYS_005).toBe("SYS_005");
    });

    it("should have all BIZ codes", () => {
      expect(ERROR_CODES.BIZ_001).toBe("BIZ_001");
      expect(ERROR_CODES.BIZ_002).toBe("BIZ_002");
      expect(ERROR_CODES.BIZ_003).toBe("BIZ_003");
      expect(ERROR_CODES.BIZ_004).toBe("BIZ_004");
    });
  });
});
