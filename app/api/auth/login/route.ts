import { NextRequest, NextResponse } from "next/server";
import {
  generateTokenPair,
  verifyPassword,
  type JWTPayload,
  type UserRole,
} from "@/lib/auth";
import { pool } from "@/lib/database";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/login
 * Autentica un usuario y devuelve tokens JWT
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validación de inputs
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son requeridos" },
        { status: 400 }
      );
    }

    // Buscar usuario en base de datos
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT user_id, email, password_hash, role, nombre, apellido, is_active
         FROM usuarios 
         WHERE email = $1`,
        [email]
      );

      if (result.rows.length === 0) {
        console.log("[AUTH] Usuario no encontrado:", email);
        return NextResponse.json(
          { error: "Email o contraseña inválidos" },
          { status: 401 }
        );
      }

      const user = result.rows[0];

      // Verificar que el usuario esté activo
      if (!user.is_active) {
        console.log("[AUTH] Usuario desactivado:", email);
        return NextResponse.json(
          { error: "Usuario desactivado. Contacte al administrador" },
          { status: 403 }
        );
      }

      // Verificar password
      const isValidPassword = await verifyPassword(
        password,
        user.password_hash
      );
      if (!isValidPassword) {
        console.log("[AUTH] Password inválido para:", email);
        return NextResponse.json(
          { error: "Email o contraseña inválidos" },
          { status: 401 }
        );
      }

      // Actualizar last_login
      await client.query(
        `UPDATE usuarios SET last_login = NOW(), updated_at = NOW() WHERE user_id = $1`,
        [user.user_id]
      );

      // Generar tokens
      const payload: JWTPayload = {
        userId: user.user_id,
        email: user.email,
        role: user.role as UserRole,
      };

      const { accessToken, refreshToken } = generateTokenPair(payload);

      console.log("[AUTH] Login exitoso:", email, `(${user.role})`);

      // Crear respuesta
      const response = NextResponse.json(
        {
          accessToken,
          refreshToken,
          user: {
            id: user.user_id,
            email: user.email,
            role: user.role,
            nombre: user.nombre,
            apellido: user.apellido,
          },
        },
        { status: 200 }
      );

      // Set cookie para web app (seguridad adicional)
      response.cookies.set("auth-token", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 15, // 15 minutos
        path: "/",
      });

      return response;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("[AUTH] Error durante login:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
