/**
 * Ejemplo de uso de Sentry Logger en API Routes
 *
 * Este archivo muestra cómo usar el logger optimizado de Sentry
 * para capturar solo errores críticos en producción.
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest, checkApiPermission } from "@/lib/api-auth";
import { pool } from "@/lib/database";
import {
  captureApiError,
  captureDatabaseError,
  addBreadcrumb,
  logDebug,
} from "@/lib/sentry-logger";

export const dynamic = "force-dynamic";

/**
 * Ejemplo: GET /api/ejemplo
 *
 * Muestra cómo usar Sentry de forma optimizada:
 * - Solo errores críticos van a Sentry en producción
 * - Debug/Info solo en desarrollo
 * - Warnings solo si son críticos
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

    // 3. Debug log (solo desarrollo, no va a Sentry)
    logDebug("Fetching data for user", {
      userId: auth.user.userId,
      email: auth.user.email,
    });

    // 4. Agregar breadcrumb (rastro para errores futuros)
    addBreadcrumb("api.request", "User fetching data", {
      endpoint: "/api/ejemplo",
      userId: auth.user.userId,
    });

    // 5. Consulta a base de datos
    const client = await pool.connect();
    try {
      const result = await client.query("SELECT * FROM tabla WHERE id = $1", [
        1,
      ]);

      // Debug: resultado obtenido (solo desarrollo)
      logDebug("Query result", { rowCount: result.rowCount });

      return NextResponse.json(result.rows, { status: 200 });
    } catch (dbError) {
      // ❌ ERROR CRÍTICO: Capturar error de base de datos
      // Este SÍ se envía a Sentry en producción
      captureDatabaseError(dbError, "SELECT * FROM tabla WHERE id = $1", [1]);

      return NextResponse.json(
        { error: "Error al consultar datos" },
        { status: 500 }
      );
    } finally {
      client.release();
    }
  } catch (error) {
    // ❌ ERROR CRÍTICO: Capturar error general de API
    // Este SÍ se envía a Sentry en producción
    captureApiError(error, "/api/ejemplo", "GET", auth?.user?.userId, {
      additionalContext: "Error inesperado en endpoint",
    });

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * Ejemplo: POST /api/ejemplo
 *
 * Muestra manejo de errores de validación (NO van a Sentry)
 */
export async function POST(request: NextRequest) {
  let auth: ReturnType<typeof authenticateApiRequest> | undefined;

  try {
    auth = authenticateApiRequest(request);
    if (auth.error) {
      return NextResponse.json(auth.error, { status: auth.error.statusCode });
    }

    const body = await request.json();

    // Validación: estos errores NO van a Sentry (son esperados)
    if (!body.nombre) {
      // ⚠️ NO enviar a Sentry: error de validación esperado
      logDebug("Validation error: missing nombre");
      return NextResponse.json(
        { error: "El nombre es requerido" },
        { status: 400 }
      );
    }

    // Breadcrumb antes de operación crítica
    addBreadcrumb("api.validation", "Data validated", {
      nombre: body.nombre,
    });

    // Lógica de negocio...
    const client = await pool.connect();
    try {
      const result = await client.query(
        "INSERT INTO tabla (nombre) VALUES ($1) RETURNING *",
        [body.nombre]
      );

      return NextResponse.json(result.rows[0], { status: 201 });
    } catch (dbError) {
      // ❌ ERROR CRÍTICO: fallo en inserción
      captureDatabaseError(dbError, "INSERT INTO tabla (nombre) VALUES ($1)", [
        body.nombre,
      ]);

      return NextResponse.json(
        { error: "Error al crear registro" },
        { status: 500 }
      );
    } finally {
      client.release();
    }
  } catch (error) {
    // ❌ ERROR CRÍTICO
    captureApiError(error, "/api/ejemplo", "POST", auth?.user?.userId);

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * RESUMEN DE USO:
 *
 * ✅ SÍ enviar a Sentry (producción):
 *    - captureApiError() → Errores inesperados en API
 *    - captureDatabaseError() → Errores de base de datos
 *    - Errores no controlados (throw)
 *
 * ❌ NO enviar a Sentry:
 *    - Errores de validación (400)
 *    - Errores de autenticación (401)
 *    - Errores de permisos (403)
 *    - Errores de "not found" (404)
 *    - logDebug() → Solo consola en desarrollo
 *    - logInfo() → Solo testing
 *
 * 📊 Breadcrumbs:
 *    - addBreadcrumb() → Rastro de eventos para contexto
 *    - Se incluyen automáticamente cuando hay error
 */
