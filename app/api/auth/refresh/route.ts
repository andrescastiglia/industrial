import { NextRequest, NextResponse } from "next/server";
import {
  verifyRefreshToken,
  generateAccessToken,
  AUTH_ERRORS,
} from "@/lib/auth";
import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_MAX_AGE_SECONDS,
} from "@/lib/business-constants";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/refresh
 * Refresca el access token usando el refresh token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { error: AUTH_ERRORS.MISSING_TOKEN.error },
        { status: AUTH_ERRORS.MISSING_TOKEN.statusCode }
      );
    }

    // Verificar refresh token
    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded) {
      return NextResponse.json(
        { error: AUTH_ERRORS.INVALID_TOKEN.error },
        { status: AUTH_ERRORS.INVALID_TOKEN.statusCode }
      );
    }

    // Generar nuevo access token
    const newAccessToken = generateAccessToken({
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    });

    const response = NextResponse.json(
      { accessToken: newAccessToken },
      { status: 200 }
    );

    response.cookies.set(AUTH_COOKIE_NAME, newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[AUTH] Error en refresh:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
