/**
 * Tests para el módulo de validación API
 * Enfoque: Testeamos formatZodErrors con safeParse en lugar de try/catch
 */

import { z, ZodError } from "zod";
import { formatZodErrors } from "@/lib/api-validation";

describe("api-validation.ts", () => {
  describe("formatZodErrors", () => {
    it("should format single validation error", () => {
      const schema = z.object({
        email: z.string().email("Email inválido"),
      });

      const result = schema.safeParse({ email: "no-es-email" });

      if (!result.success) {
        const formatted = formatZodErrors(result.error);

        expect(formatted).toBeDefined();
        expect(Array.isArray(formatted)).toBe(true);
        expect(formatted.length).toBeGreaterThan(0);
        expect(formatted[0]).toHaveProperty("field");
        expect(formatted[0]).toHaveProperty("message");
        expect(formatted[0].field).toBe("email");
      } else {
        fail("Validation should have failed");
      }
    });

    it("should format multiple validation errors", () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().positive(),
        name: z.string().min(3),
      });

      const result = schema.safeParse({
        email: "invalido",
        age: -5,
        name: "ab",
      });

      if (!result.success) {
        const formatted = formatZodErrors(result.error);

        expect(formatted.length).toBeGreaterThanOrEqual(3);

        const fields = formatted.map((e) => e.field);
        expect(fields).toContain("email");
        expect(fields).toContain("age");
        expect(fields).toContain("name");
      }
    });

    it("should format nested field errors", () => {
      const schema = z.object({
        user: z.object({
          name: z.string().min(3, "Nombre muy corto"),
        }),
      });

      const result = schema.safeParse({ user: { name: "ab" } });

      if (!result.success) {
        const formatted = formatZodErrors(result.error);

        expect(formatted[0].field).toBe("user.name");
        expect(formatted[0].message).toBe("Nombre muy corto");
      }
    });

    it("should format deeply nested errors", () => {
      const schema = z.object({
        data: z.object({
          user: z.object({
            email: z.string().email(),
          }),
        }),
      });

      const result = schema.safeParse({
        data: { user: { email: "invalido" } },
      });

      if (!result.success) {
        const formatted = formatZodErrors(result.error);

        expect(formatted[0].field).toBe("data.user.email");
      }
    });

    it("should handle missing required fields", () => {
      const schema = z.object({
        required_field: z.string(),
        another_field: z.number(),
      });

      const result = schema.safeParse({});

      if (!result.success) {
        const formatted = formatZodErrors(result.error);

        expect(formatted.length).toBe(2);
        const fields = formatted.map((e) => e.field);
        expect(fields).toContain("required_field");
        expect(fields).toContain("another_field");
      }
    });

    it("should preserve custom error messages", () => {
      const schema = z.object({
        price: z.number().positive("El precio debe ser positivo"),
      });

      const result = schema.safeParse({ price: -10 });

      if (!result.success) {
        const formatted = formatZodErrors(result.error);

        expect(formatted[0].message).toBe("El precio debe ser positivo");
        expect(formatted[0].field).toBe("price");
      }
    });

    it("should handle array validation errors", () => {
      const schema = z.object({
        items: z.array(z.number()).min(1, "Array no puede estar vacío"),
      });

      const result = schema.safeParse({ items: [] });

      if (!result.success) {
        const formatted = formatZodErrors(result.error);

        expect(formatted[0].field).toBe("items");
        expect(formatted[0].message).toContain("vacío");
      }
    });

    it("should handle enum errors", () => {
      const schema = z.object({
        role: z.enum(["admin", "user", "guest"]),
      });

      const result = schema.safeParse({ role: "superadmin" });

      if (!result.success) {
        const formatted = formatZodErrors(result.error);

        expect(formatted[0].field).toBe("role");
        expect(formatted[0].message).toBeDefined();
      }
    });

    it("should handle type mismatch", () => {
      const schema = z.object({
        count: z.number(),
        active: z.boolean(),
      });

      const result = schema.safeParse({
        count: "not a number",
        active: "not a boolean",
      });

      if (!result.success) {
        const formatted = formatZodErrors(result.error);

        expect(formatted.length).toBe(2);
        const fields = formatted.map((e) => e.field);
        expect(fields).toContain("count");
        expect(fields).toContain("active");
      }
    });

    it("should return empty array for empty ZodError", () => {
      const error = new ZodError([]);
      const formatted = formatZodErrors(error);

      expect(Array.isArray(formatted)).toBe(true);
      expect(formatted).toEqual([]);
    });

    it("should format all errors with field and message", () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().int().positive(),
      });

      const result = schema.safeParse({ email: "bad", age: -1.5 });

      if (!result.success) {
        const formatted = formatZodErrors(result.error);

        formatted.forEach((err) => {
          expect(err).toHaveProperty("field");
          expect(err).toHaveProperty("message");
          expect(typeof err.field).toBe("string");
          expect(typeof err.message).toBe("string");
          expect(err.field.length).toBeGreaterThan(0);
          expect(err.message.length).toBeGreaterThan(0);
        });
      }
    });
  });
});
