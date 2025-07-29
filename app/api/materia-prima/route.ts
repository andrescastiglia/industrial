import { type NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";

export async function GET() {
  try {
    const client = await pool.connect();

    const result = await client.query(`
      SELECT 
        mp.materia_prima_id,
        mp.nombre,
        mp.descripcion,
        mp.referencia_proveedor,
        mp.unidad_medida,
        mp.stock_actual,
        mp.punto_pedido,
        mp.tiempo_entrega_dias,
        mp.longitud_estandar_m,
        mp.color,
        mp.id_tipo_componente,
        tc.nombre_tipo
      FROM Materia_Prima mp
      LEFT JOIN Tipo_Componente tc ON mp.id_tipo_componente = tc.tipo_componente_id
      ORDER BY mp.nombre
    `);

    client.release();

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching materia prima:", error);
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
      nombre,
      descripcion,
      referencia_proveedor,
      unidad_medida,
      stock_actual,
      punto_pedido,
      tiempo_entrega_dias,
      longitud_estandar_m,
      color,
      id_tipo_componente,
    } = body;

    const client = await pool.connect();

    const result = await client.query(
      `
      INSERT INTO Materia_Prima (
        nombre, descripcion, referencia_proveedor, unidad_medida,
        stock_actual, punto_pedido, tiempo_entrega_dias,
        longitud_estandar_m, color, id_tipo_componente
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `,
      [
        nombre,
        descripcion,
        referencia_proveedor,
        unidad_medida,
        stock_actual,
        punto_pedido,
        tiempo_entrega_dias,
        longitud_estandar_m,
        color,
        id_tipo_componente,
      ]
    );

    client.release();

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("Error creating materia prima:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
