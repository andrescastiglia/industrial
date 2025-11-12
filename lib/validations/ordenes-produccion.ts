/**
 * Orden de Producción validation schemas
 * Comprehensive validation for production order data
 */

import { z } from "zod";
import {
  nonEmptyStringSchema,
  mediumTextSchema,
  positiveIntSchema,
  dateSchema,
  futureDateSchema,
  pastDateSchema,
} from "./common";

// ==================== Enums ====================

export const ordenProduccionEstadoEnum = z.enum(
  ["pendiente", "en_proceso", "completada", "cancelada"],
  { message: "Estado de orden inválido" }
);

export const ordenProduccionPrioridadEnum = z.enum(
  ["baja", "media", "alta", "urgente"],
  { message: "Prioridad inválida" }
);

// ==================== Base Schema ====================

export const ordenProduccionBaseSchema = z.object({
  numero_orden: nonEmptyStringSchema
    .max(50, "Máximo 50 caracteres")
    .regex(
      /^OP-\d{4,10}$/,
      "Formato de número de orden inválido (debe ser OP-XXXX)"
    ),

  producto_id: positiveIntSchema,

  cantidad: positiveIntSchema.max(999999, "Cantidad demasiado alta"),

  fecha_inicio: dateSchema,

  fecha_estimada: dateSchema,

  fecha_completada: dateSchema.optional().nullable(),

  operario_id: positiveIntSchema.optional().nullable(),

  estado: ordenProduccionEstadoEnum.default("pendiente"),

  prioridad: ordenProduccionPrioridadEnum.default("media"),

  notas: z
    .string()
    .max(1000, "Máximo 1000 caracteres")
    .trim()
    .optional()
    .or(z.literal("")),
});

// ==================== Create Schema ====================

/**
 * Schema for creating a new orden de producción
 * Validates that estimated date is after start date
 */
export const createOrdenProduccionSchema = ordenProduccionBaseSchema
  .refine(
    (data) => {
      if (data.fecha_estimada) {
        return new Date(data.fecha_estimada) >= new Date(data.fecha_inicio);
      }
      return true;
    },
    {
      message:
        "La fecha estimada debe ser igual o posterior a la fecha de inicio",
      path: ["fecha_estimada"],
    }
  )
  .refine(
    (data) => {
      // fecha_completada should only be set if estado is 'completada'
      if (data.fecha_completada && data.estado !== "completada") {
        return false;
      }
      return true;
    },
    {
      message:
        'La fecha completada solo puede establecerse si el estado es "completada"',
      path: ["fecha_completada"],
    }
  );

// ==================== Update Schema ====================

/**
 * Schema for updating an existing orden de producción
 * All fields are optional (partial update support)
 */
export const updateOrdenProduccionSchema = ordenProduccionBaseSchema
  .partial()
  .refine(
    (data) => {
      if (data.fecha_inicio && data.fecha_estimada) {
        return new Date(data.fecha_estimada) >= new Date(data.fecha_inicio);
      }
      return true;
    },
    {
      message:
        "La fecha estimada debe ser igual o posterior a la fecha de inicio",
      path: ["fecha_estimada"],
    }
  )
  .refine(
    (data) => {
      if (
        data.fecha_completada &&
        data.estado &&
        data.estado !== "completada"
      ) {
        return false;
      }
      return true;
    },
    {
      message:
        'La fecha completada solo puede establecerse si el estado es "completada"',
      path: ["fecha_completada"],
    }
  );

// ==================== Query Schemas ====================

/**
 * Schema for filtering ordenes de producción
 */
export const filterOrdenProduccionSchema = z.object({
  numero_orden: z.string().optional(),
  producto_id: z.coerce.number().int().positive().optional(),
  operario_id: z.coerce.number().int().positive().optional(),
  estado: ordenProduccionEstadoEnum.optional(),
  prioridad: ordenProduccionPrioridadEnum.optional(),
  fecha_inicio_desde: z.coerce.date().optional(),
  fecha_inicio_hasta: z.coerce.date().optional(),
  fecha_estimada_desde: z.coerce.date().optional(),
  fecha_estimada_hasta: z.coerce.date().optional(),
  search: z.string().optional(),
});

/**
 * Schema for orden de producción ID parameter
 */
export const ordenProduccionIdSchema = z.object({
  id: z.coerce.number().int().positive("ID de orden de producción inválido"),
});

// ==================== Business Logic Validation ====================

/**
 * Validate that orden can be started
 */
export const validateOrdenCanStart = (estado: string) => {
  const errors: string[] = [];

  if (estado !== "pendiente") {
    errors.push(`No se puede iniciar una orden con estado "${estado}"`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Validate that orden can be completed
 */
export const validateOrdenCanComplete = (estado: string) => {
  const errors: string[] = [];

  if (estado !== "en_proceso") {
    errors.push(
      `Solo se pueden completar órdenes en proceso (estado actual: "${estado}")`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Validate that orden can be cancelled
 */
export const validateOrdenCanCancel = (estado: string) => {
  const errors: string[] = [];

  if (estado === "completada") {
    errors.push("No se pueden cancelar órdenes completadas");
  }

  if (estado === "cancelada") {
    errors.push("La orden ya está cancelada");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Validate orden production timeline
 */
export const validateOrdenTimeline = (
  fechaInicio: Date,
  fechaEstimada: Date,
  fechaCompletada?: Date | null
) => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (fechaEstimada < fechaInicio) {
    errors.push("La fecha estimada no puede ser anterior a la fecha de inicio");
  }

  if (fechaCompletada) {
    if (fechaCompletada < fechaInicio) {
      errors.push(
        "La fecha de completado no puede ser anterior a la fecha de inicio"
      );
    }

    if (fechaCompletada > fechaEstimada) {
      const diasRetraso = Math.ceil(
        (fechaCompletada.getTime() - fechaEstimada.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      warnings.push(`Orden completada con ${diasRetraso} día(s) de retraso`);
    }
  }

  // Check if current date is past estimated date and order is not complete
  if (fechaCompletada === null || fechaCompletada === undefined) {
    const now = new Date();
    if (now > fechaEstimada) {
      const diasRetraso = Math.ceil(
        (now.getTime() - fechaEstimada.getTime()) / (1000 * 60 * 60 * 24)
      );
      warnings.push(`Orden atrasada por ${diasRetraso} día(s)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};

// ==================== Types ====================

export type OrdenProduccionCreate = z.infer<typeof createOrdenProduccionSchema>;
export type OrdenProduccionUpdate = z.infer<typeof updateOrdenProduccionSchema>;
export type OrdenProduccionFilter = z.infer<typeof filterOrdenProduccionSchema>;
export type OrdenProduccionId = z.infer<typeof ordenProduccionIdSchema>;
export type OrdenProduccionEstado = z.infer<typeof ordenProduccionEstadoEnum>;
export type OrdenProduccionPrioridad = z.infer<
  typeof ordenProduccionPrioridadEnum
>;
