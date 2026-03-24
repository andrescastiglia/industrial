import { type NextRequest, NextResponse } from "next/server";

import { pool } from "@/lib/database";
import {
  authenticateApiRequest,
  checkApiPermission,
  logApiOperation,
} from "@/lib/api-auth";
import { validateRequest } from "@/lib/api-validation";
import { createVentaSchema, filterVentaSchema } from "@/lib/validations/ventas";
import { handleApiError, mapDatabaseError } from "@/lib/error-handler";
import { normalizeVentaEstado } from "@/lib/business-constants";

export const dynamic = "force-dynamic";

function normalizeVentaRow<T extends Record<string, any>>(row: T): T {
  const normalizedEstado = normalizeVentaEstado(row.estado);

  return {
    ...row,
    estado: normalizedEstado || row.estado,
    total_venta:
      row.total_venta == null
        ? null
        : Number.parseFloat(String(row.total_venta)),
    detalle: Array.isArray(row.detalle)
      ? row.detalle.map((detalle: Record<string, any>) => ({
          ...detalle,
          precio_unitario_venta:
            detalle.precio_unitario_venta == null
              ? null
              : Number.parseFloat(String(detalle.precio_unitario_venta)),
        }))
      : row.detalle,
  };
}

function calculateVentaTotal(
  explicitTotal: number | null | undefined,
  detalles: Array<{ cantidad: number; precio_unitario_venta?: number | null }>
) {
  if (explicitTotal != null) {
    return explicitTotal;
  }

  return detalles.reduce(
    (sum, detalle) =>
      sum + detalle.cantidad * Number(detalle.precio_unitario_venta || 0),
    0
  );
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
      querySchema: filterVentaSchema,
    });

    if (!validation.success) {
      return validation.response!;
    }

    const filters = validation.data?.query;

    logApiOperation(
      "GET",
      "/api/ventas",
      user,
      "Listar todas las ventas",
      JSON.stringify(filters || {})
    );

    const client = await pool.connect();

    try {
      const queryParams: Array<string | number | Date> = [];
      let paramIndex = 1;
      let whereClause = "WHERE 1=1";

      if (filters?.cliente_id) {
        whereClause += ` AND ov.cliente_id = $${paramIndex}`;
        queryParams.push(filters.cliente_id);
        paramIndex++;
      }

      if (filters?.estado) {
        whereClause += ` AND LOWER(REPLACE(ov.estado, ' ', '_')) = $${paramIndex}`;
        queryParams.push(filters.estado);
        paramIndex++;
      }

      if (filters?.fecha_desde) {
        whereClause += ` AND ov.fecha_pedido >= $${paramIndex}`;
        queryParams.push(filters.fecha_desde);
        paramIndex++;
      }

      if (filters?.fecha_hasta) {
        whereClause += ` AND ov.fecha_pedido <= $${paramIndex}`;
        queryParams.push(filters.fecha_hasta);
        paramIndex++;
      }

      if (filters?.search) {
        whereClause += ` AND (
          CAST(ov.orden_venta_id AS TEXT) ILIKE $${paramIndex}
          OR c.nombre ILIKE $${paramIndex}
          OR ov.estado ILIKE $${paramIndex}
        )`;
        queryParams.push(`%${filters.search}%`);
        paramIndex++;
      }

      const result = await client.query(
        `
        SELECT
          ov.orden_venta_id,
          ov.cliente_id,
          ov.fecha_pedido,
          ov.fecha_entrega_estimada,
          ov.fecha_entrega_real,
          ov.estado,
          ov.total_venta,
          c.nombre AS cliente_nombre,
          c.contacto AS cliente_contacto,
          COALESCE(
            json_agg(
              json_build_object(
                'detalle_orden_venta_id', dov.detalle_orden_venta_id,
                'orden_venta_id', dov.orden_venta_id,
                'producto_id', dov.producto_id,
                'cantidad', dov.cantidad,
                'precio_unitario_venta', dov.precio_unitario_venta
              ) ORDER BY dov.detalle_orden_venta_id
            ) FILTER (WHERE dov.detalle_orden_venta_id IS NOT NULL),
            '[]'::json
          ) AS detalle
        FROM Ordenes_Venta ov
        JOIN Clientes c ON ov.cliente_id = c.cliente_id
        LEFT JOIN Detalle_Orden_Venta dov
          ON ov.orden_venta_id = dov.orden_venta_id
        ${whereClause}
        GROUP BY ov.orden_venta_id, c.cliente_id
        ORDER BY ov.fecha_pedido DESC, ov.orden_venta_id DESC
      `,
        queryParams
      );

      return NextResponse.json(result.rows.map(normalizeVentaRow));
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
      bodySchema: createVentaSchema,
    });

    if (!validation.success) {
      return validation.response!;
    }

    const ventaData = validation.data!.body!;
    const totalVenta = calculateVentaTotal(
      ventaData.total_venta,
      ventaData.detalles
    );

    logApiOperation(
      "POST",
      "/api/ventas",
      user,
      "Crear nueva venta",
      `cliente_id: ${ventaData.cliente_id}`
    );

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const ordenResult = await client.query(
        `
        INSERT INTO Ordenes_Venta (
          cliente_id,
          fecha_pedido,
          fecha_entrega_estimada,
          fecha_entrega_real,
          estado,
          total_venta
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
        [
          ventaData.cliente_id,
          ventaData.fecha_pedido,
          ventaData.fecha_entrega_estimada,
          ventaData.fecha_entrega_real || null,
          ventaData.estado,
          totalVenta,
        ]
      );

      const nuevaOrden = ordenResult.rows[0];
      const detalleRows = [];

      for (const detalle of ventaData.detalles) {
        const detalleResult = await client.query(
          `
          INSERT INTO Detalle_Orden_Venta (
            orden_venta_id,
            producto_id,
            cantidad,
            precio_unitario_venta
          ) VALUES ($1, $2, $3, $4)
          RETURNING *
        `,
          [
            nuevaOrden.orden_venta_id,
            detalle.producto_id,
            detalle.cantidad,
            detalle.precio_unitario_venta || null,
          ]
        );

        detalleRows.push(detalleResult.rows[0]);
      }

      await client.query("COMMIT");

      return NextResponse.json(
        normalizeVentaRow({
          ...nuevaOrden,
          detalle: detalleRows,
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
