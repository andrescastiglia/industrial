/**
 * Operario validation schemas
 * Comprehensive validation for worker/operator data
 */

import { z } from "zod";
import {
  emailSchema,
  phoneSchema,
  shortTextSchema,
  mediumTextSchema,
  positiveDecimalSchema,
  statusEnum,
  dateSchema,
  pastDateSchema,
} from "./common";

// ==================== Enums ====================

export const operarioTurnoEnum = z.enum(
  ["mañana", "tarde", "noche", "rotativo"],
  {
    message: "Turno inválido",
  }
);

export const operarioEspecialidadEnum = z.enum(
  [
    "general",
    "soldadura",
    "mecanizado",
    "ensamblaje",
    "pintura",
    "control_calidad",
  ],
  { message: "Especialidad inválida" }
);

// ==================== Base Schema ====================

export const operarioBaseSchema = z.object({
  nombre: shortTextSchema.max(150, "Máximo 150 caracteres"),

  email: emailSchema,

  telefono: phoneSchema,

  direccion: mediumTextSchema.optional().or(z.literal("")),

  numero_documento: shortTextSchema
    .max(20, "Máximo 20 caracteres")
    .regex(/^[0-9]+$/, "Solo números permitidos"),

  fecha_ingreso: pastDateSchema,

  salario: positiveDecimalSchema.max(99999999.99, "Salario demasiado alto"),

  turno: operarioTurnoEnum.default("mañana"),

  especialidad: operarioEspecialidadEnum.default("general"),

  estado: statusEnum.default("activo"),

  notas: z
    .string()
    .max(1000, "Máximo 1000 caracteres")
    .trim()
    .optional()
    .or(z.literal("")),
});

// ==================== Create Schema ====================

/**
 * Schema for creating a new operario
 * All required fields must be present
 */
export const createOperarioSchema = operarioBaseSchema;

// ==================== Update Schema ====================

/**
 * Schema for updating an existing operario
 * All fields are optional (partial update support)
 */
export const updateOperarioSchema = operarioBaseSchema.partial();

// ==================== Query Schemas ====================

/**
 * Schema for filtering operarios
 */
export const filterOperarioSchema = z.object({
  nombre: z.string().optional(),
  turno: operarioTurnoEnum.optional(),
  especialidad: operarioEspecialidadEnum.optional(),
  estado: statusEnum.optional(),
  search: z.string().optional(),
});

/**
 * Schema for operario ID parameter
 */
export const operarioIdSchema = z.object({
  id: z.coerce.number().int().positive("ID de operario inválido"),
});

// ==================== Business Logic Validation ====================

/**
 * Validate that operario can be assigned to production order
 */
export const validateOperarioAvailability = (estado: string, turno: string) => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (estado !== "activo") {
    errors.push(`Operario no activo (estado: ${estado})`);
  }

  const now = new Date();
  const hour = now.getHours();

  // Check if operario's shift matches current time
  if (turno === "mañana" && (hour < 6 || hour >= 14)) {
    warnings.push("Operario asignado a turno de mañana (6:00 - 14:00)");
  } else if (turno === "tarde" && (hour < 14 || hour >= 22)) {
    warnings.push("Operario asignado a turno de tarde (14:00 - 22:00)");
  } else if (turno === "noche" && hour >= 6 && hour < 22) {
    warnings.push("Operario asignado a turno de noche (22:00 - 6:00)");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Validate operario seniority and experience
 */
export const validateOperarioExperience = (fechaIngreso: Date) => {
  const warnings: string[] = [];

  const now = new Date();
  const monthsExperience =
    (now.getFullYear() - fechaIngreso.getFullYear()) * 12 +
    (now.getMonth() - fechaIngreso.getMonth());

  if (monthsExperience < 3) {
    warnings.push(
      `Operario con poca experiencia (${monthsExperience} meses). Supervisión recomendada`
    );
  }

  return {
    valid: true,
    errors: [],
    warnings,
    monthsExperience,
  };
};

// ==================== Types ====================

export type OperarioCreate = z.infer<typeof createOperarioSchema>;
export type OperarioUpdate = z.infer<typeof updateOperarioSchema>;
export type OperarioFilter = z.infer<typeof filterOperarioSchema>;
export type OperarioId = z.infer<typeof operarioIdSchema>;
export type OperarioTurno = z.infer<typeof operarioTurnoEnum>;
export type OperarioEspecialidad = z.infer<typeof operarioEspecialidadEnum>;
