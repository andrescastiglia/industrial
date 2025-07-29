import { type NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await pool.connect();

    const result = await client.query(
      "DELETE FROM Ventas WHERE venta_id = $1 RETURNING *",
      [params.id]
    );

    client.release();

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Venta no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Venta eliminada correctamente" });
  } catch (error) {
    console.error("Error deleting venta:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
