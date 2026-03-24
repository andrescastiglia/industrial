/**
 * Proveedor validation schemas aligned with scripts/database-schema.sql
 */

import { z } from "zod";
import {
  emailSchema,
  phoneSchema,
  shortTextSchema,
  mediumTextSchema,
} from "./common";

export const proveedorBaseSchema = z.object({
  nombre: shortTextSchema.max(255, "Máximo 255 caracteres"),
  contacto: shortTextSchema
    .max(255, "Máximo 255 caracteres")
    .optional()
    .or(z.literal("")),
  direccion: mediumTextSchema.optional().or(z.literal("")),
  telefono: phoneSchema.optional().or(z.literal("")),
  email: emailSchema.optional().or(z.literal("")),
  cuit: z
    .string()
    .max(50, "Máximo 50 caracteres")
    .trim()
    .optional()
    .or(z.literal("")),
});

export const createProveedorSchema = proveedorBaseSchema;
export const updateProveedorSchema = proveedorBaseSchema.partial();

export const filterProveedorSchema = z.object({
  nombre: z.string().optional(),
  email: z.string().optional(),
  cuit: z.string().optional(),
  search: z.string().optional(),
});

export const proveedorIdSchema = z.object({
  id: z.coerce.number().int().positive("ID de proveedor inválido"),
});

export const validateProveedorIdentity = (nombre: string, cuit?: string) => {
  const errors: string[] = [];

  if (!nombre.trim()) {
    errors.push("Nombre de proveedor requerido");
  }

  if (cuit && cuit.trim().length < 8) {
    errors.push("CUIT demasiado corto");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export type ProveedorCreate = z.infer<typeof createProveedorSchema>;
export type ProveedorUpdate = z.infer<typeof updateProveedorSchema>;
export type ProveedorFilter = z.infer<typeof filterProveedorSchema>;
export type ProveedorId = z.infer<typeof proveedorIdSchema>;
