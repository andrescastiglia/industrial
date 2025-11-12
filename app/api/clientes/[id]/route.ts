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
      `/api/clientes/${params.id}`,
      user,
      "Obtener cliente"
    );

    const client = await pool.connect();

    const result = await client.query(
      `
      SELECT cliente_id, nombre, contacto, direccion, telefono, email FROM Clientes
      WHERE cliente_id = $1
      ORDER BY nombre
    `,
      [params.id]
    );

    client.release();

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching cliente:", error);
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
    const { nombre, contacto, direccion, telefono, email } = body;

    logApiOperation(
      "PUT",
      `/api/clientes/${params.id}`,
      user,
      "Actualizar cliente",
      nombre
    );

    const client = await pool.connect();

    const result = await client.query(
      `
      UPDATE Clientes SET
        nombre = $1,
        contacto = $2,
        direccion = $3,
        telefono = $4,
        email = $5
      WHERE cliente_id = $6
      RETURNING *
    `,
      [nombre, contacto, direccion, telefono, email, params.id]
    );

    client.release();

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating cliente:", error);
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
      `/api/clientes/${params.id}`,
      user,
      "Eliminar cliente"
    );

    const client = await pool.connect();

    const result = await client.query(
      "DELETE FROM Clientes WHERE cliente_id = $1 RETURNING *",
      [params.id]
    );

    client.release();

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Cliente eliminado correctamente" });
  } catch (error) {
    console.error("Error deleting cliente:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
