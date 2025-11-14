/**
 * Compra validation schemas
 * Comprehensive validation for purchase data
 */

import { z } from "zod";
import {
  positiveIntSchema,
  positiveDecimalSchema,
  nonNegativeDecimalSchema,
  dateSchema,
  futureDateSchema,
} from "./common";

// ==================== Enums ====================

export const compraEstadoEnum = z.enum(["pendiente", "recibida", "cancelada"], {
  message: "Estado de compra inválido",
});

// ==================== Base Schema ====================

export const compraBaseSchema = z.object({
  proveedor_id: positiveIntSchema,

  fecha_pedido: dateSchema,

  fecha_recepcion_estimada: dateSchema.optional(),

  fecha_recepcion_real: dateSchema.optional().nullable(),

  estado: z.string().max(50, "Máximo 50 caracteres").default("Pendiente"),

  total_compra: positiveDecimalSchema
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

// ==================== Compra Detalle Schema ====================

export const compraDetalleSchema = z.object({
  materia_prima_id: positiveIntSchema,

  cantidad: positiveDecimalSchema.max(999999, "Cantidad demasiado alta"),

  precio_unitario: positiveDecimalSchema.max(
    999999999.99,
    "Precio demasiado alto"
  ),

  subtotal: positiveDecimalSchema.max(999999999.99, "Subtotal demasiado alto"),
});

// ==================== Create Schema ====================

/**
 * Schema for creating a new compra with details
 * Validates that delivery date is after purchase date if provided
 */
export const createCompraSchema = compraBaseSchema
  .extend({
    detalles: z
      .array(compraDetalleSchema)
      .min(1, "Debe incluir al menos un material"),
  })
  .refine(
    (data) => {
      // Validate that fecha_recepcion_estimada is after fecha_pedido if provided
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

// ==================== Update Schema ====================

/**
 * Schema for updating an existing compra
 * All fields are optional (partial update support)
 */
export const updateCompraSchema = compraBaseSchema.partial();

// ==================== Query Schemas ====================

/**
 * Schema for filtering compras
 */
export const filterCompraSchema = z.object({
  numero_compra: z.string().optional(),
  proveedor_id: z.coerce.number().int().positive().optional(),
  estado: compraEstadoEnum.optional(),
  fecha_desde: z.coerce.date().optional(),
  fecha_hasta: z.coerce.date().optional(),
  fecha_entrega_desde: z.coerce.date().optional(),
  fecha_entrega_hasta: z.coerce.date().optional(),
  total_min: z.coerce.number().positive().optional(),
  total_max: z.coerce.number().positive().optional(),
  search: z.string().optional(),
});

/**
 * Schema for compra ID parameter
 */
export const compraIdSchema = z.object({
  id: z.coerce.number().int().positive("ID de compra inválido"),
});

// ==================== Business Logic Validation ====================

/**
 * Validate that compra can be marked as received
 */
export const validateCompraCanReceive = (estado: string) => {
  const errors: string[] = [];

  if (estado === "recibida") {
    errors.push("La compra ya fue recibida");
  }

  if (estado === "cancelada") {
    errors.push("No se puede recibir una compra cancelada");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Validate that compra can be cancelled
 */
export const validateCompraCanCancel = (estado: string) => {
  const errors: string[] = [];

  if (estado === "recibida") {
    errors.push("No se puede cancelar una compra ya recibida");
  }

  if (estado === "cancelada") {
    errors.push("La compra ya está cancelada");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Validate delivery timeline
 */
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

// ==================== Types ====================

export type CompraCreate = z.infer<typeof createCompraSchema>;
export type CompraUpdate = z.infer<typeof updateCompraSchema>;
export type CompraDetalle = z.infer<typeof compraDetalleSchema>;
export type CompraFilter = z.infer<typeof filterCompraSchema>;
export type CompraId = z.infer<typeof compraIdSchema>;
export type CompraEstado = z.infer<typeof compraEstadoEnum>;
