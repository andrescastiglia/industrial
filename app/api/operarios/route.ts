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
      "/api/operarios",
      user,
      "Listar todos los operarios"
    );

    const client = await pool.connect();

    const result = await client.query(`
      SELECT operario_id, nombre, apellido, rol FROM Operarios
      ORDER BY apellido, nombre
    `);

    client.release();

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching operarios:", error);
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
    const { nombre, apellido, rol } = body;

    logApiOperation(
      "POST",
      "/api/operarios",
      user,
      "Crear nuevo operario",
      `${nombre} ${apellido}`
    );

    const client = await pool.connect();

    const result = await client.query(
      `
      INSERT INTO Operarios (nombre, apellido, rol)
      VALUES ($1, $2, $3)
      RETURNING *
    `,
      [nombre, apellido, rol]
    );

    client.release();

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("Error creating operario:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
