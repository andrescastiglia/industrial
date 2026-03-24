/**
 * Compra validation schemas aligned with scripts/database-schema.sql
 */

import { z } from "zod";
import {
  positiveIntSchema,
  positiveDecimalSchema,
  nonNegativeDecimalSchema,
  dateSchema,
} from "./common";
import {
  COMPRA_ESTADOS,
  normalizeCompraEstado,
} from "@/lib/business-constants";

export const compraEstadoEnum = z.enum(COMPRA_ESTADOS, {
  message: "Estado de compra inválido",
});

export const compraBaseSchema = z.object({
  proveedor_id: positiveIntSchema,
  fecha_pedido: dateSchema,
  fecha_recepcion_estimada: dateSchema.optional().nullable(),
  fecha_recepcion_real: dateSchema.optional().nullable(),
  estado: z
    .string()
    .trim()
    .transform((value, ctx) => {
      const normalized = normalizeCompraEstado(value);
      if (!normalized) {
        ctx.addIssue({
          code: "custom",
          message: "Estado de compra inválido",
        });
        return z.NEVER;
      }
      return normalized;
    })
    .default("pendiente"),
  total_compra: nonNegativeDecimalSchema
    .max(999999999.99, "Total demasiado alto")
    .optional()
    .nullable(),
  cotizacion_ref: z
    .string()
    .max(100, "Máximo 100 caracteres")
    .trim()
    .optional()
    .nullable()
    .or(z.literal("")),
});

export const compraDetalleSchema = z.object({
  materia_prima_id: positiveIntSchema,
  cantidad_pedida: positiveDecimalSchema.max(999999, "Cantidad demasiado alta"),
  cantidad_recibida: nonNegativeDecimalSchema
    .max(999999, "Cantidad recibida demasiado alta")
    .optional()
    .nullable(),
  unidad_medida: z
    .string()
    .max(50, "Máximo 50 caracteres")
    .trim()
    .optional()
    .nullable()
    .or(z.literal("")),
});

export const createCompraSchema = compraBaseSchema
  .extend({
    detalles: z.array(compraDetalleSchema).optional().default([]),
  })
  .refine(
    (data) => {
      if (!data.fecha_recepcion_estimada) return true;
      return (
        new Date(data.fecha_recepcion_estimada) >= new Date(data.fecha_pedido)
      );
    },
    {
      message:
        "La fecha de recepción estimada debe ser igual o posterior a la fecha de pedido",
      path: ["fecha_recepcion_estimada"],
    }
  );

export const updateCompraSchema = compraBaseSchema
  .partial()
  .extend({
    detalles: z.array(compraDetalleSchema).optional(),
  })
  .refine(
    (data) => {
      if (!data.fecha_pedido || !data.fecha_recepcion_estimada) {
        return true;
      }

      return (
        new Date(data.fecha_recepcion_estimada) >= new Date(data.fecha_pedido)
      );
    },
    {
      message:
        "La fecha de recepción estimada debe ser igual o posterior a la fecha de pedido",
      path: ["fecha_recepcion_estimada"],
    }
  );

export const filterCompraSchema = z.object({
  proveedor_id: z.coerce.number().int().positive().optional(),
  estado: compraEstadoEnum.optional(),
  fecha_desde: z.coerce.date().optional(),
  fecha_hasta: z.coerce.date().optional(),
  search: z.string().optional(),
});

export const compraIdSchema = z.object({
  id: z.coerce.number().int().positive("ID de compra inválido"),
});

export const validateCompraCanReceive = (estado: string) => {
  const normalized = normalizeCompraEstado(estado);
  const errors: string[] = [];

  if (normalized === "recibida") {
    errors.push("La compra ya fue recibida");
  }

  if (normalized === "cancelada") {
    errors.push("No se puede recibir una compra cancelada");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const validateCompraCanCancel = (estado: string) => {
  const normalized = normalizeCompraEstado(estado);
  const errors: string[] = [];

  if (normalized === "recibida") {
    errors.push("No se puede cancelar una compra ya recibida");
  }

  if (normalized === "cancelada") {
    errors.push("La compra ya está cancelada");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const validateCompraDelivery = (
  fechaCompra: Date,
  fechaEntregaEstimada: Date
) => {
  const warnings: string[] = [];

  const diasEntrega = Math.ceil(
    (fechaEntregaEstimada.getTime() - fechaCompra.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  if (diasEntrega > 30) {
    warnings.push(
      `Tiempo de entrega muy largo (${diasEntrega} días). Verificar con proveedor`
    );
  }

  const now = new Date();
  if (now > fechaEntregaEstimada) {
    const diasRetraso = Math.ceil(
      (now.getTime() - fechaEntregaEstimada.getTime()) / (1000 * 60 * 60 * 24)
    );
    warnings.push(`Compra atrasada por ${diasRetraso} día(s)`);
  }

  return {
    valid: true,
    errors: [],
    warnings,
  };
};

export type CompraCreate = z.infer<typeof createCompraSchema>;
export type CompraUpdate = z.infer<typeof updateCompraSchema>;
export type CompraDetalle = z.infer<typeof compraDetalleSchema>;
export type CompraFilter = z.infer<typeof filterCompraSchema>;
export type CompraId = z.infer<typeof compraIdSchema>;
export type CompraEstado = z.infer<typeof compraEstadoEnum>;
