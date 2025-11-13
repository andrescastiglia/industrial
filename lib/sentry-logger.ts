/**
 * Sentry Logger Utility
 *
 * Helper para usar Sentry de forma controlada:
 * - Solo errores críticos en producción
 * - Warnings opcionales
 * - Info/Debug solo en desarrollo
 */

import * as Sentry from "@sentry/nextjs";

type LogLevel = "debug" | "info" | "warning" | "error" | "fatal";

interface LogOptions {
  tags?: Record<string, string>;
  extra?: Record<string, any>;
  user?: {
    id: string;
    email?: string;
    username?: string;
  };
}

/**
 * Log controlado que respeta el entorno
 * - Producción: solo 'error' y 'fatal' se envían a Sentry
 * - Desarrollo: todo se loggea en consola, nada a Sentry
 */
export function logToSentry(
  level: LogLevel,
  message: string,
  error?: Error | unknown,
  options?: LogOptions
) {
  const isProduction = process.env.NODE_ENV === "production";
  const isDevelopment = process.env.NODE_ENV === "development";

  // En desarrollo, solo consola
  if (isDevelopment) {
    const logFn =
      level === "error" || level === "fatal" ? console.error : console.log;
    logFn(`[Sentry ${level.toUpperCase()}]`, message, error || "", options);
    return;
  }

  // En producción, filtrar por nivel
  switch (level) {
    case "fatal":
    case "error":
      // Siempre enviar errores críticos en producción
      if (error instanceof Error) {
        Sentry.captureException(error, {
          level: level,
          tags: options?.tags,
          extra: { message, ...options?.extra },
          user: options?.user,
        });
      } else {
        Sentry.captureMessage(message, {
          level: level,
          tags: options?.tags,
          extra: { error, ...options?.extra },
          user: options?.user,
        });
      }
      break;

    case "warning":
      // Warnings: solo si son críticos (definidos en tags)
      if (options?.tags?.severity === "high" || options?.tags?.critical) {
        Sentry.captureMessage(message, {
          level: "warning",
          tags: options.tags,
          extra: options.extra,
          user: options?.user,
        });
      } else {
        // Warning no crítico: solo consola en producción
        console.warn(`[Sentry Warning]`, message, options);
      }
      break;

    case "info":
    case "debug":
      // Info/Debug: NUNCA en producción, solo en testing
      if (process.env.NODE_ENV === "test") {
        console.log(`[Sentry ${level}]`, message, options);
      }
      break;
  }
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
  logToSentry(
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
  logToSentry(
    "error",
    "Database Error",
    error instanceof Error ? error : new Error(String(error)),
    {
      tags: {
        layer: "database",
        severity: "high",
      },
      extra: {
        query: query.substring(0, 500), // Limitar largo de query
        paramsCount: params?.length || 0,
      },
    }
  );
}

/**
 * Capturar error de autenticación (warning, no error crítico)
 */
export function captureAuthWarning(
  message: string,
  email?: string,
  extra?: Record<string, any>
) {
  logToSentry("warning", message, undefined, {
    tags: {
      layer: "auth",
      severity: "medium",
    },
    extra: {
      email: email ? email.substring(0, 3) + "***" : undefined, // Ocultar email
      ...extra,
    },
  });
}

/**
 * Log informativo (solo desarrollo/testing)
 */
export function logInfo(message: string, extra?: Record<string, any>) {
  logToSentry("info", message, undefined, { extra });
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
 * Establecer contexto de usuario para errores futuros
 */
export function setUserContext(user: {
  id: number;
  email: string;
  role?: string;
}) {
  if (process.env.NODE_ENV === "production") {
    Sentry.setUser({
      id: user.id.toString(),
      email: user.email,
      role: user.role,
    });
  }
}

/**
 * Limpiar contexto de usuario (logout)
 */
export function clearUserContext() {
  if (process.env.NODE_ENV === "production") {
    Sentry.setUser(null);
  }
}

/**
 * Agregar breadcrumb (rastro de eventos)
 * Solo en producción para errores futuros
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, any>
) {
  if (process.env.NODE_ENV === "production") {
    Sentry.addBreadcrumb({
      category,
      message,
      data,
      level: "info",
    });
  } else if (process.env.NODE_ENV === "development") {
    console.log(`[Breadcrumb] ${category}:`, message, data);
  }
}
