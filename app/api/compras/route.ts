import { type NextRequest, NextResponse } from "next/server";

import { pool } from "@/lib/database";
import {
  authenticateApiRequest,
  checkApiPermission,
  logApiOperation,
} from "@/lib/api-auth";
import { validateRequest } from "@/lib/api-validation";
import {
  createCompraSchema,
  filterCompraSchema,
} from "@/lib/validations/compras";
import { handleApiError, mapDatabaseError } from "@/lib/error-handler";
import { normalizeCompraEstado } from "@/lib/business-constants";

export const dynamic = "force-dynamic";

function normalizeCompraRow<T extends Record<string, any>>(row: T): T {
  return {
    ...row,
    estado: normalizeCompraEstado(row.estado) || row.estado,
    total_compra:
      row.total_compra == null
        ? null
        : Number.parseFloat(String(row.total_compra)),
    detalles: Array.isArray(row.detalles)
      ? row.detalles.map((detalle: Record<string, any>) => ({
          ...detalle,
          cantidad_pedida: Number(detalle.cantidad_pedida),
          cantidad_recibida: Number(detalle.cantidad_recibida),
        }))
      : row.detalles,
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

    const validation = await validateRequest(request, {
      querySchema: filterCompraSchema,
    });

    if (!validation.success) {
      return validation.response!;
    }

    const filters = validation.data?.query;

    logApiOperation(
      "GET",
      "/api/compras",
      user,
      "Listar compras",
      JSON.stringify(filters || {})
    );

    const client = await pool.connect();

    try {
      const queryParams: Array<string | number | Date> = [];
      let paramIndex = 1;
      let whereClause = "WHERE 1=1";

      if (filters?.proveedor_id) {
        whereClause += ` AND c.proveedor_id = $${paramIndex}`;
        queryParams.push(filters.proveedor_id);
        paramIndex++;
      }

      if (filters?.estado) {
        whereClause += ` AND LOWER(REPLACE(c.estado, ' ', '_')) = $${paramIndex}`;
        queryParams.push(filters.estado);
        paramIndex++;
      }

      if (filters?.fecha_desde) {
        whereClause += ` AND c.fecha_pedido >= $${paramIndex}`;
        queryParams.push(filters.fecha_desde);
        paramIndex++;
      }

      if (filters?.fecha_hasta) {
        whereClause += ` AND c.fecha_pedido <= $${paramIndex}`;
        queryParams.push(filters.fecha_hasta);
        paramIndex++;
      }

      if (filters?.search) {
        whereClause += ` AND (
          CAST(c.compra_id AS TEXT) ILIKE $${paramIndex}
          OR p.nombre ILIKE $${paramIndex}
          OR c.cotizacion_ref ILIKE $${paramIndex}
          OR c.estado ILIKE $${paramIndex}
        )`;
        queryParams.push(`%${filters.search}%`);
        paramIndex++;
      }

      const result = await client.query(
        `
        SELECT 
          c.compra_id,
          c.proveedor_id,
          c.fecha_pedido,
          c.fecha_recepcion_estimada,
          c.fecha_recepcion_real,
          c.estado,
          c.total_compra,
          c.cotizacion_ref,
          p.nombre AS proveedor_nombre,
          COALESCE(
            json_agg(
              json_build_object(
                'detalle_compra_id', dcmp.detalle_compra_id,
                'compra_id', dcmp.compra_id,
                'materia_prima_id', dcmp.materia_prima_id,
                'cantidad_pedida', dcmp.cantidad_pedida,
                'cantidad_recibida', dcmp.cantidad_recibida,
                'unidad_medida', dcmp.unidad_medida
              ) ORDER BY dcmp.detalle_compra_id
            ) FILTER (WHERE dcmp.detalle_compra_id IS NOT NULL),
            '[]'::json
          ) AS detalles
        FROM Compras c
        JOIN Proveedores p ON c.proveedor_id = p.proveedor_id
        LEFT JOIN Detalle_Compra_Materia_Prima dcmp
          ON c.compra_id = dcmp.compra_id
        ${whereClause}
        GROUP BY c.compra_id, p.proveedor_id
        ORDER BY c.fecha_pedido DESC, c.compra_id DESC
      `,
        queryParams
      );

      return NextResponse.json(result.rows.map(normalizeCompraRow));
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
      bodySchema: createCompraSchema,
    });

    if (!validation.success) {
      return validation.response!;
    }

    const compraData = validation.data!.body!;

    logApiOperation(
      "POST",
      "/api/compras",
      user,
      "Crear compra",
      `proveedor_id: ${compraData.proveedor_id}`
    );

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const compraResult = await client.query(
        `
        INSERT INTO Compras (
          proveedor_id,
          fecha_pedido,
          fecha_recepcion_estimada,
          fecha_recepcion_real,
          estado,
          total_compra,
          cotizacion_ref
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
        [
          compraData.proveedor_id,
          compraData.fecha_pedido,
          compraData.fecha_recepcion_estimada || null,
          compraData.fecha_recepcion_real || null,
          compraData.estado,
          compraData.total_compra || 0,
          compraData.cotizacion_ref || null,
        ]
      );

      const nuevaCompra = compraResult.rows[0];
      const detalleRows = [];

      for (const detalle of compraData.detalles || []) {
        const detalleResult = await client.query(
          `
          INSERT INTO Detalle_Compra_Materia_Prima (
            compra_id,
            materia_prima_id,
            cantidad_pedida,
            cantidad_recibida,
            unidad_medida
          ) VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `,
          [
            nuevaCompra.compra_id,
            detalle.materia_prima_id,
            detalle.cantidad_pedida,
            detalle.cantidad_recibida || 0,
            detalle.unidad_medida || null,
          ]
        );

        detalleRows.push(detalleResult.rows[0]);
      }

      await client.query("COMMIT");

      return NextResponse.json(
        normalizeCompraRow({
          ...nuevaCompra,
          detalles: detalleRows,
        }),
        { status: 201 }
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw mapDatabaseError(error);
    } finally {
      client.release();
    }
  }, request);
}
