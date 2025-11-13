/**
 * Ejemplo de uso de OpenTelemetry en API Routes
 *
 * Este archivo muestra cómo usar OpenTelemetry para:
 * - Capturar errores críticos
 * - Crear traces de operaciones
 * - Agregar eventos (breadcrumbs)
 * - Debug logging
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest, checkApiPermission } from "@/lib/api-auth";
import { pool } from "@/lib/database";
import {
  captureApiError,
  captureDatabaseError,
  addBreadcrumb,
  logDebug,
  withTrace,
} from "@/lib/otel-logger";

export const dynamic = "force-dynamic";

/**
 * Ejemplo: GET /api/ejemplo-otel
 *
 * Muestra cómo usar OpenTelemetry de forma optimizada:
 * - Solo errores críticos generan spans
 * - Debug/Info solo en desarrollo
 * - Traces automáticos de operaciones
 */
export async function GET(request: NextRequest) {
  let auth: ReturnType<typeof authenticateApiRequest> | undefined;

  try {
    // 1. Autenticar usuario
    auth = authenticateApiRequest(request);
    if (auth.error) {
      return NextResponse.json(auth.error, { status: auth.error.statusCode });
    }

    // 2. Verificar permisos
    const permissionError = checkApiPermission(auth.user, "read:all");
    if (permissionError) return permissionError;

    // 3. Debug log (solo desarrollo, no genera spans)
    logDebug("Fetching data for user", {
      userId: auth.user.userId,
      email: auth.user.email,
    });

    // 4. Agregar evento al span activo
    addBreadcrumb("api.request", "User fetching data", {
      endpoint: "/api/ejemplo-otel",
      userId: auth.user.userId,
    });

    // 5. Operación con trace automático
    const data = await withTrace(
      "database.query.select",
      async () => {
        const client = await pool.connect();
        try {
          const result = await client.query("SELECT * FROM clientes LIMIT 10");
          return result.rows;
        } finally {
          client.release();
        }
      },
      {
        "db.system": "postgresql",
        "db.operation": "SELECT",
        "db.table": "clientes",
      }
    );

    // Debug: resultado obtenido (solo desarrollo)
    logDebug("Query result", { rowCount: data.length });

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    // ❌ ERROR CRÍTICO: Capturar error general de API
    // Este SÍ genera span en OpenTelemetry
    captureApiError(error, "/api/ejemplo-otel", "GET", auth?.user?.userId, {
      additionalContext: "Error inesperado en endpoint",
    });

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * Ejemplo: POST /api/ejemplo-otel
 *
 * Muestra manejo de errores de validación (NO generan spans)
 */
export async function POST(request: NextRequest) {
  let auth: ReturnType<typeof authenticateApiRequest> | undefined;

  try {
    auth = authenticateApiRequest(request);
    if (auth.error) {
      return NextResponse.json(auth.error, { status: auth.error.statusCode });
    }

    const body = await request.json();

    // Validación: estos errores NO generan spans (son esperados)
    if (!body.nombre) {
      // ⚠️ NO enviar a OpenTelemetry: error de validación esperado
      logDebug("Validation error: missing nombre");
      return NextResponse.json(
        { error: "El nombre es requerido" },
        { status: 400 }
      );
    }

    // Evento antes de operación crítica
    addBreadcrumb("api.validation", "Data validated", {
      nombre: body.nombre,
    });

    // Operación con trace
    const result = await withTrace(
      "database.insert.cliente",
      async () => {
        const client = await pool.connect();
        try {
          const res = await client.query(
            "INSERT INTO clientes (nombre) VALUES ($1) RETURNING *",
            [body.nombre]
          );
          return res.rows[0];
        } catch (dbError) {
          // ❌ ERROR CRÍTICO: fallo en inserción
          captureDatabaseError(
            dbError,
            "INSERT INTO clientes (nombre) VALUES ($1)",
            [body.nombre]
          );
          throw dbError;
        } finally {
          client.release();
        }
      },
      {
        "db.system": "postgresql",
        "db.operation": "INSERT",
        "db.table": "clientes",
      }
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    // ❌ ERROR CRÍTICO
    captureApiError(error, "/api/ejemplo-otel", "POST", auth?.user?.userId);

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * RESUMEN DE USO CON OPENTELEMETRY:
 *
 * ✅ SÍ genera spans (producción):
 *    - captureApiError() → Span de error en API
 *    - captureDatabaseError() → Span de error DB
 *    - withTrace() → Span de operación completa
 *    - Errores no controlados (throw)
 *
 * ❌ NO genera spans:
 *    - Errores de validación (400)
 *    - Errores de autenticación (401)
 *    - Errores de permisos (403)
 *    - Errores de "not found" (404)
 *    - logDebug() → Solo consola en desarrollo
 *    - logInfo() → Solo testing
 *
 * 📊 Eventos (equivalente a breadcrumbs):
 *    - addBreadcrumb() → Eventos en span activo
 *    - Se incluyen automáticamente en traces
 *
 * 🎯 Traces automáticos:
 *    - withTrace(name, operation, attributes)
 *    - Crea span parent para operación
 *    - Captura errores automáticamente
 *    - Agrega atributos personalizados
 */
