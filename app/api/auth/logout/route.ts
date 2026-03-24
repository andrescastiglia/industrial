import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/business-constants";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/logout
 * Realiza logout del usuario (server-side cleanup si es necesario)
 * El cliente debe limpiar los tokens del localStorage
 */
export async function POST(request: NextRequest) {
  try {
    // En esta implementación, el logout es principalmente client-side
    // El servidor simplemente confirma la solicitud
    console.log("[AUTH] Logout ejecutado");

    // Crear respuesta
    const response = NextResponse.json(
      { message: "Logout exitoso" },
      { status: 200 }
    );

    // Limpiar cookie del token
    response.cookies.set(AUTH_COOKIE_NAME, "", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0, // Expira inmediatamente
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[AUTH] Error en logout:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
