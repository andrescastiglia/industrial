import { type NextRequest, NextResponse } from "next/server";

import { pool } from "@/lib/database";
import {
  authenticateApiRequest,
  checkApiPermission,
  logApiOperation,
} from "@/lib/api-auth";
import { validateRequest } from "@/lib/api-validation";
import {
  createVentaSchema,
  updateVentaSchema,
  ventaIdSchema,
} from "@/lib/validations/ventas";
import {
  handleApiError,
  mapDatabaseError,
  NotFoundError,
} from "@/lib/error-handler";
import { normalizeVentaEstado } from "@/lib/business-constants";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function normalizeVentaRow<T extends Record<string, any>>(row: T): T {
  return {
    ...row,
    estado: normalizeVentaEstado(row.estado) || row.estado,
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
      paramsSchema: ventaIdSchema,
      params: { id: params.id },
    });

    if (!validation.success) {
      return validation.response!;
    }

    const { id } = validation.data!.params!;

    logApiOperation("GET", `/api/ventas/${id}`, user, "Obtener venta");

    const client = await pool.connect();

    try {
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
          c.contacto AS cliente_contacto
        FROM Ordenes_Venta ov
        JOIN Clientes c ON ov.cliente_id = c.cliente_id
        WHERE ov.orden_venta_id = $1
      `,
        [id]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError("Venta");
      }

      const detalleResult = await client.query(
        `
        SELECT
          detalle_orden_venta_id,
          orden_venta_id,
          producto_id,
          cantidad,
          precio_unitario_venta
        FROM Detalle_Orden_Venta
        WHERE orden_venta_id = $1
        ORDER BY detalle_orden_venta_id
      `,
        [id]
      );

      return NextResponse.json(
        normalizeVentaRow({
          ...result.rows[0],
          detalle: detalleResult.rows,
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
      bodySchema: updateVentaSchema,
      paramsSchema: ventaIdSchema,
      params: { id: params.id },
    });

    if (!validation.success) {
      return validation.response!;
    }

    const ventaData = validation.data!.body!;
    const { id } = validation.data!.params!;

    logApiOperation("PUT", `/api/ventas/${id}`, user, "Actualizar venta");

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const currentResult = await client.query(
        "SELECT orden_venta_id FROM Ordenes_Venta WHERE orden_venta_id = $1",
        [id]
      );

      if (currentResult.rows.length === 0) {
        throw new NotFoundError("Venta");
      }

      const totalVenta = calculateVentaTotal(
        ventaData.total_venta,
        ventaData.detalles || []
      );

      const result = await client.query(
        `
        UPDATE Ordenes_Venta SET
          cliente_id = COALESCE($1, cliente_id),
          fecha_pedido = COALESCE($2, fecha_pedido),
          fecha_entrega_estimada = COALESCE($3, fecha_entrega_estimada),
          fecha_entrega_real = $4,
          estado = COALESCE($5, estado),
          total_venta = $6
        WHERE orden_venta_id = $7
        RETURNING *
      `,
        [
          ventaData.cliente_id || null,
          ventaData.fecha_pedido || null,
          ventaData.fecha_entrega_estimada || null,
          ventaData.fecha_entrega_real || null,
          ventaData.estado || null,
          totalVenta,
          id,
        ]
      );

      const updatedVenta = result.rows[0];

      let detalleRows = [];
      if (ventaData.detalles) {
        await client.query(
          "DELETE FROM Detalle_Orden_Venta WHERE orden_venta_id = $1",
          [id]
        );

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
              id,
              detalle.producto_id,
              detalle.cantidad,
              detalle.precio_unitario_venta || null,
            ]
          );
          detalleRows.push(detalleResult.rows[0]);
        }
      } else {
        const detalleResult = await client.query(
          `
          SELECT
            detalle_orden_venta_id,
            orden_venta_id,
            producto_id,
            cantidad,
            precio_unitario_venta
          FROM Detalle_Orden_Venta
          WHERE orden_venta_id = $1
          ORDER BY detalle_orden_venta_id
        `,
          [id]
        );
        detalleRows = detalleResult.rows;
      }

      await client.query("COMMIT");

      return NextResponse.json(
        normalizeVentaRow({
          ...updatedVenta,
          detalle: detalleRows,
        })
      );
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
      paramsSchema: ventaIdSchema,
      params: { id: params.id },
    });

    if (!validation.success) {
      return validation.response!;
    }

    const { id } = validation.data!.params!;

    logApiOperation("DELETE", `/api/ventas/${id}`, user, "Eliminar venta");

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      await client.query(
        "DELETE FROM Detalle_Orden_Venta WHERE orden_venta_id = $1",
        [id]
      );

      const result = await client.query(
        "DELETE FROM Ordenes_Venta WHERE orden_venta_id = $1 RETURNING *",
        [id]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError("Venta");
      }

      await client.query("COMMIT");

      return NextResponse.json({ message: "Venta eliminada correctamente" });
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
