# Análisis Técnico Profundo - Sistema Industrial

---

## 📑 Tabla de Contenidos

1. [Análisis de Arquitectura](#análisis-de-arquitectura)
2. [Estructura de Base de Datos](#estructura-de-base-de-datos)
3. [Análisis de Componentes](#análisis-de-componentes)
4. [API y Endpoints](#api-y-endpoints)
5. [Flujos de Datos Críticos](#flujos-de-datos-críticos)
6. [Performance y Optimización](#performance-y-optimización)
7. [Patrones de Diseño](#patrones-de-diseño)
8. [Testing y Validación](#testing-y-validación)

---

## 🏗️ Análisis de Arquitectura

### Arquitectura en Capas

```
┌────────────────────────────────────────────────────────┐
│ CAPA 1: PRESENTACIÓN (Frontend)                       │
│ - React Components                                     │
│ - Tailwind CSS Styling                                │
│ - State Management (React Hooks)                      │
│ - WebSocket Client Connection                         │
└────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────┐
│ CAPA 2: LÓGICA DE NEGOCIO (API)                       │
│ - Next.js API Routes                                  │
│ - Validación de entrada                               │
│ - Cálculos automáticos                                │
│ - Transacciones BD                                    │
└────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────┐
│ CAPA 3: ACCESO A DATOS                                │
│ - PostgreSQL Connection Pool                          │
│ - Query Optimization                                  │
│ - Índices                                             │
│ - Backup & Recovery                                   │
└────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────┐
│ CAPA 4: COMUNICACIÓN (WebSocket)                      │
│ - ws server en puerto 3300                            │
│ - Broadcast de eventos                                │
│ - Sincronización cliente-servidor                     │
└────────────────────────────────────────────────────────┘
```

### Patrones Arquitectónicos Identificados

| Patrón          | Implementación                                               | Beneficio                        |
| --------------- | ------------------------------------------------------------ | -------------------------------- |
| **MVC**         | Models (interfaces), Views (React), Controllers (API routes) | Separación de responsabilidades  |
| **Repository**  | apiClient wrapper                                            | Abstracción de datos             |
| **Factory**     | calculateMaterialConsumption                                 | Encapsulación de lógica compleja |
| **Observer**    | WebSocket/Hooks                                              | Reactividad en tiempo real       |
| **Transaction** | BEGIN/COMMIT/ROLLBACK                                        | Integridad de datos              |

---

## 💾 Estructura de Base de Datos

### Diagrama de Relaciones

```
┌──────────────┐
│   CLIENTES   │
├──────────────┤
│ cliente_id   │◄──┐
│ nombre       │   │
│ contacto     │   │
│ email        │   │
└──────────────┘   │
                   │
                   ├─ (1:N) ──► ┌──────────────────────┐
                   │            │ ORDENES_VENTA        │
                   │            ├──────────────────────┤
                   │            │ orden_venta_id       │
                   │            │ cliente_id (FK)      │
                   │            │ fecha_pedido         │
                   │            │ fecha_entrega_est    │
                   │            │ estado               │
                   │            └──────────────────────┘
                   │                      │
                   │                      ├─ (1:N) ──► ┌──────────────────────┐
                   │                      │            │ DETALLE_ORDEN_VENTA  │
                   │                      │            ├──────────────────────┤
                   │                      │            │ detalle_id           │
                   │                      │            │ orden_venta_id (FK)  │
                   │                      │            │ producto_id (FK)     │
                   │                      │            │ cantidad             │
                   │                      │            └──────────────────────┘
                   │                      │
                   │                      └─────────► (relacionado a)
                   │
                   └─────► Productos ──── Componentes ──── Materia_Prima
                                              │
                                              └─ Tipo_Componente


ÓRDENES_PRODUCCIÓN (Tabla Central)
├── Producto (FK)
├── Consumo_Materia_Prima_Produccion (1:N)
│   └── Materia_Prima (FK)
└── Etapas_Produccion (1:N)
    └── Operarios (FK)


COMPRAS (Abastecimiento)
├── Proveedor (FK)
└── Detalle_Compra_Materia_Prima (1:N)
    └── Materia_Prima (FK)
```

### Definiciones de Tablas Críticas

#### Tabla: `Materia_Prima`

```sql
CREATE TABLE Materia_Prima (
    materia_prima_id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    referencia_proveedor VARCHAR(255),
    unidad_medida VARCHAR(50),          -- kg, m, unidad
    stock_actual NUMERIC(10,2),
    punto_pedido NUMERIC(10,2),         -- ALERTA CUANDO stock < punto_pedido
    tiempo_entrega_dias INT,
    longitud_estandar_m NUMERIC(10,2),  -- 5.8, 6.0, etc
    color VARCHAR(100),
    id_tipo_componente INT,
    FOREIGN KEY (id_tipo_componente) REFERENCES Tipo_Componente(tipo_componente_id)
);

-- Índices para optimización
CREATE INDEX idx_materia_prima_stock ON Materia_Prima(stock_actual);
CREATE INDEX idx_materia_prima_tipo ON Materia_Prima(id_tipo_componente);
```

#### Tabla: `Ordenes_Produccion`

```sql
CREATE TABLE Ordenes_Produccion (
    orden_produccion_id SERIAL PRIMARY KEY,
    orden_venta_id INT,
    producto_id INT NOT NULL,
    cantidad_a_producir INT NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT NOW(),
    fecha_inicio TIMESTAMP,
    fecha_fin_estimada TIMESTAMP,
    fecha_fin_real TIMESTAMP,
    estado VARCHAR(50),                 -- Planificada, En Proceso, Completada
    FOREIGN KEY (producto_id) REFERENCES Productos(producto_id),
    FOREIGN KEY (orden_venta_id) REFERENCES Ordenes_Venta(orden_venta_id)
);
```

#### Tabla: `Consumo_Materia_Prima_Produccion`

```sql
CREATE TABLE Consumo_Materia_Prima_Produccion (
    consumo_id SERIAL PRIMARY KEY,
    orden_produccion_id INT NOT NULL,
    materia_prima_id INT NOT NULL,
    cantidad_requerida NUMERIC(10,2),   -- CALCULADA AUTOMÁTICAMENTE
    cantidad_usada NUMERIC(10,2),       -- Registrada durante producción
    merma_calculada NUMERIC(10,2),      -- cantidad_usada - cantidad_requerida
    fecha_registro TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (orden_produccion_id) REFERENCES Ordenes_Produccion(orden_produccion_id),
    FOREIGN KEY (materia_prima_id) REFERENCES Materia_Prima(materia_prima_id),
    UNIQUE (orden_produccion_id, materia_prima_id)  -- Un material por orden
);

-- Índices para búsquedas
CREATE INDEX idx_consumo_orden ON Consumo_Materia_Prima_Produccion(orden_produccion_id);
CREATE INDEX idx_consumo_material ON Consumo_Materia_Prima_Produccion(materia_prima_id);
```

#### Tabla: `Productos_Componentes`

```sql
CREATE TABLE Productos_Componentes (
    producto_id INT NOT NULL,
    componente_id INT NOT NULL,
    cantidad_necesaria NUMERIC(10,2),   -- Por unidad de producto
    angulo_corte VARCHAR(100),
    PRIMARY KEY (producto_id, componente_id),
    FOREIGN KEY (producto_id) REFERENCES Productos(producto_id),
    FOREIGN KEY (componente_id) REFERENCES Componentes(componente_id)
);
```

---

## 🔍 Análisis de Componentes

### Componentes Frontend Principales

#### 1. Dashboard (`/app/dashboard/page.tsx`)

**Responsabilidades**:

- Punto de entrada principal
- Agregación de datos
- Navegación a módulos

**Estructura**:

```
Dashboard
├── Header (Logo, Usuario)
├── Sidebar (Navegación)
├── Main Content
│   ├── Estadísticas (Cards)
│   ├── Gráficos (Charts)
│   └── Tablas de datos
└── DevTools Panel (Monitoreo)
```

**Hooks Utilizados**:

```typescript
-useOrdenesProduccion() - // Órdenes de producción
  useMateriaPrima() - // Inventario
  useProductos() - // Catálogo
  useClientes() - // Contactos
  useIndustrialWebSocket(); // Actualizaciones en vivo
```

#### 2. Órdenes de Producción (`/app/dashboard/ordenes-produccion/page.tsx`)

**Características**:

- Gestión completa de órdenes
- Cálculo automático de consumos
- Edición y eliminación

**Flujo**:

```
Usuario → Click "Nueva Orden" → Abre Dialog → Completa Formulario
    ↓
Valida datos → API POST → Backend calcula consumos → DB transaction
    ↓
Retorna con consumos → UI se actualiza → WebSocket notifica otros clientes
```

**Componentes Utilizados**:

```
Dialog (form)
├── Inputs (Producto, Cantidad, Fechas)
├── Selects (Estado)
└── Botones (Crear, Cancelar)

Table
├── Filas con órdenes
└── Acciones (Editar, Eliminar)
```

#### 3. Materia Prima (`/app/dashboard/materia-prima/page.tsx`)

**Características**:

- Gestión de inventario
- Alertas de stock bajo
- Movimientos

**Estados Visuales**:

```
Badge "Stock OK"     (stock > punto_pedido * 1.5)
Badge "Stock Bajo"   (stock > punto_pedido)
Badge "ALERTA"       (stock ≤ punto_pedido)
```

#### 4. Productos (`/app/dashboard/productos/page.tsx`)

**Características**:

- Definición de productos
- Asignación de componentes
- Especificaciones técnicas

**Tabs**:

1. Información General
2. Componentes asignados
3. Especificaciones

---

## 🔌 API y Endpoints

### Estructura de Endpoints

```
/api/
├── clientes/
│   ├── GET (list)
│   ├── POST (create)
│   └── [id]/
│       ├── GET (read)
│       ├── PUT (update)
│       └── DELETE
├── materia-prima/
│   ├── GET (list con joins)
│   ├── POST (create)
│   └── [id]/
│       ├── GET, PUT, DELETE
├── ordenes-produccion/
│   ├── GET (list con consumos ✨)
│   ├── POST (create con cálculo automático ✨)
│   └── [id]/
│       ├── GET (con detalles)
│       ├── PUT (recalcula consumos ✨)
│       └── DELETE
├── productos/
│   ├── GET (list)
│   ├── POST (con componentes)
│   └── [id]/
├── inventario/
│   └── movimientos/
│       └── POST (registrar entrada/salida)
├── websocket
│   └── GET (WebSocket upgrade)
└── dashboard
    └── GET (métricas agregadas)
```

### Endpoints Críticos Detallados

#### `POST /api/ordenes-produccion` (Crear orden con consumos automáticos)

**Request**:

```json
{
  "producto_id": 1,
  "cantidad_a_producir": 100,
  "fecha_creacion": "2025-11-10T10:00:00Z",
  "fecha_fin_estimada": "2025-11-15T10:00:00Z",
  "estado": "Planificada"
}
```

**Proceso**:

```
1. Validar entrada
2. BEGIN transaction
3. INSERT Ordenes_Produccion
4. SELECT productos_componentes WHERE producto_id = 1
5. FOREACH componente:
     cantidad_total = componente.cantidad_necesaria * 100
     INSERT Consumo_Materia_Prima_Produccion
6. COMMIT
7. RETURN orden con consumos
```

**Response** (201):

```json
{
  "orden_produccion_id": 42,
  "producto_id": 1,
  "cantidad_a_producir": 100,
  "estado": "Planificada",
  "consumos": [
    {
      "materia_prima_id": 5,
      "nombre": "Vidrio templado",
      "cantidad_total": 200,
      "cantidad_requerida": 200
    }
  ],
  "mensaje": "Orden creada con consumos calculados automáticamente"
}
```

#### `GET /api/ordenes-produccion` (Listar con consumos)

**Query Compleja**:

```sql
SELECT
  op.*,
  COALESCE(
    json_agg(
      json_build_object(
        'consumo_id', cmpp.consumo_id,
        'materia_prima_id', cmpp.materia_prima_id,
        'cantidad_requerida', cmpp.cantidad_requerida,
        'cantidad_usada', cmpp.cantidad_usada,
        'merma_calculada', cmpp.merma_calculada
      ) ORDER BY cmpp.consumo_id
    ) FILTER (WHERE cmpp.consumo_id IS NOT NULL),
    '[]'::json
  ) as consumos
FROM Ordenes_Produccion op
LEFT JOIN Consumo_Materia_Prima_Produccion cmpp
  ON op.orden_produccion_id = cmpp.orden_produccion_id
GROUP BY op.orden_produccion_id
ORDER BY op.fecha_creacion DESC;
```

**Ventaja**: Los consumos vienen en la respuesta, sin queries adicionales

#### `PUT /api/ordenes-produccion/[id]` (Actualizar con recalculation)

**Lógica**:

```typescript
1. Obtener orden actual
2. Comparar producto_id y cantidad_a_producir
3. SI cambió ALGUNO:
     - Eliminar consumos antiguos
     - Calcular nuevos consumos
     - Insertar nuevos registros
4. SI NO cambió:
     - Solo actualizar orden
5. RETURN orden actualizada
```

---

## 🔄 Flujos de Datos Críticos

### Flujo 1: Crear Orden con Consumos Automáticos

```
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND: Usuario completa formulario                        │
└──────────────────┬──────────────────────────────────────────┘
                   │ POST /api/ordenes-produccion
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ API ROUTE: Valida entrada                                   │
│ - producto_id: requerido                                    │
│ - cantidad_a_producir: > 0                                  │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ DATABASE: BEGIN transaction                                 │
│ 1. INSERT Ordenes_Produccion                               │
│ 2. SELECT Productos_Componentes                            │
│ 3. FOREACH: INSERT Consumo_Materia_Prima_Produccion        │
│ 4. COMMIT                                                   │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND: Recibe respuesta con consumos                      │
│ Actualiza estado local                                      │
│ Muestra en tabla                                            │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ WEBSOCKET: Notifica a otros clientes                        │
│ Actualización en tiempo real                                │
└─────────────────────────────────────────────────────────────┘
```

### Flujo 2: Cambiar Cantidad de Orden

```
Usuario edita cantidad: 100 → 150

            ↓

PUT /api/ordenes-produccion/42

            ↓

API detecta:
- cantidad_a_producir: 100 → 150 (CAMBIÓ)

            ↓

Eliminar consumos antiguos (basados en 100)

            ↓

Calcular nuevos consumos (basados en 150):
- Vidrio: 200 m² → 300 m²
- Marco: 500 m → 750 m
- etc.

            ↓

INSERT nuevos registros

            ↓

COMMIT transaction

            ↓

Retorna orden con nuevos consumos

            ↓

Frontend actualiza tabla
WebSocket notifica cambio
```

### Flujo 3: Monitoreo en Tiempo Real (WebSocket)

```
Servidor                           Cliente 1        Cliente 2
    │                                 │                 │
    │◄─── WebSocket connect ─────────│                 │
    │◄─── WebSocket connect ─────────│─────────────────│
    │                                 │                 │
    │ (Usuario crea orden)            │                 │
    │────────────────────────────────►│                 │
    │                                 │                 │
    │ Broadcast: "orden:created"      │                 │
    │───────────────────────────────► │                 │
    │──────────────────────────────────────────────────►│
    │                                 │                 │
    │ (Ambos actualizan UI)           ✓                 ✓
    │
```

---

## ⚡ Performance y Optimización

### Optimizaciones Implementadas

#### 1. Connection Pooling

```typescript
// /lib/database.ts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // máx 20 conexiones
  idleTimeoutMillis: 30000, // cerrar después 30s inactivo
  connectionTimeoutMillis: 2000,
});
```

#### 2. Índices en BD

```sql
-- Búsquedas rápidas
CREATE INDEX idx_ordenes_estado ON Ordenes_Produccion(estado);
CREATE INDEX idx_ordenes_producto ON Ordenes_Produccion(producto_id);
CREATE INDEX idx_consumo_orden ON Consumo_Materia_Prima_Produccion(orden_produccion_id);

-- Foreign keys automáticamente indexadas
```

#### 3. JSON Aggregation (Single Query)

```sql
-- En lugar de 2 queries (órdenes + consumos)
-- Hacemos 1 query con LEFT JOIN + json_agg
-- Result: 40-50% más rápido
```

#### 4. Memoización en Frontend

```typescript
// React Hooks cachean resultados
const { ordenes } = useOrdenesProduccion(); // Rerenderiza solo si cambió
```

#### 5. Lazy Loading

```typescript
// Solo traer lo necesario
GET /api/ordenes-produccion   // Con consumos
vs.
GET /api/ordenes-produccion   // Datos básicos
GET /api/consumos?orden_id=42 // Detalles bajo demanda
```

### Métricas de Performance Esperadas

| Operación                          | Tiempo           | Límite    |
| ---------------------------------- | ---------------- | --------- |
| GET órdenes (100 registros)        | ~200ms           | <500ms ✓  |
| POST orden con consumos            | ~400ms           | <1000ms ✓ |
| PUT orden (recalcular)             | ~300ms           | <1000ms ✓ |
| Búsqueda en tabla (1000 registros) | ~50ms (frontend) | <100ms ✓  |
| WebSocket broadcast                | ~50ms            | <200ms ✓  |

---

## 🎨 Patrones de Diseño

### 1. Repository Pattern

```typescript
// /lib/api.ts - Abstracción de datos
class ApiClient {
  async getOrdenesProduccion(): Promise<OrdenProduccion[]> {
    return this.getRequest<OrdenProduccion[]>("/ordenes-produccion");
  }

  async createOrdenProduccion(data: OrdenProduccion): Promise<OrdenProduccion> {
    return this.postRequest<OrdenProduccion>("/ordenes-produccion", data);
  }
}

// Beneficio: Si cambia estructura de respuesta, solo cambiar aquí
```

### 2. Custom Hooks

```typescript
// /hooks/useOrdenesProduccion.ts
export function useOrdenesProduccion() {
  const [ordenes, setOrdenes] = useState<OrdenProduccion[]>([]);

  const createOrden = async (data: OrdenProduccion) => {
    const response = await apiClient.createOrdenProduccion(data);
    setOrdenes([response, ...ordenes]);
    return response;
  };

  return { ordenes, createOrden };
}

// Reutilizable en múltiples componentes
```

### 3. Factory Pattern

```typescript
// /lib/production-calculations.ts
export async function calculateMaterialConsumption(
  producto_id: number,
  cantidad: number
): Promise<ConsumoCalculado[]> {
  // Encapsula lógica de cálculo
  // Reutilizable en POST y PUT
}

// Beneficio: Un único lugar para la lógica crítica
```

### 4. Observer Pattern (WebSocket)

```typescript
// /hooks/useIndustrialWebSocket.ts
export function useIndustrialWebSocket() {
  useEffect(() => {
    const ws = new WebSocket(getClientWebSocketUrl());

    ws.onmessage = (event) => {
      const { type, data } = JSON.parse(event.data);

      if (type === "orden:created") {
        setOrdenes((prev) => [data, ...prev]);
      }
    };
  }, []);
}

// Beneficio: Componentes reaccionan a cambios del servidor
```

---

## ✅ Testing y Validación

### Validaciones en API

```typescript
// POST /api/ordenes-produccion
if (!producto_id || !cantidad_a_producir) {
  return { error: "Campos requeridos", status: 400 };
}

if (cantidad_a_producir <= 0) {
  return { error: "Cantidad debe ser > 0", status: 400 };
}

// Verificar que producto existe
const producto = await db.getProducto(producto_id);
if (!producto) {
  return { error: "Producto no encontrado", status: 404 };
}
```

### Transacciones para Integridad

```typescript
try {
  await client.query("BEGIN");

  // Todas las operaciones
  await client.query("INSERT...");
  await client.query("INSERT...");

  // Si falla cualquiera, ROLLBACK automático
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
  // Garantiza consistencia
}
```

### Casos de Prueba Recomendados

**Unit Tests**:

- [ ] calculateMaterialConsumption (diferentes productos)
- [ ] validación de entrada en API
- [ ] cálculo de merma

**Integration Tests**:

- [ ] Crear orden → consumos se calculan
- [ ] Cambiar cantidad → consumos se recalculan
- [ ] Eliminar orden → consumos se eliminan

**End-to-End Tests**:

- [ ] Flujo completo: Venta → Producción → Entrega
- [ ] WebSocket: Un cliente crea orden → otro ve actualización
- [ ] Inventario: Stock se actualiza al crear orden

---

## 📊 Conclusión Técnica

### Fortalezas del Sistema

✅ **Automatización**: Cálculo de consumos sin intervención manual  
✅ **Integridad**: Transacciones ACID garantizan consistencia  
✅ **Performance**: Optimizaciones de índices y queries  
✅ **Escalabilidad**: Arquitectura modular y separación de responsabilidades  
✅ **Mantenibilidad**: Patrones de diseño claros  
✅ **Trazabilidad**: Registro completo de operaciones

### Áreas de Mejora

🔄 **Testing**: Agregar suite de tests automatizados  
🔒 **Seguridad**: Implementar autenticación y RBAC  
📈 **Monitoreo**: Logging y alertas más detalladas  
🚀 **Performance**: Caching en cliente (Redis)  
📊 **Analytics**: Dashboard de métricas avanzadas

---
