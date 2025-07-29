import { type NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await pool.connect();

    const result = await client.query(
      "SELECT proveedor_id, nombre, contacto, direccion, telefono, email, cuit FROM Proveedores WHERE proveedor_id = $1",
      [params.id]
    );

    client.release();

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Proveedor no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching proveedor:", error);
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
    const body = await request.json();
    const { nombre, contacto, direccion, telefono, email, cuit } = body;

    const client = await pool.connect();

    const result = await client.query(
      `
      UPDATE Proveedores SET
        nombre = $1,
        contacto = $2,
        direccion = $3,
        telefono = $4,
        email = $5,
        cuit = $6
      WHERE proveedor_id = $7
      RETURNING *
    `,
      [nombre, contacto, direccion, telefono, email, cuit, params.id]
    );

    client.release();

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Proveedor no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating proveedor:", error);
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
    const client = await pool.connect();

    const result = await client.query(
      "DELETE FROM Proveedores WHERE proveedor_id = $1 RETURNING *",
      [params.id]
    );

    client.release();

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Proveedor no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Proveedor eliminado correctamente" });
  } catch (error) {
    console.error("Error deleting proveedor:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
