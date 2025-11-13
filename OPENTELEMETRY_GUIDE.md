# 🔭 Guía de Uso de OpenTelemetry

Este proyecto usa **OpenTelemetry** para observabilidad y monitoreo de la aplicación. OpenTelemetry es un estándar open-source que proporciona traces, métricas y logs estructurados.

---

## 📊 ¿Qué es OpenTelemetry?

OpenTelemetry (OTel) es un framework de observabilidad que te permite:

- **Traces**: Ver el flujo completo de una request a través de tu sistema
- **Métricas**: Medir performance, latencia, throughput
- **Logs**: Logs estructurados correlacionados con traces
- **Vendor-neutral**: Compatible con Jaeger, Grafana, DataDog, New Relic, etc.

---

## 🚀 Configuración

### Variables de Entorno

```bash
# .env.local o .env.production

# Nombre del servicio (aparece en traces)
OTEL_SERVICE_NAME=industrial-maese

# Endpoint del collector (OTLP)
# Ejemplos:
# - Jaeger local: http://localhost:4318/v1/traces
# - Grafana Cloud: https://otlp-gateway-prod-XX.grafana.net/otlp
# - DataDog: https://trace.agent.datadoghq.com/v1/traces
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces

# Headers para autenticación (opcional, formato JSON)
# Ejemplo Grafana Cloud:
OTEL_EXPORTER_OTLP_HEADERS='{"Authorization":"Basic <base64-user:token>"}'

# Ambiente
NODE_ENV=production
```

---

## 🐳 Backend Local: Jaeger (Docker)

Para ver traces en local, usa Jaeger con Docker:

```bash
# Iniciar Jaeger all-in-one
docker run -d --name jaeger \
  -e COLLECTOR_OTLP_ENABLED=true \
  -p 16686:16686 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest

# Ver UI de Jaeger
open http://localhost:16686
```

O usa `docker-compose.yml`:

```yaml
version: "3.8"
services:
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686" # UI
      - "4318:4318" # OTLP HTTP
    environment:
      - COLLECTOR_OTLP_ENABLED=true
```

```bash
docker-compose up -d
```

---

## 📦 Backends Soportados

### 1. **Jaeger** (Open Source, Local)

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
```

UI: http://localhost:16686

### 2. **Grafana Cloud** (Free tier: 50GB/mes)

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-gateway-prod-us-east-0.grafana.net/otlp/v1/traces
OTEL_EXPORTER_OTLP_HEADERS='{"Authorization":"Basic <base64>"}'
```

Get token: https://grafana.com/auth/sign-in

### 3. **DataDog**

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=https://trace.agent.datadoghq.com/v1/traces
OTEL_EXPORTER_OTLP_HEADERS='{"DD-API-KEY":"<your-api-key>"}'
```

### 4. **New Relic**

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp.nr-data.net:4318/v1/traces
OTEL_EXPORTER_OTLP_HEADERS='{"api-key":"<your-license-key>"}'
```

### 5. **AWS X-Ray**

Requiere AWS OpenTelemetry Collector

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
```

---

## 🎯 Uso en el Código

### 1. Importar el Logger

```typescript
import {
  captureApiError,
  captureDatabaseError,
  logDebug,
  withTrace,
  addBreadcrumb,
  setUserContext,
  clearUserContext,
} from "@/lib/otel-logger";
```

---

### 2. Traces Automáticos de Operaciones

La función `withTrace()` crea un span parent para una operación:

```typescript
export async function GET(request: NextRequest) {
  try {
    // Crear trace de toda la operación
    const data = await withTrace(
      "api.clientes.fetch", // Nombre del span
      async () => {
        // Tu código aquí
        const client = await pool.connect();
        try {
          return await client.query("SELECT * FROM clientes");
        } finally {
          client.release();
        }
      },
      {
        // Atributos personalizados
        "http.method": "GET",
        "http.route": "/api/clientes",
        "user.id": auth.user.userId,
      }
    );

    return NextResponse.json(data.rows);
  } catch (error) {
    captureApiError(error, "/api/clientes", "GET");
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
```

**Resultado en Jaeger**:

```
Trace: api.clientes.fetch
  ├─ Span: database.query (auto-instrumentation)
  ├─ Atributos: http.method=GET, user.id=123
  └─ Duration: 45ms
```

---

### 3. Errores de API (Genera Spans)

```typescript
export async function POST(request: NextRequest) {
  let auth: ReturnType<typeof authenticateApiRequest> | undefined;

  try {
    auth = authenticateApiRequest(request);
    // ... lógica de negocio
    const result = await createCliente(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    // ✅ Genera span de error en OpenTelemetry
    captureApiError(error, "/api/clientes", "POST", auth?.user?.userId, {
      body: JSON.stringify(body),
      timestamp: Date.now(),
    });

    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
```

**Resultado**: Span `error.API Error: POST /api/clientes` con stack trace.

---

### 4. Errores de Base de Datos (Genera Spans)

```typescript
const client = await pool.connect();
try {
  const result = await client.query(
    "INSERT INTO clientes (nombre, email) VALUES ($1, $2)",
    [nombre, email]
  );
  return result.rows[0];
} catch (dbError) {
  // ✅ Genera span de error DB
  captureDatabaseError(
    dbError,
    "INSERT INTO clientes (nombre, email) VALUES ($1, $2)",
    [nombre, email]
  );
  throw dbError;
} finally {
  client.release();
}
```

**Resultado**: Span `error.Database Error` con query y parámetros.

---

### 5. Errores de Validación (NO genera spans)

```typescript
export async function POST(request: NextRequest) {
  const body = await request.json();

  // ❌ NO genera span: error esperado
  if (!body.nombre) {
    logDebug("Validation error: missing nombre");
    return NextResponse.json(
      { error: "El nombre es requerido" },
      { status: 400 }
    );
  }

  // ... continuar
}
```

---

### 6. Logging de Debug (Solo Desarrollo)

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

  // Solo aparece en consola local
  // NO genera spans en OpenTelemetry
}
```

---

### 7. Eventos (Breadcrumbs)

```typescript
export async function checkout(cart: Cart) {
  // Agregar eventos al span activo
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
    // Los eventos se incluyen automáticamente en el span de error
    captureApiError(error, "/api/checkout", "POST");
    throw error;
  }
}
```

**Resultado en Jaeger**: Eventos aparecen en la timeline del trace.

---

### 8. Contexto de Usuario

Ya está integrado en `hooks/useAuth.ts`:

```typescript
// Al hacer login
useEffect(() => {
  if (user) {
    // ✅ Establecer usuario en span activo
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
  clearUserContext(); // Limpia contexto
  router.push("/login");
};
```

Todos los spans futuros tendrán `user.id`, `user.email`, `user.role`.

---

## 📋 Instrumentación Automática

OpenTelemetry instrumenta automáticamente:

| Librería        | Auto-instrumentado | Qué captura                  |
| --------------- | ------------------ | ---------------------------- |
| **HTTP**        | ✅                 | Requests entrantes/salientes |
| **PostgreSQL**  | ✅                 | Queries SQL (con params)     |
| **Express**     | ✅                 | Rutas y middleware           |
| **Fetch API**   | ✅                 | Llamadas a APIs externas     |
| **DNS**         | ❌                 | Deshabilitado (ruido)        |
| **File System** | ❌                 | Deshabilitado (ruido)        |

---

## 🔍 Ver Traces en Jaeger

1. Inicia Jaeger: `docker run -d -p 16686:16686 -p 4318:4318 jaegertracing/all-in-one`
2. Inicia tu app: `npm run dev`
3. Haz requests: `curl http://localhost:3000/api/clientes`
4. Abre Jaeger UI: http://localhost:16686
5. Selecciona servicio: `industrial-maese`
6. Ve tus traces!

**Ejemplo de trace**:

```
Trace ID: 7f8a9b2c...
Duration: 125ms

├─ GET /api/clientes [85ms]
│  ├─ authenticateApiRequest [5ms]
│  ├─ database.query.select [75ms]
│  │  └─ SELECT * FROM clientes
│  └─ Events:
│     └─ api.request: User fetching data
```

---

## 🎯 Filtrado: ¿Cuándo Genera Spans?

### ✅ SÍ genera spans:

- ❌ `captureApiError()` - Errores inesperados
- ❌ `captureDatabaseError()` - Errores de DB
- 📊 `withTrace()` - Operaciones trackeadas
- 🔄 Auto-instrumentación HTTP, PostgreSQL

### ❌ NO genera spans:

- ✅ Errores de validación (400)
- ✅ Errores de autenticación (401)
- ✅ Errores de permisos (403)
- ✅ Resources not found (404)
- 🔍 `logDebug()` - Solo consola
- 📝 `logInfo()` - Solo testing

---

## 📊 Dashboards y Alertas

### Grafana (con Grafana Cloud o self-hosted)

```sql
-- Query de ejemplo en Grafana

-- Latencia promedio por endpoint
avg(rate(http_server_duration_ms_sum[5m]))
  by (http_route)

-- Errores por minuto
sum(rate(http_server_requests_total{http_status_code=~"5.."}[1m]))

-- Top endpoints más lentos
topk(10, histogram_quantile(0.95,
  rate(http_server_duration_ms_bucket[5m])))
```

### Alertas (ejemplo)

```yaml
# alerts.yaml
groups:
  - name: api_errors
    rules:
      - alert: HighErrorRate
        expr: rate(http_server_requests_total{http_status_code=~"5.."}[5m]) > 0.1
        for: 5m
        annotations:
          summary: "Alta tasa de errores en API"
```

---

## 🧪 Testing

### Test local sin backend

```bash
# No configurar OTEL_EXPORTER_OTLP_ENDPOINT
# Los traces se generan pero no se exportan
NODE_ENV=development npm run dev
```

Verás en consola:

```
[OpenTelemetry] ✓ Tracing initialized
[OpenTelemetry] Service: industrial-maese
[OpenTelemetry] Endpoint: http://localhost:4318/v1/traces
[OTel ERROR] API Error: GET /api/test
```

### Test con Jaeger local

```bash
# 1. Iniciar Jaeger
docker run -d -p 4318:4318 -p 16686:16686 jaegertracing/all-in-one

# 2. Configurar endpoint
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces

# 3. Iniciar app
npm run dev

# 4. Hacer requests
curl http://localhost:3000/api/ejemplo-otel

# 5. Ver traces
open http://localhost:16686
```

---

## 🔧 Archivos de Configuración

- `instrumentation.ts` - Entry point de Next.js
- `lib/telemetry/otel.config.ts` - Configuración de OpenTelemetry SDK
- `lib/otel-logger.ts` - ⭐ **Utility principal**
- `app/api/ejemplo-otel/route.ts` - Ejemplo de uso

---

## 🆚 Diferencias con Sentry

| Aspecto      | Sentry            | OpenTelemetry                  |
| ------------ | ----------------- | ------------------------------ |
| **Tipo**     | SaaS propietario  | Open source, vendor-neutral    |
| **Enfoque**  | Error tracking    | Observabilidad completa        |
| **Costo**    | Quota por eventos | Depende del backend elegido    |
| **Traces**   | Básico            | Avanzado (distributed tracing) |
| **Backends** | Solo Sentry       | Jaeger, Grafana, DataDog, etc. |
| **Lock-in**  | Vendor lock-in    | Sin lock-in                    |
| **Setup**    | Simple            | Moderado                       |

---

## 📚 Recursos

- **Documentación oficial**: https://opentelemetry.io/docs/
- **Jaeger**: https://www.jaegertracing.io/
- **Grafana Cloud (free)**: https://grafana.com/products/cloud/
- **Ejemplo completo**: `app/api/ejemplo-otel/route.ts`

---

## ✅ Checklist

- [ ] Configurar variables de entorno (OTEL_SERVICE_NAME, OTEL_EXPORTER_OTLP_ENDPOINT)
- [ ] Elegir backend (Jaeger local, Grafana Cloud, DataDog, etc.)
- [ ] Iniciar backend (ej: `docker run jaeger`)
- [ ] Usar `withTrace()` en operaciones críticas
- [ ] Usar `captureApiError()` en catch blocks
- [ ] Usar `logDebug()` para debugging local
- [ ] Verificar traces en UI del backend
- [ ] Configurar alertas (opcional)

---

¿Preguntas? Revisa el ejemplo completo en `app/api/ejemplo-otel/route.ts`
