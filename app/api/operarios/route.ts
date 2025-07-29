import { type NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";

export async function GET() {
  try {
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
    const body = await request.json();
    const { nombre, apellido, rol } = body;

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
