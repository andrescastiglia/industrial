/**
 * Operario validation schemas aligned with scripts/database-schema.sql
 */

import { z } from "zod";
import { shortTextSchema } from "./common";

export const operarioBaseSchema = z.object({
  nombre: shortTextSchema.max(100, "Máximo 100 caracteres"),
  apellido: shortTextSchema.max(100, "Máximo 100 caracteres"),
  rol: z
    .string()
    .max(100, "Máximo 100 caracteres")
    .trim()
    .optional()
    .nullable()
    .or(z.literal("")),
});

export const createOperarioSchema = operarioBaseSchema;
export const updateOperarioSchema = operarioBaseSchema.partial();

export const filterOperarioSchema = z.object({
  nombre: z.string().optional(),
  apellido: z.string().optional(),
  rol: z.string().optional(),
  search: z.string().optional(),
});

export const operarioIdSchema = z.object({
  id: z.coerce.number().int().positive("ID de operario inválido"),
});

export const validateOperarioIdentity = (nombre: string, apellido: string) => {
  const errors: string[] = [];

  if (!nombre.trim()) {
    errors.push("Nombre requerido");
  }

  if (!apellido.trim()) {
    errors.push("Apellido requerido");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export type OperarioCreate = z.infer<typeof createOperarioSchema>;
export type OperarioUpdate = z.infer<typeof updateOperarioSchema>;
export type OperarioFilter = z.infer<typeof filterOperarioSchema>;
export type OperarioId = z.infer<typeof operarioIdSchema>;
