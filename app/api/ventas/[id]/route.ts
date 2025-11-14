import { type NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";
import {
  authenticateApiRequest,
  checkApiPermission,
  logApiOperation,
} from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Autenticar usuario
    const auth = authenticateApiRequest(request);
    if (auth.error) {
      return NextResponse.json(auth.error, { status: auth.error.statusCode });
    }
    const { user } = auth;

    // Verificar permisos
    const permissionError = checkApiPermission(user, "delete:all");
    if (permissionError) return permissionError;

    logApiOperation(
      "DELETE",
      `/api/ventas/${params.id}`,
      user,
      "Eliminar venta"
    );

    const client = await pool.connect();

    const result = await client.query(
      "DELETE FROM Ordenes_Venta WHERE orden_venta_id = $1 RETURNING *",
      [params.id]
    );

    client.release();

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Venta no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Venta eliminada correctamente" });
  } catch (error) {
    console.error("Error deleting venta:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
