/**
 * Sentry Client Configuration
 *
 * Configuración de Sentry para el cliente (browser)
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // DSN de Sentry - debe configurarse en variables de entorno
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Entorno actual
  environment: process.env.NODE_ENV || "development",

  // Release tracking - útil para sourcemaps y rollback
  release: process.env.NEXT_PUBLIC_APP_VERSION || "unknown",

  // Tasa de muestreo de errores (100% = todos los errores)
  tracesSampleRate: 1.0,

  // Tasa de muestreo de transacciones de performance
  // En producción, considera reducir a 0.1 (10%) para reducir costos
  replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Tasa de muestreo cuando ocurre un error (sesiones con errores)
  replaysOnErrorSampleRate: 1.0,

  // Habilitar replay de sesiones para debugging visual
  integrations: [
    Sentry.replayIntegration({
      // Máscara de datos sensibles
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Filtrar errores conocidos y benignos
  ignoreErrors: [
    // Errores de red comunes
    "Network request failed",
    "NetworkError",
    "Failed to fetch",

    // Errores de navegador
    "ResizeObserver loop limit exceeded",
    "Non-Error promise rejection captured",

    // Errores de extensiones del navegador
    /extensions\//i,
    /^chrome:\/\//i,
    /^moz-extension:\/\//i,
  ],

  // Configuración de breadcrumbs (rastro de eventos)
  beforeBreadcrumb(breadcrumb, hint) {
    // Filtrar breadcrumbs de consola en producción
    if (
      breadcrumb.category === "console" &&
      process.env.NODE_ENV === "production"
    ) {
      return null;
    }

    // Máscara de datos sensibles en URLs
    if (breadcrumb.data?.url) {
      breadcrumb.data.url = breadcrumb.data.url.replace(
        /token=[^&]+/g,
        "token=***"
      );
      breadcrumb.data.url = breadcrumb.data.url.replace(
        /password=[^&]+/g,
        "password=***"
      );
    }

    return breadcrumb;
  },

  // Configuración de eventos antes de enviar
  beforeSend(event, hint) {
    // En desarrollo, solo log a consola
    if (process.env.NODE_ENV === "development") {
      console.error("Sentry Event:", event);
      console.error("Original Error:", hint.originalException);
      // No enviar a Sentry en desarrollo
      return null;
    }

    // Filtrar información sensible
    if (event.request) {
      // Remover headers sensibles
      if (event.request.headers) {
        delete event.request.headers["authorization"];
        delete event.request.headers["cookie"];
      }

      // Remover query params sensibles
      if (
        event.request.query_string &&
        typeof event.request.query_string === "string"
      ) {
        event.request.query_string = event.request.query_string
          .replace(/token=[^&]+/g, "token=***")
          .replace(/password=[^&]+/g, "password=***");
      }
    }

    // Agregar contexto adicional
    if (event.extra) {
      event.extra.userAgent = navigator.userAgent;
      event.extra.viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      };
    }

    return event;
  },

  // Configurar tags globales
  initialScope: {
    tags: {
      runtime: "browser",
    },
  },
});
