/**
 * Common validation schemas and utilities
 * Reusable validation patterns for the entire application
 */

import { z } from "zod";

// ==================== Common Patterns ====================

/**
 * Email validation with proper RFC 5322 pattern
 */
export const emailSchema = z
  .string()
  .min(1, "El email es requerido")
  .email("Formato de email inválido")
  .toLowerCase()
  .trim();

/**
 * Phone validation (Colombian format: +57 3XX XXX XXXX)
 * Also accepts international formats
 */
export const phoneSchema = z
  .string()
  .min(1, "El teléfono es requerido")
  .regex(
    /^(\+?\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/,
    "Formato de teléfono inválido"
  )
  .trim();

/**
 * Optional phone (can be empty or valid)
 */
export const phoneOptionalSchema = z
  .string()
  .regex(
    /^(\+?\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/,
    "Formato de teléfono inválido"
  )
  .trim()
  .optional()
  .or(z.literal(""));

/**
 * NIT/RUT validation (Colombian tax ID)
 * Format: XXXXXXXXX-X
 */
export const nitSchema = z
  .string()
  .min(1, "El NIT/RUT es requerido")
  .regex(/^\d{6,10}-\d$/, "Formato de NIT/RUT inválido (ej: 123456789-0)")
  .trim();

/**
 * Positive integer validation
 */
export const positiveIntSchema = z
  .number()
  .int("Debe ser un número entero")
  .positive("Debe ser un número positivo");

/**
 * Positive decimal validation (for prices, quantities)
 */
export const positiveDecimalSchema = z
  .number()
  .positive("Debe ser un número positivo")
  .finite("Debe ser un número válido");

/**
 * Non-negative decimal (allows 0)
 */
export const nonNegativeDecimalSchema = z
  .number()
  .nonnegative("No puede ser negativo")
  .finite("Debe ser un número válido");

/**
 * Percentage validation (0-100)
 */
export const percentageSchema = z
  .number()
  .min(0, "El porcentaje no puede ser negativo")
  .max(100, "El porcentaje no puede ser mayor a 100")
  .finite("Debe ser un número válido");

/**
 * Date validation (ISO 8601 format or Date object)
 */
export const dateSchema = z.coerce.date({
  errorMap: () => ({ message: "Formato de fecha inválido" }),
});

/**
 * Future date validation
 */
export const futureDateSchema = z.coerce
  .date()
  .refine((date) => date > new Date(), { message: "La fecha debe ser futura" });

/**
 * Past date validation
 */
export const pastDateSchema = z.coerce
  .date()
  .refine((date) => date < new Date(), { message: "La fecha debe ser pasada" });

/**
 * UUID validation
 */
export const uuidSchema = z.string().uuid("ID inválido");

/**
 * Non-empty string validation
 */
export const nonEmptyStringSchema = z
  .string()
  .min(1, "Este campo es requerido")
  .trim();

/**
 * Text with length limits
 */
export const shortTextSchema = z
  .string()
  .min(1, "Este campo es requerido")
  .max(100, "Máximo 100 caracteres")
  .trim();

export const mediumTextSchema = z
  .string()
  .min(1, "Este campo es requerido")
  .max(500, "Máximo 500 caracteres")
  .trim();

export const longTextSchema = z
  .string()
  .min(1, "Este campo es requerido")
  .max(2000, "Máximo 2000 caracteres")
  .trim();

/**
 * Optional text (can be empty)
 */
export const optionalTextSchema = z.string().trim().optional();

/**
 * URL validation
 */
export const urlSchema = z
  .string()
  .url("URL inválida")
  .trim()
  .optional()
  .or(z.literal(""));

/**
 * Color hex validation
 */
export const colorHexSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Color hex inválido (ej: #FF5733)")
  .optional();

// ==================== Enums ====================

/**
 * Common status enum
 */
export const statusEnum = z.enum(["activo", "inactivo"], {
  errorMap: () => ({ message: "Estado inválido" }),
});

/**
 * Priority enum
 */
export const priorityEnum = z.enum(["baja", "media", "alta", "urgente"], {
  errorMap: () => ({ message: "Prioridad inválida" }),
});

// ==================== Sanitization ====================

/**
 * Sanitize string by removing dangerous characters
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>'"]/g, "") // Remove potential XSS characters
    .replace(/\s+/g, " "); // Normalize whitespace
}

/**
 * Sanitize HTML by stripping all tags
 */
export function sanitizeHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

// ==================== Validation Helpers ====================

/**
 * Check if value is within range
 */
export function inRange(
  value: number,
  min: number,
  max: number,
  fieldName: string = "Valor"
): z.ZodNumber {
  return z
    .number()
    .min(min, `${fieldName} debe ser al menos ${min}`)
    .max(max, `${fieldName} no puede ser mayor a ${max}`);
}

/**
 * Validate that end date is after start date
 */
export function validateDateRange(startDate: Date, endDate: Date): boolean {
  return endDate > startDate;
}

/**
 * Create a schema for numeric ID validation
 */
export const idSchema = z.number().int().positive("ID inválido");

/**
 * Pagination schema
 */
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

// ==================== Error Messages ====================

export const ValidationErrors = {
  REQUIRED: "Este campo es requerido",
  INVALID_EMAIL: "Email inválido",
  INVALID_PHONE: "Teléfono inválido",
  INVALID_NIT: "NIT/RUT inválido",
  INVALID_DATE: "Fecha inválida",
  INVALID_NUMBER: "Número inválido",
  INVALID_URL: "URL inválida",
  TOO_SHORT: "Demasiado corto",
  TOO_LONG: "Demasiado largo",
  OUT_OF_RANGE: "Fuera de rango",
  NEGATIVE_VALUE: "No puede ser negativo",
  FUTURE_DATE: "La fecha debe ser futura",
  PAST_DATE: "La fecha debe ser pasada",
  DUPLICATE: "Ya existe un registro con este valor",
  NOT_FOUND: "Registro no encontrado",
  FOREIGN_KEY: "Referencia inválida",
} as const;
