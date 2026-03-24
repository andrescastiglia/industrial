import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/business-constants";

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
 * Proxy de Next.js para proteger rutas.
 * Solo verifica la presencia del token; la validación JWT real se hace en cada API.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/api")) {
    const authHeader = request.headers.get("authorization");
    const cookieToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    const token = authHeader?.replace("Bearer ", "") || cookieToken;

    if (pathname.startsWith("/dashboard")) {
      console.log("[PROXY] Dashboard access attempt:", {
        pathname,
        hasAuthHeader: !!authHeader,
        hasCookie: !!cookieToken,
        hasToken: !!token,
        cookieValue: cookieToken
          ? `${cookieToken.substring(0, 20)}...`
          : "none",
      });
    }

    if (!token) {
      console.log("[PROXY] No token found, redirecting to login");

      if (pathname.startsWith("/api")) {
        return NextResponse.json(
          { error: "Token de autenticación requerido" },
          { status: 401 }
        );
      }

      return NextResponse.redirect(new URL("/login", request.url));
    }

    console.log("[PROXY] Token found, allowing access");
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*", "/login"],
};
