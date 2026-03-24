/**
 * Producto validation schemas aligned with scripts/database-schema.sql
 */

import { z } from "zod";
import {
  shortTextSchema,
  mediumTextSchema,
  positiveDecimalSchema,
  positiveIntSchema,
} from "./common";

export const componenteProductoSchema = z.object({
  materia_prima_id: positiveIntSchema,
  cantidad_necesaria: positiveDecimalSchema.max(
    999999999.99,
    "Cantidad demasiado alta"
  ),
  angulo_corte: z
    .string()
    .max(50, "Máximo 50 caracteres")
    .trim()
    .optional()
    .nullable()
    .or(z.literal("")),
});

export const productoBaseSchema = z.object({
  nombre_modelo: shortTextSchema.max(100, "Máximo 100 caracteres"),
  descripcion: mediumTextSchema.optional().or(z.literal("")),
  ancho: positiveDecimalSchema.max(999999.99, "Ancho demasiado alto"),
  alto: positiveDecimalSchema.max(999999.99, "Alto demasiado alto"),
  color: z
    .string()
    .max(100, "Máximo 100 caracteres")
    .trim()
    .optional()
    .nullable()
    .or(z.literal("")),
  tipo_accionamiento: z
    .string()
    .max(255, "Máximo 255 caracteres")
    .trim()
    .optional()
    .nullable()
    .or(z.literal("")),
});

export const createProductoSchema = productoBaseSchema.extend({
  componentes: z.array(componenteProductoSchema).default([]),
});

export const updateProductoSchema = productoBaseSchema.partial().extend({
  componentes: z.array(componenteProductoSchema).optional(),
});

export const filterProductoSchema = z.object({
  nombre_modelo: z.string().optional(),
  color: z.string().optional(),
  search: z.string().optional(),
});

export const productoIdSchema = z.object({
  id: z.coerce.number().int().positive("ID de producto inválido"),
});

export const validateProductoDimensions = (ancho: number, alto: number) => {
  const warnings: string[] = [];

  if (ancho > 4000 || alto > 4000) {
    warnings.push("Producto con dimensiones altas. Verificar factibilidad.");
  }

  return {
    valid: true,
    errors: [],
    warnings,
  };
};

export type ProductoCreate = z.infer<typeof createProductoSchema>;
export type ProductoUpdate = z.infer<typeof updateProductoSchema>;
export type ProductoFilter = z.infer<typeof filterProductoSchema>;
export type ProductoId = z.infer<typeof productoIdSchema>;
