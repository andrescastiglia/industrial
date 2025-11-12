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
  numero_compra: z
    .string()
    .min(1, "Número de compra requerido")
    .max(50, "Máximo 50 caracteres")
    .regex(
      /^COM-\d{4,10}$/,
      "Formato de número de compra inválido (debe ser COM-XXXX)"
    ),

  proveedor_id: positiveIntSchema,

  fecha_compra: dateSchema,

  fecha_entrega_estimada: dateSchema,

  subtotal: nonNegativeDecimalSchema.max(
    999999999.99,
    "Subtotal demasiado alto"
  ),

  impuestos: nonNegativeDecimalSchema.max(
    999999999.99,
    "Impuestos demasiado altos"
  ),

  total: positiveDecimalSchema.max(999999999.99, "Total demasiado alto"),

  estado: compraEstadoEnum.default("pendiente"),

  notas: z
    .string()
    .max(1000, "Máximo 1000 caracteres")
    .trim()
    .optional()
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
 * Validates that totals are consistent and delivery date is after purchase date
 */
export const createCompraSchema = compraBaseSchema
  .extend({
    detalles: z
      .array(compraDetalleSchema)
      .min(1, "Debe incluir al menos un material"),
  })
  .refine(
    (data) => {
      // Validate that fecha_entrega_estimada is after fecha_compra
      return (
        new Date(data.fecha_entrega_estimada) >= new Date(data.fecha_compra)
      );
    },
    {
      message:
        "La fecha de entrega debe ser igual o posterior a la fecha de compra",
      path: ["fecha_entrega_estimada"],
    }
  )
  .refine(
    (data) => {
      // Validate that subtotal matches sum of detalles
      const calculatedSubtotal = data.detalles.reduce(
        (sum, detalle) => sum + detalle.subtotal,
        0
      );
      return Math.abs(calculatedSubtotal - data.subtotal) < 0.01;
    },
    {
      message: "El subtotal no coincide con la suma de los detalles",
      path: ["subtotal"],
    }
  )
  .refine(
    (data) => {
      // Validate that total = subtotal + impuestos
      const calculatedTotal = data.subtotal + data.impuestos;
      return Math.abs(calculatedTotal - data.total) < 0.01;
    },
    {
      message: "El total no coincide con subtotal + impuestos",
      path: ["total"],
    }
  )
  .refine(
    (data) => {
      // Validate each detalle subtotal = cantidad * precio_unitario
      return data.detalles.every((detalle) => {
        const calculatedSubtotal = detalle.cantidad * detalle.precio_unitario;
        return Math.abs(calculatedSubtotal - detalle.subtotal) < 0.01;
      });
    },
    {
      message: "El subtotal de algún detalle no coincide con cantidad × precio",
      path: ["detalles"],
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
