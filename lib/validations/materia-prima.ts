/**
 * Materia prima validation schemas aligned with scripts/database-schema.sql
 */

import { z } from "zod";
import {
  shortTextSchema,
  mediumTextSchema,
  nonNegativeDecimalSchema,
} from "./common";

export const materiaPrimaBaseSchema = z.object({
  nombre: shortTextSchema.max(255, "Máximo 255 caracteres"),
  descripcion: mediumTextSchema.optional().or(z.literal("")),
  referencia_proveedor: z
    .string()
    .max(255, "Máximo 255 caracteres")
    .trim()
    .optional()
    .nullable()
    .or(z.literal("")),
  unidad_medida: z.string().min(1, "Unidad requerida").max(50).trim(),
  stock_actual: nonNegativeDecimalSchema.max(
    999999999.99,
    "Stock demasiado alto"
  ),
  punto_pedido: nonNegativeDecimalSchema
    .max(999999999.99, "Punto de pedido demasiado alto")
    .optional()
    .nullable(),
  tiempo_entrega_dias: z
    .number()
    .int("Debe ser un entero")
    .min(0, "No puede ser negativo")
    .max(3650, "Tiempo de entrega demasiado alto")
    .optional()
    .nullable(),
  longitud_estandar_m: nonNegativeDecimalSchema
    .max(999999999.99, "Longitud demasiado alta")
    .optional()
    .nullable(),
  color: z
    .string()
    .max(100, "Máximo 100 caracteres")
    .trim()
    .optional()
    .nullable()
    .or(z.literal("")),
  id_tipo_componente: z
    .number()
    .int()
    .positive("Tipo de componente inválido")
    .optional()
    .nullable(),
});

export const createMateriaPrimaSchema = materiaPrimaBaseSchema;
export const updateMateriaPrimaSchema = materiaPrimaBaseSchema.partial();

export const filterMateriaPrimaSchema = z.object({
  nombre: z.string().optional(),
  referencia_proveedor: z.string().optional(),
  id_tipo_componente: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
});

export const materiaPrimaIdSchema = z.object({
  id: z.coerce.number().int().positive("ID de materia prima inválido"),
});

export const validateMateriaPrimaStock = (
  stockActual: number,
  puntoPedido?: number | null
) => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (stockActual < 0) {
    errors.push("Stock no puede ser negativo");
  }

  if (puntoPedido != null && stockActual < puntoPedido) {
    warnings.push(
      `Stock actual (${stockActual}) está por debajo del punto de pedido (${puntoPedido})`
    );
  }

  if (stockActual === 0) {
    warnings.push("Materia prima sin stock disponible");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};

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

  if (stockActual > 0 && stockActual - cantidadRequerida < stockActual * 0.2) {
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

export type MateriaPrimaCreate = z.infer<typeof createMateriaPrimaSchema>;
export type MateriaPrimaUpdate = z.infer<typeof updateMateriaPrimaSchema>;
export type MateriaPrimaFilter = z.infer<typeof filterMateriaPrimaSchema>;
export type MateriaPrimaId = z.infer<typeof materiaPrimaIdSchema>;
