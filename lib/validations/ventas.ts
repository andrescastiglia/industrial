/**
 * Venta validation schemas aligned with scripts/database-schema.sql
 */

import { z } from "zod";
import {
  positiveIntSchema,
  nonNegativeDecimalSchema,
  dateSchema,
} from "./common";
import { VENTA_ESTADOS, normalizeVentaEstado } from "@/lib/business-constants";

export const ventaEstadoEnum = z.enum(VENTA_ESTADOS, {
  message: "Estado de venta inválido",
});

export const ventaBaseSchema = z.object({
  cliente_id: positiveIntSchema,
  fecha_pedido: dateSchema,
  fecha_entrega_estimada: dateSchema,
  fecha_entrega_real: dateSchema.optional().nullable(),
  estado: z
    .string()
    .trim()
    .transform((value, ctx) => {
      const normalized = normalizeVentaEstado(value);
      if (!normalized) {
        ctx.addIssue({
          code: "custom",
          message: "Estado de venta inválido",
        });
        return z.NEVER;
      }
      return normalized;
    })
    .default("cotizacion"),
  total_venta: nonNegativeDecimalSchema
    .max(999999999.99, "Total demasiado alto")
    .optional()
    .nullable(),
});

export const ventaDetalleSchema = z.object({
  producto_id: positiveIntSchema,
  cantidad: positiveIntSchema.max(999999, "Cantidad demasiado alta"),
  precio_unitario_venta: nonNegativeDecimalSchema
    .max(999999999.99, "Precio demasiado alto")
    .optional()
    .nullable(),
});

export const createVentaSchema = ventaBaseSchema
  .extend({
    detalles: z
      .array(ventaDetalleSchema)
      .min(1, "Debe incluir al menos un producto"),
  })
  .refine(
    (data) =>
      new Date(data.fecha_entrega_estimada) >= new Date(data.fecha_pedido),
    {
      message:
        "La fecha de entrega estimada debe ser igual o posterior a la fecha de pedido",
      path: ["fecha_entrega_estimada"],
    }
  );

export const updateVentaSchema = ventaBaseSchema
  .partial()
  .extend({
    detalles: z.array(ventaDetalleSchema).optional(),
  })
  .refine(
    (data) => {
      if (!data.fecha_pedido || !data.fecha_entrega_estimada) {
        return true;
      }

      return (
        new Date(data.fecha_entrega_estimada) >= new Date(data.fecha_pedido)
      );
    },
    {
      message:
        "La fecha de entrega estimada debe ser igual o posterior a la fecha de pedido",
      path: ["fecha_entrega_estimada"],
    }
  );

export const filterVentaSchema = z.object({
  cliente_id: z.coerce.number().int().positive().optional(),
  estado: ventaEstadoEnum.optional(),
  fecha_desde: z.coerce.date().optional(),
  fecha_hasta: z.coerce.date().optional(),
  search: z.string().optional(),
});

export const ventaIdSchema = z.object({
  id: z.coerce.number().int().positive("ID de venta inválido"),
});

export const validateVentaCanCancel = (estado: string) => {
  const normalized = normalizeVentaEstado(estado);
  const errors: string[] = [];

  if (normalized === "cancelada") {
    errors.push("La venta ya está cancelada");
  }

  if (normalized === "entregada") {
    errors.push("No se puede cancelar una venta ya entregada");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const validateVentaCanDeliver = (estado: string) => {
  const normalized = normalizeVentaEstado(estado);
  const errors: string[] = [];

  if (normalized === "entregada") {
    errors.push("La venta ya está entregada");
  }

  if (normalized === "cancelada") {
    errors.push("No se puede entregar una venta cancelada");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export type VentaCreate = z.infer<typeof createVentaSchema>;
export type VentaUpdate = z.infer<typeof updateVentaSchema>;
export type VentaDetalle = z.infer<typeof ventaDetalleSchema>;
export type VentaFilter = z.infer<typeof filterVentaSchema>;
export type VentaId = z.infer<typeof ventaIdSchema>;
