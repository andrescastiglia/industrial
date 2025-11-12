/**
 * Cliente validation schemas
 * Comprehensive validation for customer data
 */

import { z } from "zod";
import {
  emailSchema,
  phoneSchema,
  phoneOptionalSchema,
  nitSchema,
  nonEmptyStringSchema,
  shortTextSchema,
  mediumTextSchema,
  optionalTextSchema,
  statusEnum,
} from "./common";

// ==================== Base Schema ====================

export const clienteBaseSchema = z.object({
  nombre: shortTextSchema.max(150, "Máximo 150 caracteres"),

  email: emailSchema,

  telefono: phoneSchema,

  direccion: mediumTextSchema,

  nit: nitSchema.optional().or(z.literal("")),

  contacto: shortTextSchema
    .max(150, "Máximo 150 caracteres")
    .optional()
    .or(z.literal("")),

  telefono_contacto: phoneOptionalSchema,

  email_contacto: z
    .string()
    .email("Email inválido")
    .optional()
    .or(z.literal("")),

  notas: z
    .string()
    .max(1000, "Máximo 1000 caracteres")
    .trim()
    .optional()
    .or(z.literal("")),

  estado: statusEnum.default("activo"),
});

// ==================== Create Schema ====================

/**
 * Schema for creating a new cliente
 * All required fields must be present
 */
export const createClienteSchema = clienteBaseSchema;

// ==================== Update Schema ====================

/**
 * Schema for updating an existing cliente
 * All fields are optional (partial update support)
 */
export const updateClienteSchema = clienteBaseSchema.partial();

// ==================== Query Schemas ====================

/**
 * Schema for filtering clientes
 */
export const filterClienteSchema = z.object({
  nombre: z.string().optional(),
  email: z.string().optional(),
  estado: statusEnum.optional(),
  search: z.string().optional(), // General search term
});

/**
 * Schema for cliente ID parameter
 */
export const clienteIdSchema = z.object({
  id: z.coerce.number().int().positive("ID de cliente inválido"),
});

// ==================== Business Logic Validation ====================

/**
 * Validate that cliente has required information for invoicing
 */
export const validateClienteForInvoicing = (
  cliente: z.infer<typeof clienteBaseSchema>
) => {
  const errors: string[] = [];

  if (!cliente.nit || cliente.nit.trim() === "") {
    errors.push("NIT es requerido para facturación");
  }

  if (!cliente.direccion || cliente.direccion.trim() === "") {
    errors.push("Dirección es requerida para facturación");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// ==================== Types ====================

export type ClienteCreate = z.infer<typeof createClienteSchema>;
export type ClienteUpdate = z.infer<typeof updateClienteSchema>;
export type ClienteFilter = z.infer<typeof filterClienteSchema>;
export type ClienteId = z.infer<typeof clienteIdSchema>;
