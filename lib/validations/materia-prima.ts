/**
 * Materia Prima validation schemas
 * Comprehensive validation for raw material data
 */

import { z } from "zod";
import {
  nonEmptyStringSchema,
  shortTextSchema,
  mediumTextSchema,
  positiveDecimalSchema,
  nonNegativeDecimalSchema,
  statusEnum,
} from "./common";

// ==================== Base Schema ====================

export const materiaPrimaBaseSchema = z.object({
  codigo: shortTextSchema
    .max(50, "Máximo 50 caracteres")
    .regex(
      /^[A-Z0-9-_]+$/,
      "Solo letras mayúsculas, números, guiones y guiones bajos"
    ),

  nombre: shortTextSchema.max(200, "Máximo 200 caracteres"),

  descripcion: mediumTextSchema.optional().or(z.literal("")),

  precio_unitario: positiveDecimalSchema.max(
    999999999.99,
    "Precio demasiado alto"
  ),

  stock_actual: nonNegativeDecimalSchema.max(999999999, "Stock demasiado alto"),

  stock_minimo: nonNegativeDecimalSchema.max(
    999999999,
    "Stock mínimo demasiado alto"
  ),

  unidad_medida: z.enum(
    ["kg", "litro", "metro", "unidad", "gramo", "mililitro"],
    {
      message: "Unidad de medida inválida",
    }
  ),

  proveedor_id: z
    .number()
    .int()
    .positive("Proveedor inválido")
    .optional()
    .nullable(),

  tipo_componente_id: z
    .number()
    .int()
    .positive("Tipo de componente inválido")
    .optional()
    .nullable(),

  estado: statusEnum.default("activo"),
});

// ==================== Create Schema ====================

/**
 * Schema for creating a new materia prima
 * All required fields must be present
 */
export const createMateriaPrimaSchema = materiaPrimaBaseSchema;

// ==================== Update Schema ====================

/**
 * Schema for updating an existing materia prima
 * All fields are optional (partial update support)
 */
export const updateMateriaPrimaSchema = materiaPrimaBaseSchema.partial();

// ==================== Query Schemas ====================

/**
 * Schema for filtering materia prima
 */
export const filterMateriaPrimaSchema = z.object({
  codigo: z.string().optional(),
  nombre: z.string().optional(),
  proveedor_id: z.coerce.number().int().positive().optional(),
  tipo_componente_id: z.coerce.number().int().positive().optional(),
  estado: statusEnum.optional(),
  stock_bajo: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

/**
 * Schema for materia prima ID parameter
 */
export const materiaPrimaIdSchema = z.object({
  id: z.coerce.number().int().positive("ID de materia prima inválido"),
});

// ==================== Business Logic Validation ====================

/**
 * Validate that materia prima stock is sufficient
 */
export const validateMateriaPrimaStock = (
  stockActual: number,
  stockMinimo: number
) => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (stockActual < 0) {
    errors.push("Stock no puede ser negativo");
  }

  if (stockActual < stockMinimo) {
    warnings.push(
      `Stock actual (${stockActual}) está por debajo del mínimo (${stockMinimo})`
    );
  }

  if (stockActual === 0) {
    warnings.push("Materia prima sin stock disponible");
  }

  if (stockMinimo === 0) {
    warnings.push(
      "Stock mínimo no configurado. Recomendado: establecer un valor de seguridad"
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Validate that consumption quantity is available
 */
export const validateMateriaPrimaConsumption = (
  stockActual: number,
  cantidadRequerida: number
) => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (cantidadRequerida <= 0) {
    errors.push("Cantidad requerida debe ser mayor a 0");
  }

  if (stockActual < cantidadRequerida) {
    errors.push(
      `Stock insuficiente. Disponible: ${stockActual}, Requerido: ${cantidadRequerida}`
    );
  }

  const stockRestante = stockActual - cantidadRequerida;
  if (stockRestante < stockActual * 0.2) {
    warnings.push(
      "El consumo dejará el stock en nivel crítico (menos del 20%)"
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};

// ==================== Types ====================

export type MateriaPrimaCreate = z.infer<typeof createMateriaPrimaSchema>;
export type MateriaPrimaUpdate = z.infer<typeof updateMateriaPrimaSchema>;
export type MateriaPrimaFilter = z.infer<typeof filterMateriaPrimaSchema>;
export type MateriaPrimaId = z.infer<typeof materiaPrimaIdSchema>;
