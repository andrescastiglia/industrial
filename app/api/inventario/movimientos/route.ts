import { type NextRequest, NextResponse } from "next/server";



import { pool } from "@/lib/database";

import {
  authenticateApiRequest,
  checkApiPermission,
  logApiOperation,
} from "@/lib/api-auth";

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest) {
  try {
    // Autenticar usuario
    const auth = authenticateApiRequest(request);
    if (auth.error) {
      return NextResponse.json(auth.error, { status: auth.error.statusCode });
    }
    const { user } = auth;

    // Verificar permisos
    const permissionError = checkApiPermission(user, "write:all");
    if (permissionError) return permissionError;

    const body = await request.json();
    const { materia_prima_id, cantidad } = body;

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
      return NextResponse.json(
        { error: "materia_prima no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating materia_prima:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
