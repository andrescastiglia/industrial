import { NextRequest, NextResponse } from "next/server";
import {
  verifyAccessToken,
  extractTokenFromHeader,
  AUTH_ERRORS,
} from "@/lib/auth";

/**
 * Rutas públicas que NO requieren autenticación
 */
const PUBLIC_ROUTES = [
  "/login",
  "/api/auth/login",
  "/api/auth/refresh",
  "/api/auth/logout",
];

/**
 * Middleware de Next.js para proteger rutas
 * Ejecuta en TODAS las solicitudes
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Verificar si es una ruta pública
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // Rutas protegidas: requieren autenticación
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/api")) {
    // Extraer token del header Authorization
    const authHeader = request.headers.get("authorization");
    const token = extractTokenFromHeader(authHeader);

    // Si no hay token, rechazar
    if (!token) {
      // Si es una ruta API, devolver 401
      if (pathname.startsWith("/api")) {
        return NextResponse.json(
          { error: AUTH_ERRORS.MISSING_TOKEN.error },
          { status: AUTH_ERRORS.MISSING_TOKEN.statusCode }
        );
      }
      // Si es una ruta web, redirigir a login
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Verificar token
    const decoded = verifyAccessToken(token);

    if (!decoded) {
      // Si es una ruta API, devolver 401
      if (pathname.startsWith("/api")) {
        return NextResponse.json(
          { error: AUTH_ERRORS.INVALID_TOKEN.error },
          { status: AUTH_ERRORS.INVALID_TOKEN.statusCode }
        );
      }
      // Si es una ruta web, redirigir a login
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Agregar info del usuario al header para usarlo en la ruta
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", decoded.userId.toString());
    requestHeaders.set("x-user-email", decoded.email);
    requestHeaders.set("x-user-role", decoded.role);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

/**
 * Configurar qué rutas ejecutan el middleware
 */
export const config = {
  matcher: [
    // Proteger todas las rutas del dashboard
    "/dashboard/:path*",
    // Proteger todas las rutas API
    "/api/:path*",
    // Permitir login
    "/login",
  ],
};
