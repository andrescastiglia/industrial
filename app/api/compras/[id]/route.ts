import { type NextRequest, NextResponse } from "next/server";

import { pool } from "@/lib/database";

import {
  authenticateApiRequest,
  checkApiPermission,
  logApiOperation,
} from "@/lib/api-auth";
import { validateRequest } from "@/lib/api-validation";

import { updateCompraSchema, compraIdSchema } from "@/lib/validations/compras";
import {
  handleApiError,
  mapDatabaseError,
  NotFoundError,
} from "@/lib/error-handler";
import { apiLogger, startTimer } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const timer = startTimer(`GET /api/compras/${params.id}`, apiLogger);

  return handleApiError(async () => {
    // Autenticar usuario
    const auth = authenticateApiRequest(request);
    if (auth.error) {
      apiLogger.warn("Autenticación fallida en GET /api/compras/[id]", {
        compraId: params.id,
      });
      return NextResponse.json(auth.error, { status: auth.error.statusCode });
    }
    const { user } = auth;

    // Verificar permisos
    const permissionError = checkApiPermission(user, "read:all");
    if (permissionError) {
      apiLogger.warn("Permisos insuficientes en GET /api/compras/[id]", {
        userId: String(user.userId),
        compraId: params.id,
      });
      return permissionError;
    }

    // Validar parámetros de ruta
    const validation = await validateRequest(request, {
      paramsSchema: compraIdSchema,
      params: { id: params.id },
    });

    if (!validation.success) {
      apiLogger.warn("Validación fallida en GET /api/compras/[id]", {
        compraId: params.id,
        errors: validation.response,
      });
      return validation.response!;
    }

    const { id } = validation.data!.params!;

    logApiOperation("GET", `/api/compras/${id}`, user, "Obtener compra");

    const client = await pool.connect();

    try {
      const dbTimer = startTimer("Query compra by ID", apiLogger);
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
          p.nombre as proveedor_nombre
        FROM Compras c
        JOIN Proveedores p ON c.proveedor_id = p.proveedor_id
        WHERE c.compra_id = $1
      `,
        [id]
      );
      dbTimer.endDb();

      if (result.rows.length === 0) {
        apiLogger.warn("Compra no encontrada", { compraId: id });
        throw new NotFoundError("Compra");
      }

      // Obtener detalles de la compra
      const detallesTimer = startTimer("Query detalles compra", apiLogger);
      const detallesResult = await client.query(
        `
        SELECT 
          d.detalle_compra_id,
          d.materia_prima_id,
          d.cantidad_pedida,
          d.cantidad_recibida,
          d.unidad_medida,
          m.nombre as materia_prima_nombre
        FROM Detalle_Compra_Materia_Prima d
        JOIN Materia_Prima m ON d.materia_prima_id = m.materia_prima_id
        WHERE d.compra_id = $1
        ORDER BY d.detalle_compra_id
      `,
        [id]
      );
      detallesTimer.endDb();

      const compra = {
        ...result.rows[0],
        detalles: detallesResult.rows,
      };

      apiLogger.info("Compra obtenida exitosamente", {
        compraId: id,
        estado: compra.estado,
        detallesCount: detallesResult.rows.length,
      });

      timer.end();
      return NextResponse.json(compra);
    } catch (dbError: any) {
      if (dbError instanceof NotFoundError) {
        throw dbError;
      }
      apiLogger.error("Error de base de datos en GET /api/compras/[id]", {
        compraId: id,
        error: {
          message: dbError.message,
          code: dbError.code,
          stack: dbError.stack,
        },
      });
      throw mapDatabaseError(dbError);
    } finally {
      client.release();
    }
  }, request);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const timer = startTimer(`PUT /api/compras/${params.id}`, apiLogger);

  return handleApiError(async () => {
    // Autenticar usuario
    const auth = authenticateApiRequest(request);
    if (auth.error) {
      apiLogger.warn("Autenticación fallida en PUT /api/compras/[id]", {
        compraId: params.id,
      });
      return NextResponse.json(auth.error, { status: auth.error.statusCode });
    }
    const { user } = auth;

    // Verificar permisos
    const permissionError = checkApiPermission(user, "write:all");
    if (permissionError) {
      apiLogger.warn("Permisos insuficientes en PUT /api/compras/[id]", {
        userId: String(user.userId),
        compraId: params.id,
      });
      return permissionError;
    }

    // Validar parámetros y body
    const validation = await validateRequest(request, {
      bodySchema: updateCompraSchema,
      paramsSchema: compraIdSchema,
      params: { id: params.id },
      sanitize: true,
    });

    if (!validation.success) {
      apiLogger.warn("Validación fallida en PUT /api/compras/[id]", {
        compraId: params.id,
        errors: validation.response,
      });
      return validation.response!;
    }

    const compraData = validation.data!.body!;
    const { id } = validation.data!.params!;

    logApiOperation(
      "PUT",
      `/api/compras/${id}`,
      user,
      "Actualizar compra",
      compraData.estado || ""
    );

    const client = await pool.connect();

    try {
      // Verificar que la compra existe
      const checkResult = await client.query(
        "SELECT compra_id FROM Compras WHERE compra_id = $1",
        [id]
      );

      if (checkResult.rows.length === 0) {
        apiLogger.warn("Compra no encontrada para actualización", {
          compraId: id,
        });
        throw new NotFoundError("Compra");
      }

      // Build dynamic update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Helper para validar si un valor es válido (no es objeto vacío)
      const isValidValue = (value: any) => {
        if (value === null || value === undefined) return true; // null es válido para campos opcionales
        if (typeof value === "object" && !(value instanceof Date)) {
          // Si es un objeto vacío, no es válido
          return Object.keys(value).length > 0;
        }
        return true;
      };

      // Helper para limpiar valores (convertir objetos vacíos a null)
      const cleanValue = (value: any) => {
        if (value === null || value === undefined) return null;
        if (typeof value === "object" && !(value instanceof Date)) {
          return Object.keys(value).length === 0 ? null : value;
        }
        return value;
      };

      if (compraData.proveedor_id !== undefined) {
        updates.push(`proveedor_id = $${paramIndex}`);
        values.push(compraData.proveedor_id);
        paramIndex++;
      }

      // Solo actualizar fecha_pedido si viene con un valor válido (no objeto vacío)
      if (
        compraData.fecha_pedido !== undefined &&
        isValidValue(compraData.fecha_pedido)
      ) {
        updates.push(`fecha_pedido = $${paramIndex}`);
        values.push(cleanValue(compraData.fecha_pedido));
        paramIndex++;
      }

      if (compraData.fecha_recepcion_estimada !== undefined) {
        updates.push(`fecha_recepcion_estimada = $${paramIndex}`);
        values.push(cleanValue(compraData.fecha_recepcion_estimada));
        paramIndex++;
      }

      if (compraData.fecha_recepcion_real !== undefined) {
        updates.push(`fecha_recepcion_real = $${paramIndex}`);
        values.push(cleanValue(compraData.fecha_recepcion_real));
        paramIndex++;
      }

      if (compraData.estado !== undefined) {
        updates.push(`estado = $${paramIndex}`);
        values.push(compraData.estado);
        paramIndex++;
      }

      if (compraData.total_compra !== undefined) {
        updates.push(`total_compra = $${paramIndex}`);
        values.push(compraData.total_compra);
        paramIndex++;
      }

      if (compraData.cotizacion_ref !== undefined) {
        updates.push(`cotizacion_ref = $${paramIndex}`);
        values.push(compraData.cotizacion_ref || null);
        paramIndex++;
      }

      if (updates.length === 0) {
        apiLogger.warn("No hay campos para actualizar", { compraId: id });
        return NextResponse.json(
          { success: false, error: "No hay campos para actualizar" },
          { status: 400 }
        );
      }

      values.push(id);

      const dbTimer = startTimer("Update compra", apiLogger);
      const result = await client.query(
        `UPDATE Compras SET ${updates.join(", ")} WHERE compra_id = $${paramIndex} RETURNING *`,
        values
      );
      dbTimer.endDb();

      if (result.rows.length === 0) {
        apiLogger.warn("Compra no encontrada al actualizar", {
          compraId: id,
        });
        throw new NotFoundError("Compra");
      }

      apiLogger.info("Compra actualizada exitosamente", {
        compraId: id,
        updatedFields: Object.keys(compraData),
        userId: String(user.userId),
      });

      timer.end();
      return NextResponse.json(result.rows[0]);
    } catch (dbError: any) {
      if (dbError instanceof NotFoundError) {
        throw dbError;
      }
      apiLogger.error("Error de base de datos en PUT /api/compras/[id]", {
        compraId: id,
        error: {
          message: dbError.message,
          code: dbError.code,
          stack: dbError.stack,
        },
      });
      throw mapDatabaseError(dbError);
    } finally {
      client.release();
    }
  }, request);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const timer = startTimer(`DELETE /api/compras/${params.id}`, apiLogger);

  return handleApiError(async () => {
    // Autenticar usuario
    const auth = authenticateApiRequest(request);
    if (auth.error) {
      apiLogger.warn("Autenticación fallida en DELETE /api/compras/[id]", {
        compraId: params.id,
      });
      return NextResponse.json(auth.error, { status: auth.error.statusCode });
    }
    const { user } = auth;

    // Verificar permisos
    const permissionError = checkApiPermission(user, "delete:all");
    if (permissionError) {
      apiLogger.warn("Permisos insuficientes en DELETE /api/compras/[id]", {
        userId: String(user.userId),
        compraId: params.id,
      });
      return permissionError;
    }

    logApiOperation(
      "DELETE",
      `/api/compras/${params.id}`,
      user,
      "Eliminar compra"
    );

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Primero eliminar los detalles de la compra
      const deleteDetallesTimer = startTimer(
        "Delete detalles compra",
        apiLogger
      );
      await client.query(
        "DELETE FROM Detalle_Compra_Materia_Prima WHERE compra_id = $1",
        [params.id]
      );
      deleteDetallesTimer.endDb();

      // Luego eliminar la compra
      const dbTimer = startTimer("Delete compra", apiLogger);
      const result = await client.query(
        "DELETE FROM Compras WHERE compra_id = $1 RETURNING *",
        [params.id]
      );
      dbTimer.endDb();

      if (result.rows.length === 0) {
        await client.query("ROLLBACK");
        apiLogger.warn("Compra no encontrada para eliminación", {
          compraId: params.id,
        });
        throw new NotFoundError("Compra");
      }

      await client.query("COMMIT");

      apiLogger.info("Compra eliminada exitosamente", {
        compraId: params.id,
        estado: result.rows[0].estado,
        userId: String(user.userId),
      });

      timer.end();
      return NextResponse.json({ message: "Compra eliminada correctamente" });
    } catch (dbError: any) {
      await client.query("ROLLBACK");

      if (dbError instanceof NotFoundError) {
        throw dbError;
      }

      // Manejar errores de integridad referencial
      if (dbError.code === "23503") {
        apiLogger.warn("Intento de eliminar compra en uso", {
          compraId: params.id,
          error: dbError.message,
        });
        throw mapDatabaseError(dbError);
      }

      apiLogger.error("Error de base de datos en DELETE /api/compras/[id]", {
        compraId: params.id,
        error: {
          message: dbError.message,
          code: dbError.code,
          stack: dbError.stack,
        },
      });
      throw mapDatabaseError(dbError);
    } finally {
      client.release();
    }
  }, request);
}
