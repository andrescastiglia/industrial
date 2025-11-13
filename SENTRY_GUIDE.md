# 🛡️ Guía de Uso de Sentry - Optimizado

Este proyecto usa **Sentry** para monitoreo de errores con una configuración **altamente optimizada** que minimiza el uso de cuota y solo envía errores críticos en producción.

---

## 📊 Configuración Actual

### Niveles de Filtrado

| Nivel       | Desarrollo | Testing    | Producción                 |
| ----------- | ---------- | ---------- | -------------------------- |
| **fatal**   | ❌ Consola | ❌ Consola | ✅ **Sentry**              |
| **error**   | ❌ Consola | ❌ Consola | ✅ **Sentry**              |
| **warning** | ❌ Consola | ❌ Consola | ⚠️ Solo si `severity=high` |
| **info**    | ❌ Consola | ✅ Consola | ❌ Nunca                   |
| **debug**   | ✅ Consola | ❌ Nunca   | ❌ Nunca                   |

### Performance Tracing

- **Producción**: `0%` (deshabilitado)
- **Desarrollo**: `0%` (deshabilitado)
- **Session Replay**: Solo 10% cuando hay error en producción

### Privacidad (GDPR)

- ✅ `sendDefaultPii: false` (sin datos personales)
- ✅ Headers sensibles filtrados
- ✅ Cookies filtradas
- ✅ Tokens en URLs enmascarados

---

## 🚀 Uso en el Código

### 1. Importar el Logger

```typescript
import {
  captureApiError,
  captureDatabaseError,
  captureAuthWarning,
  logDebug,
  logInfo,
  addBreadcrumb,
  setUserContext,
  clearUserContext,
} from "@/lib/sentry-logger";
```

---

### 2. Errores de API (SÍ enviar a Sentry)

```typescript
export async function GET(request: NextRequest) {
  let auth: ReturnType<typeof authenticateApiRequest> | undefined;

  try {
    auth = authenticateApiRequest(request);
    if (auth.error) {
      return NextResponse.json(auth.error, { status: auth.error.statusCode });
    }

    // ... lógica de negocio
    const data = await fetchData();
    return NextResponse.json(data);
  } catch (error) {
    // ✅ SÍ enviar: error inesperado
    captureApiError(error, "/api/clientes", "GET", auth?.user?.userId, {
      additionalContext: "Error al obtener clientes",
    });

    return NextResponse.json(
      { error: "Error al obtener datos" },
      { status: 500 }
    );
  }
}
```

---

### 3. Errores de Base de Datos (SÍ enviar a Sentry)

```typescript
const client = await pool.connect();
try {
  const result = await client.query("SELECT * FROM clientes WHERE id = $1", [
    clienteId,
  ]);
  return result.rows;
} catch (dbError) {
  // ✅ SÍ enviar: error de DB
  captureDatabaseError(dbError, "SELECT * FROM clientes WHERE id = $1", [
    clienteId,
  ]);

  throw new Error("Error al consultar base de datos");
} finally {
  client.release();
}
```

---

### 4. Errores de Validación (NO enviar a Sentry)

```typescript
export async function POST(request: NextRequest) {
  const body = await request.json();

  // ❌ NO enviar: error de validación esperado
  if (!body.nombre) {
    logDebug("Validation error: missing nombre");
    return NextResponse.json(
      { error: "El nombre es requerido" },
      { status: 400 }
    );
  }

  // ❌ NO enviar: error de autenticación esperado
  if (auth.error) {
    logDebug("Auth failed", { email: body.email });
    return NextResponse.json(auth.error, { status: 401 });
  }

  // ... continuar
}
```

---

### 5. Warnings Críticos (Solo algunos a Sentry)

```typescript
// ⚠️ Warning crítico: SÍ enviar (con tag severity=high)
if (stockBajo < 10) {
  captureAuthWarning("Stock crítico detectado", undefined, {
    productoId: producto.id,
    stockActual: stockBajo,
    severity: "high", // ← Esto hace que se envíe
  });
}

// ⚠️ Warning normal: NO enviar
if (user.lastLogin < hace30Dias) {
  logDebug("Usuario inactivo por 30 días", { userId: user.id });
  // Solo consola, no Sentry
}
```

---

### 6. Logs de Debug (Solo desarrollo)

```typescript
export async function processOrder(orderId: number) {
  // ✅ Solo en desarrollo (npm run dev)
  logDebug("Processing order", { orderId });

  const order = await fetchOrder(orderId);

  logDebug("Order fetched", {
    orderId,
    items: order.items.length,
    total: order.total,
  });

  // Estos logs NO se envían a Sentry
  // Solo aparecen en consola local
}
```

---

### 7. Logs Informativos (Solo testing)

```typescript
// ✅ Solo en NODE_ENV=test
logInfo("Test iniciado: crear cliente", {
  testName: "should create client",
  timestamp: Date.now(),
});

// No se envía a Sentry
// Solo aparece en consola durante tests
```

---

### 8. Breadcrumbs (Rastro de eventos)

```typescript
export async function checkout(cart: Cart) {
  // Dejar rastro de eventos (solo producción)
  addBreadcrumb("checkout", "User started checkout", {
    cartItems: cart.items.length,
    total: cart.total,
  });

  try {
    const payment = await processPayment(cart);

    addBreadcrumb("payment", "Payment processed", {
      paymentId: payment.id,
      method: payment.method,
    });

    return payment;
  } catch (error) {
    // Al capturar el error, Sentry incluirá
    // automáticamente los breadcrumbs anteriores
    captureApiError(error, "/api/checkout", "POST");
    throw error;
  }
}
```

---

### 9. Contexto de Usuario (Autenticación)

Ya está integrado en `hooks/useAuth.ts`:

```typescript
// Al hacer login
useEffect(() => {
  if (user) {
    // ✅ Establecer usuario en Sentry (solo producción)
    setUserContext({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  }
}, [user]);

// Al hacer logout
const logout = async () => {
  // ... limpiar tokens

  // ✅ Limpiar contexto de Sentry
  clearUserContext();

  router.push("/login");
};
```

Todos los errores futuros tendrán el email y rol del usuario.

---

## 📋 Checklist: ¿Enviar a Sentry o No?

### ✅ SÍ enviar a Sentry (producción):

- ❌ Errores inesperados en try-catch
- ❌ Errores de base de datos (query fallido)
- ❌ Errores de red externos (APIs de terceros)
- ❌ Errores de lógica de negocio inesperados
- ❌ Errores de parseo de datos críticos
- ⚠️ Warnings con `severity: "high"`

### ❌ NO enviar a Sentry:

- ✅ Errores de validación (400)
- ✅ Errores de autenticación (401)
- ✅ Errores de permisos (403)
- ✅ Recursos no encontrados (404)
- ✅ Conflictos esperados (409)
- ✅ Rate limiting (429)
- ✅ Logs de debug
- ✅ Logs informativos
- ✅ Warnings normales

---

## 🔧 Testing Local

### Ver errores en desarrollo (sin enviar a Sentry)

```bash
npm run dev
```

Cuando ocurre un error, verás en consola:

```
[Sentry Debug] Event: {
  message: "Database connection failed",
  level: "error",
  ...
}
[Sentry Debug] Original Error: Error: Connection timeout
```

**Nada se envía a Sentry**, solo logs locales.

---

### Simular error en producción

Crea un endpoint temporal:

```typescript
// app/api/test-sentry/route.ts
import { captureApiError } from "@/lib/sentry-logger";

export async function GET() {
  try {
    // Forzar error
    throw new Error("Test error para Sentry");
  } catch (error) {
    captureApiError(error, "/api/test-sentry", "GET");
    return Response.json({ error: "Error de prueba" }, { status: 500 });
  }
}
```

Luego en desarrollo:

```bash
curl http://localhost:3000/api/test-sentry
```

Verás el log en consola. En producción se enviaría a Sentry.

---

## 📊 Dashboard de Sentry

### Ver errores capturados

1. Ve a https://sentry.io/
2. Selecciona tu proyecto: `javascript-nextjs`
3. Navega a **Issues**
4. Filtra por:
   - **Environment**: production
   - **Level**: error, fatal
   - **Tags**: endpoint, method, layer

### Información disponible en cada error

- ✅ Stack trace completo
- ✅ Usuario afectado (email, rol)
- ✅ Breadcrumbs (rastro de eventos)
- ✅ Tags para filtrar (endpoint, method, layer)
- ✅ Extra data (query, params, context)
- ✅ Session replay (video de la sesión al 10%)

---

## 📈 Impacto en Cuota

### Antes (configuración por defecto):

- Traces: 100%
- Session replay: 100%
- Logs: Todos
- Warnings/Info: Todos
- **Estimado**: ~10,000 eventos/mes

### Ahora (optimizado):

- Traces: 0%
- Session replay: 10% solo en errores
- Logs: Ninguno automático
- Solo errores críticos
- **Estimado**: ~100-500 eventos/mes

**Reducción**: >90% de eventos 🎉

---

## 🚨 Errores Comunes

### 1. Error no aparece en Sentry

**Causa**: Estás en desarrollo (`npm run dev`)

**Solución**: Los errores en desarrollo solo se loggean en consola, no se envían a Sentry. Para probar, haz build de producción:

```bash
NODE_ENV=production npm run build
NODE_ENV=production npm run start
```

### 2. Demasiados eventos en Sentry

**Causa**: Estás usando `console.error()` o `Sentry.captureException()` directamente.

**Solución**: Usa siempre `captureApiError()` o `captureDatabaseError()` del logger.

### 3. Warning no se envía a Sentry

**Causa**: Los warnings normales NO se envían (by design).

**Solución**: Si el warning es crítico, agrega tag `severity: "high"`:

```typescript
captureAuthWarning("Warning crítico", undefined, {
  severity: "high", // ← Esto hace que se envíe
});
```

---

## 🎯 Resumen

```typescript
// ✅ SÍ usar (errores críticos):
captureApiError(error, endpoint, method);
captureDatabaseError(error, query, params);

// ❌ NO usar para validaciones:
if (!body.nombre) {
  return Response.json({ error: "Nombre requerido" }, { status: 400 });
  // Sin Sentry ✓
}

// 🔍 Debug solo desarrollo:
logDebug("Processing order", { orderId });

// 📊 Rastro de eventos:
addBreadcrumb("payment", "Payment started", { amount });
```

---

## 📚 Archivos de Configuración

- `sentry.client.config.ts` - Browser (React)
- `sentry.server.config.ts` - Server (API Routes)
- `sentry.edge.config.ts` - Middleware
- `lib/sentry-logger.ts` - ⭐ **Utility principal**
- `app/api/ejemplo-sentry/route.ts` - Ejemplo de uso

---

¿Preguntas? Revisa el ejemplo completo en `app/api/ejemplo-sentry/route.ts`
