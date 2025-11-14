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

import { handleApiError, mapDatabaseError } from "@/lib/error-handler";

import { apiLogger, startTimer } from "@/lib/logger";
import { withTrace } from "@/lib/otel-logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const timer = startTimer("GET /api/clientes", apiLogger);

  return handleApiError(async () => {
    // Autenticar usuario
    const auth = authenticateApiRequest(request);
    if (auth.error) {
      apiLogger.warn("Autenticación fallida en GET /api/clientes", {
        error: auth.error,
      });
      return NextResponse.json(auth.error, { status: auth.error.statusCode });
    }
    const { user } = auth;

    // Verificar permisos
    const permissionError = checkApiPermission(user, "read:all");
    if (permissionError) {
      apiLogger.warn("Permisos insuficientes en GET /api/clientes", {
        userId: user.userId,
        role: user.role,
      });
      return permissionError;
    }

    // Validar parámetros de consulta
    const validation = await validateRequest(request, {
      querySchema: filterClienteSchema,
    });

    if (!validation.success) {
      apiLogger.warn("Validación fallida en GET /api/clientes", {
        errors: validation.response,
      });
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

    try {
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

      const dbTimer = startTimer("Query clientes", apiLogger);
      const result = await client.query(query, queryParams);
      const duration = dbTimer.endDb();

      apiLogger.info("Clientes obtenidos exitosamente", {
        count: result.rows.length,
        filters,
        duration,
      });

      const totalDuration = timer.end();
      return NextResponse.json(result.rows);
    } catch (dbError: any) {
      apiLogger.error("Error de base de datos en GET /api/clientes", {
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
export async function POST(request: NextRequest) {
  const timer = startTimer("POST /api/clientes", apiLogger);

  return withTrace("POST /api/clientes", async (span) => {
    return handleApiError(async () => {
      // Autenticar usuario
      const auth = authenticateApiRequest(request);

      if (auth.user) {
        span?.setAttribute("user.id", auth.user.userId);
        span?.setAttribute("user.role", auth.user.role);
      }
      if (auth.error) {
        apiLogger.warn("Autenticación fallida en POST /api/clientes", {
          error: auth.error,
        });
        return NextResponse.json(auth.error, { status: auth.error.statusCode });
      }
      const { user } = auth;

      // Verificar permisos
      const permissionError = checkApiPermission(user, "write:all");
      if (permissionError) {
        apiLogger.warn("Permisos insuficientes en POST /api/clientes", {
          userId: user.userId,
          role: user.role,
        });
        return permissionError;
      }

      // Validar y sanitizar body
      const validation = await validateRequest(request, {
        bodySchema: createClienteSchema,
        sanitize: true,
      });

      if (!validation.success) {
        apiLogger.warn("Validación fallida en POST /api/clientes", {
          errors: validation.response,
        });
        return validation.response!;
      }

      const clienteData = validation.data!.body!;

      // Validar unicidad de email
      const emailCheck = await validateClienteEmailUnique(clienteData.email);
      if (!emailCheck.valid) {
        apiLogger.warn("Email duplicado en POST /api/clientes", {
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

      logApiOperation(
        "POST",
        "/api/clientes",
        user,
        "Crear nuevo cliente",
        `${clienteData.nombre}`
      );

      const client = await pool.connect();

      try {
        const dbTimer = startTimer("Insert cliente", apiLogger);
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
        dbTimer.endDb();

        apiLogger.info("Cliente creado exitosamente", {
          clienteId: result.rows[0].cliente_id,
          nombre: result.rows[0].nombre,
          userId: user.userId,
        });

        const totalDuration = timer.end();

        return NextResponse.json(
          {
            success: true,
            data: result.rows[0],
            message: "Cliente creado exitosamente",
          },
          { status: 201 }
        );
      } catch (dbError: any) {
        apiLogger.error("Error de base de datos en POST /api/clientes", {
          error: {
            message: dbError.message,
            code: dbError.code,
            stack: dbError.stack,
          },
          clienteData: {
            nombre: clienteData.nombre,
            email: clienteData.email,
          },
        });
        throw mapDatabaseError(dbError);
      } finally {
        client.release();
      }
    }, request);
  });
}
