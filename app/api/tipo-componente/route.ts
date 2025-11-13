import { type NextRequest, NextResponse } from "next/server";



import { pool } from "@/lib/database";

import {
  authenticateApiRequest,
  checkApiPermission,
  logApiOperation,
} from "@/lib/api-auth";

export const dynamic = 'force-dynamic';

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
      "/api/tipo-componente",
      user,
      "Listar tipos de componentes"
    );

    const client = await pool.connect();

    const result = await client.query(`
      SELECT tipo_componente_id, nombre_tipo FROM Tipo_Componente
      ORDER BY nombre_tipo
    `);

    client.release();

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching tipos componente:", error);
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
    const { nombre_tipo } = body;

    logApiOperation(
      "POST",
      "/api/tipo-componente",
      user,
      "Crear tipo de componente",
      nombre_tipo
    );

    const client = await pool.connect();

    const result = await client.query(
      `
      INSERT INTO Tipo_Componente (nombre_tipo)
      VALUES ($1)
      RETURNING *
    `,
      [nombre_tipo]
    );

    client.release();

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("Error creating tipo componente:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
