import { type NextRequest, NextResponse } from "next/server"
import { pool } from "@/lib/database"

export async function GET() {
  try {
    const client = await pool.connect()

    const result = await client.query(`
      SELECT 
        op.*,
        p.nombre_modelo,
        p.descripcion as producto_descripcion,
        p.ancho,
        p.alto,
        p.color as producto_color,
        p.tipo_accionamiento,
        ov.cliente_id,
        c.nombre as cliente_nombre,
        c.contacto as cliente_contacto
      FROM Ordenes_Produccion op
      LEFT JOIN Productos p ON op.producto_id = p.producto_id
      LEFT JOIN Ordenes_Venta ov ON op.orden_venta_id = ov.orden_venta_id
      LEFT JOIN Clientes c ON ov.cliente_id = c.cliente_id
      ORDER BY op.fecha_creacion DESC
    `)

    client.release()

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("Error fetching ordenes produccion:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
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
    } = body

    const client = await pool.connect()

    try {
      await client.query("BEGIN")

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
        ],
      )

      const nuevaOrden = ordenResult.rows[0]

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
          ],
        )
      }

      await client.query("COMMIT")
      client.release()

      return NextResponse.json(nuevaOrden, { status: 201 })
    } catch (error) {
      await client.query("ROLLBACK")
      client.release()
      throw error
    }
  } catch (error) {
    console.error("Error creating orden produccion:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
