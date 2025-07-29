import { type NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await pool.connect();

    const result = await client.query(
      "SELECT operario_id, nombre, apellido, rol FROM Operarios WHERE operario_id = $1",
      [params.id]
    );

    client.release();

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Operario no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching operario:", error);
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
    const { nombre, apellido, rol } = body;

    const client = await pool.connect();

    const result = await client.query(
      `
      UPDATE Operarios SET
        nombre = $1,
        apellido = $2,
        rol = $3
      WHERE operario_id = $4
      RETURNING *
    `,
      [nombre, apellido, rol, params.id]
    );

    client.release();

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Operario no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating operario:", error);
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
      "DELETE FROM Operarios WHERE operario_id = $1 RETURNING *",
      [params.id]
    );

    client.release();

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Operario no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Operario eliminado correctamente" });
  } catch (error) {
    console.error("Error deleting operario:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
