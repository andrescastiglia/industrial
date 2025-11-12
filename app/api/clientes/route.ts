import { type NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";
import {
  authenticateApiRequest,
  checkApiPermission,
  logApiOperation,
} from "@/lib/api-auth";
import { validateRequest } from "@/lib/api-validation";
import {
  createClienteSchema,
  filterClienteSchema,
} from "@/lib/validations/clientes";
import { validateClienteEmailUnique } from "@/lib/validation-helpers";

export async function GET(request: NextRequest) {
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

    // Validar parámetros de consulta
    const validation = await validateRequest(request, {
      querySchema: filterClienteSchema,
    });

    if (!validation.success) {
      return validation.response!;
    }

    const filters = validation.data?.query;

    logApiOperation(
      "GET",
      "/api/clientes",
      user,
      "Listar todos los clientes",
      JSON.stringify(filters)
    );

    const client = await pool.connect();

    // Build dynamic query based on filters
    let query =
      "SELECT cliente_id, nombre, contacto, direccion, telefono, email FROM Clientes WHERE 1=1";
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (filters?.nombre) {
      query += ` AND nombre ILIKE $${paramIndex}`;
      queryParams.push(`%${filters.nombre}%`);
      paramIndex++;
    }

    if (filters?.email) {
      query += ` AND email ILIKE $${paramIndex}`;
      queryParams.push(`%${filters.email}%`);
      paramIndex++;
    }

    if (filters?.search) {
      query += ` AND (nombre ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR contacto ILIKE $${paramIndex})`;
      queryParams.push(`%${filters.search}%`);
      paramIndex++;
    }

    query += " ORDER BY nombre";

    const result = await client.query(query, queryParams);

    client.release();

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching clientes:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    // Validar y sanitizar body
    const validation = await validateRequest(request, {
      bodySchema: createClienteSchema,
      sanitize: true,
    });

    if (!validation.success) {
      return validation.response!;
    }

    const clienteData = validation.data!.body!;

    // Validar unicidad de email
    const emailCheck = await validateClienteEmailUnique(clienteData.email);
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

    logApiOperation(
      "POST",
      "/api/clientes",
      user,
      "Crear nuevo cliente",
      `${clienteData.nombre}`
    );

    const client = await pool.connect();

    const result = await client.query(
      `
      INSERT INTO Clientes (nombre, contacto, direccion, telefono, email)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
      [
        clienteData.nombre,
        clienteData.contacto || null,
        clienteData.direccion,
        clienteData.telefono,
        clienteData.email,
      ]
    );

    client.release();

    return NextResponse.json(
      {
        success: true,
        data: result.rows[0],
        message: "Cliente creado exitosamente",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating cliente:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
