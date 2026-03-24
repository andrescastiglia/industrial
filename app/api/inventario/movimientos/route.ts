import { type NextRequest, NextResponse } from "next/server";

import { pool } from "@/lib/database";

import {
  authenticateApiRequest,
  checkApiPermission,
  logApiOperation,
} from "@/lib/api-auth";
import { withTrace, captureApiError } from "@/lib/otel-logger";

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest) {
  let auth: ReturnType<typeof authenticateApiRequest> | undefined;
  let materia_prima_id: number | undefined;
  let cantidad: number | undefined;

  return withTrace("PUT /api/inventario/movimientos", async (span) => {
    try {
      // Autenticar usuario
      auth = authenticateApiRequest(request);

      if (auth.user) {
        span?.setAttribute("user.id", auth.user.userId);
        span?.setAttribute("user.role", auth.user.role);
      }
      if (auth.error) {
        return NextResponse.json(auth.error, { status: auth.error.statusCode });
      }
      const { user } = auth;

      // Verificar permisos
      const permissionError = checkApiPermission(user, "write:all");
      if (permissionError) return permissionError;

      const body = await request.json();
      ({ materia_prima_id, cantidad } = body);

      logApiOperation(
        "PUT",
        "/api/inventario/movimientos",
        user,
        "Registrar movimiento de inventario",
        `materia_prima_id: ${materia_prima_id}`
      );

      const client = await pool.connect();

      // Actualizar stock según tipo de movimiento
      const result = await client.query(
        "UPDATE materia_prima SET stock_actual = $2 WHERE materia_prima_id = $1 RETURNING *",
        [materia_prima_id, cantidad]
      );

      client.release();

      if (result.rows.length === 0) {
        if (materia_prima_id !== undefined) {
          span?.setAttribute("inventory.materia_prima_id", materia_prima_id);
        }
        span?.setAttribute("inventory.found", false);
        return NextResponse.json(
          { error: "materia_prima no encontrada" },
          { status: 404 }
        );
      }

      if (materia_prima_id !== undefined) {
        span?.setAttribute("inventory.materia_prima_id", materia_prima_id);
      }
      if (cantidad !== undefined) {
        span?.setAttribute("inventory.updated_stock", cantidad);
      }
      span?.setAttribute("inventory.success", true);
      span?.setAttribute("db.operation", "UPDATE");

      return NextResponse.json(result.rows[0]);
    } catch (error) {
      console.error("Error updating materia_prima:", error);
      captureApiError(
        error,
          "/api/inventario/movimientos",
          "PUT",
          auth?.user?.userId,
          { materia_prima_id, cantidad }
      );
      return NextResponse.json(
        { error: "Error interno del servidor" },
        { status: 500 }
      );
    }
  });
}
