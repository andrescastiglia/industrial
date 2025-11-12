import { type NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";
import {
  authenticateApiRequest,
  checkApiPermission,
  logApiOperation,
} from "@/lib/api-auth";

export async function GET(request: NextRequest) {
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
      "/api/proveedores",
      user,
      "Listar todos los proveedores"
    );

    const client = await pool.connect();

    const result = await client.query(`
      SELECT proveedor_id, nombre, contacto, direccion, telefono, email, cuit FROM Proveedores
      ORDER BY nombre
    `);

    client.release();

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching proveedores:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    const { nombre, contacto, direccion, telefono, email, cuit } = body;

    logApiOperation(
      "POST",
      "/api/proveedores",
      user,
      "Crear nuevo proveedor",
      nombre
    );

    const client = await pool.connect();

    const result = await client.query(
      `
      INSERT INTO Proveedores (nombre, contacto, direccion, telefono, email, cuit)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
      [nombre, contacto, direccion, telefono, email, cuit]
    );

    client.release();

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("Error creating proveedor:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
