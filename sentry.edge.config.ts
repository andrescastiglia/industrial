// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://780f05a9110ceab70bc24ebf8f34e52e@o4510359007723520.ingest.us.sentry.io/4510359009886208",

  // Entorno
  environment: process.env.NODE_ENV || "development",

  // Sin tracing de performance (0%)
  tracesSampleRate: 0,

  // Deshabilitar logs automáticos
  enableLogs: false,

  // NO enviar información personal
  sendDefaultPii: false,

  // Filtrar eventos antes de enviar
  beforeSend(event, hint) {
    // En desarrollo/testing: no enviar nada
    if (process.env.NODE_ENV !== "production") {
      console.error("[Sentry Edge Debug]:", hint.originalException || event);
      return null;
    }

    // Solo errores críticos (error o fatal)
    if (event.level && !["error", "fatal"].includes(event.level)) {
      return null;
    }

    // Filtrar información sensible
    if (event.request) {
      delete event.request.headers;
      delete event.request.cookies;
    }

    return event;
  },

  // Ignorar errores comunes
  ignoreErrors: ["Network request failed", "Failed to fetch", "NetworkError"],
});
