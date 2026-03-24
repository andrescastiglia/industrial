/**
 * OpenTelemetry Configuration
 *
 * Configuración de telemetría para Next.js
 * - Traces automáticos de HTTP, PostgreSQL, Express
 * - Exportación a formato OTLP (compatible con Jaeger, Grafana, DataDog)
 * - Solo errores críticos en producción (similar a configuración anterior)
 */

import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

const isProduction = process.env.NODE_ENV === "production";
const isDevelopment = process.env.NODE_ENV === "development";

// Configuración del servicio
const resource = resourceFromAttributes({
  [SEMRESATTRS_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || "industrial-maese",
  [SEMRESATTRS_SERVICE_VERSION]: "0.1.0",
  [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]:
    process.env.NODE_ENV || "development",
});

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
        enabled: true,
        // Filtrar requests innecesarios
        ignoreIncomingRequestHook: (req) => {
          const url = "url" in req && typeof req.url === "string" ? req.url : "";
          // Ignorar health checks, assets estáticos, y archivos Next.js
          return (
            url.includes("/_next/") ||
            url.includes("/favicon.ico") ||
            url.includes("/health") ||
            url.includes("/__nextjs") ||
            url.includes(".well-known")
          );
        },
        // Agregar atributos personalizados
        requestHook: (span, req) => {
          const url = "url" in req && typeof req.url === "string" ? req.url : "";
          if (url.includes("/api/")) {
            span.setAttribute("http.route", url.split("?")[0]);
          }
        },
      },
      // PostgreSQL - solo INSERT/UPDATE/DELETE (no SELECT)
      "@opentelemetry/instrumentation-pg": {
        enabled: true,
        requireParentSpan: false,
        // Agregar información de la query
        requestHook: (span, queryConfig) => {
          if (queryConfig && typeof queryConfig === "object") {
            const text = (queryConfig as any).text || "";
            if (text) {
              const upperText = text.trim().toUpperCase();

              // Solo tracear INSERT, UPDATE, DELETE, ALTER, DROP, CREATE
              if (
                !upperText.startsWith("INSERT") &&
                !upperText.startsWith("UPDATE") &&
                !upperText.startsWith("DELETE") &&
                !upperText.startsWith("ALTER") &&
                !upperText.startsWith("DROP") &&
                !upperText.startsWith("CREATE")
              ) {
                // Marcar span para no enviarlo
                span.setAttribute("otel.skip", true);
                return;
              }

              // Limitar longitud de queries muy largas
              span.setAttribute(
                "db.statement",
                text.length > 500 ? text.substring(0, 500) + "..." : text
              );

              // Agregar tipo de operación
              if (upperText.startsWith("INSERT")) {
                span.setAttribute("db.operation", "INSERT");
              } else if (upperText.startsWith("UPDATE")) {
                span.setAttribute("db.operation", "UPDATE");
              } else if (upperText.startsWith("DELETE")) {
                span.setAttribute("db.operation", "DELETE");
              }
            }
          }
        },
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
  try {
    sdk.start();

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
  } catch (error) {
    console.error("[OpenTelemetry] ✗ Error initializing:", error);
  }

  // Graceful shutdown
  process.on("SIGTERM", () => {
    void sdk
      .shutdown()
      .then(() => {
        if (isDevelopment) {
          console.log("[OpenTelemetry] ✓ Shutdown complete");
        }
      })
      .catch((error: unknown) =>
        console.error("[OpenTelemetry] ✗ Error during shutdown:", error)
      )
      .finally(() => process.exit(0));
  });
}

export default sdk;
