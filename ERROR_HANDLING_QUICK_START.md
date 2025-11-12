# Sistema de Error Handling - Resumen Rápido

**✅ COMPLETADO** - 15 de enero, 2025

---

## 🎯 Lo que se implementó

### Archivos Nuevos (6)

1. **`/lib/error-handler.ts`** (520 líneas)
   - 8 clases de error especializadas
   - 40+ códigos estandarizados (AUTH_xxx, VAL_xxx, DB_xxx, etc.)
   - Helpers: `handleApiError()`, `mapDatabaseError()`, `assertExists()`, etc.

2. **`/lib/logger.ts`** (420 líneas)
   - Winston con 4 transports
   - 5 loggers pre-configurados
   - Performance timers
   - Async wrappers

3. **`sentry.client.config.ts`** (140 líneas) - Browser
4. **`sentry.server.config.ts`** (150 líneas) - Node.js
5. **`sentry.edge.config.ts`** (60 líneas) - Edge Runtime

6. **Documentación**
   - `ERROR_HANDLING_GUIDE.md` (1,970 líneas / 67 páginas)
   - `ERROR_HANDLING_COMPLETION_REPORT.md` (950 líneas)

### Archivos Actualizados (2 ejemplos)

- `/app/api/clientes/route.ts` - GET, POST
- `/app/api/clientes/[id]/route.ts` - GET, PUT, DELETE

---

## 📝 Cómo usar en tus rutas API

### Patrón Básico

```typescript
import {
  handleApiError,
  NotFoundError,
  mapDatabaseError,
} from "@/lib/error-handler";
import { apiLogger, startTimer } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const timer = startTimer("GET /api/resource", apiLogger);

  return handleApiError(async () => {
    // 1. Autenticación
    const auth = authenticateApiRequest(request);
    if (auth.error) {
      apiLogger.warn("Auth failed", { error: auth.error });
      return NextResponse.json(auth.error, { status: 401 });
    }

    // 2. Operación de DB
    const client = await pool.connect();
    try {
      const result = await client.query("SELECT ...");

      if (result.rows.length === 0) {
        throw new NotFoundError("Recurso");
      }

      apiLogger.info("Success", { count: result.rows.length });
      timer.end();

      return NextResponse.json(result.rows);
    } catch (dbError: any) {
      apiLogger.error("DB error", { error: dbError });
      throw mapDatabaseError(dbError);
    } finally {
      client.release();
    }
  }, request);
}
```

---

## 🔥 Características Principales

### 1. Errores Estructurados

**Antes:**

```typescript
catch (error) {
  console.error('Error:', error);
  return NextResponse.json({ error: 'Error interno' }, { status: 500 });
}
```

**Después:**

```typescript
throw new NotFoundError("Cliente"); // Automáticamente formateado
```

**Respuesta:**

```json
{
  "success": false,
  "error": {
    "code": "RES_001",
    "message": "Cliente no encontrado",
    "timestamp": "2025-01-15T19:45:00.000Z",
    "path": "/api/clientes/123"
  }
}
```

### 2. Clases de Error Disponibles

```typescript
import {
  NotFoundError, // 404 - Recurso no encontrado
  ValidationError, // 400 - Datos inválidos
  ConflictError, // 409 - Duplicado
  AuthenticationError, // 401 - Token inválido
  AuthorizationError, // 403 - Sin permisos
  BusinessError, // 422 - Regla de negocio
  DatabaseError, // 500 - Error de DB
  SystemError, // 500 - Error interno
} from "@/lib/error-handler";
```

### 3. Códigos de Error

| Prefijo | Categoría     | Ejemplo                               |
| ------- | ------------- | ------------------------------------- |
| `AUTH_` | Autenticación | `AUTH_001` - Token inválido           |
| `VAL_`  | Validación    | `VAL_006` - Email duplicado           |
| `DB_`   | Base de datos | `DB_001` - Error de conexión          |
| `RES_`  | Recursos      | `RES_001` - No encontrado             |
| `BIZ_`  | Negocio       | `BIZ_004` - Prerrequisito no cumplido |
| `SYS_`  | Sistema       | `SYS_001` - Error interno             |

**Ver tabla completa en:** `ERROR_HANDLING_GUIDE.md` (secciones 4)

### 4. Logging Estructurado

```typescript
import { apiLogger, dbLogger, authLogger } from "@/lib/logger";

// Logging básico
apiLogger.info("Cliente creado", { clienteId: 123 });
apiLogger.warn("Stock bajo", { productoId: 456, stock: 5 });
apiLogger.error("DB timeout", { query: "SELECT ...", duration: 5000 });

// Logging de DB operations (marca slow si > 1s)
dbLogger.logDatabase("SELECT clientes", 45); // 45ms

// Performance timing
const timer = startTimer("Query clientes", apiLogger);
const result = await pool.query("SELECT ...");
timer.end(); // Logea duración automáticamente
```

**Logs se guardan en:**

- `logs/combined.log` - Todos los logs (14 días)
- `logs/error.log` - Solo errores (30 días)
- `logs/warn.log` - Solo warnings (14 días)

### 5. Mapeo Automático de Errores PostgreSQL

```typescript
try {
  await client.query("INSERT ...");
} catch (dbError: any) {
  throw mapDatabaseError(dbError);
  // 23505 → ConflictError (email duplicado)
  // 23503 → ValidationError (FK inválida)
  // 23502 → ValidationError (campo requerido)
}
```

---

## 📦 Variables de Entorno

Agregar a tu `.env.local`:

```bash
# Logging
LOG_LEVEL=info                        # error, warn, info, http, debug
LOGS_DIR=/var/log/app                 # default: ./logs

# Sentry (opcional - solo producción)
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_DSN=https://...@sentry.io/...
APP_VERSION=1.0.0
```

---

## 🚀 Próximos Pasos

### 1. Aplicar a Rutas Restantes (17 rutas)

**Lista de rutas pendientes:**

- `/app/api/productos/route.ts`
- `/app/api/productos/[id]/route.ts`
- `/app/api/materia-prima/route.ts`
- `/app/api/materia-prima/[id]/route.ts`
- `/app/api/proveedores/route.ts`
- `/app/api/proveedores/[id]/route.ts`
- `/app/api/operarios/route.ts`
- `/app/api/operarios/[id]/route.ts`
- `/app/api/ordenes-produccion/route.ts`
- `/app/api/ordenes-produccion/[id]/route.ts`
- `/app/api/ventas/route.ts`
- `/app/api/ventas/[id]/route.ts`
- `/app/api/compras/route.ts`
- `/app/api/tipo-componente/route.ts`
- `/app/api/inventario/movimientos/route.ts`
- `/app/api/dashboard/route.ts`
- `/app/api/websocket/route.ts` (especial)

**Estimación:** 15-20 minutos por ruta = 4-6 horas total

### 2. Configurar Producción

```bash
# Crear directorio de logs
mkdir -p logs
chmod 755 logs

# Verificar variables de entorno
echo $SENTRY_DSN
echo $LOG_LEVEL
```

### 3. Tests (Futuro Sprint)

- Tests unitarios de clases de error
- Tests de mapDatabaseError()
- Tests de handleApiError()
- Mock de Winston y Sentry

---

## 📚 Documentación

### Guía Completa

**`ERROR_HANDLING_GUIDE.md`** (67 páginas)

- Arquitectura del sistema
- Todas las clases de error con ejemplos
- Tabla completa de códigos (40+)
- Sistema de logging (Winston)
- Integración con Sentry
- 12+ ejemplos prácticos
- Best practices (DOs y DON'Ts)
- Troubleshooting

### Reporte de Implementación

**`ERROR_HANDLING_COMPLETION_REPORT.md`**

- Métricas detalladas
- Archivos creados
- Comparación antes/después
- Lecciones aprendidas
- Consideraciones de seguridad

---

## ✅ Status

- **Build:** ✅ Compilando sin errores
- **TypeScript:** ✅ Sin errores de tipos
- **Dependencies:** ✅ 225 packages, 0 vulnerabilidades
- **Ejemplos:** ✅ 2 rutas actualizadas
- **Documentación:** ✅ 67 páginas completas
- **Tests:** ⏳ Pendiente
- **Producción:** ⏳ Requiere config de Sentry DSN

---

## 🆘 Ayuda Rápida

### ¿Cómo logueo un error?

```typescript
apiLogger.error('Error descriptivo', {
  context: 'POST /api/clientes',
  clienteData: { ... },
  error: { message: error.message, code: error.code }
});
```

### ¿Cómo lanzo un error 404?

```typescript
throw new NotFoundError("Cliente", ERROR_CODES.RES_001, {
  clienteId: 123,
});
```

### ¿Cómo mapeo error de DB?

```typescript
try {
  await client.query("...");
} catch (dbError: any) {
  throw mapDatabaseError(dbError); // Automático
}
```

### ¿Cómo mido performance?

```typescript
const timer = startTimer("Operation", apiLogger);
// ... operación
timer.end(); // Logea duración
```

### ¿Dónde veo los logs?

```bash
# Desarrollo
tail -f logs/combined.log

# Filtrar errores
grep "error" logs/combined.log

# Últimos 100 logs
tail -n 100 logs/combined.log | jq .
```

---

## 🔗 Links Útiles

- **Guía completa:** `ERROR_HANDLING_GUIDE.md`
- **Reporte:** `ERROR_HANDLING_COMPLETION_REPORT.md`
- **Roadmap:** `ROADMAP_DESARROLLO.md` (Sección 2 - Completada)
- **Winston docs:** https://github.com/winstonjs/winston
- **Sentry docs:** https://docs.sentry.io/platforms/javascript/guides/nextjs/

---

**¿Dudas?** Lee la guía completa en `ERROR_HANDLING_GUIDE.md` 📖
