/**
 * API Validation Middleware
 * Centralized request validation using Zod schemas
 */

import { NextRequest, NextResponse } from "next/server";
import { z, ZodError, ZodSchema } from "zod";

// ==================== Types ====================

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

// ==================== Error Formatting ====================

/**
 * Format Zod errors into a user-friendly structure
 */
export function formatZodErrors(error: ZodError): ValidationError[] {
  return error.issues.map((err) => ({
    field: err.path.join("."),
    message: err.message,
  }));
}

/**
 * Create standardized validation error response
 */
export function createValidationErrorResponse(
  errors: ValidationError[],
  message: string = "Errores de validación"
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
      validation_errors: errors,
    },
    { status: 400 }
  );
}

// ==================== Validation Functions ====================

/**
 * Validate request body against a Zod schema
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json();
    const validatedData = schema.parse(body);

    return {
      success: true,
      data: validatedData,
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        errors: formatZodErrors(error),
      };
    }

    return {
      success: false,
      errors: [
        {
          field: "body",
          message: "Error al parsear el cuerpo de la solicitud",
        },
      ],
    };
  }
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQueryParams<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): ValidationResult<T> {
  try {
    const { searchParams } = new URL(request.url);
    const params: Record<string, string> = {};

    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    const validatedData = schema.parse(params);

    return {
      success: true,
      data: validatedData,
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        errors: formatZodErrors(error),
      };
    }

    return {
      success: false,
      errors: [
        {
          field: "query",
          message: "Error al validar parámetros de consulta",
        },
      ],
    };
  }
}

/**
 * Validate path parameters against a Zod schema
 */
export function validatePathParams<T>(
  params: any,
  schema: ZodSchema<T>
): ValidationResult<T> {
  try {
    const validatedData = schema.parse(params);

    return {
      success: true,
      data: validatedData,
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        errors: formatZodErrors(error),
      };
    }

    return {
      success: false,
      errors: [
        {
          field: "params",
          message: "Error al validar parámetros de ruta",
        },
      ],
    };
  }
}

// ==================== Input Sanitization ====================

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>'"]/g, "") // Remove potentially dangerous characters
    .replace(/\s+/g, " "); // Normalize whitespace
}

/**
 * Sanitize HTML by stripping all tags
 */
export function sanitizeHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

/**
 * Recursively sanitize all string values in an object
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj };

  for (const key in sanitized) {
    if (typeof sanitized[key] === "string") {
      sanitized[key] = sanitizeString(sanitized[key]) as any;
    } else if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
      sanitized[key] = sanitizeObject(sanitized[key]);
    }
  }

  return sanitized;
}

// ==================== Combined Validation Middleware ====================

/**
 * Complete request validation helper
 * Validates body, query params, and path params in one call
 */
export async function validateRequest<TBody = any, TQuery = any, TParams = any>(
  request: NextRequest,
  options: {
    bodySchema?: ZodSchema<TBody>;
    querySchema?: ZodSchema<TQuery>;
    paramsSchema?: ZodSchema<TParams>;
    params?: any;
    sanitize?: boolean;
  }
): Promise<{
  success: boolean;
  data?: {
    body?: TBody;
    query?: TQuery;
    params?: TParams;
  };
  errors?: ValidationError[];
  response?: NextResponse;
}> {
  const errors: ValidationError[] = [];
  const data: any = {};

  // Validate body
  if (options.bodySchema) {
    const bodyResult = await validateRequestBody(request, options.bodySchema);
    if (!bodyResult.success) {
      errors.push(...(bodyResult.errors || []));
    } else {
      data.body = options.sanitize
        ? sanitizeObject(bodyResult.data as any)
        : bodyResult.data;
    }
  }

  // Validate query params
  if (options.querySchema) {
    const queryResult = validateQueryParams(request, options.querySchema);
    if (!queryResult.success) {
      errors.push(...(queryResult.errors || []));
    } else {
      data.query = queryResult.data;
    }
  }

  // Validate path params
  if (options.paramsSchema && options.params) {
    const paramsResult = validatePathParams(
      options.params,
      options.paramsSchema
    );
    if (!paramsResult.success) {
      errors.push(...(paramsResult.errors || []));
    } else {
      data.params = paramsResult.data;
    }
  }

  // Return error response if validation failed
  if (errors.length > 0) {
    return {
      success: false,
      errors,
      response: createValidationErrorResponse(errors),
    };
  }

  return {
    success: true,
    data,
  };
}

// ==================== Validation Helpers ====================

/**
 * Check if a numeric value is within range
 */
export function isInRange(
  value: number,
  min: number,
  max: number
): { valid: boolean; error?: string } {
  if (value < min) {
    return { valid: false, error: `Valor debe ser al menos ${min}` };
  }
  if (value > max) {
    return { valid: false, error: `Valor no puede ser mayor a ${max}` };
  }
  return { valid: true };
}

/**
 * Check if a date is within range
 */
export function isDateInRange(
  date: Date,
  minDate?: Date,
  maxDate?: Date
): { valid: boolean; error?: string } {
  if (minDate && date < minDate) {
    return {
      valid: false,
      error: `Fecha debe ser posterior a ${minDate.toLocaleDateString()}`,
    };
  }
  if (maxDate && date > maxDate) {
    return {
      valid: false,
      error: `Fecha debe ser anterior a ${maxDate.toLocaleDateString()}`,
    };
  }
  return { valid: true };
}

/**
 * Validate that an array has at least one item
 */
export function hasMinItems<T>(
  array: T[],
  min: number = 1
): { valid: boolean; error?: string } {
  if (array.length < min) {
    return {
      valid: false,
      error: `Debe incluir al menos ${min} elemento(s)`,
    };
  }
  return { valid: true };
}

/**
 * Validate that an array doesn't exceed max items
 */
export function hasMaxItems<T>(
  array: T[],
  max: number
): { valid: boolean; error?: string } {
  if (array.length > max) {
    return {
      valid: false,
      error: `No puede incluir más de ${max} elemento(s)`,
    };
  }
  return { valid: true };
}

// ==================== SQL Injection Prevention ====================

/**
 * Check for potential SQL injection patterns
 * Note: This is a basic check. Always use parameterized queries!
 */
export function hasSqlInjectionPattern(input: string): boolean {
  const sqlPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i, // SQL comment
    /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i, // SQL injection
    /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i, // SQL injection 'or'
    /((\%27)|(\'))union/i, // UNION injection
    /exec(\s|\+)+(s|x)p\w+/i, // Stored procedure exec
  ];

  return sqlPatterns.some((pattern) => pattern.test(input));
}

/**
 * Validate input for SQL injection attempts
 */
export function validateAgainstSqlInjection(input: string): {
  valid: boolean;
  error?: string;
} {
  if (hasSqlInjectionPattern(input)) {
    return {
      valid: false,
      error: "Entrada contiene patrones no permitidos",
    };
  }
  return { valid: true };
}
