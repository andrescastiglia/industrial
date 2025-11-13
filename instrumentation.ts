/**
 * OpenTelemetry Instrumentation for Next.js
 *
 * Este archivo se ejecuta automáticamente por Next.js
 * Configura telemetría para monitoreo de la aplicación
 */

export async function register() {
  // Solo inicializar en Node.js runtime (server-side)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Importar configuración de OpenTelemetry
    await import("./lib/telemetry/otel.config");
  }
}
