import { type NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await pool.connect();

    // Obtener orden de producción con información relacionada
    const ordenResult = await client.query(
      `
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
      WHERE op.orden_produccion_id = $1
    `,
      [params.id]
    );

    if (ordenResult.rows.length === 0) {
      client.release();
      return NextResponse.json(
        { error: "Orden no encontrada" },
        { status: 404 }
      );
    }

    // Obtener consumos de materia prima con información detallada
    const consumosResult = await client.query(
      `
      SELECT 
        cmpp.consumo_id,
        cmpp.orden_produccion_id,
        cmpp.materia_prima_id,
        cmpp.cantidad_requerida,
        cmpp.cantidad_usada,
        cmpp.merma_calculada,
        cmpp.fecha_registro
      FROM Consumo_Materia_Prima_Produccion cmpp
      WHERE cmpp.orden_produccion_id = $1
      ORDER BY cmpp.fecha_registro
    `,
      [params.id]
    );

    // Obtener etapas de producción si existen
    const etapasResult = await client.query(
      `
      SELECT 
        ep.etapa_id,
        ep.orden_produccion_id,
        ep.nombre_etapa,
        ep.fecha_inicio,
        ep.fecha_fin,
        ep.operario_id,
        ep.estado,
        o.nombre as operario_nombre,
        o.apellido as operario_apellido,
        o.rol as operario_rol
      FROM Etapas_Produccion ep
      LEFT JOIN Operarios o ON ep.operario_id = o.operario_id
      WHERE ep.orden_produccion_id = $1
      ORDER BY ep.fecha_inicio
    `,
      [params.id]
    );

    client.release();

    const orden = {
      ...ordenResult.rows[0],
      consumos: consumosResult.rows,
      etapas: etapasResult.rows,
    };

    return NextResponse.json(orden);
  } catch (error) {
    console.error("Error fetching orden produccion:", error);
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
    const {
      orden_venta_id,
      producto_id,
      cantidad_a_producir,
      fecha_inicio,
      fecha_fin_estimada,
      fecha_fin_real,
      estado,
      consumos = [],
    } = body;

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Actualizar orden de producción
      const result = await client.query(
        `
        UPDATE Ordenes_Produccion SET
          orden_venta_id = $1,
          producto_id = $2,
          cantidad_a_producir = $3,
          fecha_inicio = $4,
          fecha_fin_estimada = $5,
          fecha_fin_real = $6,
          estado = $7
        WHERE orden_produccion_id = $8
        RETURNING *
      `,
        [
          orden_venta_id,
          producto_id,
          cantidad_a_producir,
          fecha_inicio,
          fecha_fin_estimada,
          fecha_fin_real,
          estado,
          params.id,
        ]
      );

      if (result.rows.length === 0) {
        await client.query("ROLLBACK");
        client.release();
        return NextResponse.json(
          { error: "Orden no encontrada" },
          { status: 404 }
        );
      }

      // Eliminar consumos existentes
      await client.query(
        "DELETE FROM Consumo_Materia_Prima_Produccion WHERE orden_produccion_id = $1",
        [params.id]
      );

      // Insertar nuevos consumos
      for (const consumo of consumos) {
        await client.query(
          `
          INSERT INTO Consumo_Materia_Prima_Produccion (
            orden_produccion_id, materia_prima_id, cantidad_requerida,
            cantidad_usada, merma_calculada, fecha_registro
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `,
          [
            params.id,
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

      return NextResponse.json(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      client.release();
      throw error;
    }
  } catch (error) {
    console.error("Error updating orden produccion:", error);
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

    try {
      await client.query("BEGIN");

      // Eliminar etapas de producción primero
      await client.query(
        "DELETE FROM Etapas_Produccion WHERE orden_produccion_id = $1",
        [params.id]
      );

      // Eliminar consumos de materia prima
      await client.query(
        "DELETE FROM Consumo_Materia_Prima_Produccion WHERE orden_produccion_id = $1",
        [params.id]
      );

      // Eliminar orden de producción
      const result = await client.query(
        "DELETE FROM Ordenes_Produccion WHERE orden_produccion_id = $1 RETURNING *",
        [params.id]
      );

      if (result.rows.length === 0) {
        await client.query("ROLLBACK");
        client.release();
        return NextResponse.json(
          { error: "Orden no encontrada" },
          { status: 404 }
        );
      }

      await client.query("COMMIT");
      client.release();

      return NextResponse.json({ message: "Orden eliminada correctamente" });
    } catch (error) {
      await client.query("ROLLBACK");
      client.release();
      throw error;
    }
  } catch (error) {
    console.error("Error deleting orden produccion:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
