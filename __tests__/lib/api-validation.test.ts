import type { NextRequest } from "next/server";
import { z, ZodError, type ZodSchema } from "zod";
import {
  createValidationErrorResponse,
  formatZodErrors,
  hasMaxItems,
  hasMinItems,
  hasSqlInjectionPattern,
  isDateInRange,
  isInRange,
  sanitizeHtml,
  sanitizeObject,
  sanitizeString,
  validateAgainstSqlInjection,
  validatePathParams,
  validateQueryParams,
  validateRequest,
  validateRequestBody,
} from "@/lib/api-validation";

type RequestOptions = {
  body?: unknown;
  jsonError?: Error;
  url?: string;
};

function createMockRequest(options: RequestOptions = {}): NextRequest {
  const { body, jsonError, url = "http://localhost/api" } = options;

  return {
    url,
    json: jsonError
      ? jest.fn().mockRejectedValue(jsonError)
      : jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

describe("api-validation.ts", () => {
  describe("formatZodErrors", () => {
    it("formats nested Zod issues with path and message", () => {
      const schema = z.object({
        data: z.object({
          user: z.object({
            email: z.string().email("Email invalido"),
          }),
        }),
      });

      const result = schema.safeParse({
        data: { user: { email: "correo-malo" } },
      });

      expect(result.success).toBe(false);

      if (result.success) {
        return;
      }

      expect(formatZodErrors(result.error)).toEqual([
        {
          field: "data.user.email",
          message: "Email invalido",
        },
      ]);
    });

    it("returns an empty array for an empty ZodError", () => {
      expect(formatZodErrors(new ZodError([]))).toEqual([]);
    });
  });

  describe("createValidationErrorResponse", () => {
    it("creates a standardized 400 response", async () => {
      const errors = [{ field: "email", message: "Email invalido" }];
      const response = createValidationErrorResponse(
        errors,
        "Payload invalido"
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        success: false,
        error: "Payload invalido",
        validation_errors: errors,
      });
    });
  });

  describe("validateRequestBody", () => {
    const bodySchema = z.object({
      name: z.string().min(2),
      quantity: z.number().int().positive(),
    });

    it("returns parsed body data when the schema is valid", async () => {
      const request = createMockRequest({
        body: { name: "Marco", quantity: 3 },
      });

      await expect(validateRequestBody(request, bodySchema)).resolves.toEqual({
        success: true,
        data: { name: "Marco", quantity: 3 },
      });
    });

    it("returns formatted Zod errors when validation fails", async () => {
      const request = createMockRequest({
        body: { name: "M", quantity: 0 },
      });

      await expect(validateRequestBody(request, bodySchema)).resolves.toEqual({
        success: false,
        errors: [
          {
            field: "name",
            message: "Too small: expected string to have >=2 characters",
          },
          {
            field: "quantity",
            message: "Too small: expected number to be >0",
          },
        ],
      });
    });

    it("returns a parse error when request.json fails", async () => {
      const request = createMockRequest({
        jsonError: new Error("invalid json"),
      });

      await expect(validateRequestBody(request, bodySchema)).resolves.toEqual({
        success: false,
        errors: [
          {
            field: "body",
            message: "Error al parsear el cuerpo de la solicitud",
          },
        ],
      });
    });
  });

  describe("validateQueryParams", () => {
    const querySchema = z.object({
      page: z.coerce.number().int().positive(),
      search: z.string().min(1),
    });

    it("parses and validates query string values", () => {
      const request = createMockRequest({
        url: "http://localhost/api?page=2&search=mesa",
      });

      expect(validateQueryParams(request, querySchema)).toEqual({
        success: true,
        data: { page: 2, search: "mesa" },
      });
    });

    it("returns Zod errors for invalid query values", () => {
      const request = createMockRequest({
        url: "http://localhost/api?page=0&search=",
      });

      expect(validateQueryParams(request, querySchema)).toEqual({
        success: false,
        errors: [
          {
            field: "page",
            message: "Too small: expected number to be >0",
          },
          {
            field: "search",
            message: "Too small: expected string to have >=1 characters",
          },
        ],
      });
    });

    it("returns a generic query error when URL parsing fails", () => {
      const request = createMockRequest({ url: "notaurl" });

      expect(validateQueryParams(request, querySchema)).toEqual({
        success: false,
        errors: [
          {
            field: "query",
            message: "Error al validar parámetros de consulta",
          },
        ],
      });
    });
  });

  describe("validatePathParams", () => {
    const paramsSchema = z.object({
      id: z.string().regex(/^\d+$/),
    });

    it("returns parsed route params when the schema is valid", () => {
      expect(validatePathParams({ id: "42" }, paramsSchema)).toEqual({
        success: true,
        data: { id: "42" },
      });
    });

    it("returns formatted errors for invalid route params", () => {
      const result = validatePathParams({ id: "abc" }, paramsSchema);

      expect(result.success).toBe(false);
      expect(result.errors?.[0].field).toBe("id");
    });

    it("returns a generic params error when schema parsing throws a non-Zod error", () => {
      const explodingSchema = {
        parse: jest.fn(() => {
          throw new Error("boom");
        }),
      } as unknown as ZodSchema<{ id: string }>;

      expect(validatePathParams({ id: "42" }, explodingSchema)).toEqual({
        success: false,
        errors: [
          {
            field: "params",
            message: "Error al validar parámetros de ruta",
          },
        ],
      });
    });
  });

  describe("sanitizers", () => {
    it("sanitizes strings by trimming, removing dangerous characters, and normalizing whitespace", () => {
      expect(sanitizeString(`  "O'Reilly"   <admin>  `)).toBe("OReilly admin");
    });

    it("strips HTML tags from rich text", () => {
      expect(sanitizeHtml(" <p>Hola <strong>mundo</strong></p> ")).toBe(
        "Hola mundo"
      );
    });

    it("recursively sanitizes nested object values without mutating the source object", () => {
      const source = {
        name: "  Ana   Lopez  ",
        meta: {
          comment: ` "<hola>" `,
          visits: 3,
          nested: null,
        },
      };

      const sanitized = sanitizeObject(source);

      expect(sanitized).toEqual({
        name: "Ana Lopez",
        meta: {
          comment: "hola",
          visits: 3,
          nested: null,
        },
      });
      expect(source.meta.comment).toBe(` "<hola>" `);
    });
  });

  describe("validateRequest", () => {
    it("validates body, query, and params together and sanitizes the body when requested", async () => {
      const request = createMockRequest({
        body: {
          name: `  "Mesa"  `,
          details: { note: "  entrega   rapida  " },
        },
        url: "http://localhost/api?page=4",
      });

      const result = await validateRequest(request, {
        bodySchema: z.object({
          name: z.string(),
          details: z.object({ note: z.string() }),
        }),
        querySchema: z.object({
          page: z.coerce.number().int().positive(),
        }),
        paramsSchema: z.object({
          id: z.string().regex(/^\d+$/),
        }),
        params: { id: "99" },
        sanitize: true,
      });

      expect(result).toEqual({
        success: true,
        data: {
          body: {
            name: "Mesa",
            details: { note: "entrega rapida" },
          },
          query: { page: 4 },
          params: { id: "99" },
        },
      });
    });

    it("preserves body values when sanitization is disabled", async () => {
      const request = createMockRequest({
        body: {
          name: `  "Mesa"  `,
        },
      });

      const result = await validateRequest(request, {
        bodySchema: z.object({
          name: z.string(),
        }),
        sanitize: false,
      });

      expect(result).toEqual({
        success: true,
        data: {
          body: {
            name: `  "Mesa"  `,
          },
        },
      });
    });

    it("aggregates validation errors from all request sources", async () => {
      const request = createMockRequest({
        body: { name: "" },
        url: "http://localhost/api?page=0",
      });

      const result = await validateRequest(request, {
        bodySchema: z.object({
          name: z.string().min(1),
        }),
        querySchema: z.object({
          page: z.coerce.number().int().positive(),
        }),
        paramsSchema: z.object({
          id: z.string().regex(/^\d+$/),
        }),
        params: { id: "sin-numero" },
      });

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.response?.status).toBe(400);
      await expect(result.response?.json()).resolves.toEqual({
        success: false,
        error: "Errores de validación",
        validation_errors: result.errors,
      });
    });

    it("does not assign successful undefined payloads into the result object", async () => {
      const request = createMockRequest({ body: undefined });

      const result = await validateRequest(request, {
        bodySchema: z.undefined(),
      });

      expect(result).toEqual({
        success: true,
        data: {},
      });
    });
  });

  describe("validation helpers", () => {
    it("checks numeric ranges", () => {
      expect(isInRange(5, 1, 10)).toEqual({ valid: true });
      expect(isInRange(0, 1, 10)).toEqual({
        valid: false,
        error: "Valor debe ser al menos 1",
      });
      expect(isInRange(11, 1, 10)).toEqual({
        valid: false,
        error: "Valor no puede ser mayor a 10",
      });
    });

    it("checks date ranges", () => {
      const minDate = new Date("2026-01-10T00:00:00.000Z");
      const maxDate = new Date("2026-01-20T00:00:00.000Z");

      expect(
        isDateInRange(new Date("2026-01-15T00:00:00.000Z"), minDate, maxDate)
      ).toEqual({
        valid: true,
      });
      expect(
        isDateInRange(new Date("2026-01-05T00:00:00.000Z"), minDate, maxDate)
      ).toEqual({
        valid: false,
        error: `Fecha debe ser posterior a ${minDate.toLocaleDateString()}`,
      });
      expect(
        isDateInRange(new Date("2026-01-25T00:00:00.000Z"), minDate, maxDate)
      ).toEqual({
        valid: false,
        error: `Fecha debe ser anterior a ${maxDate.toLocaleDateString()}`,
      });
    });

    it("validates minimum and maximum array sizes", () => {
      expect(hasMinItems([])).toEqual({
        valid: false,
        error: "Debe incluir al menos 1 elemento(s)",
      });
      expect(hasMinItems(["a"], 1)).toEqual({ valid: true });
      expect(hasMinItems([], 2)).toEqual({
        valid: false,
        error: "Debe incluir al menos 2 elemento(s)",
      });
      expect(hasMaxItems(["a"], 2)).toEqual({ valid: true });
      expect(hasMaxItems(["a", "b", "c"], 2)).toEqual({
        valid: false,
        error: "No puede incluir más de 2 elemento(s)",
      });
    });
  });

  describe("SQL injection guards", () => {
    it.each([
      "admin' --",
      "1' union select * from users",
      "name=foo';",
      "exec xp_cmdshell",
    ])("detects dangerous SQL patterns in %s", (input) => {
      expect(hasSqlInjectionPattern(input)).toBe(true);
      expect(validateAgainstSqlInjection(input)).toEqual({
        valid: false,
        error: "Entrada contiene patrones no permitidos",
      });
    });

    it("allows safe input", () => {
      expect(hasSqlInjectionPattern("pedido aprobado")).toBe(false);
      expect(validateAgainstSqlInjection("pedido aprobado")).toEqual({
        valid: true,
      });
    });
  });
});
