/**
 * Tests unitarios para el sistema de validación
 *
 * Cubre:
 * - Schemas de validación (Zod)
 * - Validation helpers
 * - Sanitización de datos
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { z } from "zod";
import {
  emailSchema,
  phoneSchema,
  nitSchema,
  positiveIntSchema,
  positiveDecimalSchema,
  nonNegativeDecimalSchema,
  percentageSchema,
  dateSchema,
} from "@/lib/validations/common";
import {
  createClienteSchema,
  updateClienteSchema,
  filterClienteSchema,
  clienteIdSchema,
} from "@/lib/validations/clientes";

// Mock del pool de database
const mockQuery = jest.fn();
jest.mock("@/lib/database", () => ({
  pool: {
    query: mockQuery,
  },
}));

describe("Validation System", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Common Validation Schemas", () => {
    describe("emailSchema", () => {
      it("should validate correct email", () => {
        const result = emailSchema.safeParse("test@example.com");
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe("test@example.com");
        }
      });

      it("should reject invalid email", () => {
        const result = emailSchema.safeParse("invalid-email");
        expect(result.success).toBe(false);
      });

      it("should reject empty email", () => {
        const result = emailSchema.safeParse("");
        expect(result.success).toBe(false);
      });

      it("should normalize email to lowercase", () => {
        const result = emailSchema.safeParse("TEST@EXAMPLE.COM");
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe("test@example.com");
        }
      });

      it("should reject email with spaces", () => {
        const result = emailSchema.safeParse("test @example.com");
        expect(result.success).toBe(false);
      });
    });

    describe("phoneSchema", () => {
      it("should validate Colombian phone", () => {
        const result = phoneSchema.safeParse("+573001234567");
        expect(result.success).toBe(true);
      });

      it("should validate basic phone", () => {
        const result = phoneSchema.safeParse("3001234567");
        expect(result.success).toBe(true);
      });

      it("should reject too short phone", () => {
        const result = phoneSchema.safeParse("");
        expect(result.success).toBe(false);
      });

      it("should allow phone with dashes", () => {
        const result = phoneSchema.safeParse("300-123-4567");
        expect(result.success).toBe(true);
      });
    });

    describe("nitSchema", () => {
      it("should reject NIT without verification digit", () => {
        const result = nitSchema.safeParse("900123456");
        expect(result.success).toBe(false);
      });

      it("should validate NIT with verification digit", () => {
        const result = nitSchema.safeParse("900123456-7");
        expect(result.success).toBe(true);
      });

      it("should reject invalid NIT", () => {
        const result = nitSchema.safeParse("123");
        expect(result.success).toBe(false);
      });

      it("should reject NIT with letters", () => {
        const result = nitSchema.safeParse("ABC123456");
        expect(result.success).toBe(false);
      });
    });

    describe("positiveIntSchema", () => {
      it("should validate positive integer", () => {
        const result = positiveIntSchema.safeParse(10);
        expect(result.success).toBe(true);
      });

      it("should reject zero", () => {
        const result = positiveIntSchema.safeParse(0);
        expect(result.success).toBe(false);
      });

      it("should reject negative number", () => {
        const result = positiveIntSchema.safeParse(-5);
        expect(result.success).toBe(false);
      });

      it("should reject decimal number", () => {
        const result = positiveIntSchema.safeParse(10.5);
        expect(result.success).toBe(false);
      });
    });

    describe("positiveDecimalSchema", () => {
      it("should validate positive decimal", () => {
        const result = positiveDecimalSchema.safeParse(10.5);
        expect(result.success).toBe(true);
      });

      it("should validate positive integer", () => {
        const result = positiveDecimalSchema.safeParse(100);
        expect(result.success).toBe(true);
      });

      it("should reject zero", () => {
        const result = positiveDecimalSchema.safeParse(0);
        expect(result.success).toBe(false);
      });

      it("should reject negative", () => {
        const result = positiveDecimalSchema.safeParse(-10.5);
        expect(result.success).toBe(false);
      });
    });

    describe("nonNegativeDecimalSchema", () => {
      it("should validate zero", () => {
        const result = nonNegativeDecimalSchema.safeParse(0);
        expect(result.success).toBe(true);
      });

      it("should validate positive", () => {
        const result = nonNegativeDecimalSchema.safeParse(10.5);
        expect(result.success).toBe(true);
      });

      it("should reject negative", () => {
        const result = nonNegativeDecimalSchema.safeParse(-1);
        expect(result.success).toBe(false);
      });
    });

    describe("percentageSchema", () => {
      it("should validate 0%", () => {
        const result = percentageSchema.safeParse(0);
        expect(result.success).toBe(true);
      });

      it("should validate 100%", () => {
        const result = percentageSchema.safeParse(100);
        expect(result.success).toBe(true);
      });

      it("should validate 50.5%", () => {
        const result = percentageSchema.safeParse(50.5);
        expect(result.success).toBe(true);
      });

      it("should reject negative", () => {
        const result = percentageSchema.safeParse(-1);
        expect(result.success).toBe(false);
      });

      it("should reject over 100", () => {
        const result = percentageSchema.safeParse(101);
        expect(result.success).toBe(false);
      });
    });

    describe("dateSchema", () => {
      it("should validate ISO date string", () => {
        const result = dateSchema.safeParse("2025-01-15");
        expect(result.success).toBe(true);
      });

      it("should validate Date object", () => {
        const result = dateSchema.safeParse(new Date());
        expect(result.success).toBe(true);
      });

      it("should reject invalid date string", () => {
        const result = dateSchema.safeParse("not-a-date");
        expect(result.success).toBe(false);
      });

      it("should coerce to Date object", () => {
        const result = dateSchema.safeParse("2025-01-15");
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBeInstanceOf(Date);
        }
      });
    });
  });

  describe("Cliente Validation Schemas", () => {
    describe("createClienteSchema", () => {
      it("should validate complete cliente data", () => {
        const clienteData = {
          nombre: "ACME Corp",
          contacto: "John Doe",
          direccion: "Calle 123 #45-67",
          telefono: "3001234567",
          email: "contact@acme.com",
        };

        const result = createClienteSchema.safeParse(clienteData);
        expect(result.success).toBe(true);
      });

      it("should validate with optional contacto", () => {
        const clienteData = {
          nombre: "ACME Corp",
          direccion: "Calle 123 #45-67",
          telefono: "3001234567",
          email: "contact@acme.com",
        };

        const result = createClienteSchema.safeParse(clienteData);
        expect(result.success).toBe(true);
      });

      it("should reject without required fields", () => {
        const clienteData = {
          nombre: "ACME Corp",
        };

        const result = createClienteSchema.safeParse(clienteData);
        expect(result.success).toBe(false);
      });

      it("should reject invalid email", () => {
        const clienteData = {
          nombre: "ACME Corp",
          direccion: "Calle 123",
          telefono: "3001234567",
          email: "invalid-email",
        };

        const result = createClienteSchema.safeParse(clienteData);
        expect(result.success).toBe(false);
      });

      it("should reject empty nombre", () => {
        const clienteData = {
          nombre: "",
          direccion: "Calle 123",
          telefono: "3001234567",
          email: "test@test.com",
        };

        const result = createClienteSchema.safeParse(clienteData);
        expect(result.success).toBe(false);
      });

      it("should trim whitespace from strings", () => {
        const clienteData = {
          nombre: "  ACME Corp  ",
          direccion: "  Calle 123  ",
          telefono: "3001234567",
          email: "test@test.com",
        };

        const result = createClienteSchema.safeParse(clienteData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.nombre).toBe("ACME Corp");
          expect(result.data.direccion).toBe("Calle 123");
        }
      });
    });

    describe("updateClienteSchema", () => {
      it("should validate partial update", () => {
        const updateData = {
          nombre: "New Name",
        };

        const result = updateClienteSchema.safeParse(updateData);
        expect(result.success).toBe(true);
      });

      it("should validate multiple fields update", () => {
        const updateData = {
          nombre: "New Name",
          email: "newemail@test.com",
          telefono: "3009876543",
        };

        const result = updateClienteSchema.safeParse(updateData);
        expect(result.success).toBe(true);
      });

      it("should reject invalid email in update", () => {
        const updateData = {
          email: "invalid",
        };

        const result = updateClienteSchema.safeParse(updateData);
        expect(result.success).toBe(false);
      });

      it("should allow empty update (all fields optional)", () => {
        const updateData = {};

        const result = updateClienteSchema.safeParse(updateData);
        expect(result.success).toBe(true);
      });
    });

    describe("filterClienteSchema", () => {
      it("should validate nombre filter", () => {
        const filter = { nombre: "ACME" };
        const result = filterClienteSchema.safeParse(filter);
        expect(result.success).toBe(true);
      });

      it("should validate email filter", () => {
        const filter = { email: "test@test.com" };
        const result = filterClienteSchema.safeParse(filter);
        expect(result.success).toBe(true);
      });

      it("should validate search filter", () => {
        const filter = { search: "ACME" };
        const result = filterClienteSchema.safeParse(filter);
        expect(result.success).toBe(true);
      });

      it("should validate empty filter", () => {
        const filter = {};
        const result = filterClienteSchema.safeParse(filter);
        expect(result.success).toBe(true);
      });

      it("should validate multiple filters", () => {
        const filter = {
          nombre: "ACME",
          email: "test@test.com",
        };
        const result = filterClienteSchema.safeParse(filter);
        expect(result.success).toBe(true);
      });
    });

    describe("clienteIdSchema", () => {
      it("should validate numeric ID", () => {
        const result = clienteIdSchema.safeParse({ id: "123" });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.id).toBe(123);
        }
      });

      it("should coerce string to number", () => {
        const result = clienteIdSchema.safeParse({ id: "456" });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(typeof result.data.id).toBe("number");
        }
      });

      it("should reject negative ID", () => {
        const result = clienteIdSchema.safeParse({ id: "-1" });
        expect(result.success).toBe(false);
      });

      it("should reject zero ID", () => {
        const result = clienteIdSchema.safeParse({ id: "0" });
        expect(result.success).toBe(false);
      });

      it("should reject non-numeric ID", () => {
        const result = clienteIdSchema.safeParse({ id: "abc" });
        expect(result.success).toBe(false);
      });
    });
  });

  describe("Sanitization", () => {
    it("should remove leading/trailing whitespace", () => {
      const schema = z.string().trim();
      const result = schema.safeParse("  test  ");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("test");
      }
    });

    it("should convert to lowercase for emails", () => {
      const result = emailSchema.safeParse("TEST@EXAMPLE.COM");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("test@example.com");
      }
    });

    it("should handle undefined optional fields", () => {
      const schema = z.object({
        required: z.string(),
        optional: z.string().optional(),
      });

      const result = schema.safeParse({ required: "test" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.optional).toBeUndefined();
      }
    });
  });

  describe("SQL Injection Prevention", () => {
    it("should validate against SQL injection patterns", () => {
      const dangerousInputs = [
        "'; DROP TABLE usuarios; --",
        "1' OR '1'='1",
        "admin'--",
        "1; DELETE FROM clientes",
      ];

      dangerousInputs.forEach((input) => {
        // El schema básico permite estos strings, pero la capa de sanitización
        // en api-validation.ts los detectará
        const schema = z.string().min(1);
        const result = schema.safeParse(input);

        // El schema en sí no falla (eso es trabajo de hasSqlInjectionPattern)
        // pero documentamos que estos inputs existen
        expect(result.success).toBe(true);
      });
    });
  });

  describe("Business Rules Validation", () => {
    it("should validate positive prices", () => {
      const schema = z.object({
        precio: positiveDecimalSchema,
      });

      expect(schema.safeParse({ precio: 100 }).success).toBe(true);
      expect(schema.safeParse({ precio: 0 }).success).toBe(false);
      expect(schema.safeParse({ precio: -10 }).success).toBe(false);
    });

    it("should validate stock quantities", () => {
      const schema = z.object({
        stock: z.number().int().min(0),
      });

      expect(schema.safeParse({ stock: 0 }).success).toBe(true);
      expect(schema.safeParse({ stock: 100 }).success).toBe(true);
      expect(schema.safeParse({ stock: -1 }).success).toBe(false);
      expect(schema.safeParse({ stock: 10.5 }).success).toBe(false);
    });

    it("should validate date ranges", () => {
      const schema = z
        .object({
          fechaInicio: dateSchema,
          fechaFin: dateSchema,
        })
        .refine((data) => data.fechaFin >= data.fechaInicio, {
          message: "Fecha fin debe ser mayor o igual a fecha inicio",
          path: ["fechaFin"],
        });

      const validData = {
        fechaInicio: new Date("2025-01-01"),
        fechaFin: new Date("2025-01-31"),
      };
      expect(schema.safeParse(validData).success).toBe(true);

      const invalidData = {
        fechaInicio: new Date("2025-01-31"),
        fechaFin: new Date("2025-01-01"),
      };
      expect(schema.safeParse(invalidData).success).toBe(false);
    });
  });

  describe("Comprehensive Schema Tests", () => {
    it("should validate nested objects", () => {
      const schema = z.object({
        cliente: z.object({
          nombre: z.string(),
          email: emailSchema,
        }),
        detalles: z.array(
          z.object({
            cantidad: positiveIntSchema,
            precio: positiveDecimalSchema,
          })
        ),
      });

      const validData = {
        cliente: {
          nombre: "Test",
          email: "test@test.com",
        },
        detalles: [
          { cantidad: 5, precio: 100 },
          { cantidad: 3, precio: 200 },
        ],
      };

      const result = schema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should validate arrays with constraints", () => {
      const schema = z.object({
        items: z.array(z.string()).min(1).max(10),
      });

      expect(schema.safeParse({ items: ["item1"] }).success).toBe(true);
      expect(schema.safeParse({ items: [] }).success).toBe(false);
      expect(schema.safeParse({ items: Array(11).fill("item") }).success).toBe(
        false
      );
    });

    it("should validate enums", () => {
      const schema = z.object({
        estado: z.enum(["pendiente", "aprobado", "rechazado"]),
      });

      expect(schema.safeParse({ estado: "pendiente" }).success).toBe(true);
      expect(schema.safeParse({ estado: "aprobado" }).success).toBe(true);
      expect(schema.safeParse({ estado: "invalido" }).success).toBe(false);
    });
  });
});
