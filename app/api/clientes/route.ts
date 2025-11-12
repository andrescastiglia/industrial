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

    logApiOperation("GET", "/api/clientes", user, "Listar todos los clientes");

    const client = await pool.connect();

    const result = await client.query(`
      SELECT cliente_id, nombre, contacto, direccion, telefono, email FROM Clientes
      ORDER BY nombre
    `);

    client.release();

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching clientes:", error);
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
    const { nombre, contacto, direccion, telefono, email } = body;

    logApiOperation(
      "POST",
      "/api/clientes",
      user,
      "Crear nuevo cliente",
      `${nombre}`
    );

    const client = await pool.connect();

    const result = await client.query(
      `
      INSERT INTO Clientes (nombre, contacto, direccion, telefono, email)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
      [nombre, contacto, direccion, telefono, email]
    );

    client.release();

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("Error creating cliente:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
