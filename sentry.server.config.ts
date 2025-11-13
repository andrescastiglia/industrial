// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://780f05a9110ceab70bc24ebf8f34e52e@o4510359007723520.ingest.us.sentry.io/4510359009886208",

  // Entorno
  environment: process.env.NODE_ENV || "development",

  // Tracing deshabilitado en producción (0%) para minimizar uso
  // Solo capturamos errores, no performance traces
  tracesSampleRate: 0,

  // Deshabilitar envío de logs automáticos
  // Solo enviaremos errores explícitos
  enableLogs: false,

  // NO enviar información personal (GDPR compliance)
  sendDefaultPii: false,

  // Filtrar eventos antes de enviar
  beforeSend(event, hint) {
    // En desarrollo/testing: no enviar nada a Sentry
    if (process.env.NODE_ENV !== "production") {
      console.error("[Sentry Server Debug]:", hint.originalException || event);
      return null;
    }

    // Solo enviar errores críticos (error o fatal)
    if (event.level && !["error", "fatal"].includes(event.level)) {
      return null; // Filtrar warnings, info, debug
    }

    // Filtrar información sensible de requests
    if (event.request) {
      delete event.request.headers;
      delete event.request.cookies;
    }

    return event;
  },

  // Ignorar errores comunes y benignos
  ignoreErrors: [
    "Network request failed",
    "Failed to fetch",
    "NetworkError",
    "Non-Error promise rejection",
  ],
});
