# Guía de Manejo de Errores

**Sistema Industrial - Gestión de Excepciones y Logging**

Documentación completa del sistema de manejo de errores implementado en Fase 1 - Sección 2: "Manejo de Errores Uniforme"

---

## 📋 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Clases de Error](#clases-de-error)
4. [Códigos de Error](#códigos-de-error)
5. [Sistema de Logging](#sistema-de-logging)
6. [Integración con Sentry](#integración-con-sentry)
7. [Uso en API Routes](#uso-en-api-routes)
8. [Ejemplos Prácticos](#ejemplos-prácticos)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## Introducción

El sistema de manejo de errores proporciona:

- ✅ **Clases de error estandarizadas** con códigos consistentes
- ✅ **Logging estructurado** con Winston (consola + archivos)
- ✅ **Error tracking** con Sentry para producción
- ✅ **Respuestas uniformes** de API
- ✅ **Mapeo automático** de errores de base de datos
- ✅ **Performance timing** integrado
- ✅ **Context tracking** para debugging

---

## Arquitectura del Sistema

### Componentes Principales

```
lib/
├── error-handler.ts    # Clases de error, códigos, helpers
├── logger.ts           # Winston logging con transports
sentry.client.config.ts # Sentry para browser
sentry.server.config.ts # Sentry para Node.js
sentry.edge.config.ts   # Sentry para Edge Runtime
```

### Flujo de Error Handling

```
Request → API Route Handler
    ↓
Validación (Zod schemas)
    ↓
Operación de Negocio/DB
    ↓ (error)
ApiError/DatabaseError
    ↓
handleApiError() wrapper
    ↓
createErrorResponse()
    ↓
NextResponse.json()
    ↓ (en paralelo)
Winston Logger → logs/error.log
Sentry (si producción)
```

---

## Clases de Error

### Jerarquía de Clases

```typescript
Error (nativo)
  └── ApiError (base)
        ├── AuthenticationError
        ├── AuthorizationError
        ├── ValidationError
        ├── NotFoundError
        ├── ConflictError
        ├── ResourceInUseError
        ├── DatabaseError
        ├── BusinessError
        └── SystemError
```

### ApiError (Clase Base)

```typescript
class ApiError extends Error {
  code: ErrorCode; // Código estandarizado
  statusCode: number; // HTTP status code
  details?: Record<string, any>; // Metadatos adicionales
  isOperational: boolean; // true = esperado, false = bug
}
```

**Propiedades:**

- `code`: Código de error estandarizado (ver sección Códigos de Error)
- `statusCode`: Código HTTP (400, 401, 404, 500, etc.)
- `details`: Objeto con información adicional del contexto
- `isOperational`: Indica si es un error esperado (negocio) o bug de programación

### AuthenticationError

**Uso:** Token inválido/expirado, credenciales incorrectas

```typescript
throw new AuthenticationError("Token de acceso expirado", ERROR_CODES.AUTH_005);
```

**Status Code:** `401 Unauthorized`

**Ejemplos de uso:**

- Token JWT inválido
- Token expirado
- Credenciales incorrectas
- Usuario no encontrado

### AuthorizationError

**Uso:** Permisos insuficientes

```typescript
throw new AuthorizationError(
  "Necesitas permisos de administrador",
  ERROR_CODES.AUTH_004,
  { requiredRole: "administrador", userRole: "operario" }
);
```

**Status Code:** `403 Forbidden`

### ValidationError

**Uso:** Datos de entrada inválidos

```typescript
throw new ValidationError("Email inválido", ERROR_CODES.VAL_003, {
  field: "email",
  value: "not-an-email",
});
```

**Status Code:** `400 Bad Request`

**Casos comunes:**

- Formato inválido
- Campo requerido faltante
- Valor fuera de rango
- Violación de regla de negocio

### NotFoundError

**Uso:** Recurso no encontrado

```typescript
throw new NotFoundError("Cliente", ERROR_CODES.RES_001, {
  clienteId: 123,
});
```

**Status Code:** `404 Not Found`

### ConflictError

**Uso:** Recurso duplicado (violación de unicidad)

```typescript
throw new ConflictError(
  "Ya existe un cliente con ese email",
  ERROR_CODES.VAL_006,
  { email: "test@example.com" }
);
```

**Status Code:** `409 Conflict`

### ResourceInUseError

**Uso:** No se puede eliminar porque está referenciado

```typescript
throw new ResourceInUseError("Cliente", ERROR_CODES.RES_003, {
  ventas: 5,
  ordenes: 3,
});
```

**Status Code:** `409 Conflict`

### DatabaseError

**Uso:** Errores de base de datos (conexión, timeout, etc.)

```typescript
throw new DatabaseError("Timeout de consulta", ERROR_CODES.DB_003, {
  query: "SELECT ...",
  duration: 30000,
});
```

**Status Code:** `500 Internal Server Error`
**isOperational:** `false` (indica bug o problema de infraestructura)

### BusinessError

**Uso:** Violación de regla de negocio

```typescript
throw new BusinessError(
  "No se puede aprobar la orden porque faltan materiales",
  ERROR_CODES.BIZ_004,
  { materialesFaltantes: ["Acero", "Aluminio"] }
);
```

**Status Code:** `422 Unprocessable Entity`

### SystemError

**Uso:** Errores internos del servidor

```typescript
throw new SystemError("Servicio de email no disponible", ERROR_CODES.SYS_004, {
  service: "email",
  provider: "sendgrid",
});
```

**Status Code:** `500 Internal Server Error`

---

## Códigos de Error

Sistema de códigos estandarizados con prefijos por categoría.

### Autenticación (AUTH_xxx)

| Código     | Descripción               | HTTP Status |
| ---------- | ------------------------- | ----------- |
| `AUTH_001` | Token inválido o expirado | 401         |
| `AUTH_002` | Credenciales inválidas    | 401         |
| `AUTH_003` | Token no proporcionado    | 401         |
| `AUTH_004` | Permisos insuficientes    | 403         |
| `AUTH_005` | Sesión expirada           | 401         |
| `AUTH_006` | Usuario no encontrado     | 401         |

### Validación (VAL_xxx)

| Código    | Descripción                   | HTTP Status |
| --------- | ----------------------------- | ----------- |
| `VAL_001` | Datos de entrada inválidos    | 400         |
| `VAL_002` | Campo requerido faltante      | 400         |
| `VAL_003` | Formato inválido              | 400         |
| `VAL_004` | Valor fuera de rango          | 400         |
| `VAL_005` | Violación de regla de negocio | 400         |
| `VAL_006` | Valor duplicado (unicidad)    | 409         |
| `VAL_007` | Referencia inválida (FK)      | 400         |
| `VAL_008` | Stock insuficiente            | 400         |

### Base de Datos (DB_xxx)

| Código   | Descripción                         | HTTP Status |
| -------- | ----------------------------------- | ----------- |
| `DB_001` | Error de conexión                   | 500         |
| `DB_002` | Violación de constraint             | 500         |
| `DB_003` | Timeout de query                    | 500         |
| `DB_004` | Registro no encontrado              | 404         |
| `DB_005` | Violación de integridad referencial | 500         |
| `DB_006` | Error de transacción                | 500         |
| `DB_007` | Error de deadlock                   | 500         |

### Recursos (RES_xxx)

| Código    | Descripción                           | HTTP Status |
| --------- | ------------------------------------- | ----------- |
| `RES_001` | Recurso no encontrado                 | 404         |
| `RES_002` | Recurso ya existe                     | 409         |
| `RES_003` | Recurso en uso (no se puede eliminar) | 409         |
| `RES_004` | Límite de recursos excedido           | 429         |

### Sistema (SYS_xxx)

| Código    | Descripción                | HTTP Status |
| --------- | -------------------------- | ----------- |
| `SYS_001` | Error interno del servidor | 500         |
| `SYS_002` | Servicio no disponible     | 503         |
| `SYS_003` | Configuración inválida     | 500         |
| `SYS_004` | Dependencia externa falló  | 502         |
| `SYS_005` | Operación no implementada  | 501         |

### Negocio (BIZ_xxx)

| Código    | Descripción                             | HTTP Status |
| --------- | --------------------------------------- | ----------- |
| `BIZ_001` | Operación no permitida en estado actual | 422         |
| `BIZ_002` | Límite de operación excedido            | 422         |
| `BIZ_003` | Conflicto de operación concurrente      | 409         |
| `BIZ_004` | Prerrequisito no cumplido               | 422         |

---

## Sistema de Logging

### Winston Configuration

**Ubicación:** `/lib/logger.ts`

**Transports:**

- **Console:** Siempre activo (dev + prod)
- **File (combined.log):** Todos los logs en producción
- **File (error.log):** Solo errores en producción
- **File (warn.log):** Solo warnings en producción

**Log Levels:**

- `error`: Errores críticos
- `warn`: Advertencias
- `info`: Información general
- `http`: Requests HTTP
- `debug`: Debugging detallado (solo dev)

### Loggers Pre-configurados

```typescript
import { apiLogger, dbLogger, authLogger, businessLogger } from "@/lib/logger";

// API operations
apiLogger.info("Cliente creado", { clienteId: 123 });

// Database operations
dbLogger.logDatabase("SELECT clientes", 45); // 45ms

// Authentication
authLogger.logAuth("login", "user123");

// Business events
businessLogger.logBusinessEvent("orden_aprobada", { ordenId: 456 });
```

### Métodos Disponibles

#### Logging Básico

```typescript
apiLogger.error(message, metadata);
apiLogger.warn(message, metadata);
apiLogger.info(message, metadata);
apiLogger.http(message, metadata);
apiLogger.debug(message, metadata);
```

#### Logging de Requests

```typescript
// Inicio de request
apiLogger.logRequest(request);

// Respuesta de request
apiLogger.logResponse(request, statusCode, duration);
```

#### Logging de Errores

```typescript
try {
  // operación
} catch (error) {
  apiLogger.logError(error, { context: "POST /api/clientes" });
  throw error;
}
```

#### Performance Timing

```typescript
import { startTimer } from "@/lib/logger";

const timer = startTimer("Query clientes", apiLogger);
const result = await pool.query("SELECT ...");
const duration = timer.end(); // Logs automáticamente
```

**Para operaciones de DB:**

```typescript
const dbTimer = startTimer("Insert cliente", apiLogger);
await pool.query("INSERT ...");
dbTimer.endDb(); // Marca como slow query si > 1s
```

#### Async Operations con Logging

```typescript
import { withLogging } from "@/lib/logger";

const data = await withLogging(
  "Fetch user profile",
  async () => {
    return await fetchUserProfile(userId);
  },
  apiLogger,
  { userId }
);
// Logs automáticamente inicio, duración, y errores
```

### Formato de Logs

**Desarrollo (consola coloreada):**

```
2025-01-15 14:32:10 [info]: Cliente creado exitosamente
{
  "clienteId": 123,
  "nombre": "ACME Corp",
  "userId": "user456"
}
```

**Producción (JSON estructurado):**

```json
{
  "timestamp": "2025-01-15T19:32:10.123Z",
  "level": "info",
  "message": "Cliente creado exitosamente",
  "clienteId": 123,
  "nombre": "ACME Corp",
  "userId": "user456",
  "context": "API"
}
```

### Rotación de Archivos

**Configuración:**

- **Tamaño máximo por archivo:** 10MB (combined/error), 5MB (warn)
- **Retención:** 14 días (combined/warn), 30 días (error)
- **Ubicación:** `logs/` (configurable con `LOGS_DIR`)

**Variables de entorno:**

```bash
# .env
LOG_LEVEL=info        # error, warn, info, http, debug
LOGS_DIR=/var/log/app # Directorio de logs (default: ./logs)
```

---

## Integración con Sentry

### Configuración

**Archivos:**

- `sentry.client.config.ts`: Browser/Frontend
- `sentry.server.config.ts`: Node.js/API Routes
- `sentry.edge.config.ts`: Edge Runtime/Middleware

**Variables de entorno:**

```bash
# .env.local
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_DSN=https://...@sentry.io/...
APP_VERSION=1.0.0
```

### Características

#### Client (Browser)

- **Session Replay:** Video replay de sesiones con errores
- **Breadcrumbs:** Tracking de acciones del usuario
- **Masked Data:** Oculta texto y media sensible
- **Error Filtering:** Ignora errores de extensiones del navegador

#### Server (Node.js)

- **Error Classification:** Operacional vs Programación
- **SQL Query Redaction:** Oculta queries sensibles en producción
- **Memory Tracking:** Incluye uso de memoria en eventos
- **Sensitive Data Filtering:** Remueve headers y body sensibles

#### Edge Runtime

- **Lightweight Config:** Configuración optimizada para edge
- **Reduced Sampling:** 50% en producción para límites de edge

### Filtrado de Datos Sensibles

**Automáticamente removido:**

- Headers: `authorization`, `cookie`, `x-api-key`
- Query params: `token`, `password`
- Body fields: `password`, `token`, `apiKey`

**Breadcrumbs filtrados:**

- Console logs en producción
- URLs con tokens/passwords enmascarados

### Sampling Rates

| Tipo                  | Desarrollo | Producción |
| --------------------- | ---------- | ---------- |
| Errors                | 100%       | 100%       |
| Transactions (Server) | 100%       | 10%        |
| Session Replays       | 100%       | 10%        |
| Replays on Error      | 100%       | 100%       |
| Edge Transactions     | 100%       | 50%        |

---

## Uso en API Routes

### Patrón Básico

```typescript
import { NextRequest, NextResponse } from "next/server";
import { handleApiError, NotFoundError } from "@/lib/error-handler";
import { apiLogger, startTimer } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const timer = startTimer("GET /api/clientes", apiLogger);

  return handleApiError(async () => {
    // 1. Autenticación
    const auth = authenticateApiRequest(request);
    if (auth.error) {
      apiLogger.warn("Auth failed", { error: auth.error });
      return NextResponse.json(auth.error, { status: 401 });
    }

    // 2. Validación
    const validation = await validateRequest(request, {
      querySchema: filterSchema,
    });
    if (!validation.success) {
      apiLogger.warn("Validation failed", { errors: validation.response });
      return validation.response!;
    }

    // 3. Operación de negocio/DB
    const client = await pool.connect();
    try {
      const dbTimer = startTimer("Query", apiLogger);
      const result = await client.query("SELECT ...");
      dbTimer.endDb();

      apiLogger.info("Success", { count: result.rows.length });
      timer.end();

      return NextResponse.json(result.rows);
    } catch (dbError: any) {
      apiLogger.error("DB error", {
        error: { message: dbError.message, code: dbError.code },
      });
      throw mapDatabaseError(dbError);
    } finally {
      client.release();
    }
  }, request);
}
```

### Ejemplo Completo: POST /api/clientes

```typescript
export async function POST(request: NextRequest) {
  const timer = startTimer('POST /api/clientes', apiLogger);

  return handleApiError(async () => {
    // Autenticación
    const auth = authenticateApiRequest(request);
    if (auth.error) {
      apiLogger.warn('Autenticación fallida', { error: auth.error });
      return NextResponse.json(auth.error, { status: 401 });
    }
    const { user } = auth;

    // Autorización
    const permissionError = checkApiPermission(user, 'write:all');
    if (permissionError) {
      apiLogger.warn('Permisos insuficientes', {
        userId: user.userId,
        role: user.role
      });
      return permissionError;
    }

    // Validación
    const validation = await validateRequest(request, {
      bodySchema: createClienteSchema,
      sanitize: true,
    });
    if (!validation.success) {
      apiLogger.warn('Validación fallida', { errors: validation.response });
      return validation.response!;
    }

    const clienteData = validation.data!.body!;

    // Validación de negocio: email único
    const emailCheck = await validateClienteEmailUnique(clienteData.email);
    if (!emailCheck.valid) {
      apiLogger.warn('Email duplicado', { email: clienteData.email });
      throw new ConflictError(
        'Ya existe un cliente con ese email',
        ERROR_CODES.VAL_006,
        { email: clienteData.email }
      );
    }

    // Operación de DB
    const client = await pool.connect();
    try {
      const dbTimer = startTimer('Insert cliente', apiLogger);
      const result = await client.query(
        'INSERT INTO Clientes (...) VALUES (...) RETURNING *',
        [clienteData.nombre, clienteData.email, ...]
      );
      dbTimer.endDb();

      // Log de éxito
      apiLogger.info('Cliente creado exitosamente', {
        clienteId: result.rows[0].cliente_id,
        nombre: result.rows[0].nombre,
        userId: user.userId,
      });

      timer.end();

      return NextResponse.json({
        success: true,
        data: result.rows[0],
        message: 'Cliente creado exitosamente',
      }, { status: 201 });

    } catch (dbError: any) {
      apiLogger.error('Error de base de datos', {
        error: { message: dbError.message, code: dbError.code },
        clienteData: { nombre: clienteData.nombre, email: clienteData.email },
      });
      throw mapDatabaseError(dbError);
    } finally {
      client.release();
    }
  }, request);
}
```

---

## Ejemplos Prácticos

### Ejemplo 1: Manejo de Not Found

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleApiError(async () => {
    const result = await pool.query(
      "SELECT * FROM Clientes WHERE cliente_id = $1",
      [params.id]
    );

    if (result.rows.length === 0) {
      apiLogger.warn("Cliente no encontrado", { clienteId: params.id });
      throw new NotFoundError("Cliente", ERROR_CODES.RES_001, {
        clienteId: params.id,
      });
    }

    return NextResponse.json(result.rows[0]);
  }, request);
}

// Respuesta automática:
// {
//   "success": false,
//   "error": {
//     "code": "RES_001",
//     "message": "Cliente no encontrado",
//     "details": { "clienteId": "123" },
//     "timestamp": "2025-01-15T19:45:00.000Z",
//     "path": "/api/clientes/123"
//   }
// }
```

### Ejemplo 2: Validación de Regla de Negocio

```typescript
import {
  assertBusinessRule,
  BusinessError,
  ERROR_CODES,
} from "@/lib/error-handler";

export async function POST(request: NextRequest) {
  return handleApiError(async () => {
    const ordenData = await validateRequest(request, {
      bodySchema: createOrdenSchema,
    });

    // Verificar stock disponible
    const producto = await getProducto(ordenData.productoId);

    assertBusinessRule(
      producto.stock >= ordenData.cantidad,
      "Stock insuficiente para crear la orden",
      ERROR_CODES.BIZ_004,
      {
        stockDisponible: producto.stock,
        cantidadSolicitada: ordenData.cantidad,
      }
    );

    // Continuar con la creación...
  }, request);
}
```

### Ejemplo 3: Mapeo Automático de Errores de DB

```typescript
import { mapDatabaseError } from '@/lib/error-handler';

export async function POST(request: NextRequest) {
  return handleApiError(async () => {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'INSERT INTO Clientes (email, ...) VALUES ($1, ...)',
        [email, ...]
      );
      return NextResponse.json(result.rows[0]);
    } catch (dbError: any) {
      // Mapeo automático:
      // - 23505 (unique violation) → ConflictError con VAL_006
      // - 23503 (FK violation) → ValidationError con VAL_007
      // - 23502 (not null) → ValidationError con VAL_002
      // - ECONNREFUSED → DatabaseError con DB_001
      throw mapDatabaseError(dbError);
    } finally {
      client.release();
    }
  }, request);
}
```

### Ejemplo 4: Logging con Contexto

```typescript
import { apiLogger } from "@/lib/logger";

// Crear logger con contexto específico
const clienteLogger = apiLogger.child("Clientes");

export async function POST(request: NextRequest) {
  return handleApiError(async () => {
    // Logs tendrán context: "API:Clientes"
    clienteLogger.info("Iniciando creación de cliente");

    const cliente = await createCliente(data);

    clienteLogger.logBusinessEvent("cliente_creado", {
      clienteId: cliente.id,
      nombre: cliente.nombre,
    });

    return NextResponse.json(cliente);
  }, request);
}
```

### Ejemplo 5: Resource In Use (No se puede eliminar)

```typescript
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleApiError(async () => {
    const client = await pool.connect();
    try {
      const result = await client.query(
        "DELETE FROM Clientes WHERE cliente_id = $1 RETURNING *",
        [params.id]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError("Cliente");
      }

      return NextResponse.json({ message: "Cliente eliminado" });
    } catch (dbError: any) {
      // Error 23503 = FK constraint violation
      if (dbError.code === "23503") {
        apiLogger.warn("Intento de eliminar cliente en uso", {
          clienteId: params.id,
          constraint: dbError.constraint,
        });
        // mapDatabaseError convierte a ValidationError con VAL_007
        throw mapDatabaseError(dbError);
      }
      throw mapDatabaseError(dbError);
    } finally {
      client.release();
    }
  }, request);
}
```

---

## Best Practices

### ✅ DO

1. **Usar handleApiError() siempre**

   ```typescript
   export async function GET(request: NextRequest) {
     return handleApiError(async () => {
       // tu lógica
     }, request);
   }
   ```

2. **Loggear eventos importantes**

   ```typescript
   apiLogger.info("Operación exitosa", { details });
   apiLogger.warn("Condición inusual", { context });
   apiLogger.error("Error crítico", { error });
   ```

3. **Usar clases de error específicas**

   ```typescript
   throw new NotFoundError("Cliente");
   throw new ValidationError("Email inválido", ERROR_CODES.VAL_003);
   ```

4. **Incluir metadatos útiles**

   ```typescript
   throw new BusinessError("Stock insuficiente", ERROR_CODES.BIZ_004, {
     stockDisponible: 10,
     cantidadSolicitada: 20,
     productoId: 123,
   });
   ```

5. **Usar timers para performance**

   ```typescript
   const timer = startTimer("Operation", apiLogger);
   // ... operación
   timer.end();
   ```

6. **Mapear errores de DB**
   ```typescript
   catch (dbError: any) {
     throw mapDatabaseError(dbError);
   }
   ```

### ❌ DON'T

1. **No usar console.error/log**

   ```typescript
   // ❌ MAL
   console.error("Error:", error);

   // ✅ BIEN
   apiLogger.error("Error en operación", { error });
   ```

2. **No devolver errores sin formato**

   ```typescript
   // ❌ MAL
   return NextResponse.json({ error: error.message }, { status: 500 });

   // ✅ BIEN
   throw new SystemError(error.message, ERROR_CODES.SYS_001);
   ```

3. **No exponer información sensible**

   ```typescript
   // ❌ MAL
   throw new SystemError(dbError.stack, SYS_001);

   // ✅ BIEN
   throw new SystemError(
     "Error de base de datos",
     SYS_001,
     process.env.NODE_ENV === "development"
       ? { stack: dbError.stack }
       : undefined
   );
   ```

4. **No ignorar errores silenciosamente**

   ```typescript
   // ❌ MAL
   try {
     await operation();
   } catch (error) {
     // nada
   }

   // ✅ BIEN
   try {
     await operation();
   } catch (error) {
     apiLogger.error("Operation failed", { error });
     throw mapDatabaseError(error);
   }
   ```

5. **No usar códigos de error genéricos**

   ```typescript
   // ❌ MAL
   throw new ApiError("ERROR", "Algo falló", 500);

   // ✅ BIEN
   throw new SystemError("Servicio X no disponible", ERROR_CODES.SYS_004);
   ```

### Estructura de try/catch Recomendada

```typescript
export async function POST(request: NextRequest) {
  const timer = startTimer("POST /api/resource", apiLogger);

  return handleApiError(async () => {
    // 1. Auth/Validation (sin try/catch, handleApiError lo maneja)
    const auth = authenticateApiRequest(request);
    if (auth.error) {
      apiLogger.warn("Auth failed", { error: auth.error });
      return NextResponse.json(auth.error, { status: 401 });
    }

    // 2. DB operations (con try/catch para cleanup)
    const client = await pool.connect();
    try {
      const result = await client.query("...");
      apiLogger.info("Success", { details });
      timer.end();
      return NextResponse.json(result.rows);
    } catch (dbError: any) {
      apiLogger.error("DB error", { error: dbError });
      throw mapDatabaseError(dbError);
    } finally {
      client.release(); // Siempre liberar conexión
    }
  }, request);
}
```

---

## Troubleshooting

### Logs no aparecen en archivos

**Síntoma:** Logs en consola pero no en `logs/` folder

**Solución:**

1. Verificar que `NODE_ENV=production`
2. Crear directorio `logs/` manualmente si no existe
3. Verificar permisos de escritura: `chmod 755 logs/`
4. Configurar `LOGS_DIR` en `.env` si quieres otra ubicación

### Sentry no captura errores

**Síntoma:** Errores no aparecen en Sentry dashboard

**Verificar:**

1. ✅ DSN configurado correctamente en `.env.local`

   ```bash
   NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
   SENTRY_DSN=https://...@sentry.io/...
   ```

2. ✅ `NODE_ENV=production` (en dev no se envía por defecto)

3. ✅ Error no está en `ignoreErrors` list

4. ✅ Verificar en consola:
   ```typescript
   console.log("Sentry DSN:", process.env.NEXT_PUBLIC_SENTRY_DSN);
   ```

### Errores de DB no mapeados correctamente

**Síntoma:** Recibes `DB_001` genérico en lugar de error específico

**Solución:**
Asegúrate de usar `mapDatabaseError()`:

```typescript
try {
  await client.query("...");
} catch (dbError: any) {
  throw mapDatabaseError(dbError); // Mapeo automático
}
```

**Códigos PostgreSQL comunes:**

- `23505`: Unique violation → `VAL_006`
- `23503`: FK violation → `VAL_007`
- `23502`: Not null violation → `VAL_002`

### Performance slow

**Síntoma:** Queries marcadas como "slow" en logs

**Threshold:** 1000ms (1 segundo)

**Investigar:**

1. Revisar logs: `grep "slow" logs/combined.log`
2. Identificar queries lentas
3. Agregar índices en DB
4. Optimizar consultas

**Ejemplo de log:**

```json
{
  "level": "warn",
  "message": "DB Query clientes - 1250ms",
  "duration": 1250,
  "operation": "Query clientes",
  "slow": true
}
```

### handleApiError no funciona

**Síntoma:** Errores no formateados correctamente

**Verificar:**

1. ✅ Importación correcta:

   ```typescript
   import { handleApiError } from "@/lib/error-handler";
   ```

2. ✅ Uso correcto con async:

   ```typescript
   return handleApiError(async () => {
     // código asíncrono
   }, request);
   ```

3. ✅ Devolver NextResponse dentro del handler:
   ```typescript
   return handleApiError(async () => {
     return NextResponse.json(data); // ✅
   }, request);
   ```

### Logs con nivel incorrecto

**Síntoma:** No ves logs de debug o info

**Solución:**
Configurar `LOG_LEVEL` en `.env`:

```bash
# Development
LOG_LEVEL=debug

# Production
LOG_LEVEL=info
```

**Jerarquía de niveles:**

```
error < warn < info < http < debug
```

Si configuras `LOG_LEVEL=warn`, solo verás `warn` y `error`.

---

## Variables de Entorno

```bash
# Logging
LOG_LEVEL=info                    # error, warn, info, http, debug
LOGS_DIR=/var/log/app             # Directorio de logs (default: ./logs)

# Sentry
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_DSN=https://...@sentry.io/...
APP_VERSION=1.0.0
NEXT_PUBLIC_APP_VERSION=1.0.0

# General
NODE_ENV=production               # production | development | test
```

---

## Resumen de Implementación

### Archivos Creados

1. `/lib/error-handler.ts` (500+ líneas)
   - 8 clases de error
   - 40+ códigos estandarizados
   - Helpers: `handleApiError()`, `mapDatabaseError()`, `assertExists()`, etc.

2. `/lib/logger.ts` (420+ líneas)
   - Winston configuration
   - 5 loggers pre-configurados
   - Performance timers
   - Async wrappers

3. `sentry.client.config.ts` (140 líneas)
   - Session replay
   - Breadcrumbs
   - Data masking

4. `sentry.server.config.ts` (150 líneas)
   - Error classification
   - Query redaction
   - Memory tracking

5. `sentry.edge.config.ts` (60 líneas)
   - Lightweight config
   - Edge-optimized

### Rutas Actualizadas (Ejemplos)

- `/app/api/clientes/route.ts`
- `/app/api/clientes/[id]/route.ts`

**Patrón aplicado:**

- ✅ `handleApiError()` wrapper
- ✅ Winston logging
- ✅ Performance timers
- ✅ Error mapping
- ✅ Structured metadata

### Métricas

- **Clases de error:** 8 especializadas
- **Códigos de error:** 40+ estandarizados
- **Log levels:** 5 (error, warn, info, http, debug)
- **Loggers:** 5 pre-configurados
- **Transports:** 4 (console, combined, error, warn)
- **API routes actualizadas:** 2 (ejemplos)
- **Lines of code:** ~1,300
- **Build status:** ✅ Compilando sin errores

---

## Próximos Pasos

1. **Aplicar patrón a todas las rutas API** (17 rutas restantes)
2. **Crear tests unitarios** para error handling
3. **Dashboard de métricas** con logs agregados
4. **Alertas proactivas** en Sentry
5. **Error boundary** en frontend para React errors

---

## Referencias

- **Winston:** https://github.com/winstonjs/winston
- **Sentry Next.js:** https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **API Error Best Practices:** https://www.rfc-editor.org/rfc/rfc7807
- **PostgreSQL Error Codes:** https://www.postgresql.org/docs/current/errcodes-appendix.html

---

**Última actualización:** 15 de enero, 2025  
**Versión:** 1.0.0  
**Mantenedor:** Sistema Industrial Development Team
