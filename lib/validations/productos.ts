/**
 * Producto validation schemas
 * Comprehensive validation for finished product data
 */

import { z } from "zod";
import {
  nonEmptyStringSchema,
  shortTextSchema,
  mediumTextSchema,
  positiveDecimalSchema,
  nonNegativeDecimalSchema,
  statusEnum,
  urlSchema,
} from "./common";

// ==================== Base Schema ====================

export const productoBaseSchema = z.object({
  codigo: shortTextSchema
    .max(50, "Máximo 50 caracteres")
    .regex(
      /^[A-Z0-9-_]+$/,
      "Solo letras mayúsculas, números, guiones y guiones bajos"
    ),

  nombre: shortTextSchema.max(200, "Máximo 200 caracteres"),

  descripcion: mediumTextSchema.optional().or(z.literal("")),

  precio_venta: positiveDecimalSchema.max(
    999999999.99,
    "Precio demasiado alto"
  ),

  precio_costo: nonNegativeDecimalSchema.max(
    999999999.99,
    "Costo demasiado alto"
  ),

  stock_actual: z
    .number()
    .int("Debe ser un número entero")
    .nonnegative("No puede ser negativo")
    .default(0),

  stock_minimo: z
    .number()
    .int("Debe ser un número entero")
    .nonnegative("No puede ser negativo")
    .default(0),

  unidad_medida: z
    .enum(
      ["unidad", "kg", "litro", "metro", "metro_cuadrado", "metro_cubico"],
      {
        message: "Unidad de medida inválida",
      }
    )
    .default("unidad"),

  tiempo_produccion: z
    .number()
    .int("Debe ser un número entero")
    .positive("Debe ser mayor a 0")
    .max(9999, "Tiempo de producción demasiado alto")
    .describe("Tiempo en minutos"),

  imagen_url: urlSchema,

  categoria: shortTextSchema
    .max(100, "Máximo 100 caracteres")
    .optional()
    .or(z.literal("")),

  estado: statusEnum.default("activo"),
});

// ==================== Create Schema ====================

/**
 * Schema for creating a new producto
 * All required fields must be present
 */
export const createProductoSchema = productoBaseSchema;

// ==================== Update Schema ====================

/**
 * Schema for updating an existing producto
 * All fields are optional (partial update support)
 */
export const updateProductoSchema = productoBaseSchema.partial();

// ==================== Query Schemas ====================

/**
 * Schema for filtering productos
 */
export const filterProductoSchema = z.object({
  codigo: z.string().optional(),
  nombre: z.string().optional(),
  categoria: z.string().optional(),
  estado: statusEnum.optional(),
  stock_bajo: z.coerce.boolean().optional(), // Filter by low stock
  search: z.string().optional(),
});

/**
 * Schema for producto ID parameter
 */
export const productoIdSchema = z.object({
  id: z.coerce.number().int().positive("ID de producto inválido"),
});

// ==================== Business Logic Validation ====================

/**
 * Validate that producto pricing makes sense
 */
export const validateProductoPricing = (
  producto: z.infer<typeof productoBaseSchema>
) => {
  const errors: string[] = [];

  if (producto.precio_venta <= producto.precio_costo) {
    errors.push(
      "El precio de venta debe ser mayor al costo para tener ganancia"
    );
  }

  const margen =
    ((producto.precio_venta - producto.precio_costo) / producto.precio_venta) *
    100;
  if (margen < 10) {
    errors.push(
      `Margen de ganancia muy bajo (${margen.toFixed(2)}%). Recomendado: al menos 10%`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings:
      margen < 20
        ? ["Margen de ganancia bajo. Considere revisar precios."]
        : [],
  };
};

/**
 * Validate that stock is sufficient for production
 */
export const validateProductoStock = (
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
    warnings.push("Producto sin stock disponible");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};

// ==================== Types ====================

export type ProductoCreate = z.infer<typeof createProductoSchema>;
export type ProductoUpdate = z.infer<typeof updateProductoSchema>;
export type ProductoFilter = z.infer<typeof filterProductoSchema>;
export type ProductoId = z.infer<typeof productoIdSchema>;
