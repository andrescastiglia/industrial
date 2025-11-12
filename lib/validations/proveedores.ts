/**
 * Proveedor validation schemas
 * Comprehensive validation for supplier data
 */

import { z } from "zod";
import {
  emailSchema,
  phoneSchema,
  phoneOptionalSchema,
  nitSchema,
  shortTextSchema,
  mediumTextSchema,
  statusEnum,
  urlSchema,
} from "./common";

// ==================== Base Schema ====================

export const proveedorBaseSchema = z.object({
  nombre: shortTextSchema.max(150, "Máximo 150 caracteres"),

  email: emailSchema,

  telefono: phoneSchema,

  direccion: mediumTextSchema,

  nit: nitSchema,

  contacto: shortTextSchema
    .max(150, "Máximo 150 caracteres")
    .optional()
    .or(z.literal("")),

  telefono_contacto: phoneOptionalSchema,

  email_contacto: z
    .string()
    .email("Email inválido")
    .optional()
    .or(z.literal("")),

  sitio_web: urlSchema,

  notas: z
    .string()
    .max(1000, "Máximo 1000 caracteres")
    .trim()
    .optional()
    .or(z.literal("")),

  calificacion: z
    .number()
    .int()
    .min(1)
    .max(5, "Calificación debe estar entre 1 y 5")
    .optional()
    .nullable(),

  estado: statusEnum.default("activo"),
});

// ==================== Create Schema ====================

/**
 * Schema for creating a new proveedor
 * All required fields must be present
 */
export const createProveedorSchema = proveedorBaseSchema;

// ==================== Update Schema ====================

/**
 * Schema for updating an existing proveedor
 * All fields are optional (partial update support)
 */
export const updateProveedorSchema = proveedorBaseSchema.partial();

// ==================== Query Schemas ====================

/**
 * Schema for filtering proveedores
 */
export const filterProveedorSchema = z.object({
  nombre: z.string().optional(),
  email: z.string().optional(),
  estado: statusEnum.optional(),
  calificacion: z.coerce.number().int().min(1).max(5).optional(),
  search: z.string().optional(),
});

/**
 * Schema for proveedor ID parameter
 */
export const proveedorIdSchema = z.object({
  id: z.coerce.number().int().positive("ID de proveedor inválido"),
});

// ==================== Business Logic Validation ====================

/**
 * Validate that proveedor has good rating for important orders
 */
export const validateProveedorRating = (calificacion?: number | null) => {
  const warnings: string[] = [];

  if (!calificacion) {
    warnings.push("Proveedor sin calificación. Considere evaluar su desempeño");
  } else if (calificacion < 3) {
    warnings.push(
      `Proveedor con calificación baja (${calificacion}/5). Revisar historial`
    );
  }

  return {
    valid: true,
    errors: [],
    warnings,
  };
};

// ==================== Types ====================

export type ProveedorCreate = z.infer<typeof createProveedorSchema>;
export type ProveedorUpdate = z.infer<typeof updateProveedorSchema>;
export type ProveedorFilter = z.infer<typeof filterProveedorSchema>;
export type ProveedorId = z.infer<typeof proveedorIdSchema>;
