import { type NextRequest, NextResponse } from "next/server";

import { pool } from "@/lib/database";
import { calculateMaterialConsumption } from "@/lib/production-calculations";
import {
  authenticateApiRequest,
  checkApiPermission,
  logApiOperation,
} from "@/lib/api-auth";
import { validateRequest } from "@/lib/api-validation";
import { createOrdenProduccionSchema } from "@/lib/validations/ordenes-produccion";
import {
  BusinessError,
  handleApiError,
  mapDatabaseError,
} from "@/lib/error-handler";
import { normalizeOrdenProduccionEstado } from "@/lib/business-constants";

export const dynamic = "force-dynamic";

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

export async function GET(request: NextRequest) {
  return handleApiError(async () => {
    const auth = authenticateApiRequest(request);
    if (auth.error) {
      return NextResponse.json(auth.error, { status: auth.error.statusCode });
    }
    const { user } = auth;

    const permissionError = checkApiPermission(user, "read:all");
    if (permissionError) return permissionError;

    logApiOperation(
      "GET",
      "/api/ordenes-produccion",
      user,
      "Listar todas las órdenes de producción"
    );

    const client = await pool.connect();

    try {
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
          op.estado,
          COALESCE(
            json_agg(
              json_build_object(
                'consumo_id', cmpp.consumo_id,
                'orden_produccion_id', cmpp.orden_produccion_id,
                'materia_prima_id', cmpp.materia_prima_id,
                'cantidad_requerida', cmpp.cantidad_requerida,
                'cantidad_usada', cmpp.cantidad_usada,
                'merma_calculada', cmpp.merma_calculada,
                'fecha_registro', cmpp.fecha_registro
              ) ORDER BY cmpp.consumo_id
            ) FILTER (WHERE cmpp.consumo_id IS NOT NULL),
            '[]'::json
          ) AS consumos
        FROM Ordenes_Produccion op
        LEFT JOIN Consumo_Materia_Prima_Produccion cmpp
          ON op.orden_produccion_id = cmpp.orden_produccion_id
        GROUP BY op.orden_produccion_id
        ORDER BY op.fecha_creacion DESC
      `);

      return NextResponse.json(result.rows.map(normalizeOrdenRow));
    } catch (error) {
      throw mapDatabaseError(error);
    } finally {
      client.release();
    }
  }, request);
}

export async function POST(request: NextRequest) {
  return handleApiError(async () => {
    const auth = authenticateApiRequest(request);
    if (auth.error) {
      return NextResponse.json(auth.error, { status: auth.error.statusCode });
    }
    const { user } = auth;

    const permissionError = checkApiPermission(user, "write:all");
    if (permissionError) return permissionError;

    const validation = await validateRequest(request, {
      bodySchema: createOrdenProduccionSchema,
    });

    if (!validation.success) {
      return validation.response!;
    }

    const ordenData = validation.data!.body!;

    logApiOperation(
      "POST",
      "/api/ordenes-produccion",
      user,
      "Crear nueva orden de producción",
      `producto_id: ${ordenData.producto_id}`
    );

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const ordenResult = await client.query(
        `
        INSERT INTO Ordenes_Produccion (
          orden_venta_id,
          producto_id,
          cantidad_a_producir,
          fecha_creacion,
          fecha_inicio,
          fecha_fin_estimada,
          fecha_fin_real,
          estado
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
        [
          ordenData.orden_venta_id || null,
          ordenData.producto_id,
          ordenData.cantidad_a_producir,
          ordenData.fecha_creacion || new Date(),
          ordenData.fecha_inicio || null,
          ordenData.fecha_fin_estimada || null,
          ordenData.fecha_fin_real || null,
          ordenData.estado,
        ]
      );

      const nuevaOrden = ordenResult.rows[0];
      const consumosCalculados = await calculateMaterialConsumption(
        ordenData.producto_id,
        ordenData.cantidad_a_producir
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
            consumo.cantidad_total,
            0,
            0,
            new Date(),
          ]
        );
      }

      await client.query("COMMIT");

      return NextResponse.json(
        normalizeOrdenRow({
          ...nuevaOrden,
          consumos: consumosCalculados.map((consumo) => ({
            consumo_id: null,
            orden_produccion_id: nuevaOrden.orden_produccion_id,
            materia_prima_id: consumo.materia_prima_id,
            cantidad_requerida: consumo.cantidad_total,
            cantidad_usada: 0,
            merma_calculada: 0,
            fecha_registro: new Date(),
          })),
          mensaje: "Orden creada con consumos calculados automáticamente",
        }),
        { status: 201 }
      );
    } catch (error) {
      await client.query("ROLLBACK");
      if (error instanceof BusinessError) {
        throw error;
      }
      throw mapDatabaseError(error);
    } finally {
      client.release();
    }
  }, request);
}
