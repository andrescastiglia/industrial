import { type NextRequest, NextResponse } from "next/server";

import { pool } from "@/lib/database";
import { calculateMaterialConsumption } from "@/lib/production-calculations";
import {
  authenticateApiRequest,
  checkApiPermission,
  logApiOperation,
} from "@/lib/api-auth";
import { validateRequest } from "@/lib/api-validation";
import {
  updateOrdenProduccionSchema,
  ordenProduccionIdSchema,
} from "@/lib/validations/ordenes-produccion";
import {
  BusinessError,
  handleApiError,
  mapDatabaseError,
  NotFoundError,
} from "@/lib/error-handler";
import { normalizeOrdenProduccionEstado } from "@/lib/business-constants";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function normalizeOrdenRow<T extends Record<string, any>>(row: T): T {
  return {
    ...row,
    estado: normalizeOrdenProduccionEstado(row.estado) || row.estado,
    consumos: Array.isArray(row.consumos)
      ? row.consumos.map((consumo: Record<string, any>) => ({
          ...consumo,
          cantidad_requerida: Number(consumo.cantidad_requerida),
          cantidad_usada: Number(consumo.cantidad_usada),
          merma_calculada: Number(consumo.merma_calculada),
        }))
      : row.consumos,
  };
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const params = await context.params;
  return handleApiError(async () => {
    const auth = authenticateApiRequest(request);
    if (auth.error) {
      return NextResponse.json(auth.error, { status: auth.error.statusCode });
    }
    const { user } = auth;

    const permissionError = checkApiPermission(user, "read:all");
    if (permissionError) return permissionError;

    const validation = await validateRequest(request, {
      paramsSchema: ordenProduccionIdSchema,
      params: { id: params.id },
    });

    if (!validation.success) {
      return validation.response!;
    }

    const { id } = validation.data!.params!;

    logApiOperation(
      "GET",
      `/api/ordenes-produccion/${id}`,
      user,
      "Obtener orden de producción"
    );

    const client = await pool.connect();

    try {
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
        [id]
      );

      if (ordenResult.rows.length === 0) {
        throw new NotFoundError("Orden");
      }

      const consumosResult = await client.query(
        `
        SELECT 
          consumo_id,
          orden_produccion_id,
          materia_prima_id,
          cantidad_requerida,
          cantidad_usada,
          merma_calculada,
          fecha_registro
        FROM Consumo_Materia_Prima_Produccion
        WHERE orden_produccion_id = $1
        ORDER BY fecha_registro
      `,
        [id]
      );

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
          o.nombre AS operario_nombre,
          o.apellido AS operario_apellido,
          o.rol AS operario_rol
        FROM Etapas_Produccion ep
        LEFT JOIN Operarios o ON ep.operario_id = o.operario_id
        WHERE ep.orden_produccion_id = $1
        ORDER BY ep.fecha_inicio
      `,
        [id]
      );

      return NextResponse.json(
        normalizeOrdenRow({
          ...ordenResult.rows[0],
          consumos: consumosResult.rows,
          etapas: etapasResult.rows,
        })
      );
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw mapDatabaseError(error);
    } finally {
      client.release();
    }
  }, request);
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  const params = await context.params;
  return handleApiError(async () => {
    const auth = authenticateApiRequest(request);
    if (auth.error) {
      return NextResponse.json(auth.error, { status: auth.error.statusCode });
    }
    const { user } = auth;

    const permissionError = checkApiPermission(user, "write:all");
    if (permissionError) return permissionError;

    const validation = await validateRequest(request, {
      bodySchema: updateOrdenProduccionSchema,
      paramsSchema: ordenProduccionIdSchema,
      params: { id: params.id },
    });

    if (!validation.success) {
      return validation.response!;
    }

    const ordenData = validation.data!.body!;
    const { id } = validation.data!.params!;

    logApiOperation(
      "PUT",
      `/api/ordenes-produccion/${id}`,
      user,
      "Actualizar orden de producción"
    );

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const ordenActualResult = await client.query(
        `
        SELECT producto_id, cantidad_a_producir
        FROM Ordenes_Produccion
        WHERE orden_produccion_id = $1
      `,
        [id]
      );

      if (ordenActualResult.rows.length === 0) {
        throw new NotFoundError("Orden");
      }

      const ordenActual = ordenActualResult.rows[0];
      const result = await client.query(
        `
        UPDATE Ordenes_Produccion SET
          orden_venta_id = COALESCE($1, orden_venta_id),
          producto_id = COALESCE($2, producto_id),
          cantidad_a_producir = COALESCE($3, cantidad_a_producir),
          fecha_inicio = $4,
          fecha_fin_estimada = $5,
          fecha_fin_real = $6,
          estado = COALESCE($7, estado)
        WHERE orden_produccion_id = $8
        RETURNING *
      `,
        [
          ordenData.orden_venta_id || null,
          ordenData.producto_id || null,
          ordenData.cantidad_a_producir || null,
          ordenData.fecha_inicio || null,
          ordenData.fecha_fin_estimada || null,
          ordenData.fecha_fin_real || null,
          ordenData.estado || null,
          id,
        ]
      );

      const ordenActualizada = result.rows[0];

      const shouldRecalculate =
        (!!ordenData.producto_id &&
          ordenData.producto_id !== ordenActual.producto_id) ||
        (!!ordenData.cantidad_a_producir &&
          ordenData.cantidad_a_producir !== ordenActual.cantidad_a_producir);

      if (shouldRecalculate) {
        await client.query(
          "DELETE FROM Consumo_Materia_Prima_Produccion WHERE orden_produccion_id = $1",
          [id]
        );

        const consumosCalculados = await calculateMaterialConsumption(
          ordenActualizada.producto_id,
          ordenActualizada.cantidad_a_producir
        );

        if (consumosCalculados.length === 0) {
          throw new BusinessError(
            "El producto no tiene componentes configurados para calcular consumos"
          );
        }

        for (const consumo of consumosCalculados) {
          await client.query(
            `
            INSERT INTO Consumo_Materia_Prima_Produccion (
              orden_produccion_id,
              materia_prima_id,
              cantidad_requerida,
              cantidad_usada,
              merma_calculada,
              fecha_registro
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `,
            [
              id,
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

      return NextResponse.json(
        normalizeOrdenRow({
          ...ordenActualizada,
          mensaje: shouldRecalculate
            ? "Orden actualizada y consumos recalculados"
            : "Orden actualizada",
        })
      );
    } catch (error) {
      await client.query("ROLLBACK");
      if (error instanceof NotFoundError || error instanceof BusinessError) {
        throw error;
      }
      throw mapDatabaseError(error);
    } finally {
      client.release();
    }
  }, request);
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  const params = await context.params;
  return handleApiError(async () => {
    const auth = authenticateApiRequest(request);
    if (auth.error) {
      return NextResponse.json(auth.error, { status: auth.error.statusCode });
    }
    const { user } = auth;

    const permissionError = checkApiPermission(user, "delete:all");
    if (permissionError) return permissionError;

    const validation = await validateRequest(request, {
      paramsSchema: ordenProduccionIdSchema,
      params: { id: params.id },
    });

    if (!validation.success) {
      return validation.response!;
    }

    const { id } = validation.data!.params!;

    logApiOperation(
      "DELETE",
      `/api/ordenes-produccion/${id}`,
      user,
      "Eliminar orden de producción"
    );

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      await client.query(
        "DELETE FROM Etapas_Produccion WHERE orden_produccion_id = $1",
        [id]
      );
      await client.query(
        "DELETE FROM Consumo_Materia_Prima_Produccion WHERE orden_produccion_id = $1",
        [id]
      );

      const result = await client.query(
        "DELETE FROM Ordenes_Produccion WHERE orden_produccion_id = $1 RETURNING *",
        [id]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError("Orden");
      }

      await client.query("COMMIT");

      return NextResponse.json({ message: "Orden eliminada correctamente" });
    } catch (error) {
      await client.query("ROLLBACK");
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw mapDatabaseError(error);
    } finally {
      client.release();
    }
  }, request);
}
