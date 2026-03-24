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
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

const isProduction = process.env.NODE_ENV === "production";
const isDevelopment = process.env.NODE_ENV === "development";
const ATTR_DEPLOYMENT_ENVIRONMENT = "deployment.environment";

function getRequestUrl(req: unknown): string {
  if (typeof req !== "object" || req === null || !("url" in req)) {
    return "";
  }

  return typeof req.url === "string" ? req.url : "";
}

function shouldIgnoreIncomingRequest(url: string): boolean {
  return (
    url.includes("/_next/") ||
    url.includes("/favicon.ico") ||
    url.includes("/health") ||
    url.includes("/__nextjs") ||
    url.includes(".well-known")
  );
}

function getMutationOperation(statement: string): string | null {
  const operations = ["INSERT", "UPDATE", "DELETE", "ALTER", "DROP", "CREATE"];
  const matchedOperation = operations.find((operation) =>
    statement.startsWith(operation)
  );

  return matchedOperation || null;
}

function truncateStatement(statement: string): string {
  return statement.length > 500
    ? `${statement.substring(0, 500)}...`
    : statement;
}

function annotateDatabaseSpan(span: any, queryConfig: unknown): void {
  if (typeof queryConfig !== "object" || queryConfig === null) {
    return;
  }

  const text =
    "text" in queryConfig && typeof queryConfig.text === "string"
      ? queryConfig.text
      : "";

  if (!text) {
    return;
  }

  const normalizedStatement = text.trim().toUpperCase();
  const operation = getMutationOperation(normalizedStatement);

  if (!operation) {
    span.setAttribute("otel.skip", true);
    return;
  }

  span.setAttribute("db.statement", truncateStatement(text));
  span.setAttribute("db.operation", operation);
}

// Configuración del servicio
const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || "industrial-maese",
  [ATTR_SERVICE_VERSION]: "0.1.0",
  [ATTR_DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || "development",
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
        ignoreIncomingRequestHook: (req) => {
          return shouldIgnoreIncomingRequest(getRequestUrl(req));
        },
        requestHook: (span, req) => {
          const url = getRequestUrl(req);
          if (url.includes("/api/")) {
            span.setAttribute("http.route", url.split("?")[0]);
          }
        },
      },
      // PostgreSQL - solo INSERT/UPDATE/DELETE (no SELECT)
      "@opentelemetry/instrumentation-pg": {
        enabled: true,
        requireParentSpan: false,
        requestHook: (span, queryConfig) => {
          annotateDatabaseSpan(span, queryConfig);
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
