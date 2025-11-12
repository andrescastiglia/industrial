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

    // Validar parámetros de ruta
    const validation = await validateRequest(request, {
      paramsSchema: clienteIdSchema,
      params: { id: params.id },
    });

    if (!validation.success) {
      return validation.response!;
    }

    const { id } = validation.data!.params!;

    logApiOperation("GET", `/api/clientes/${id}`, user, "Obtener cliente");

    const client = await pool.connect();

    const result = await client.query(
      `
      SELECT cliente_id, nombre, contacto, direccion, telefono, email FROM Clientes
      WHERE cliente_id = $1
      ORDER BY nombre
    `,
      [id]
    );

    client.release();

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching cliente:", error);
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

    // Validar parámetros y body
    const validation = await validateRequest(request, {
      bodySchema: updateClienteSchema,
      paramsSchema: clienteIdSchema,
      params: { id: params.id },
      sanitize: true,
    });

    if (!validation.success) {
      return validation.response!;
    }

    const clienteData = validation.data!.body!;
    const { id } = validation.data!.params!;

    // Verificar que el cliente existe
    const existsCheck = await validateClienteExists(id);
    if (!existsCheck.valid) {
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
      return NextResponse.json(
        { success: false, error: "No hay campos para actualizar" },
        { status: 400 }
      );
    }

    values.push(id);

    const result = await client.query(
      `UPDATE Clientes SET ${updates.join(", ")} WHERE cliente_id = $${paramIndex} RETURNING *`,
      values
    );

    client.release();

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating cliente:", error);
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
      `/api/clientes/${params.id}`,
      user,
      "Eliminar cliente"
    );

    const client = await pool.connect();

    const result = await client.query(
      "DELETE FROM Clientes WHERE cliente_id = $1 RETURNING *",
      [params.id]
    );

    client.release();

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Cliente eliminado correctamente" });
  } catch (error) {
    console.error("Error deleting cliente:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
