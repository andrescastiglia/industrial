import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";
import { hashPassword } from "@/lib/auth";
import {
  authenticateApiRequest,
  checkApiPermission,
  logApiOperation,
} from "@/lib/api-auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/register
 * Crea un nuevo usuario en el sistema (solo admins)
 */
export async function POST(request: NextRequest) {
  try {
    // Autenticar request
    const auth = authenticateApiRequest(request);
    if (auth.error) {
      return NextResponse.json(auth.error, { status: auth.error.statusCode });
    }

    // Verificar que sea admin (solo admins pueden crear usuarios)
    const permissionError = checkApiPermission(auth.user, "manage:users");
    if (permissionError) return permissionError;

    // Validar body
    const body = await request.json();
    const { email, password, role, nombre, apellido } = body;

    if (!email || !password || !role) {
      return NextResponse.json(
        { error: "Email, password y role son requeridos" },
        { status: 400 }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Formato de email inválido" },
        { status: 400 }
      );
    }

    // Validar longitud de password
    if (password.length < 6) {
      return NextResponse.json(
        { error: "El password debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    // Validar rol
    if (!["admin", "gerente", "operario"].includes(role)) {
      return NextResponse.json(
        { error: "Rol inválido. Debe ser: admin, gerente, operario" },
        { status: 400 }
      );
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Insertar usuario
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO users (email, password_hash, role, nombre, apellido)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING user_id, email, role, nombre, apellido, created_at, is_active`,
        [email, password_hash, role, nombre, apellido]
      );

      // Log de auditoría
      logApiOperation(
        "POST",
        "/api/auth/register",
        auth.user,
        `Usuario creado: ${email} (${role})`
      );

      return NextResponse.json(
        {
          message: "Usuario creado exitosamente",
          user: result.rows[0],
        },
        { status: 201 }
      );
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("[AUTH] Error creating user:", error);

    // Error de email duplicado
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "El email ya está registrado" },
        { status: 409 }
      );
    }

    // Error de constraint de rol
    if (error.code === "23514") {
      return NextResponse.json(
        { error: "Rol inválido. Debe ser: admin, gerente, operario" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Error al crear usuario" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/register
 * Lista todos los usuarios (solo admins)
 */
export async function GET(request: NextRequest) {
  try {
    // Autenticar request
    const auth = authenticateApiRequest(request);
    if (auth.error) {
      return NextResponse.json(auth.error, { status: auth.error.statusCode });
    }

    // Verificar que sea admin
    const permissionError = checkApiPermission(auth.user, "manage:users");
    if (permissionError) return permissionError;

    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT user_id, email, role, nombre, apellido, created_at, last_login, is_active
         FROM users
         ORDER BY created_at DESC`
      );

      return NextResponse.json({
        users: result.rows,
        total: result.rows.length,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("[AUTH] Error listing users:", error);
    return NextResponse.json(
      { error: "Error al listar usuarios" },
      { status: 500 }
    );
  }
}
