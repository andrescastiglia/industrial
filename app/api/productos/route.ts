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
      componentes = [],
    } = body;

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Crear producto
      const result = await client.query(
        `
        INSERT INTO Productos (
          nombre_modelo, descripcion, ancho, alto, color, tipo_accionamiento
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
        [nombre_modelo, descripcion, ancho, alto, color, tipo_accionamiento]
      );

      const nuevoProducto = result.rows[0];

      // Insertar componentes si los hay
      for (const componente of componentes) {
        await client.query(
          `
          INSERT INTO Componentes_Producto (
            producto_id, materia_prima_id, cantidad_necesaria, angulo_corte
          ) VALUES ($1, $2, $3, $4)
        `,
          [
            nuevoProducto.producto_id,
            componente.materia_prima_id,
            componente.cantidad_necesaria,
            componente.angulo_corte,
          ]
        );
      }

      await client.query("COMMIT");
      client.release();

      return NextResponse.json(nuevoProducto, { status: 201 });
    } catch (error) {
      await client.query("ROLLBACK");
      client.release();
      throw error;
    }
  } catch (error) {
    console.error("Error creating producto:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
