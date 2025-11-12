/**
 * Venta validation schemas
 * Comprehensive validation for sales data
 */

import { z } from "zod";
import {
  positiveIntSchema,
  positiveDecimalSchema,
  nonNegativeDecimalSchema,
  dateSchema,
  mediumTextSchema,
} from "./common";

// ==================== Enums ====================

export const ventaEstadoEnum = z.enum(
  ["pendiente", "pagada", "cancelada", "devuelta"],
  { message: "Estado de venta inválido" }
);

export const ventaMetodoPagoEnum = z.enum(
  ["efectivo", "tarjeta", "transferencia", "credito"],
  { message: "Método de pago inválido" }
);

// ==================== Base Schema ====================

export const ventaBaseSchema = z.object({
  numero_venta: z
    .string()
    .min(1, "Número de venta requerido")
    .max(50, "Máximo 50 caracteres")
    .regex(
      /^VEN-\d{4,10}$/,
      "Formato de número de venta inválido (debe ser VEN-XXXX)"
    ),

  cliente_id: positiveIntSchema,

  fecha_venta: dateSchema,

  subtotal: nonNegativeDecimalSchema.max(
    999999999.99,
    "Subtotal demasiado alto"
  ),

  impuestos: nonNegativeDecimalSchema.max(
    999999999.99,
    "Impuestos demasiado altos"
  ),

  total: positiveDecimalSchema.max(999999999.99, "Total demasiado alto"),

  metodo_pago: ventaMetodoPagoEnum,

  estado: ventaEstadoEnum.default("pendiente"),

  notas: z
    .string()
    .max(1000, "Máximo 1000 caracteres")
    .trim()
    .optional()
    .or(z.literal("")),
});

// ==================== Venta Detalle Schema ====================

export const ventaDetalleSchema = z.object({
  producto_id: positiveIntSchema,

  cantidad: positiveIntSchema.max(999999, "Cantidad demasiado alta"),

  precio_unitario: positiveDecimalSchema.max(
    999999999.99,
    "Precio demasiado alto"
  ),

  subtotal: positiveDecimalSchema.max(999999999.99, "Subtotal demasiado alto"),
});

// ==================== Create Schema ====================

/**
 * Schema for creating a new venta with details
 * Validates that totals are consistent
 */
export const createVentaSchema = ventaBaseSchema
  .extend({
    detalles: z
      .array(ventaDetalleSchema)
      .min(1, "Debe incluir al menos un producto"),
  })
  .refine(
    (data) => {
      // Validate that subtotal matches sum of detalles
      const calculatedSubtotal = data.detalles.reduce(
        (sum, detalle) => sum + detalle.subtotal,
        0
      );
      return Math.abs(calculatedSubtotal - data.subtotal) < 0.01; // Allow 1 cent difference for rounding
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
 * Schema for updating an existing venta
 * All fields are optional (partial update support)
 */
export const updateVentaSchema = ventaBaseSchema.partial();

// ==================== Query Schemas ====================

/**
 * Schema for filtering ventas
 */
export const filterVentaSchema = z.object({
  numero_venta: z.string().optional(),
  cliente_id: z.coerce.number().int().positive().optional(),
  estado: ventaEstadoEnum.optional(),
  metodo_pago: ventaMetodoPagoEnum.optional(),
  fecha_desde: z.coerce.date().optional(),
  fecha_hasta: z.coerce.date().optional(),
  total_min: z.coerce.number().positive().optional(),
  total_max: z.coerce.number().positive().optional(),
  search: z.string().optional(),
});

/**
 * Schema for venta ID parameter
 */
export const ventaIdSchema = z.object({
  id: z.coerce.number().int().positive("ID de venta inválido"),
});

// ==================== Business Logic Validation ====================

/**
 * Validate that venta can be cancelled
 */
export const validateVentaCanCancel = (estado: string) => {
  const errors: string[] = [];

  if (estado === "cancelada") {
    errors.push("La venta ya está cancelada");
  }

  if (estado === "devuelta") {
    errors.push("No se puede cancelar una venta devuelta");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Validate that venta can be marked as paid
 */
export const validateVentaCanPay = (estado: string) => {
  const errors: string[] = [];

  if (estado === "pagada") {
    errors.push("La venta ya está pagada");
  }

  if (estado === "cancelada") {
    errors.push("No se puede pagar una venta cancelada");
  }

  if (estado === "devuelta") {
    errors.push("No se puede pagar una venta devuelta");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Validate tax calculation
 */
export const validateVentaTaxes = (
  subtotal: number,
  impuestos: number,
  tasaImpuesto: number = 0.19
) => {
  const warnings: string[] = [];

  const expectedTax = subtotal * tasaImpuesto;
  const difference = Math.abs(impuestos - expectedTax);

  if (difference > 0.01) {
    warnings.push(
      `Los impuestos (${impuestos.toFixed(2)}) no coinciden con el cálculo esperado (${expectedTax.toFixed(2)})`
    );
  }

  return {
    valid: true,
    errors: [],
    warnings,
  };
};

// ==================== Types ====================

export type VentaCreate = z.infer<typeof createVentaSchema>;
export type VentaUpdate = z.infer<typeof updateVentaSchema>;
export type VentaDetalle = z.infer<typeof ventaDetalleSchema>;
export type VentaFilter = z.infer<typeof filterVentaSchema>;
export type VentaId = z.infer<typeof ventaIdSchema>;
export type VentaEstado = z.infer<typeof ventaEstadoEnum>;
export type VentaMetodoPago = z.infer<typeof ventaMetodoPagoEnum>;
