import { type NextRequest, NextResponse } from "next/server";

import { pool } from "@/lib/database";

import { calculateMaterialConsumption } from "@/lib/production-calculations";

import {
  authenticateApiRequest,
  checkApiPermission,
  logApiOperation,
} from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Autenticar usuario
    const auth = authenticateApiRequest(request);
    if (auth.error) {
      return NextResponse.json(auth.error, { status: auth.error.statusCode });
    }
    const { user } = auth;

    // Verificar permisos
    const permissionError = checkApiPermission(user, "read:all");
    if (permissionError) return permissionError;

    logApiOperation(
      "GET",
      `/api/ordenes-produccion/${params.id}`,
      user,
      "Obtener orden de producción"
    );

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
    // Autenticar usuario
    const auth = authenticateApiRequest(request);
    if (auth.error) {
      return NextResponse.json(auth.error, { status: auth.error.statusCode });
    }
    const { user } = auth;

    // Verificar permisos
    const permissionError = checkApiPermission(user, "write:all");
    if (permissionError) return permissionError;

    const body = await request.json();
    const {
      orden_venta_id,
      producto_id,
      cantidad_a_producir,
      fecha_inicio,
      fecha_fin_estimada,
      fecha_fin_real,
      estado,
    } = body;

    logApiOperation(
      "PUT",
      `/api/ordenes-produccion/${params.id}`,
      user,
      "Actualizar orden de producción",
      `estado: ${estado}`
    );

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Obtener orden actual para comparar cantidad
      const ordenActualResult = await client.query(
        `SELECT producto_id, cantidad_a_producir FROM Ordenes_Produccion WHERE orden_produccion_id = $1`,
        [params.id]
      );

      if (ordenActualResult.rows.length === 0) {
        await client.query("ROLLBACK");
        client.release();
        return NextResponse.json(
          { error: "Orden no encontrada" },
          { status: 404 }
        );
      }

      const ordenActual = ordenActualResult.rows[0];
      const cantidadCambio =
        cantidad_a_producir &&
        cantidad_a_producir !== ordenActual.cantidad_a_producir;
      const productoCambio =
        producto_id && producto_id !== ordenActual.producto_id;

      // Actualizar orden de producción
      const result = await client.query(
        `
        UPDATE Ordenes_Produccion SET
          orden_venta_id = COALESCE($1, orden_venta_id),
          producto_id = COALESCE($2, producto_id),
          cantidad_a_producir = COALESCE($3, cantidad_a_producir),
          fecha_inicio = COALESCE($4, fecha_inicio),
          fecha_fin_estimada = COALESCE($5, fecha_fin_estimada),
          fecha_fin_real = COALESCE($6, fecha_fin_real),
          estado = COALESCE($7, estado)
        WHERE orden_produccion_id = $8
        RETURNING *
      `,
        [
          orden_venta_id || null,
          producto_id || null,
          cantidad_a_producir || null,
          fecha_inicio || null,
          fecha_fin_estimada || null,
          fecha_fin_real || null,
          estado || null,
          params.id,
        ]
      );

      const ordenActualizada = result.rows[0];

      // Si cambió cantidad o producto, recalcular consumos
      if (cantidadCambio || productoCambio) {
        // Eliminar consumos existentes
        await client.query(
          "DELETE FROM Consumo_Materia_Prima_Produccion WHERE orden_produccion_id = $1",
          [params.id]
        );

        // Calcular nuevos consumos
        const consumosCalculados = await calculateMaterialConsumption(
          ordenActualizada.producto_id,
          ordenActualizada.cantidad_a_producir
        );

        // Insertar nuevos consumos calculados
        for (const consumo of consumosCalculados) {
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
              consumo.cantidad_total,
              0,
              0,
              new Date(),
            ]
          );
        }
      }

      await client.query("COMMIT");
      client.release();

      return NextResponse.json({
        ...ordenActualizada,
        mensaje:
          cantidadCambio || productoCambio
            ? "Orden actualizada y consumos recalculados"
            : "Orden actualizada",
      });
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
    // Autenticar usuario
    const auth = authenticateApiRequest(request);
    if (auth.error) {
      return NextResponse.json(auth.error, { status: auth.error.statusCode });
    }
    const { user } = auth;

    // Verificar permisos
    const permissionError = checkApiPermission(user, "delete:all");
    if (permissionError) return permissionError;

    logApiOperation(
      "DELETE",
      `/api/ordenes-produccion/${params.id}`,
      user,
      "Eliminar orden de producción"
    );

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
