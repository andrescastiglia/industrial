/**
 * Sistema Centralizado de Manejo de Errores
 *
 * Proporciona clases de error estandarizadas, códigos consistentes y
 * formateo uniforme de respuestas de error para toda la aplicación.
 */

// ============================================================================
// Códigos de Error Estandarizados
// ============================================================================

export const ERROR_CODES = {
  // Errores de Autenticación (AUTH_xxx)
  AUTH_001: "AUTH_001", // Token inválido o expirado
  AUTH_002: "AUTH_002", // Credenciales inválidas
  AUTH_003: "AUTH_003", // Token no proporcionado
  AUTH_004: "AUTH_004", // Permisos insuficientes
  AUTH_005: "AUTH_005", // Sesión expirada
  AUTH_006: "AUTH_006", // Usuario no encontrado

  // Errores de Validación (VAL_xxx)
  VAL_001: "VAL_001", // Datos de entrada inválidos
  VAL_002: "VAL_002", // Campo requerido faltante
  VAL_003: "VAL_003", // Formato inválido
  VAL_004: "VAL_004", // Valor fuera de rango
  VAL_005: "VAL_005", // Violación de regla de negocio
  VAL_006: "VAL_006", // Valor duplicado (unicidad)
  VAL_007: "VAL_007", // Referencia inválida (FK)
  VAL_008: "VAL_008", // Stock insuficiente

  // Errores de Base de Datos (DB_xxx)
  DB_001: "DB_001", // Error de conexión
  DB_002: "DB_002", // Violación de constraint
  DB_003: "DB_003", // Timeout de query
  DB_004: "DB_004", // Registro no encontrado
  DB_005: "DB_005", // Violación de integridad referencial
  DB_006: "DB_006", // Error de transacción
  DB_007: "DB_007", // Error de deadlock

  // Errores de Recursos (RES_xxx)
  RES_001: "RES_001", // Recurso no encontrado
  RES_002: "RES_002", // Recurso ya existe
  RES_003: "RES_003", // Recurso en uso (no se puede eliminar)
  RES_004: "RES_004", // Límite de recursos excedido

  // Errores de Sistema (SYS_xxx)
  SYS_001: "SYS_001", // Error interno del servidor
  SYS_002: "SYS_002", // Servicio no disponible
  SYS_003: "SYS_003", // Configuración inválida
  SYS_004: "SYS_004", // Dependencia externa falló
  SYS_005: "SYS_005", // Operación no implementada

  // Errores de Negocio (BIZ_xxx)
  BIZ_001: "BIZ_001", // Operación no permitida en estado actual
  BIZ_002: "BIZ_002", // Límite de operación excedido
  BIZ_003: "BIZ_003", // Conflicto de operación concurrente
  BIZ_004: "BIZ_004", // Prerrequisito no cumplido
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// ============================================================================
// Interfaces
// ============================================================================

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  statusCode: number;
  details?: Record<string, any>;
  stack?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
    path?: string;
  };
}

// ============================================================================
// Clase Base: ApiError
// ============================================================================

export class ApiError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, any>;
  public readonly isOperational: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    details?: Record<string, any>,
    isOperational: boolean = true
  ) {
    super(message);

    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;

    // Mantiene el stack trace correcto
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): ErrorDetails {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      stack: process.env.NODE_ENV === "development" ? this.stack : undefined,
    };
  }
}

// ============================================================================
// Errores Especializados
// ============================================================================

/**
 * Errores de Autenticación y Autorización
 */
export class AuthenticationError extends ApiError {
  constructor(
    message: string = "Error de autenticación",
    code: ErrorCode = ERROR_CODES.AUTH_001,
    details?: Record<string, any>
  ) {
    super(code, message, 401, details);
  }
}

export class AuthorizationError extends ApiError {
  constructor(
    message: string = "Permisos insuficientes",
    code: ErrorCode = ERROR_CODES.AUTH_004,
    details?: Record<string, any>
  ) {
    super(code, message, 403, details);
  }
}

/**
 * Errores de Validación
 */
export class ValidationError extends ApiError {
  constructor(
    message: string = "Error de validación",
    code: ErrorCode = ERROR_CODES.VAL_001,
    details?: Record<string, any>
  ) {
    super(code, message, 400, details);
  }
}

/**
 * Errores de Recursos (Not Found, Already Exists, etc.)
 */
export class NotFoundError extends ApiError {
  constructor(
    resource: string = "Recurso",
    code: ErrorCode = ERROR_CODES.RES_001,
    details?: Record<string, any>
  ) {
    super(code, `${resource} no encontrado`, 404, details);
  }
}

export class ConflictError extends ApiError {
  constructor(
    message: string = "El recurso ya existe",
    code: ErrorCode = ERROR_CODES.RES_002,
    details?: Record<string, any>
  ) {
    super(code, message, 409, details);
  }
}

export class ResourceInUseError extends ApiError {
  constructor(
    resource: string = "Recurso",
    code: ErrorCode = ERROR_CODES.RES_003,
    details?: Record<string, any>
  ) {
    super(
      code,
      `${resource} está en uso y no puede ser eliminado`,
      409,
      details
    );
  }
}

/**
 * Errores de Base de Datos
 */
export class DatabaseError extends ApiError {
  constructor(
    message: string = "Error de base de datos",
    code: ErrorCode = ERROR_CODES.DB_001,
    details?: Record<string, any>
  ) {
    super(code, message, 500, details, false); // No operacional
  }
}

/**
 * Errores de Negocio
 */
export class BusinessError extends ApiError {
  constructor(
    message: string,
    code: ErrorCode = ERROR_CODES.BIZ_001,
    details?: Record<string, any>
  ) {
    super(code, message, 422, details);
  }
}

/**
 * Errores de Sistema
 */
export class SystemError extends ApiError {
  constructor(
    message: string = "Error interno del servidor",
    code: ErrorCode = ERROR_CODES.SYS_001,
    details?: Record<string, any>
  ) {
    super(code, message, 500, details, false); // No operacional
  }
}

// ============================================================================
// Funciones de Utilidad
// ============================================================================

/**
 * Crea una respuesta de error estandarizada para APIs
 */
export function createErrorResponse(
  error: Error | ApiError,
  path?: string
): ApiErrorResponse {
  const timestamp = new Date().toISOString();

  // Si es un ApiError, usar sus propiedades
  if (error instanceof ApiError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp,
        path,
      },
    };
  }

  // Error genérico - tratarlo como error interno
  return {
    success: false,
    error: {
      code: ERROR_CODES.SYS_001,
      message:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Error interno del servidor",
      details:
        process.env.NODE_ENV === "development"
          ? { originalError: error.message, stack: error.stack }
          : undefined,
      timestamp,
      path,
    },
  };
}

/**
 * Determina si un error es operacional (esperado) o de programación
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof ApiError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Convierte errores de base de datos PostgreSQL a ApiError
 */
export function mapDatabaseError(error: any): ApiError {
  // Error de constraint único
  if (error.code === "23505") {
    const match = error.detail?.match(/Key \(([^)]+)\)/);
    const field = match ? match[1] : "campo";
    return new ConflictError(
      `El valor del campo ${field} ya existe`,
      ERROR_CODES.VAL_006,
      { field, constraint: error.constraint }
    );
  }

  // Error de violación de FK
  if (error.code === "23503") {
    const match = error.detail?.match(/Key \(([^)]+)\)/);
    const field = match ? match[1] : "campo";
    return new ValidationError(
      `Referencia inválida en ${field}`,
      ERROR_CODES.VAL_007,
      { field, constraint: error.constraint }
    );
  }

  // Error de violación de not null
  if (error.code === "23502") {
    const field = error.column || "campo";
    return new ValidationError(
      `El campo ${field} es requerido`,
      ERROR_CODES.VAL_002,
      { field }
    );
  }

  // Error de check constraint
  if (error.code === "23514") {
    return new ValidationError(
      "Violación de regla de validación",
      ERROR_CODES.VAL_005,
      { constraint: error.constraint }
    );
  }

  // Error de conexión
  if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
    return new DatabaseError(
      "No se puede conectar a la base de datos",
      ERROR_CODES.DB_001,
      { originalError: error.message }
    );
  }

  // Error de timeout
  if (error.code === "ETIMEDOUT" || error.message?.includes("timeout")) {
    return new DatabaseError(
      "Timeout de consulta a base de datos",
      ERROR_CODES.DB_003,
      { originalError: error.message }
    );
  }

  // Error de deadlock
  if (error.code === "40P01") {
    return new DatabaseError(
      "Conflicto de concurrencia detectado",
      ERROR_CODES.DB_007,
      { originalError: error.message }
    );
  }

  // Error genérico de base de datos
  return new DatabaseError(
    process.env.NODE_ENV === "development"
      ? error.message
      : "Error al procesar la operación de base de datos",
    ERROR_CODES.DB_001,
    process.env.NODE_ENV === "development"
      ? { originalError: error.message, code: error.code }
      : undefined
  );
}

/**
 * Maneja errores de forma segura en route handlers de Next.js
 *
 * Uso:
 * ```typescript
 * export async function GET(request: Request) {
 *   return handleApiError(async () => {
 *     // Tu lógica aquí
 *     const data = await fetchData();
 *     return NextResponse.json({ success: true, data });
 *   }, request);
 * }
 * ```
 */
export async function handleApiError<T>(
  handler: () => Promise<T>,
  request?: Request
): Promise<T> {
  try {
    return await handler();
  } catch (error: any) {
    // Convertir errores de base de datos
    if (error.code && error.code.startsWith("2")) {
      // Códigos PostgreSQL
      const dbError = mapDatabaseError(error);
      const errorResponse = createErrorResponse(
        dbError,
        request ? new URL(request.url).pathname : undefined
      );

      const { NextResponse } = await import("next/server");
      return NextResponse.json(errorResponse, {
        status: dbError.statusCode,
      }) as T;
    }

    // Manejar ApiError
    if (error instanceof ApiError) {
      const errorResponse = createErrorResponse(
        error,
        request ? new URL(request.url).pathname : undefined
      );

      const { NextResponse } = await import("next/server");
      return NextResponse.json(errorResponse, {
        status: error.statusCode,
      }) as T;
    }

    // Error desconocido
    const systemError = new SystemError(
      process.env.NODE_ENV === "development"
        ? error.message
        : "Error interno del servidor",
      ERROR_CODES.SYS_001,
      process.env.NODE_ENV === "development"
        ? { originalError: error.message, stack: error.stack }
        : undefined
    );

    const errorResponse = createErrorResponse(
      systemError,
      request ? new URL(request.url).pathname : undefined
    );

    const { NextResponse } = await import("next/server");
    return NextResponse.json(errorResponse, {
      status: 500,
    }) as T;
  }
}

// ============================================================================
// Helpers para Casos Comunes
// ============================================================================

/**
 * Lanza un error si el recurso no existe
 */
export function assertExists<T>(
  value: T | null | undefined,
  resource: string = "Recurso",
  code: ErrorCode = ERROR_CODES.RES_001
): asserts value is T {
  if (value === null || value === undefined) {
    throw new NotFoundError(resource, code);
  }
}

/**
 * Valida que el usuario tenga un permiso específico
 */
export function assertPermission(
  hasPermission: boolean,
  message: string = "No tienes permisos para realizar esta acción"
): void {
  if (!hasPermission) {
    throw new AuthorizationError(message);
  }
}

/**
 * Valida una condición de negocio
 */
export function assertBusinessRule(
  condition: boolean,
  message: string,
  code: ErrorCode = ERROR_CODES.BIZ_001,
  details?: Record<string, any>
): void {
  if (!condition) {
    throw new BusinessError(message, code, details);
  }
}
