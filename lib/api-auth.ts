import { NextRequest, NextResponse } from "next/server";
import {
  verifyAccessToken,
  extractTokenFromHeader,
  AUTH_ERRORS,
  type JWTPayload,
  type UserRole,
} from "./auth";
import { hasPermission, type Permission } from "./permissions";

/**
 * Contexto de usuario extraído del JWT para usar en rutas API
 */
export interface ApiUserContext {
  userId: number;
  email: string;
  role: UserRole;
}

/**
 * Respuesta de error de autenticación
 */
export interface ApiAuthError {
  error: string;
  statusCode: number;
  details?: string;
}

/**
 * Verificar y extraer usuario del JWT en request de API
 * Retorna el usuario o un objeto de error
 */
export function authenticateApiRequest(
  request: NextRequest
): { user: ApiUserContext; error: null } | { user: null; error: ApiAuthError } {
  try {
    // Extraer token del header Authorization o de la cookie
    const authHeader = request.headers.get("authorization");
    let token = extractTokenFromHeader(authHeader);

    // Si no hay token en el header, intentar obtenerlo de la cookie
    if (!token) {
      token = request.cookies.get("token")?.value || null;
    }

    if (!token) {
      return {
        user: null,
        error: {
          error: AUTH_ERRORS.MISSING_TOKEN.error,
          statusCode: AUTH_ERRORS.MISSING_TOKEN.statusCode,
        },
      };
    }

    // Verificar token
    const payload = verifyAccessToken(token);
    if (!payload) {
      return {
        user: null,
        error: {
          error: AUTH_ERRORS.INVALID_TOKEN.error,
          statusCode: AUTH_ERRORS.INVALID_TOKEN.statusCode,
        },
      };
    }

    return {
      user: {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
      },
      error: null,
    };
  } catch (error) {
    console.error("[API_AUTH] Error during authentication:", error);
    return {
      user: null,
      error: {
        error: AUTH_ERRORS.INVALID_TOKEN.error,
        statusCode: AUTH_ERRORS.INVALID_TOKEN.statusCode,
        details: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}

/**
 * Middleware para proteger rutas API
 * Debe ser llamado al inicio de cada handler GET/POST/PUT/DELETE
 *
 * Uso:
 * export async function GET(request: NextRequest) {
 *   const auth = authenticateApiRequest(request);
 *   if (auth.error) {
 *     return NextResponse.json(auth.error, { status: auth.error.statusCode });
 *   }
 *   const { user } = auth;
 *   // resto del código...
 * }
 */

/**
 * Helper para verificar permisos en rutas API
 * Retorna null si tiene permiso, o un Response de error si no
 */
export function checkApiPermission(
  user: ApiUserContext,
  requiredPermission: Permission
): NextResponse<ApiAuthError> | null {
  const userPayload: JWTPayload = {
    userId: user.userId,
    email: user.email,
    role: user.role,
  };
  if (!hasPermission(userPayload, requiredPermission)) {
    const error: ApiAuthError = {
      error: AUTH_ERRORS.INSUFFICIENT_PERMISSIONS.error,
      statusCode: AUTH_ERRORS.INSUFFICIENT_PERMISSIONS.statusCode,
      details: `Permiso requerido: ${requiredPermission}`,
    };
    return NextResponse.json(error, { status: error.statusCode });
  }
  return null;
}

/**
 * Helper para crear respuestas de error de API autenticadas
 */
export function createApiErrorResponse(
  error: ApiAuthError
): NextResponse<ApiAuthError> {
  return NextResponse.json(error, { status: error.statusCode });
}

/**
 * Audit logging para operaciones de API
 */
export function logApiOperation(
  method: string,
  endpoint: string,
  user: ApiUserContext,
  action: string,
  details?: string
): void {
  const timestamp = new Date().toISOString();
  const message = `[API_AUDIT] ${timestamp} | User: ${user.email} (${user.role}) | Method: ${method} | Endpoint: ${endpoint} | Action: ${action}${details ? ` | Details: ${details}` : ""}`;
  console.log(message);
}
