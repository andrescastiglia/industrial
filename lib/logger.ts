/**
 * Sistema de Logging con Winston
 *
 * Configuración de logging estructurado con múltiples transportes,
 * niveles de severidad, rotación de archivos, y formato consistente.
 */

import winston from "winston";
import path from "path";

// ============================================================================
// Tipos y Configuración
// ============================================================================

export type LogLevel = "error" | "warn" | "info" | "http" | "debug";

export interface LogMetadata {
  userId?: string;
  requestId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  ip?: string;
  userAgent?: string;
  error?: {
    code?: string;
    message?: string;
    stack?: string;
  };
  [key: string]: any;
}

// ============================================================================
// Formato de Logs
// ============================================================================

/**
 * Formato para desarrollo - más legible en consola
 */
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = "";
    if (Object.keys(meta).length > 0) {
      metaStr = `\n${JSON.stringify(meta, null, 2)}`;
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

/**
 * Formato para producción - JSON estructurado
 */
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// ============================================================================
// Configuración de Transportes
// ============================================================================

/**
 * Obtiene los transportes según el entorno
 */
function getTransports(): winston.transport[] {
  const transports: winston.transport[] = [];

  // Consola siempre activa
  transports.push(
    new winston.transports.Console({
      format: process.env.NODE_ENV === "production" ? prodFormat : devFormat,
    })
  );

  // En producción, agregar transportes de archivo
  if (process.env.NODE_ENV === "production") {
    const logsDir = process.env.LOGS_DIR || path.join(process.cwd(), "logs");

    // Archivo para todos los logs
    transports.push(
      new winston.transports.File({
        filename: path.join(logsDir, "combined.log"),
        format: prodFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 14, // Mantener 14 días
        tailable: true,
      })
    );

    // Archivo solo para errores
    transports.push(
      new winston.transports.File({
        filename: path.join(logsDir, "error.log"),
        level: "error",
        format: prodFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 30, // Mantener 30 días de errores
        tailable: true,
      })
    );

    // Archivo solo para warnings
    transports.push(
      new winston.transports.File({
        filename: path.join(logsDir, "warn.log"),
        level: "warn",
        format: prodFormat,
        maxsize: 5 * 1024 * 1024, // 5MB
        maxFiles: 14,
        tailable: true,
      })
    );
  }

  return transports;
}

// ============================================================================
// Instancia del Logger
// ============================================================================

const logger = winston.createLogger({
  level:
    process.env.LOG_LEVEL ||
    (process.env.NODE_ENV === "production" ? "info" : "debug"),
  levels: winston.config.npm.levels,
  transports: getTransports(),
  exitOnError: false,

  // Evitar logs duplicados
  silent: process.env.NODE_ENV === "test",
});

// ============================================================================
// Métodos de Logging Mejorados
// ============================================================================

/**
 * Clase Logger con métodos mejorados y contexto
 */
class Logger {
  private context?: string;

  constructor(context?: string) {
    this.context = context;
  }

  /**
   * Crea un logger con contexto específico
   */
  child(context: string): Logger {
    return new Logger(context);
  }

  /**
   * Log de error
   */
  error(message: string, meta?: LogMetadata): void {
    logger.error(message, this.addContext(meta));
  }

  /**
   * Log de warning
   */
  warn(message: string, meta?: LogMetadata): void {
    logger.warn(message, this.addContext(meta));
  }

  /**
   * Log de información
   */
  info(message: string, meta?: LogMetadata): void {
    logger.info(message, this.addContext(meta));
  }

  /**
   * Log de HTTP requests
   */
  http(message: string, meta?: LogMetadata): void {
    logger.http(message, this.addContext(meta));
  }

  /**
   * Log de debug
   */
  debug(message: string, meta?: LogMetadata): void {
    logger.debug(message, this.addContext(meta));
  }

  /**
   * Log de inicio de request
   */
  logRequest(
    req: {
      method?: string;
      url?: string;
      headers?: { [key: string]: string | string[] | undefined };
    },
    meta?: LogMetadata
  ): void {
    const url = req.url || "";
    const method = req.method || "UNKNOWN";
    const userAgent = req.headers?.["user-agent"] || "unknown";

    this.http(`${method} ${url}`, {
      ...meta,
      method,
      path: url,
      userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
    });
  }

  /**
   * Log de respuesta de request
   */
  logResponse(
    req: { method?: string; url?: string },
    statusCode: number,
    duration: number,
    meta?: LogMetadata
  ): void {
    const url = req.url || "";
    const method = req.method || "UNKNOWN";
    const level =
      statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";

    const logMessage = `${method} ${url} ${statusCode} - ${duration}ms`;

    logger.log(
      level,
      logMessage,
      this.addContext({
        ...meta,
        method,
        path: url,
        statusCode,
        duration,
      })
    );
  }

  /**
   * Log de error con objeto Error
   */
  logError(error: Error, meta?: LogMetadata): void {
    this.error(error.message, {
      ...meta,
      error: {
        message: error.message,
        stack: error.stack,
        ...((error as any).code && { code: (error as any).code }),
      },
    });
  }

  /**
   * Log de operación de base de datos
   */
  logDatabase(operation: string, duration: number, meta?: LogMetadata): void {
    const message = `DB ${operation} - ${duration}ms`;

    if (duration > 1000) {
      this.warn(message, { ...meta, duration, operation, slow: true });
    } else {
      this.debug(message, { ...meta, duration, operation });
    }
  }

  /**
   * Log de autenticación
   */
  logAuth(
    action:
      | "login"
      | "logout"
      | "token_refresh"
      | "token_expired"
      | "unauthorized",
    userId?: string,
    meta?: LogMetadata
  ): void {
    const level =
      action === "unauthorized" || action === "token_expired" ? "warn" : "info";

    logger.log(
      level,
      `Auth: ${action}`,
      this.addContext({
        ...meta,
        userId,
        action,
      })
    );
  }

  /**
   * Log de operación de negocio importante
   */
  logBusinessEvent(
    event: string,
    details: Record<string, any>,
    meta?: LogMetadata
  ): void {
    this.info(`Business Event: ${event}`, {
      ...meta,
      event,
      ...details,
    });
  }

  /**
   * Agrega contexto a los metadatos
   */
  private addContext(meta?: LogMetadata): LogMetadata {
    return {
      ...meta,
      ...(this.context && { context: this.context }),
    };
  }
}

// ============================================================================
// Middleware para Next.js
// ============================================================================

/**
 * Middleware para logging automático de requests
 *
 * Uso en API routes:
 * ```typescript
 * export async function GET(request: Request) {
 *   const startTime = Date.now();
 *   appLogger.logRequest(request);
 *
 *   try {
 *     // ... tu lógica
 *     const duration = Date.now() - startTime;
 *     appLogger.logResponse(request, 200, duration);
 *     return response;
 *   } catch (error) {
 *     const duration = Date.now() - startTime;
 *     appLogger.logResponse(request, 500, duration);
 *     throw error;
 *   }
 * }
 * ```
 */
export function createRequestLogger(context: string = "API") {
  return new Logger(context);
}

/**
 * Helper para medir duración de operaciones
 */
export class PerformanceTimer {
  private startTime: number;
  private logger: Logger;
  private operation: string;

  constructor(operation: string, logger: Logger) {
    this.operation = operation;
    this.logger = logger;
    this.startTime = Date.now();
  }

  /**
   * Finaliza el timer y registra la duración
   */
  end(meta?: LogMetadata): number {
    const duration = Date.now() - this.startTime;
    this.logger.debug(`${this.operation} completed`, {
      ...meta,
      duration,
      operation: this.operation,
    });
    return duration;
  }

  /**
   * Finaliza el timer como operación de base de datos
   */
  endDb(meta?: LogMetadata): number {
    const duration = Date.now() - this.startTime;
    this.logger.logDatabase(this.operation, duration, meta);
    return duration;
  }
}

// ============================================================================
// Instancias Pre-configuradas
// ============================================================================

/**
 * Logger principal de la aplicación
 */
export const appLogger = new Logger("App");

/**
 * Logger para operaciones de API
 */
export const apiLogger = new Logger("API");

/**
 * Logger para operaciones de base de datos
 */
export const dbLogger = new Logger("Database");

/**
 * Logger para autenticación
 */
export const authLogger = new Logger("Auth");

/**
 * Logger para operaciones de negocio
 */
export const businessLogger = new Logger("Business");

// ============================================================================
// Exportaciones
// ============================================================================

export default logger;
export { Logger };

/**
 * Helper para crear un timer de performance
 */
export function startTimer(
  operation: string,
  logger: Logger = appLogger
): PerformanceTimer {
  return new PerformanceTimer(operation, logger);
}

/**
 * Wrapper para operaciones asíncronas con logging automático
 */
export async function withLogging<T>(
  operation: string,
  fn: () => Promise<T>,
  logger: Logger = appLogger,
  meta?: LogMetadata
): Promise<T> {
  const timer = startTimer(operation, logger);

  try {
    const result = await fn();
    timer.end(meta);
    return result;
  } catch (error) {
    const duration = timer.end(meta);
    logger.logError(error as Error, {
      ...meta,
      operation,
      duration,
      failed: true,
    });
    throw error;
  }
}
