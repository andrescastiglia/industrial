import { type NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";
import {
  authenticateApiRequest,
  checkApiPermission,
  logApiOperation,
} from "@/lib/api-auth";

export async function GET(
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
    const permissionError = checkApiPermission(user, "read:all");
    if (permissionError) return permissionError;

    logApiOperation(
      "GET",
      `/api/operarios/${params.id}`,
      user,
      "Obtener operario"
    );

    const client = await pool.connect();

    const result = await client.query(
      "SELECT operario_id, nombre, apellido, rol FROM Operarios WHERE operario_id = $1",
      [params.id]
    );

    client.release();

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Operario no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching operario:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const permissionError = checkApiPermission(user, "write:all");
    if (permissionError) return permissionError;

    const body = await request.json();
    const { nombre, apellido, rol } = body;

    logApiOperation(
      "PUT",
      `/api/operarios/${params.id}`,
      user,
      "Actualizar operario",
      `${nombre} ${apellido}`
    );

    const client = await pool.connect();

    const result = await client.query(
      `
      UPDATE Operarios SET
        nombre = $1,
        apellido = $2,
        rol = $3
      WHERE operario_id = $4
      RETURNING *
    `,
      [nombre, apellido, rol, params.id]
    );

    client.release();

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Operario no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating operario:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

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
      `/api/operarios/${params.id}`,
      user,
      "Eliminar operario"
    );
    const client = await pool.connect();

    const result = await client.query(
      "DELETE FROM Operarios WHERE operario_id = $1 RETURNING *",
      [params.id]
    );

    client.release();

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Operario no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Operario eliminado correctamente" });
  } catch (error) {
    console.error("Error deleting operario:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
