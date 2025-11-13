# API Security Implementation Guide

## Overview

All API routes in the Industrial Management System are now protected with JWT (JSON Web Token) authentication and role-based access control (RBAC).

## Architecture

### Authentication Layers

1. **Middleware (`/middleware.ts`)**: Validates JWT tokens on all requests
   - Protects routes: `/dashboard/*`, `/api/*`
   - Extracts Bearer token from Authorization header
   - Redirects unauthenticated web requests to `/login`
   - Returns 401 for unauthenticated API requests
   - Adds user context headers (`x-user-id`, `x-user-email`, `x-user-role`)

2. **API Authentication (`/lib/api-auth.ts`)**: Per-route JWT verification
   - `authenticateApiRequest(request)`: Extracts and validates token
   - `checkApiPermission(user, permission)`: Verifies role-based access
   - `logApiOperation()`: Audit logging for all API operations

3. **JWT System (`/lib/auth.ts`)**: Token generation and validation
   - `generateAccessToken()`: 15-minute expiry access tokens
   - `generateRefreshToken()`: 7-day expiry refresh tokens
   - `verifyAccessToken()`: Validates and decodes access tokens
   - Password hashing with bcryptjs (10 salt rounds)

## Demo Credentials (Development Only)

**Production User:**

```
EMAIL: admin@ejemplo.com
PASSWORD: peperino
ROLE: admin (Full system access)
```

⚠️ **IMPORTANTE**: Después del primer login en producción, debe cambiar este password inmediatamente usando el endpoint `/api/auth/change-password` o creando un nuevo usuario admin y desactivando este.

**Note**: Los usuarios demo anteriores (`gerente@ejemplo.com`, `operario@ejemplo.com`) han sido removidos. Ahora todos los usuarios se gestionan desde la base de datos PostgreSQL.

## Testing the API

### 1. Login and Get Token

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ejemplo.com",
    "password": "peperino"
  }'
```

Response:

```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": 1,
    "email": "admin@ejemplo.com",
    "role": "admin"
  }
}
```

### 2. Call Protected API Endpoint

Use the `accessToken` in Authorization header:

```bash
curl -X GET http://localhost:3000/api/clientes \
  -H "Authorization: Bearer eyJhbGc..."
```

### 3. Refresh Token

When access token expires (15 minutes), refresh it:

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGc..."
  }'
```

Response:

```json
{
  "accessToken": "eyJhbGc... (new token)"
}
```

### 4. Test Permissions

Only `admin` and `gerente` roles can write:

```bash
# This works (admin role has write:all permission)
curl -X POST http://localhost:3000/api/clientes \
  -H "Authorization: Bearer {adminToken}" \
  -H "Content-Type: application/json" \
  -d '{"nombre": "Test", "email": "test@test.com"}'

# This fails (operario role only has read:all, write:own)
curl -X POST http://localhost:3000/api/clientes \
  -H "Authorization: Bearer {operarioToken}" \
  -H "Content-Type: application/json" \
  -d '{"nombre": "Test", "email": "test@test.com"}'

# Response: 403 Forbidden
# {"error": "Permisos insuficientes", "statusCode": 403}
```

## Protected Endpoints

All endpoints in `/app/api/**` (except `/auth/*`) now require JWT authentication:

### Fully Protected (All HTTP Methods)

- `GET/POST /api/clientes`
- `GET/PUT/DELETE /api/clientes/:id`
- `GET/POST /api/productos`
- `GET/PUT/DELETE /api/productos/:id`
- `GET/POST /api/materia-prima`
- `GET/PUT/DELETE /api/materia-prima/:id`
- `GET/POST /api/ordenes-produccion`
- `GET/PUT/DELETE /api/ordenes-produccion/:id`
- `GET/POST /api/proveedores`
- `GET/PUT/DELETE /api/proveedores/:id`
- `GET/POST /api/operarios`
- `GET/PUT/DELETE /api/operarios/:id`
- `GET/POST /api/compras`
- `GET/POST /api/ventas`
- `DELETE /api/ventas/:id`
- `GET /api/dashboard`
- `PUT /api/inventario/movimientos`
- `GET/POST /api/tipo-componente`

### Public Endpoints (No Auth Required)

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /login`

### Admin Only Endpoints

- `POST /api/auth/register` - Crear nuevos usuarios (solo admin)
- `GET /api/auth/register` - Listar usuarios (solo admin)

## Role-Based Permissions

### Admin Role

- `read:all` - Read all data
- `write:all` - Create/edit all data
- `delete:all` - Delete all data
- `manage:users` - Manage user accounts
- `manage:reports` - Generate and manage reports
- `export:data` - Export system data
- `manage:settings` - Modify system settings

### Gerente (Manager) Role

- `read:all` - Read all data
- `write:all` - Create/edit all data
- `delete:all` - Delete all data
- `manage:reports` - Generate and manage reports
- `export:data` - Export system data

### Operario (Worker) Role

- `read:all` - Read all data
- `write:own` - Create/edit only own data

## Error Responses

### Missing Token (401)

```json
{
  "error": "Token no proporcionado",
  "statusCode": 401
}
```

### Invalid/Expired Token (401)

```json
{
  "error": "Token inválido o expirado",
  "statusCode": 401
}
```

### Insufficient Permissions (403)

```json
{
  "error": "Permisos insuficientes",
  "statusCode": 403,
  "details": "Permiso requerido: write:all"
}
```

### Invalid Credentials (401)

```json
{
  "error": "Email o contraseña inválidos",
  "statusCode": 401
}
```

## Implementation Details

### Each API Route Pattern

```typescript
import {
  authenticateApiRequest,
  checkApiPermission,
  logApiOperation,
} from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    // Step 1: Authenticate user
    const auth = authenticateApiRequest(request);
    if (auth.error) {
      return NextResponse.json(auth.error, { status: auth.error.statusCode });
    }
    const { user } = auth;

    // Step 2: Check permissions
    const permissionError = checkApiPermission(user, "read:all");
    if (permissionError) return permissionError;

    // Step 3: Log the operation
    logApiOperation("GET", "/api/clientes", user, "Listar todos los clientes");

    // Step 4: Proceed with business logic
    const client = await pool.connect();
    // ... rest of implementation
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

## Client-Side Integration

Use the `useAuth` hook in React components:

```typescript
"use client";

import { useAuth } from "@/hooks/useAuth";

export function MyComponent() {
  const { user, isAuthenticated, loading, logout, refreshToken } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Not authenticated</div>;

  // Make authenticated API calls
  async function fetchData() {
    const response = await fetch('/api/clientes', {
      headers: {
        'Authorization': `Bearer ${user.token}`
      }
    });
    const data = await response.json();
    return data;
  }

  return (
    <div>
      <p>Welcome, {user.email}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

## Audit Logging

All API operations are logged in the format:

```
[API_AUDIT] 2024-01-15T10:30:45.123Z | User: admin@ejemplo.com (admin) | Method: POST | Endpoint: /api/clientes | Action: Crear nuevo cliente | Details: Acme Corp
```

## Security Best Practices

1. **Store Tokens Securely**: Access tokens stored in localStorage (not ideal for XSS protection, but acceptable for MVP)
2. **Token Expiry**: Access tokens expire after 15 minutes, refresh tokens after 7 days
3. **Password Hashing**: Passwords hashed with bcryptjs (salt rounds: 10)
4. **HTTPS in Production**: Always use HTTPS to prevent token interception
5. **Environment Variables**: Store `JWT_SECRET` and `JWT_REFRESH_SECRET` in secure environment

## Next Steps

### ✅ Completed Tasks

- ✅ **Task 1: Database schema updates**
  - Tabla `users` creada en [`scripts/database-schema.sql`](scripts/database-schema.sql )
  - Usuario admin inicial con email `admin@ejemplo.com` y password `peperino`
  - Campos: `user_id`, `email`, `password_hash`, `role`, `nombre`, `apellido`, `created_at`, `updated_at`, `last_login`, `is_active`
  - Índices creados para optimizar consultas de autenticación

- ✅ **Task 3: Documentation updates**
  - Documentado proceso de creación de usuarios en producción
  - Actualizado [`API_SECURITY_GUIDE.md`](API_SECURITY_GUIDE.md ) con credenciales correctas
  - Agregado endpoint `/api/auth/register` para gestión de usuarios

### ⏳ Pending Tasks

- ⏳ **Task 2: Rate limiting** - Protección contra brute force attacks
  - Implementar límite de requests por IP/usuario
  - Recomendado: `@upstash/ratelimit` o `express-rate-limit`
  - Aplicar especialmente a `/api/auth/login`

## Production Setup

### Step 1: Execute Database Migration

```bash
# Conectar a la base de datos de producción
psql $DATABASE_URL

# Ejecutar el script de schema
\i scripts/database-schema.sql

# Verificar que la tabla users fue creada
\dt users

# Verificar que el usuario admin existe
SELECT user_id, email, role, nombre, is_active FROM users WHERE email = 'admin@ejemplo.com';
```

### Step 2: First Login and Create Admin User

```bash
# 1. Login con usuario inicial
curl -X POST https://tuapp.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ejemplo.com",
    "password": "peperino"
  }'

# 2. Crear tu usuario admin personal (reemplazar {TOKEN} con el accessToken del paso 1)
curl -X POST https://tuapp.com/api/auth/register \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tu-email@empresa.com",
    "password": "tu-password-seguro",
    "role": "admin",
    "nombre": "Tu Nombre",
    "apellido": "Tu Apellido"
  }'

# 3. Desactivar usuario demo (recomendado para seguridad)
# Conectar a la BD y ejecutar:
# UPDATE users SET is_active = FALSE WHERE email = 'admin@ejemplo.com';
```

### Step 3: Create Additional Users

```bash
# Crear usuario gerente
curl -X POST https://tuapp.com/api/auth/register \
  -H "Authorization: Bearer {ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "gerente@empresa.com",
    "password": "password123",
    "role": "gerente",
    "nombre": "Nombre",
    "apellido": "Apellido"
  }'

# Crear usuario operario
curl -X POST https://tuapp.com/api/auth/register \
  -H "Authorization: Bearer {ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "operario@empresa.com",
    "password": "password123",
    "role": "operario",
    "nombre": "Nombre",
    "apellido": "Apellido"
  }'
```

### Step 4: List All Users (Admin Only)

```bash
curl -X GET https://tuapp.com/api/auth/register \
  -H "Authorization: Bearer {ADMIN_TOKEN}"
```

Response:

```json
{
  "users": [
    {
      "user_id": 1,
      "email": "admin@ejemplo.com",
      "role": "admin",
      "nombre": "Admin",
      "apellido": "Sistema",
      "created_at": "2025-11-13T10:00:00.000Z",
      "last_login": "2025-11-13T15:30:00.000Z",
      "is_active": true
    },
    {
      "user_id": 2,
      "email": "tu-email@empresa.com",
      "role": "admin",
      "nombre": "Tu Nombre",
      "apellido": "Tu Apellido",
      "created_at": "2025-11-13T15:00:00.000Z",
      "last_login": null,
      "is_active": true
    }
  ],
  "total": 2
}
```

## Security Checklist for Production

- [ ] Ejecutar migración de base de datos (`scripts/database-schema.sql`)
- [ ] Verificar que usuario admin inicial existe
- [ ] Realizar primer login y crear usuario admin personal
- [ ] Desactivar o cambiar password del usuario demo `admin@ejemplo.com`
- [ ] Configurar variables de entorno (`JWT_SECRET`, `JWT_REFRESH_SECRET`, `DATABASE_URL`)
- [ ] Habilitar HTTPS en producción
- [ ] Implementar rate limiting en endpoints de auth
- [ ] Configurar backup automático de la base de datos
- [ ] Monitorear logs de auditoría (`[API_AUDIT]`)
- [ ] Documentar proceso de recuperación de contraseña (próxima implementación)
