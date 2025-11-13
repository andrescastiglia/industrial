/**
 * OpenTelemetry Configuration
 *
 * Configuración de telemetría para Next.js
 * - Traces automáticos de HTTP, PostgreSQL, Express
 * - Exportación a formato OTLP (compatible con Jaeger, Grafana, DataDog)
 * - Solo errores críticos en producción (similar a configuración anterior de Sentry)
 */

import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_DEPLOYMENT_ENVIRONMENT,
} from "@opentelemetry/semantic-conventions";

const isProduction = process.env.NODE_ENV === "production";
const isDevelopment = process.env.NODE_ENV === "development";

// Configuración del servicio
const resource = Resource.default().merge(
  new Resource({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || "industrial-maese",
    [ATTR_SERVICE_VERSION]: "0.1.0",
    [ATTR_DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || "development",
  })
);

// Exportador de traces
// En desarrollo: localhost (Jaeger local)
// En producción: configurar OTEL_EXPORTER_OTLP_ENDPOINT en .env
const traceExporter = new OTLPTraceExporter({
  url:
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
    (isDevelopment ? "http://localhost:4318/v1/traces" : undefined),
  headers: process.env.OTEL_EXPORTER_OTLP_HEADERS
    ? JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS)
    : {},
});

// SDK con instrumentación automática
const sdk = new NodeSDK({
  resource,
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      // File system - deshabilitado (genera mucho ruido)
      "@opentelemetry/instrumentation-fs": {
        enabled: false,
      },
      // DNS - deshabilitado
      "@opentelemetry/instrumentation-dns": {
        enabled: false,
      },
      // HTTP - habilitado (APIs y fetches)
      "@opentelemetry/instrumentation-http": {
        enabled: !process.env.NODE_ENV || process.env.NODE_ENV !== "test",
        // Filtrar requests innecesarios
        ignoreIncomingRequestHook: (req) => {
          const url = req.url || "";
          // Ignorar health checks, assets estáticos
          return (
            url.includes("/_next/") ||
            url.includes("/favicon.ico") ||
            url.includes("/health")
          );
        },
      },
      // PostgreSQL - habilitado
      "@opentelemetry/instrumentation-pg": {
        enabled: true,
      },
      // Express - habilitado
      "@opentelemetry/instrumentation-express": {
        enabled: true,
      },
    }),
  ],
});

// Inicializar SDK
if (process.env.NODE_ENV !== "test") {
  sdk
    .start()
    .then(() => {
      if (isDevelopment) {
        console.log("[OpenTelemetry] ✓ Tracing initialized");
        console.log(
          "[OpenTelemetry] Service:",
          process.env.OTEL_SERVICE_NAME || "industrial-maese"
        );
        console.log(
          "[OpenTelemetry] Endpoint:",
          process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
            "http://localhost:4318/v1/traces"
        );
      }
    })
    .catch((error) => {
      console.error("[OpenTelemetry] ✗ Error initializing:", error);
    });

  // Graceful shutdown
  process.on("SIGTERM", () => {
    sdk
      .shutdown()
      .then(() => {
        if (isDevelopment) {
          console.log("[OpenTelemetry] ✓ Shutdown complete");
        }
      })
      .catch((error) =>
        console.error("[OpenTelemetry] ✗ Error during shutdown:", error)
      )
      .finally(() => process.exit(0));
  });
}

export default sdk;
