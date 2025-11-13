import { type NextRequest, NextResponse } from "next/server";

import { pool } from "@/lib/database";

import {
  authenticateApiRequest,
  checkApiPermission,
  logApiOperation,
} from "@/lib/api-auth";
import { validateRequest } from "@/lib/api-validation";

import {
  updateClienteSchema,
  clienteIdSchema,
} from "@/lib/validations/clientes";
import {
  validateClienteExists,
  validateClienteEmailUnique,
} from "@/lib/validation-helpers";
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
  const timer = startTimer(`GET /api/clientes/${params.id}`, apiLogger);

  return handleApiError(async () => {
    // Autenticar usuario
    const auth = authenticateApiRequest(request);
    if (auth.error) {
      apiLogger.warn("Autenticación fallida en GET /api/clientes/[id]", {
        clienteId: params.id,
        error: auth.error,
      });
      return NextResponse.json(auth.error, { status: auth.error.statusCode });
    }
    const { user } = auth;

    // Verificar permisos
    const permissionError = checkApiPermission(user, "read:all");
    if (permissionError) {
      apiLogger.warn("Permisos insuficientes en GET /api/clientes/[id]", {
        userId: user.userId,
        clienteId: params.id,
      });
      return permissionError;
    }

    // Validar parámetros de ruta
    const validation = await validateRequest(request, {
      paramsSchema: clienteIdSchema,
      params: { id: params.id },
    });

    if (!validation.success) {
      apiLogger.warn("Validación fallida en GET /api/clientes/[id]", {
        clienteId: params.id,
        errors: validation.response,
      });
      return validation.response!;
    }

    const { id } = validation.data!.params!;

    logApiOperation("GET", `/api/clientes/${id}`, user, "Obtener cliente");

    const client = await pool.connect();

    try {
      const dbTimer = startTimer("Query cliente by ID", apiLogger);
      const result = await client.query(
        `
        SELECT cliente_id, nombre, contacto, direccion, telefono, email FROM Clientes
        WHERE cliente_id = $1
        ORDER BY nombre
      `,
        [id]
      );
      dbTimer.endDb();

      if (result.rows.length === 0) {
        apiLogger.warn("Cliente no encontrado", { clienteId: id });
        throw new NotFoundError("Cliente");
      }

      apiLogger.info("Cliente obtenido exitosamente", {
        clienteId: id,
        nombre: result.rows[0].nombre,
      });

      timer.end();
      return NextResponse.json(result.rows[0]);
    } catch (dbError: any) {
      if (dbError instanceof NotFoundError) {
        throw dbError;
      }
      apiLogger.error("Error de base de datos en GET /api/clientes/[id]", {
        clienteId: id,
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
  const timer = startTimer(`PUT /api/clientes/${params.id}`, apiLogger);

  return handleApiError(async () => {
    // Autenticar usuario
    const auth = authenticateApiRequest(request);
    if (auth.error) {
      apiLogger.warn("Autenticación fallida en PUT /api/clientes/[id]", {
        clienteId: params.id,
        error: auth.error,
      });
      return NextResponse.json(auth.error, { status: auth.error.statusCode });
    }
    const { user } = auth;

    // Verificar permisos
    const permissionError = checkApiPermission(user, "write:all");
    if (permissionError) {
      apiLogger.warn("Permisos insuficientes en PUT /api/clientes/[id]", {
        userId: user.userId,
        clienteId: params.id,
      });
      return permissionError;
    }

    // Validar parámetros y body
    const validation = await validateRequest(request, {
      bodySchema: updateClienteSchema,
      paramsSchema: clienteIdSchema,
      params: { id: params.id },
      sanitize: true,
    });

    if (!validation.success) {
      apiLogger.warn("Validación fallida en PUT /api/clientes/[id]", {
        clienteId: params.id,
        errors: validation.response,
      });
      return validation.response!;
    }

    const clienteData = validation.data!.body!;
    const { id } = validation.data!.params!;

    // Verificar que el cliente existe
    const existsCheck = await validateClienteExists(id);
    if (!existsCheck.valid) {
      apiLogger.warn("Cliente no encontrado para actualización", {
        clienteId: id,
      });
      return NextResponse.json(
        { success: false, error: existsCheck.error },
        { status: 404 }
      );
    }

    // Validar unicidad de email si se está actualizando
    if (clienteData.email) {
      const emailCheck = await validateClienteEmailUnique(
        clienteData.email,
        id
      );
      if (!emailCheck.valid) {
        apiLogger.warn("Email duplicado en actualización", {
          clienteId: id,
          email: clienteData.email,
        });
        return NextResponse.json(
          {
            success: false,
            error: emailCheck.error,
            validation_errors: [{ field: "email", message: emailCheck.error! }],
          },
          { status: 400 }
        );
      }
    }

    logApiOperation(
      "PUT",
      `/api/clientes/${id}`,
      user,
      "Actualizar cliente",
      clienteData.nombre || ""
    );

    const client = await pool.connect();

    try {
      // Build dynamic update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (clienteData.nombre !== undefined) {
        updates.push(`nombre = $${paramIndex}`);
        values.push(clienteData.nombre);
        paramIndex++;
      }
      if (clienteData.contacto !== undefined) {
        updates.push(`contacto = $${paramIndex}`);
        values.push(clienteData.contacto || null);
        paramIndex++;
      }
      if (clienteData.direccion !== undefined) {
        updates.push(`direccion = $${paramIndex}`);
        values.push(clienteData.direccion);
        paramIndex++;
      }
      if (clienteData.telefono !== undefined) {
        updates.push(`telefono = $${paramIndex}`);
        values.push(clienteData.telefono);
        paramIndex++;
      }
      if (clienteData.email !== undefined) {
        updates.push(`email = $${paramIndex}`);
        values.push(clienteData.email);
        paramIndex++;
      }

      if (updates.length === 0) {
        apiLogger.warn("No hay campos para actualizar", { clienteId: id });
        return NextResponse.json(
          { success: false, error: "No hay campos para actualizar" },
          { status: 400 }
        );
      }

      values.push(id);

      const dbTimer = startTimer("Update cliente", apiLogger);
      const result = await client.query(
        `UPDATE Clientes SET ${updates.join(", ")} WHERE cliente_id = $${paramIndex} RETURNING *`,
        values
      );
      dbTimer.endDb();

      if (result.rows.length === 0) {
        apiLogger.warn("Cliente no encontrado al actualizar", {
          clienteId: id,
        });
        throw new NotFoundError("Cliente");
      }

      apiLogger.info("Cliente actualizado exitosamente", {
        clienteId: id,
        updatedFields: Object.keys(clienteData),
        userId: user.userId,
      });

      timer.end();
      return NextResponse.json(result.rows[0]);
    } catch (dbError: any) {
      if (dbError instanceof NotFoundError) {
        throw dbError;
      }
      apiLogger.error("Error de base de datos en PUT /api/clientes/[id]", {
        clienteId: id,
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
  const timer = startTimer(`DELETE /api/clientes/${params.id}`, apiLogger);

  return handleApiError(async () => {
    // Autenticar usuario
    const auth = authenticateApiRequest(request);
    if (auth.error) {
      apiLogger.warn("Autenticación fallida en DELETE /api/clientes/[id]", {
        clienteId: params.id,
        error: auth.error,
      });
      return NextResponse.json(auth.error, { status: auth.error.statusCode });
    }
    const { user } = auth;

    // Verificar permisos
    const permissionError = checkApiPermission(user, "delete:all");
    if (permissionError) {
      apiLogger.warn("Permisos insuficientes en DELETE /api/clientes/[id]", {
        userId: user.userId,
        clienteId: params.id,
      });
      return permissionError;
    }

    logApiOperation(
      "DELETE",
      `/api/clientes/${params.id}`,
      user,
      "Eliminar cliente"
    );

    const client = await pool.connect();

    try {
      const dbTimer = startTimer("Delete cliente", apiLogger);
      const result = await client.query(
        "DELETE FROM Clientes WHERE cliente_id = $1 RETURNING *",
        [params.id]
      );
      dbTimer.endDb();

      if (result.rows.length === 0) {
        apiLogger.warn("Cliente no encontrado para eliminación", {
          clienteId: params.id,
        });
        throw new NotFoundError("Cliente");
      }

      apiLogger.info("Cliente eliminado exitosamente", {
        clienteId: params.id,
        nombre: result.rows[0].nombre,
        userId: user.userId,
      });

      timer.end();
      return NextResponse.json({ message: "Cliente eliminado correctamente" });
    } catch (dbError: any) {
      if (dbError instanceof NotFoundError) {
        throw dbError;
      }

      // Manejar errores de integridad referencial (FK constraint)
      if (dbError.code === "23503") {
        apiLogger.warn("Intento de eliminar cliente en uso", {
          clienteId: params.id,
          error: dbError.message,
        });
        throw mapDatabaseError(dbError);
      }

      apiLogger.error("Error de base de datos en DELETE /api/clientes/[id]", {
        clienteId: params.id,
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
