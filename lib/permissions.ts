import { type UserRole, type JWTPayload } from "@/lib/auth";

/**
 * Definición de permisos por rol
 * Cada rol puede realizar ciertas acciones en ciertos recursos
 */
export type Permission =
  | "read:all"
  | "write:all"
  | "delete:all"
  | "read:own"
  | "write:own"
  | "manage:users"
  | "manage:reports"
  | "export:data"
  | "manage:settings";

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    "read:all",
    "write:all",
    "delete:all",
    "manage:users",
    "manage:reports",
    "export:data",
    "manage:settings",
  ],
  gerente: [
    "read:all",
    "write:all",
    "delete:all",
    "manage:reports",
    "export:data",
  ],
  operario: ["read:all", "write:own"],
};

/**
 * Verificar si un usuario tiene una permiso específica
 */
export function hasPermission(
  user: JWTPayload,
  permission: Permission
): boolean {
  const userPermissions = ROLE_PERMISSIONS[user.role];
  return userPermissions.includes(permission);
}

/**
 * Verificar si un usuario tiene CUALQUIERA de las permiso especificadas
 */
export function hasAnyPermission(
  user: JWTPayload,
  permissions: Permission[]
): boolean {
  return permissions.some((permission) => hasPermission(user, permission));
}

/**
 * Verificar si un usuario tiene TODAS las permiso especificadas
 */
export function hasAllPermissions(
  user: JWTPayload,
  permissions: Permission[]
): boolean {
  return permissions.every((permission) => hasPermission(user, permission));
}

/**
 * Descripción legible de cada rol
 */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: "Administrador - Acceso total al sistema",
  gerente: "Gerente - Acceso a reportes y gestión general",
  operario: "Operario - Acceso a funciones operativas básicas",
};

/**
 * Descripción de permisos
 */
export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  "read:all": "Leer todos los datos",
  "write:all": "Crear y editar todos los datos",
  "delete:all": "Eliminar todos los datos",
  "read:own": "Leer datos propios",
  "write:own": "Crear y editar datos propios",
  "manage:users": "Gestionar usuarios",
  "manage:reports": "Gestionar reportes",
  "export:data": "Exportar datos",
  "manage:settings": "Gestionar configuración",
};
