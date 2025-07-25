import { type NextRequest, NextResponse } from "next/server"
import { pool } from "@/lib/database"

export async function GET() {
  try {
    const client = await pool.connect()

    const result = await client.query(`
      SELECT 
        ov.*,
        c.nombre as cliente_nombre,
        c.contacto as cliente_contacto
      FROM Ordenes_Venta ov
      JOIN Clientes c ON ov.cliente_id = c.cliente_id
      ORDER BY ov.fecha_pedido DESC
    `)

    client.release()

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("Error fetching ventas:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      cliente_id,
      fecha_pedido,
      fecha_entrega_estimada,
      fecha_entrega_real,
      estado,
      total_venta,
      detalles = [],
    } = body

    const client = await pool.connect()

    try {
      await client.query("BEGIN")

      // Insertar orden de venta
      const ordenResult = await client.query(
        `
        INSERT INTO Ordenes_Venta (
          cliente_id, fecha_pedido, fecha_entrega_estimada,
          fecha_entrega_real, estado, total_venta
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
        [cliente_id, fecha_pedido, fecha_entrega_estimada, fecha_entrega_real, estado, total_venta],
      )

      const nuevaOrden = ordenResult.rows[0]

      // Insertar detalles de la orden
      for (const detalle of detalles) {
        await client.query(
          `
          INSERT INTO Detalle_Orden_Venta (
            orden_venta_id, producto_id, cantidad, precio_unitario_venta
          ) VALUES ($1, $2, $3, $4)
        `,
          [nuevaOrden.orden_venta_id, detalle.producto_id, detalle.cantidad, detalle.precio_unitario_venta],
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
    console.error("Error creating venta:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
