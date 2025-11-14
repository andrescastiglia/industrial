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
        enabled: true,
        // Filtrar requests innecesarios
        ignoreIncomingRequestHook: (req) => {
          const url = req.url || "";
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
          const url = req.url || "";
          if (url.includes("/api/")) {
            span.setAttribute("http.route", url.split("?")[0]);
          }
        },
      },
      // PostgreSQL - solo INSERT/UPDATE/DELETE (no SELECT)
      "@opentelemetry/instrumentation-pg": {
        enabled: true,
        // Filtrar queries de lectura (SELECT)
        requireParentSpan: false,
        responseHook: (span, responseInfo) => {
          // Obtener el statement del span
          const statement = span.attributes["db.statement"] as string;
          if (statement) {
            const upperStatement = statement.trim().toUpperCase();
            // Si es SELECT, terminar el span inmediatamente sin enviarlo
            if (upperStatement.startsWith("SELECT")) {
              span.end();
              return;
            }
          }
        },
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
      // Fetch API - habilitado para APIs externas
      "@opentelemetry/instrumentation-fetch": {
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
