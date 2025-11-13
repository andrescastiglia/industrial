import { NextRequest, NextResponse } from "next/server";

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
 * Solo verifica la PRESENCIA del token, no lo valida (la validación se hace en cada ruta API)
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Verificar si es una ruta pública
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // Rutas protegidas: requieren autenticación
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/api")) {
    // Extraer token del header Authorization o de las cookies
    const authHeader = request.headers.get("authorization");
    const cookieToken = request.cookies.get("token")?.value;
    const token = authHeader?.replace("Bearer ", "") || cookieToken;

    // Debug: Log para diagnosticar
    if (pathname.startsWith("/dashboard")) {
      console.log("[MIDDLEWARE] Dashboard access attempt:", {
        pathname,
        hasAuthHeader: !!authHeader,
        hasCookie: !!cookieToken,
        hasToken: !!token,
        cookieValue: cookieToken
          ? `${cookieToken.substring(0, 20)}...`
          : "none",
      });
    }

    // Si no hay token, rechazar
    if (!token) {
      console.log("[MIDDLEWARE] No token found, redirecting to login");
      // Si es una ruta API, devolver 401
      if (pathname.startsWith("/api")) {
        return NextResponse.json(
          { error: "Token de autenticación requerido" },
          { status: 401 }
        );
      }
      // Si es una ruta web, redirigir a login
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Token presente - permitir continuar
    console.log("[MIDDLEWARE] Token found, allowing access");
    // La validación JWT real se hace en cada ruta API con verifyAccessToken
    return NextResponse.next();
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
