/**
 * Tests para el módulo de validation helpers
 * Verifica las funciones de validación de entidades y relaciones
 */

import { pool } from "@/lib/database";
import {
  validateClienteExists,
  validateProductoExists,
  validateMateriaPrimaExists,
  validateProveedorExists,
  validateOperarioExists,
  validateTipoComponenteExists,
  validateProductoStock,
  validateMateriaPrimaStock,
  validateClienteEmailUnique,
  validateProductoCodigoUnique,
  validateMateriaPrimaCodigoUnique,
  validateOperarioDocumentoUnique,
  validateMultipleEntitiesExist,
} from "@/lib/validation-helpers";

// Mock del pool de base de datos
jest.mock("@/lib/database", () => ({
  pool: {
    query: jest.fn(),
  },
}));

describe("validation-helpers.ts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("validateClienteExists()", () => {
    it("should return valid when cliente exists and is active", async () => {
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [{ id: 1, nombre: "Test Cliente", estado: "activo" }],
      });

      const result = await validateClienteExists(1);

      expect(result.valid).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT"),
        [1]
      );
    });

    it("should return invalid when cliente does not exist", async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await validateClienteExists(999);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("no existe");
    });

    it("should return invalid when cliente is inactive", async () => {
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [{ id: 1, nombre: "Test Cliente", estado: "inactivo" }],
      });

      const result = await validateClienteExists(1);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("inactivo");
    });

    it("should handle database errors gracefully", async () => {
      (pool.query as jest.Mock).mockRejectedValue(new Error("Database error"));

      const result = await validateClienteExists(1);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Error al validar");
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("validateProductoExists()", () => {
    it("should return valid when producto exists and is active", async () => {
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            id: 1,
            codigo: "PROD-001",
            nombre: "Test Producto",
            estado: "activo",
            stock_actual: 10,
          },
        ],
      });

      const result = await validateProductoExists(1);

      expect(result.valid).toBe(true);
      expect(result.data).toBeDefined();
    });

    it("should return invalid when producto does not exist", async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await validateProductoExists(999);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("no existe");
    });

    it("should return invalid when producto is inactive", async () => {
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            id: 1,
            codigo: "PROD-001",
            nombre: "Test",
            estado: "inactivo",
            stock_actual: 0,
          },
        ],
      });

      const result = await validateProductoExists(1);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("inactivo");
    });
  });

  describe("validateMateriaPrimaExists()", () => {
    it("should return valid when materia prima exists and is active", async () => {
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            id: 1,
            codigo: "MAT-001",
            nombre: "Test Material",
            estado: "activo",
            stock_actual: 100,
          },
        ],
      });

      const result = await validateMateriaPrimaExists(1);

      expect(result.valid).toBe(true);
      expect(result.data).toBeDefined();
    });

    it("should return invalid when materia prima does not exist", async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await validateMateriaPrimaExists(999);

      expect(result.valid).toBe(false);
    });
  });

  describe("validateProveedorExists()", () => {
    it("should return valid when proveedor exists and is active", async () => {
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [{ id: 1, nombre: "Test Proveedor", estado: "activo" }],
      });

      const result = await validateProveedorExists(1);

      expect(result.valid).toBe(true);
    });

    it("should return invalid when proveedor is inactive", async () => {
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [{ id: 1, nombre: "Test", estado: "inactivo" }],
      });

      const result = await validateProveedorExists(1);

      expect(result.valid).toBe(false);
    });
  });

  describe("validateOperarioExists()", () => {
    it("should return valid when operario exists and is active", async () => {
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [{ id: 1, nombre: "Juan", estado: "activo", turno: "mañana" }],
      });

      const result = await validateOperarioExists(1);

      expect(result.valid).toBe(true);
    });

    it("should return invalid when operario does not exist", async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await validateOperarioExists(999);

      expect(result.valid).toBe(false);
    });
  });

  describe("validateTipoComponenteExists()", () => {
    it("should return valid when tipo componente exists", async () => {
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [{ id: 1, nombre: "Perfil" }],
      });

      const result = await validateTipoComponenteExists(1);

      expect(result.valid).toBe(true);
      expect(result.data).toBeDefined();
    });

    it("should return invalid when tipo componente does not exist", async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await validateTipoComponenteExists(999);

      expect(result.valid).toBe(false);
    });
  });

  describe("validateProductoStock()", () => {
    it("should return valid when stock is sufficient", async () => {
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            id: 1,
            nombre: "Test",
            stock_actual: 100,
            stock_minimo: 10,
          },
        ],
      });

      const result = await validateProductoStock(1, 50);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should return invalid when stock is insufficient", async () => {
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            id: 1,
            nombre: "Test",
            stock_actual: 10,
            stock_minimo: 5,
          },
        ],
      });

      const result = await validateProductoStock(1, 50);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Stock insuficiente");
    });

    it("should return warning when stock will be below minimum", async () => {
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            id: 1,
            nombre: "Test",
            stock_actual: 20,
            stock_minimo: 15,
          },
        ],
      });

      const result = await validateProductoStock(1, 10);

      expect(result.valid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.length).toBeGreaterThan(0);
      expect(result.warnings?.[0]).toContain("mínimo");
    });

    it("should return invalid when producto does not exist", async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await validateProductoStock(999, 10);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("no existe");
    });
  });

  describe("validateMateriaPrimaStock()", () => {
    it("should return valid when stock is sufficient", async () => {
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            id: 1,
            nombre: "Material",
            stock_actual: 200,
            stock_minimo: 20,
          },
        ],
      });

      const result = await validateMateriaPrimaStock(1, 100);

      expect(result.valid).toBe(true);
    });

    it("should return invalid when stock is insufficient", async () => {
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            id: 1,
            nombre: "Material",
            stock_actual: 50,
            stock_minimo: 20,
          },
        ],
      });

      const result = await validateMateriaPrimaStock(1, 100);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("insuficiente");
    });

    it("should return warning when stock will be below minimum", async () => {
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            id: 1,
            nombre: "Material",
            stock_actual: 50,
            stock_minimo: 30,
          },
        ],
      });

      const result = await validateMateriaPrimaStock(1, 25);

      expect(result.valid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.length).toBeGreaterThan(0);
    });
  });

  describe("validateClienteEmailUnique()", () => {
    it("should return valid when email is unique", async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await validateClienteEmailUnique("nuevo@test.com");

      expect(result.valid).toBe(true);
    });

    it("should return invalid when email already exists", async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [{ id: 1 }] });

      const result = await validateClienteEmailUnique("existente@test.com");

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Ya existe");
    });

    it("should exclude specific id when checking uniqueness", async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await validateClienteEmailUnique("test@test.com", 5);

      expect(result.valid).toBe(true);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("id != $2"),
        ["test@test.com", 5]
      );
    });

    it("should be case insensitive", async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await validateClienteEmailUnique("Test@Example.COM");

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("LOWER"),
        expect.any(Array)
      );
    });
  });

  describe("validateProductoCodigoUnique()", () => {
    it("should return valid when codigo is unique", async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await validateProductoCodigoUnique("PROD-NEW");

      expect(result.valid).toBe(true);
    });

    it("should return invalid when codigo already exists", async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [{ id: 1 }] });

      const result = await validateProductoCodigoUnique("PROD-EXISTS");

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Ya existe");
    });

    it("should be case insensitive", async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await validateProductoCodigoUnique("prod-001");

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("UPPER"),
        expect.any(Array)
      );
    });

    it("should exclude specific id when updating", async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await validateProductoCodigoUnique("PROD-001", 10);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("id != $2"),
        ["PROD-001", 10]
      );
    });
  });

  describe("validateMateriaPrimaCodigoUnique()", () => {
    it("should return valid when codigo is unique", async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await validateMateriaPrimaCodigoUnique("MAT-NEW");

      expect(result.valid).toBe(true);
    });

    it("should return invalid when codigo already exists", async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [{ id: 1 }] });

      const result = await validateMateriaPrimaCodigoUnique("MAT-EXISTS");

      expect(result.valid).toBe(false);
    });
  });

  describe("validateOperarioDocumentoUnique()", () => {
    it("should return valid when documento is unique", async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await validateOperarioDocumentoUnique("12345678");

      expect(result.valid).toBe(true);
    });

    it("should return invalid when documento already exists", async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [{ id: 1 }] });

      const result = await validateOperarioDocumentoUnique("12345678");

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Ya existe");
    });

    it("should exclude specific id when updating", async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await validateOperarioDocumentoUnique("12345678", 5);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("id != $2"),
        ["12345678", 5]
      );
    });
  });

  describe("validateMultipleEntitiesExist()", () => {
    it("should return valid when all entities exist", async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ id: 1, nombre: "Cliente", estado: "activo" }],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 2,
              codigo: "PROD-001",
              nombre: "Producto",
              estado: "activo",
              stock_actual: 10,
            },
          ],
        });

      const result = await validateMultipleEntitiesExist([
        { type: "cliente", id: 1 },
        { type: "producto", id: 2 },
      ]);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should return invalid with errors when entities do not exist", async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await validateMultipleEntitiesExist([
        { type: "cliente", id: 999 },
        { type: "producto", id: 888 },
      ]);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should validate all entity types", async () => {
      (pool.query as jest.Mock).mockResolvedValue({
        rows: [{ id: 1, nombre: "Test", estado: "activo" }],
      });

      await validateMultipleEntitiesExist([
        { type: "cliente", id: 1 },
        { type: "producto", id: 1 },
        { type: "materia_prima", id: 1 },
        { type: "proveedor", id: 1 },
        { type: "operario", id: 1 },
      ]);

      expect(pool.query).toHaveBeenCalledTimes(5);
    });

    it("should collect all errors when multiple entities invalid", async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 2, nombre: "Test", estado: "inactivo" }],
        })
        .mockResolvedValueOnce({ rows: [] });

      const result = await validateMultipleEntitiesExist([
        { type: "cliente", id: 1 },
        { type: "producto", id: 2 },
        { type: "proveedor", id: 3 },
      ]);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(3);
    });

    it("should handle empty entity array", async () => {
      const result = await validateMultipleEntitiesExist([]);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("Error Handling", () => {
    it("should log errors to console when database fails", async () => {
      (pool.query as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await validateClienteExists(1);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("[VALIDATION]"),
        expect.any(Error)
      );
    });

    it("should return error object when validation fails", async () => {
      (pool.query as jest.Mock).mockRejectedValue(new Error("Connection lost"));

      const result = await validateProductoStock(1, 10);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle all entity validation errors gracefully", async () => {
      (pool.query as jest.Mock).mockRejectedValue(new Error("DB Error"));

      const validators = [
        validateClienteExists(1),
        validateProductoExists(1),
        validateMateriaPrimaExists(1),
        validateProveedorExists(1),
        validateOperarioExists(1),
      ];

      const results = await Promise.all(validators);

      results.forEach((result) => {
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });
});
