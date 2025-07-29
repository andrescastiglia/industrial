import { type NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";

export async function GET() {
  try {
    const client = await pool.connect();

    const result = await client.query(`
      SELECT producto_id, nombre_modelo, descripcion, ancho, alto, color, tipo_accionamiento FROM Productos
      ORDER BY nombre_modelo
    `);

    client.release();

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching productos:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      nombre_modelo,
      descripcion,
      ancho,
      alto,
      color,
      tipo_accionamiento,
    } = body;

    const client = await pool.connect();

    const result = await client.query(
      `
      INSERT INTO Productos (
        nombre_modelo, descripcion, ancho, alto, color, tipo_accionamiento
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
      [nombre_modelo, descripcion, ancho, alto, color, tipo_accionamiento]
    );

    client.release();

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("Error creating producto:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
