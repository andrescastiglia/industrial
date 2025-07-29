import { type NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";

export async function GET() {
  try {
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
    const body = await request.json();
    const { nombre_tipo } = body;

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
