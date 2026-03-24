/**
 * Orden de producción validation schemas aligned with scripts/database-schema.sql
 */

import { z } from "zod";
import { positiveIntSchema, dateSchema } from "./common";
import {
  ORDEN_PRODUCCION_ESTADOS,
  normalizeOrdenProduccionEstado,
} from "@/lib/business-constants";

export const ordenProduccionEstadoEnum = z.enum(ORDEN_PRODUCCION_ESTADOS, {
  message: "Estado de orden inválido",
});

export const ordenProduccionBaseSchema = z.object({
  orden_venta_id: positiveIntSchema.optional().nullable(),
  producto_id: positiveIntSchema,
  cantidad_a_producir: positiveIntSchema.max(999999, "Cantidad demasiado alta"),
  fecha_creacion: dateSchema.optional(),
  fecha_inicio: dateSchema.optional().nullable(),
  fecha_fin_estimada: dateSchema.optional().nullable(),
  fecha_fin_real: dateSchema.optional().nullable(),
  estado: z
    .string()
    .trim()
    .transform((value, ctx) => {
      const normalized = normalizeOrdenProduccionEstado(value);
      if (!normalized) {
        ctx.addIssue({
          code: "custom",
          message: "Estado de orden inválido",
        });
        return z.NEVER;
      }
      return normalized;
    })
    .default("pendiente"),
});

export const createOrdenProduccionSchema = ordenProduccionBaseSchema.refine(
  (data) => {
    if (!data.fecha_inicio || !data.fecha_fin_estimada) {
      return true;
    }
    return new Date(data.fecha_fin_estimada) >= new Date(data.fecha_inicio);
  },
  {
    message:
      "La fecha fin estimada debe ser igual o posterior a la fecha de inicio",
    path: ["fecha_fin_estimada"],
  }
);

export const updateOrdenProduccionSchema = ordenProduccionBaseSchema
  .partial()
  .refine(
    (data) => {
      if (!data.fecha_inicio || !data.fecha_fin_estimada) {
        return true;
      }
      return new Date(data.fecha_fin_estimada) >= new Date(data.fecha_inicio);
    },
    {
      message:
        "La fecha fin estimada debe ser igual o posterior a la fecha de inicio",
      path: ["fecha_fin_estimada"],
    }
  );

export const filterOrdenProduccionSchema = z.object({
  producto_id: z.coerce.number().int().positive().optional(),
  orden_venta_id: z.coerce.number().int().positive().optional(),
  estado: ordenProduccionEstadoEnum.optional(),
  search: z.string().optional(),
});

export const ordenProduccionIdSchema = z.object({
  id: z.coerce.number().int().positive("ID de orden de producción inválido"),
});

export const validateOrdenCanStart = (estado: string) => {
  const normalized = normalizeOrdenProduccionEstado(estado);
  const errors: string[] = [];

  if (normalized !== "pendiente") {
    errors.push(`No se puede iniciar una orden con estado "${estado}"`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const validateOrdenCanComplete = (estado: string) => {
  const normalized = normalizeOrdenProduccionEstado(estado);
  const errors: string[] = [];

  if (normalized !== "en_proceso") {
    errors.push(
      `Solo se pueden completar órdenes en proceso (estado actual: "${estado}")`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const validateOrdenCanCancel = (estado: string) => {
  const normalized = normalizeOrdenProduccionEstado(estado);
  const errors: string[] = [];

  if (normalized === "completada") {
    errors.push("No se pueden cancelar órdenes completadas");
  }

  if (normalized === "cancelada") {
    errors.push("La orden ya está cancelada");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

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

  if (!fechaCompletada) {
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

export type OrdenProduccionCreate = z.infer<typeof createOrdenProduccionSchema>;
export type OrdenProduccionUpdate = z.infer<typeof updateOrdenProduccionSchema>;
export type OrdenProduccionFilter = z.infer<typeof filterOrdenProduccionSchema>;
export type OrdenProduccionId = z.infer<typeof ordenProduccionIdSchema>;
export type OrdenProduccionEstado = z.infer<typeof ordenProduccionEstadoEnum>;
