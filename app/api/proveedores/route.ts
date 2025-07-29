import { type NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";

export async function GET() {
  try {
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
    const body = await request.json();
    const { nombre, contacto, direccion, telefono, email, cuit } = body;

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
