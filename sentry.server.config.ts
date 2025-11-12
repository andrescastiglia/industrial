/**
 * Sentry Server Configuration
 *
 * Configuración de Sentry para el servidor (Node.js)
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // DSN de Sentry - debe configurarse en variables de entorno
  dsn: process.env.SENTRY_DSN,

  // Entorno actual
  environment: process.env.NODE_ENV || "development",

  // Release tracking
  release: process.env.APP_VERSION || "unknown",

  // Tasa de muestreo de errores (100% en servidor)
  tracesSampleRate: 1.0,

  // Tasa de muestreo de transacciones
  // Reducir en producción para controlar costos
  // profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Filtrar errores conocidos
  ignoreErrors: [
    // Errores de conexión que no son críticos
    "ECONNRESET",
    "ECONNREFUSED",
    "ETIMEDOUT",

    // Errores de cliente (ya capturados en client)
    "Bad Request",
    "Unauthorized",
  ],

  // Configuración de breadcrumbs
  beforeBreadcrumb(breadcrumb, hint) {
    // Filtrar breadcrumbs de SQL queries en producción
    if (
      breadcrumb.category === "query" &&
      process.env.NODE_ENV === "production"
    ) {
      // Mantener la categoría pero remover el query completo
      if (breadcrumb.data?.query) {
        breadcrumb.data.query = "[REDACTED]";
      }
    }

    return breadcrumb;
  },

  // Configuración de eventos antes de enviar
  beforeSend(event, hint) {
    // En desarrollo, solo log a consola
    if (process.env.NODE_ENV === "development") {
      console.error("Sentry Server Event:", event);
      console.error("Original Error:", hint.originalException);
      return null;
    }

    // Filtrar información sensible del servidor
    if (event.request) {
      // Remover headers sensibles
      if (event.request.headers) {
        delete event.request.headers["authorization"];
        delete event.request.headers["cookie"];
        delete event.request.headers["x-api-key"];
      }

      // Remover datos sensibles del body
      if (event.request.data) {
        const data =
          typeof event.request.data === "string"
            ? JSON.parse(event.request.data)
            : event.request.data;

        if (data.password) data.password = "***";
        if (data.token) data.token = "***";
        if (data.apiKey) data.apiKey = "***";

        event.request.data = JSON.stringify(data);
      }
    }

    // Agregar contexto del servidor
    if (event.extra) {
      event.extra.nodeVersion = process.version;
      event.extra.platform = process.platform;
      event.extra.memory = process.memoryUsage();
    }

    // Clasificar errores operacionales vs programación
    const error = hint.originalException as any;
    if (error?.isOperational) {
      event.tags = {
        ...event.tags,
        errorType: "operational",
      };
      // Los errores operacionales son menos críticos
      event.level = "warning";
    } else {
      event.tags = {
        ...event.tags,
        errorType: "programming",
      };
      // Los errores de programación son críticos
      event.level = "error";
    }

    return event;
  },

  // Configurar tags globales
  initialScope: {
    tags: {
      runtime: "node",
    },
  },

  // Integración con tracing de performance
  integrations: [
    // Captura queries de base de datos
    // new Sentry.Integrations.Postgres(),
    // Captura requests HTTP salientes
    // new Sentry.Integrations.Http({ tracing: true }),
  ],
});
