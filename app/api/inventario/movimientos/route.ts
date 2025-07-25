import { type NextRequest, NextResponse } from "next/server"
import { pool } from "@/lib/database"

export async function GET() {
  try {
    const client = await pool.connect()

    const result = await client.query(`
      SELECT 
        mi.*,
        mp.nombre as material_nombre,
        mp.unidad_medida
      FROM movimientos_inventario mi
      JOIN materia_prima mp ON mi.materia_prima_id = mp.materia_prima_id
      ORDER BY mi.fecha DESC
      LIMIT 50
    `)

    client.release()

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("Error fetching movimientos inventario:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { materia_prima_id, tipo_movimiento, cantidad, motivo, usuario } = body

    const client = await pool.connect()

    try {
      await client.query("BEGIN")

      // Registrar movimiento
      const movimientoResult = await client.query(
        `
        INSERT INTO movimientos_inventario (
          materia_prima_id, tipo_movimiento, cantidad, motivo, usuario, fecha
        ) VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING *
      `,
        [materia_prima_id, tipo_movimiento, cantidad, motivo, usuario],
      )

      // Actualizar stock según tipo de movimiento
      let updateQuery = ""
      const updateParams = [materia_prima_id]

      switch (tipo_movimiento) {
        case "Entrada":
          updateQuery = "UPDATE materia_prima SET stock_actual = stock_actual + $2 WHERE materia_prima_id = $1"
          updateParams.push(cantidad)
          break
        case "Salida":
          updateQuery =
            "UPDATE materia_prima SET stock_actual = GREATEST(0, stock_actual - $2) WHERE materia_prima_id = $1"
          updateParams.push(cantidad)
          break
        case "Ajuste":
          updateQuery = "UPDATE materia_prima SET stock_actual = $2 WHERE materia_prima_id = $1"
          updateParams.push(cantidad)
          break
      }

      await client.query(updateQuery, updateParams)

      await client.query("COMMIT")
      client.release()

      return NextResponse.json(movimientoResult.rows[0], { status: 201 })
    } catch (error) {
      await client.query("ROLLBACK")
      client.release()
      throw error
    }
  } catch (error) {
    console.error("Error creating movimiento inventario:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
