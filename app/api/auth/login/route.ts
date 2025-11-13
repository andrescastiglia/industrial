import { NextRequest, NextResponse } from "next/server";
import {
  generateTokenPair,
  hashPassword,
  verifyPassword,
  AUTH_ERRORS,
  type JWTPayload,
  type UserRole,
} from "@/lib/auth";
import { pool } from "@/lib/database";

// Mock users - en producción esto vendría de la BD
const DEMO_USERS = [
  {
    id: 1,
    email: "admin@ejemplo.com",
    passwordHash:
      "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36MM4FS2", // admin123
    role: "admin" as UserRole,
  },
  {
    id: 2,
    email: "gerente@ejemplo.com",
    passwordHash:
      "$2a$10$SZJvJQkdMeqnP4KVZKZcWOr6pVp4VNsR9c3tC3z2K2P3M4N5O6P7Q", // gerente123
    role: "gerente" as UserRole,
  },
  {
    id: 3,
    email: "operario@ejemplo.com",
    passwordHash: "$2a$10$Tb9H4c6h0C5b0C1c0B0C0OqR3P4M5L6K7J8I9H0G1F2E3D4C5B6A", // operario123
    role: "operario" as UserRole,
  },
];

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
        { error: AUTH_ERRORS.INVALID_CREDENTIALS.error },
        { status: 400 }
      );
    }

    // Buscar usuario (por ahora usando mock data)
    // TODO: Implementar búsqueda real en BD cuando la tabla Usuarios esté lista
    const user = DEMO_USERS.find((u) => u.email === email);

    if (!user) {
      return NextResponse.json(
        { error: AUTH_ERRORS.INVALID_CREDENTIALS.error },
        { status: AUTH_ERRORS.INVALID_CREDENTIALS.statusCode }
      );
    }

    // Verificar contraseña
    // En desarrollo, permitir contraseña simple para demo
    const isValidPassword =
      process.env.NODE_ENV === "development"
        ? password === email.split("@")[0] + "123"
        : await verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: AUTH_ERRORS.INVALID_CREDENTIALS.error },
        { status: AUTH_ERRORS.INVALID_CREDENTIALS.statusCode }
      );
    }

    // Generar tokens
    const payload: Omit<JWTPayload, "iat" | "exp"> = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const { accessToken, refreshToken } = generateTokenPair(payload);

    // Log del login exitoso (para auditoría)
    console.log(`[AUTH] Login exitoso: ${user.email} (${user.role})`);

    // Crear respuesta con cookies
    const response = NextResponse.json(
      {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      },
      { status: 200 }
    );

    // Establecer cookie con el token (7 días de expiración)
    response.cookies.set("token", accessToken, {
      httpOnly: false, // Permitir acceso desde JavaScript para compatibilidad
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 días
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[AUTH] Error en login:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
