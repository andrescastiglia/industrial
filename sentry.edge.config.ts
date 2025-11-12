/**
 * Sentry Edge Configuration
 *
 * Configuración de Sentry para Edge Runtime (Middleware, Edge Functions)
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // DSN de Sentry
  dsn: process.env.SENTRY_DSN,

  // Entorno actual
  environment: process.env.NODE_ENV || "development",

  // Release tracking
  release: process.env.APP_VERSION || "unknown",

  // Tasa de muestreo - Edge runtime tiene límites más estrictos
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.5 : 1.0,

  // Filtrar errores
  ignoreErrors: [
    // Errores de timeout comunes en edge
    "TimeoutError",
    "Request timeout",
  ],

  // beforeSend para edge runtime
  beforeSend(event, hint) {
    // En desarrollo, no enviar
    if (process.env.NODE_ENV === "development") {
      console.error("Sentry Edge Event:", event);
      return null;
    }

    // Limpiar datos sensibles
    if (event.request?.headers) {
      delete event.request.headers["authorization"];
      delete event.request.headers["cookie"];
    }

    return event;
  },

  // Tags para edge runtime
  initialScope: {
    tags: {
      runtime: "edge",
    },
  },
});
