/**
 * OpenTelemetry Logger Utility
 *
 * Helper para usar OpenTelemetry de forma controlada:
 * - Traces de operaciones críticas
 * - Logs estructurados con spans
 * - Métricas de performance
 * - Solo en producción cuando configurado
 */

import {
  trace,
  SpanStatusCode,
  type Exception,
  type Span,
} from "@opentelemetry/api";

type LogLevel = "debug" | "info" | "warning" | "error" | "fatal";

interface LogOptions {
  tags?: Record<string, string | number | boolean>;
  extra?: Record<string, any>;
  user?: {
    id: string;
    email?: string;
    username?: string;
  };
}

const tracer = trace.getTracer("industrial-maese");

function isErrorLevel(level: LogLevel): boolean {
  return level === "error" || level === "fatal";
}

function logToConsole(
  level: LogLevel,
  message: string,
  error?: Error | unknown,
  options?: LogOptions
): void {
  const logFn = isErrorLevel(level) ? console.error : console.log;
  logFn(`[OTel ${level.toUpperCase()}]`, message, error || "", options);
}

function addSpanExtra(span: Span, extra?: Record<string, any>): void {
  if (!extra) {
    return;
  }

  Object.entries(extra).forEach(([key, value]) => {
    span.setAttribute(`extra.${key}`, JSON.stringify(value));
  });
}

function addSpanUser(span: Span, user?: LogOptions["user"]): void {
  if (!user) {
    return;
  }

  span.setAttribute("user.id", user.id);
  if (user.email) {
    span.setAttribute("user.email", user.email);
  }
}

function recordSpanError(
  span: Span,
  message: string,
  error?: Error | unknown
): void {
  if (error instanceof Error) {
    span.recordException(error as Exception);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
    return;
  }

  if (error) {
    span.recordException(String(error) as unknown as Exception);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: String(error),
    });
    return;
  }

  span.setStatus({
    code: SpanStatusCode.ERROR,
    message,
  });
}

function logErrorSpan(
  level: LogLevel,
  message: string,
  error?: Error | unknown,
  options?: LogOptions
): void {
  const span = tracer.startSpan(`error.${message}`, {
    attributes: {
      "error.level": level,
      "error.message": message,
      ...options?.tags,
    },
  });

  recordSpanError(span, message, error);
  addSpanExtra(span, options?.extra);
  addSpanUser(span, options?.user);
  span.end();
}

function logHighSeverityWarning(message: string, options?: LogOptions): void {
  const span = tracer.startSpan(`warning.${message}`, {
    attributes: {
      "warning.level": "high",
      "warning.message": message,
      ...options?.tags,
    },
  });

  span.end();
}

/**
 * Log controlado que respeta el entorno
 * - Producción: genera spans y traces en OpenTelemetry
 * - Desarrollo: log en consola, traces opcionales
 */
export function logToOtel(
  level: LogLevel,
  message: string,
  error?: Error | unknown,
  options?: LogOptions
) {
  if (process.env.NODE_ENV === "development") {
    logToConsole(level, message, error, options);
    return;
  }

  if (isErrorLevel(level)) {
    logErrorSpan(level, message, error, options);
    return;
  }

  if (level === "warning" && options?.tags?.severity === "high") {
    logHighSeverityWarning(message, options);
  }
}

/**
 * Crear un span para operación con traces automáticos
 */
export function withTrace<T>(
  name: string,
  operation: (span: Span) => T | Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  return tracer.startActiveSpan(name, { attributes }, async (span) => {
    try {
      const result = await Promise.resolve(operation(span));
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error as Exception);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Capturar error con contexto de API
 */
export function captureApiError(
  error: Error | unknown,
  endpoint: string,
  method: string,
  userId?: number,
  extra?: Record<string, any>
) {
  logToOtel(
    "error",
    `API Error: ${method} ${endpoint}`,
    error instanceof Error ? error : new Error(String(error)),
    {
      tags: {
        endpoint,
        method,
        layer: "api",
      },
      extra: {
        userId,
        ...extra,
      },
      user: userId
        ? {
            id: userId.toString(),
          }
        : undefined,
    }
  );
}

/**
 * Capturar error de base de datos
 */
export function captureDatabaseError(
  error: Error | unknown,
  query: string,
  params?: any[]
) {
  logToOtel(
    "error",
    "Database Error",
    error instanceof Error ? error : new Error(String(error)),
    {
      tags: {
        layer: "database",
        severity: "high",
      },
      extra: {
        query: query.substring(0, 500),
        paramsCount: params?.length || 0,
      },
    }
  );
}

/**
 * Capturar error de autenticación (warning)
 */
export function captureAuthWarning(
  message: string,
  email?: string,
  extra?: Record<string, any>
) {
  logToOtel("warning", message, undefined, {
    tags: {
      layer: "auth",
      severity: "medium",
    },
    extra: {
      email: email ? email.substring(0, 3) + "***" : undefined,
      ...extra,
    },
  });
}

/**
 * Log informativo (solo desarrollo/testing)
 */
export function logInfo(message: string, extra?: Record<string, any>) {
  logToOtel("info", message, undefined, { extra });
}

/**
 * Log de debug (solo desarrollo)
 */
export function logDebug(message: string, data?: any) {
  if (process.env.NODE_ENV === "development") {
    console.log(`[Debug]`, message, data);
  }
}

/**
 * Establecer contexto de usuario (almacenar en contexto de trace)
 */
export function setUserContext(user: {
  id: number;
  email: string;
  role?: string;
}) {
  if (process.env.NODE_ENV === "production") {
    const span = trace.getActiveSpan();
    if (span) {
      span.setAttribute("user.id", user.id.toString());
      span.setAttribute("user.email", user.email);
      if (user.role) {
        span.setAttribute("user.role", user.role);
      }
    }
  }
}

/**
 * Limpiar contexto de usuario
 */
export function clearUserContext() {
  // En OpenTelemetry, el contexto se limpia automáticamente
  // al finalizar el span activo
  if (process.env.NODE_ENV === "development") {
    console.log("[OTel] User context cleared");
  }
}

/**
 * Agregar evento al span activo (equivalente a breadcrumb)
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, any>
) {
  if (process.env.NODE_ENV === "production") {
    const span = trace.getActiveSpan();
    if (span) {
      span.addEvent(`${category}: ${message}`, data);
    }
  } else if (process.env.NODE_ENV === "development") {
    console.log(`[Breadcrumb] ${category}:`, message, data);
  }
}
