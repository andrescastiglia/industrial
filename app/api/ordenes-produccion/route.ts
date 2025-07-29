import { type NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";

export async function GET() {
  try {
    const client = await pool.connect();

    const result = await client.query(`
      SELECT 
      op.orden_produccion_id,
        op.orden_venta_id,
        op.producto_id,
        op.cantidad_a_producir,
        op.fecha_creacion,
        op.fecha_inicio,
        op.fecha_fin_estimada,
        op.fecha_fin_real,
        op.estado
      FROM Ordenes_Produccion op
      ORDER BY op.fecha_creacion DESC
    `);

    client.release();

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching ordenes produccion:", error);
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
      orden_venta_id,
      producto_id,
      cantidad_a_producir,
      fecha_creacion,
      fecha_inicio,
      fecha_fin_estimada,
      fecha_fin_real,
      estado,
      consumos = [],
    } = body;

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Insertar orden de producción
      const ordenResult = await client.query(
        `
        INSERT INTO Ordenes_Produccion (
          orden_venta_id, producto_id, cantidad_a_producir, fecha_creacion,
          fecha_inicio, fecha_fin_estimada, fecha_fin_real, estado
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
        [
          orden_venta_id,
          producto_id,
          cantidad_a_producir,
          fecha_creacion,
          fecha_inicio,
          fecha_fin_estimada,
          fecha_fin_real,
          estado,
        ]
      );

      const nuevaOrden = ordenResult.rows[0];

      // Insertar consumos de materia prima
      for (const consumo of consumos) {
        await client.query(
          `
          INSERT INTO Consumo_Materia_Prima_Produccion (
            orden_produccion_id, materia_prima_id, cantidad_requerida,
            cantidad_usada, merma_calculada, fecha_registro
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (orden_produccion_id, materia_prima_id) 
          DO UPDATE SET
            cantidad_requerida = EXCLUDED.cantidad_requerida,
            cantidad_usada = EXCLUDED.cantidad_usada,
            merma_calculada = EXCLUDED.merma_calculada,
            fecha_registro = EXCLUDED.fecha_registro
        `,
          [
            nuevaOrden.orden_produccion_id,
            consumo.materia_prima_id,
            consumo.cantidad_requerida,
            consumo.cantidad_usada,
            consumo.merma_calculada,
            consumo.fecha_registro,
          ]
        );
      }

      await client.query("COMMIT");
      client.release();

      return NextResponse.json(nuevaOrden, { status: 201 });
    } catch (error) {
      await client.query("ROLLBACK");
      client.release();
      throw error;
    }
  } catch (error) {
    console.error("Error creating orden produccion:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
