import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET =
  process.env.JWT_SECRET || "dev-secret-key-change-in-production";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-in-production";
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

/**
 * Tipos de autenticación
 */
export type UserRole = "admin" | "gerente" | "operario";

export interface JWTPayload {
  userId: number;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    email: string;
    role: UserRole;
  };
}

/**
 * Hash de contraseña
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Verificar contraseña
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generar JWT access token
 */
export function generateAccessToken(
  payload: Omit<JWTPayload, "iat" | "exp">
): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

/**
 * Generar JWT refresh token
 */
export function generateRefreshToken(
  payload: Omit<JWTPayload, "iat" | "exp">
): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

/**
 * Verificar JWT access token
 */
export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error("Error verifying access token:", error);
    return null;
  }
}

/**
 * Verificar JWT refresh token
 */
export function verifyRefreshToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error("Error verifying refresh token:", error);
    return null;
  }
}

/**
 * Generar ambos tokens (access + refresh)
 */
export function generateTokenPair(payload: Omit<JWTPayload, "iat" | "exp">): {
  accessToken: string;
  refreshToken: string;
} {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
}

/**
 * Extraer token del header Authorization
 */
export function extractTokenFromHeader(
  authHeader: string | null
): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;
  return parts[1];
}

/**
 * Validar que el token es Bearer válido
 */
export function isValidBearerToken(token: string | null): boolean {
  if (!token) return false;
  const decoded = verifyAccessToken(token);
  return decoded !== null;
}

/**
 * Tipos para respuestas de error
 */
export interface AuthError {
  error: string;
  statusCode: number;
}

export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: {
    error: "Email o contraseña inválidos",
    statusCode: 401,
  },
  MISSING_TOKEN: { error: "Token no proporcionado", statusCode: 401 },
  INVALID_TOKEN: { error: "Token inválido o expirado", statusCode: 401 },
  INSUFFICIENT_PERMISSIONS: {
    error: "Permisos insuficientes",
    statusCode: 403,
  },
  USER_NOT_FOUND: { error: "Usuario no encontrado", statusCode: 404 },
  USER_ALREADY_EXISTS: { error: "El usuario ya existe", statusCode: 409 },
  INVALID_ROLE: { error: "Rol inválido", statusCode: 400 },
} as const;
