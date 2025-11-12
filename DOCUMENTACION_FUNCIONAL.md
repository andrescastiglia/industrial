# Documentación Funcional - Sistema de Gestión Industrial

**Versión:** 1.0  
**Última actualización:** Noviembre 2025  
**Estado:** Análisis Completo

---

## 📋 Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Módulos Funcionales](#módulos-funcionales)
4. [Flujos de Negocio](#flujos-de-negocio)
5. [Gestión de Datos](#gestión-de-datos)
6. [Tecnología e Infraestructura](#tecnología-e-infraestructura)
7. [Características Avanzadas](#características-avanzadas)
8. [Guía de Usuario](#guía-de-usuario)
9. [Problemas Conocidos y Soluciones](#problemas-conocidos-y-soluciones)

---

## 🎯 Resumen Ejecutivo

### Propósito del Sistema

El sistema de **Gestión Industrial** es una plataforma web integrada diseñada para optimizar la operación de una **planta de producción de aberturas (ventanas, puertas)**, permitiendo:

- **Gestión centralizada** de clientes, proveedores, productos y materia prima
- **Control de inventario** en tiempo real
- **Planificación de producción** automática y eficiente
- **Seguimiento de órdenes** desde la venta hasta la entrega
- **Optimización de recursos** (materiales, operarios, tiempo)
- **Monitoreo en vivo** mediante WebSocket y DevTools

### Objetivos Clave

✅ **Automatización**: Eliminar tareas manuales repetitivas  
✅ **Precisión**: Cálculos automáticos de consumos y consumibles  
✅ **Eficiencia**: Optimizar tiempos de producción y costos  
✅ **Trazabilidad**: Registro completo de todas las operaciones  
✅ **Escalabilidad**: Sistema diseñado para crecer con la empresa

---

## 🏗️ Arquitectura del Sistema

### Stack Tecnológico

```
┌─────────────────────────────────────────────────────┐
│            Frontend (Next.js/React)                 │
│  - Dashboard interactivo                            │
│  - Formularios dinámicos                            │
│  - Tablas con búsqueda/filtrado                     │
│  - WebSocket para actualizaciones en vivo           │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│         API REST (Next.js API Routes)               │
│  - CRUD operations                                  │
│  - Transacciones de base de datos                   │
│  - Cálculos automáticos                             │
│  - WebSocket server en puerto 3300                  │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│        Base de Datos (PostgreSQL)                   │
│  - 12+ tablas relacionales                          │
│  - Integridad referencial                           │
│  - Índices optimizados                              │
└─────────────────────────────────────────────────────┘
```

### Componentes Principales

| Componente        | Responsabilidad             | Tecnología                      |
| ----------------- | --------------------------- | ------------------------------- |
| **Frontend**      | Interfaz de usuario         | React, Next.js 14, Tailwind CSS |
| **API**           | Lógica de negocio           | Next.js API Routes              |
| **Base de Datos** | Persistencia de datos       | PostgreSQL                      |
| **WebSocket**     | Comunicación en tiempo real | ws (librería Node)              |
| **DevTools**      | Monitoreo y debugging       | Custom React Component          |

### Flujo de Datos

```
Usuario → UI (React) → API Route → Database Query
                ↑                        ↓
                ← Response JSON ←────────
```

---

## 📦 Módulos Funcionales

### 1. **Gestión de Clientes**

#### Funcionalidad

- Registro de clientes con información de contacto
- Búsqueda y filtrado por nombre
- Actualización de datos
- Eliminación de registros

#### Datos Principales

```typescript
Cliente {
  cliente_id: number
  nombre: string
  contacto: string
  direccion: string
  telefono: string
  email: string
}
```

#### Endpoints

- `GET /api/clientes` - Listar todos los clientes
- `GET /api/clientes/[id]` - Obtener cliente específico
- `POST /api/clientes` - Crear nuevo cliente
- `PUT /api/clientes/[id]` - Actualizar cliente
- `DELETE /api/clientes/[id]` - Eliminar cliente

---

### 2. **Gestión de Proveedores**

#### Funcionalidad

- Registro de proveedores de materia prima
- Información de contacto y CUIT
- Seguimiento de compras por proveedor
- Gestión de tiempos de entrega

#### Datos Principales

```typescript
Proveedor {
  proveedor_id: number
  nombre: string
  contacto: string
  direccion: string
  telefono: string
  email: string
  cuit: string
}
```

#### Endpoints

- `GET /api/proveedores` - Listar proveedores
- `POST /api/proveedores` - Crear proveedor
- `PUT /api/proveedores/[id]` - Actualizar proveedor
- `DELETE /api/proveedores/[id]` - Eliminar proveedor

---

### 3. **Gestión de Materia Prima**

#### Funcionalidad

- Catálogo de materiales disponibles
- Control de stock en tiempo real
- Alertas de inventario bajo (punto de pedido)
- Clasificación por tipo de componente

#### Datos Principales

```typescript
MateriaPrima {
  materia_prima_id: number
  nombre: string
  descripcion: string
  referencia_proveedor: string
  unidad_medida: string              // ej: "kg", "m", "unidad"
  stock_actual: number
  punto_pedido: number               // Alerta cuando stock < punto_pedido
  tiempo_entrega_dias: number
  longitud_estandar_m: number        // ej: 5.8m, 6m
  color: string
  id_tipo_componente: number
}
```

#### Características Especiales

- **Alerta de Stock Bajo**: Visual alert cuando `stock_actual < punto_pedido`
- **Movimientos de Inventario**: Registro de entrada/salida
- **Trazabilidad**: Histórico de transacciones

#### Endpoints

- `GET /api/materia-prima` - Listar materiales
- `POST /api/materia-prima` - Crear material
- `PUT /api/materia-prima/[id]` - Actualizar material
- `DELETE /api/materia-prima/[id]` - Eliminar material
- `POST /api/inventario/movimientos` - Registrar movimiento

---

### 4. **Gestión de Productos**

#### Funcionalidad

- Definición de productos terminados (aberturas)
- Asignación de componentes a productos
- Especificaciones técnicas (dimensiones, color, accionamiento)

#### Datos Principales

```typescript
Producto {
  producto_id: number
  nombre_modelo: string              // ej: "V1", "V2", "V3"
  descripcion: string
  ancho: number
  alto: number
  color: string
  tipo_accionamiento: string         // ej: "Proyectante", "Deslizante"
  componentes: ComponenteProducto[]
}

ComponenteProducto {
  producto_id: number
  materia_prima_id: number
  cantidad_necesaria: number         // Por unidad de producto
  angulo_corte: string
}
```

#### Flujo de Definición

1. Crear producto base (nombre, dimensiones, color)
2. Agregar componentes necesarios
3. Especificar cantidad por unidad
4. Sistema calcula automáticamente consumos en producción

---

### 5. **Gestión de Órdenes de Venta**

#### Funcionalidad

- Registro de pedidos de clientes
- Seguimiento de estado (pendiente, en proceso, completada)
- Detalles de productos solicitados

#### Datos Principales

```typescript
OrdenVenta {
  orden_venta_id: number
  cliente_id: number
  fecha_pedido: Date
  fecha_entrega_estimada: Date
  fecha_entrega_real?: Date
  estado: string                     // "Pendiente", "En Proceso", "Completada"
  detalle: DetalleOrdenVenta[]
}

DetalleOrdenVenta {
  detalle_orden_venta_id: number
  orden_venta_id: number
  producto_id: number
  cantidad: number
}
```

---

### 6. **Gestión de Órdenes de Producción** ⭐ (CLAVE)

#### Funcionalidad

- **Cálculo Automático de Consumos**: Basado en productos y cantidades
- Planificación de producción
- Asignación de operarios
- Seguimiento de etapas

#### Datos Principales

```typescript
OrdenProduccion {
  orden_produccion_id: number
  producto_id: number
  cantidad_a_producir: number
  fecha_creacion: Date
  fecha_inicio?: Date
  fecha_fin_estimada: Date
  fecha_fin_real?: Date
  estado: string
  consumos: ConsumoMateriaPrimaProduccion[]
}

ConsumoMateriaPrimaProduccion {
  consumo_id: number
  orden_produccion_id: number
  materia_prima_id: number
  cantidad_requerida: number         // Calculada automáticamente
  cantidad_usada: number             // Registrada durante producción
  merma_calculada: number            // cantidad_usada - cantidad_requerida
  fecha_registro: Date
}
```

#### Proceso Automático de Consumos

```
1. Usuario crea OrdenProduccion:
   - Selecciona Producto (ej: V1)
   - Especifica Cantidad (ej: 100 unidades)

2. Sistema:
   - Busca componentes del Producto
   - Calcula: cantidad_necesaria × cantidad_a_producir
   - Inserta ConsumoMateriaPrimaProduccion automáticamente

3. Resultado:
   - Consumo exacto y consistente
   - Sin errores manuales
   - Trazable y auditable

Ejemplo:
┌────────────────────────────────────────────────┐
│ Producto: V1                                    │
│ Componentes:                                    │
│  - Vidrio: 2 m² por unidad                     │
│  - Marco: 5 m por unidad                       │
│  - Herrajes: 4 unidades por unidad             │
│                                                 │
│ Orden: 100 unidades                            │
│                                                 │
│ Consumos Calculados:                           │
│  - Vidrio: 200 m²                             │
│  - Marco: 500 m                                │
│  - Herrajes: 400 unidades                      │
└────────────────────────────────────────────────┘
```

#### Endpoints

- `GET /api/ordenes-produccion` - Listar órdenes (con consumos)
- `GET /api/ordenes-produccion/[id]` - Obtener orden con detalles
- `POST /api/ordenes-produccion` - Crear orden (calcula consumos)
- `PUT /api/ordenes-produccion/[id]` - Actualizar (recalcula si cambia cantidad)
- `DELETE /api/ordenes-produccion/[id]` - Eliminar orden

---

### 7. **Gestión de Compras**

#### Funcionalidad

- Registro de compras a proveedores
- Seguimiento de recepción de materiales
- Detalles de cantidades y precios

#### Datos Principales

```typescript
Compra {
  compra_id: number
  proveedor_id: number
  fecha_pedido: Date
  fecha_recepcion_estimada: Date
  fecha_recepcion_real?: Date
  estado: string
  total_compra: number
  cotizacion_ref: string
}
```

---

### 8. **Gestión de Operarios**

#### Funcionalidad

- Registro de empleados
- Asignación a etapas de producción
- Seguimiento por rol

#### Datos Principales

```typescript
Operario {
  operario_id: number
  nombre: string
  apellido: string
  rol: string                        // ej: "Cortador", "Soldador", "Ensamblador"
}
```

---

### 9. **Dashboard y Análitica** 📊

#### Funcionalidad

- Resumen de métricas clave
- Gráficos de estado
- Alertas de inventario
- Seguimiento en tiempo real

#### Métricas Monitoreadas

- Total de órdenes (por estado)
- Stock de materiales (crítico, bajo, normal)
- Órdenes en proceso
- Clientes activos
- Proveedores

---

## 🔄 Flujos de Negocio

### Flujo 1: Venta → Producción → Entrega

```
┌─────────────────┐
│  CLIENTE COMPRA │
└────────┬────────┘
         ↓
┌──────────────────────────────┐
│ Crear Orden de Venta         │
│ - Cliente                    │
│ - Productos                  │
│ - Cantidades                 │
│ - Fecha entrega estimada     │
└────────┬─────────────────────┘
         ↓
┌──────────────────────────────┐
│ Crear Orden de Producción    │
│ - Producto de la orden       │
│ - Cantidad total             │
│ - Consumos calculados ✓ AUTO │
└────────┬─────────────────────┘
         ↓
┌──────────────────────────────┐
│ Registrar Etapas             │
│ - Asignar operarios          │
│ - Especificar tareas         │
└────────┬─────────────────────┘
         ↓
┌──────────────────────────────┐
│ Registrar Consumo Real       │
│ - Cantidad usada             │
│ - Merma calculada            │
└────────┬─────────────────────┘
         ↓
┌──────────────────────────────┐
│ Marcar Orden Completada      │
└────────┬─────────────────────┘
         ↓
┌──────────────────────────────┐
│ Registrar Entrega            │
│ - Fecha real                 │
│ - Confirmar estado           │
└──────────────────────────────┘
```

### Flujo 2: Gestión de Inventario

```
┌──────────────────────┐
│ Stock se reduce      │
│ cuando se crea       │
│ orden de producción  │
└──────────┬───────────┘
           ↓
    ¿Stock < Punto Pedido?
         ↙          ↘
       SÍ            NO
       ↓             ↓
┌────────────────┐  [OK]
│ Generar Alerta │
└────────┬───────┘
         ↓
┌──────────────────────┐
│ Crear Compra a       │
│ Proveedor            │
└────────┬─────────────┘
         ↓
┌──────────────────────┐
│ Registrar Recepción  │
│ Actualizar Stock     │
└──────────────────────┘
```

### Flujo 3: Cálculo Automático de Consumos

```
Usuario crea OrdenProduccion {
  producto_id: 1,          ← Producto V1
  cantidad: 100
}
          ↓
Sistema ejecuta:
  1. SELECT componentes FROM Productos_Componentes
     WHERE producto_id = 1

  2. PARA CADA componente:
     cantidad_total = componente.cantidad_necesaria × 100

  3. INSERT ConsumoMateriaPrimaProduccion
     valores calculados automáticamente
          ↓
Resultado: Consumos exactos, sin intervención manual
```

---

## 💾 Gestión de Datos

### Modelo Entidad-Relación

```
Clientes
  ├── Órdenes de Venta
  │   └── Detalles de Orden
  │       └── Productos
  │           └── Componentes
  │               └── Materia Prima
  │                   └── Tipo Componente
  │
Proveedores
  ├── Compras
  │   └── Detalles de Compra
  │
Operarios
  └── Etapas de Producción
      ├── Órdenes de Producción
      │   └── Consumo de Materia Prima

Órdenes de Producción
  ├── Consumo de Materia Prima
  ├── Etapas de Producción
  └── Movimientos de Inventario
```

### Tablas Principales

| Tabla                              | Registros   | Propósito                |
| ---------------------------------- | ----------- | ------------------------ |
| `Clientes`                         | ~50-200     | Contactos de clientes    |
| `Proveedores`                      | ~10-30      | Fuentes de materia prima |
| `Materia_Prima`                    | ~50-150     | Inventario de materiales |
| `Productos`                        | ~10-50      | Productos terminados     |
| `Ordenes_Venta`                    | ~100-1000   | Pedidos de clientes      |
| `Ordenes_Produccion`               | ~100-1000   | Planes de producción     |
| `Consumo_Materia_Prima_Produccion` | ~1000-10000 | Trazabilidad de consumos |
| `Operarios`                        | ~10-50      | Personal de planta       |
| `Etapas_Produccion`                | ~500-5000   | Tareas de producción     |

### Integridad de Datos

- **Claves Primarias**: Identificación única de registros
- **Claves Foráneas**: Relaciones entre tablas
- **Restricciones**: Validación de datos
- **Transacciones**: Atomicidad en operaciones complejas

---

## 🛠️ Tecnología e Infraestructura

### Frontend

**Framework**: Next.js 14 (React)  
**Styling**: Tailwind CSS  
**UI Components**: Custom component library  
**Estado Global**: React Hooks (local)  
**HTTP Client**: Fetch API

**Características**:

- Server-side rendering
- API Routes integradas
- Optimización automática
- Hot reload en desarrollo

### Backend

**Runtime**: Node.js  
**Framework**: Next.js API Routes  
**Base de Datos**: PostgreSQL  
**Driver**: pg (node-postgres)

**Características**:

- Transacciones ACID
- Connection pooling
- Query optimization
- Error handling

### WebSocket & Tiempo Real

**Librería**: ws (WebSocket server)  
**Puerto**: 3300 (fijo, sin SSL)  
**Protocolo**: ws:// (no encriptado)

**Funcionalidades**:

- Actualizaciones en vivo del dashboard
- Notificaciones de eventos
- Sincronización entre clientes
- Monitoreo de estado del sistema

### DevTools Personalizado

**Ubicación**: `/dashboard` panel inferior  
**Funciones**:

- Monitoreo de conexión WebSocket
- Estadísticas de rendimiento
- Debugging de eventos en vivo
- Información de sistema

---

## 🚀 Características Avanzadas

### 1. Cálculo Automático de Consumos ⭐

**Archivo**: `/lib/production-calculations.ts`

**Función**: `calculateMaterialConsumption(producto_id, cantidad)`

**Ventajas**:

- ✅ Precisión matemática
- ✅ Sin errores humanos
- ✅ Consistencia en toda la planta
- ✅ Trazabilidad completa

**Ejemplo de Uso**:

```typescript
const consumos = await calculateMaterialConsumption(
  producto_id: 1,      // Producto V1
  cantidad: 100        // 100 unidades
);
// Retorna: [{materia_prima_id, nombre, cantidad_total}, ...]
```

### 2. WebSocket en Tiempo Real

**Archivo**: `/app/api/websocket/route.ts`

**Eventos Soportados**:

- Actualización de órdenes
- Cambios de inventario
- Notificaciones de sistema
- Broadcasts a múltiples clientes

**Configuración Centralizada**: `/lib/websocket-config.ts`

```typescript
export function getWebSocketConfig() {
  return {
    host: "localhost",
    port: 3300,
    protocol: "ws", // Sin SSL
    url: "ws://localhost:3300",
  };
}
```

### 3. DevTools Panel Personalizado

**Ubicación**: `/components/IndustrialDevPanel.tsx`

**Información Mostrada**:

- Conexión WebSocket (conectado/desconectado)
- Notificaciones activas
- Información de la orden siendo editable
- Estado del sistema

---

## 👤 Guía de Usuario

### Acceso al Sistema

1. **Login**: Página inicial `/login`
2. **Dashboard**: `/dashboard` (panel principal)
3. **Módulos**: Accesibles desde el menú lateral

### Operaciones Comunes

#### Crear Nueva Orden de Producción

1. Ir a `Dashboard → Órdenes de Producción`
2. Click en botón **"Nueva Orden de Producción"**
3. Completar formulario:
   - **Producto**: Seleccionar de lista
   - **Cantidad**: Número de unidades
   - **Fechas**: Creación, inicio, fin estimada
   - **Estado**: Planificada, En Proceso, etc.
4. Click **"Crear"**
5. ✅ Sistema calcula automáticamente consumos

#### Editar Orden Existente

1. Seleccionar orden de la tabla
2. Click en icono **"Editar"**
3. Modificar datos requeridos
4. Si cambias cantidad → **Consumos se recalculan**
5. Click **"Actualizar"**

#### Registrar Movimiento de Inventario

1. Ir a `Dashboard → Inventario`
2. Seleccionar material
3. Click **"Entrada"** o **"Salida"**
4. Registrar cantidad y motivo
5. ✅ Stock se actualiza automáticamente

#### Ver Métricas del Dashboard

1. Panel principal muestra:
   - Total de órdenes
   - Órdenes en proceso
   - Órdenes completadas
   - Alertas de stock bajo
2. Gráficos actualizados en tiempo real

---

## ⚠️ Problemas Conocidos y Soluciones

### 1. Consumos no aparecen al crear orden

**Síntoma**: Crear orden de producción pero no se ven los consumos  
**Causa**: GET no traía los consumos en la respuesta  
**Solución**: ✅ **RESUELTA** - Actualizar GET endpoint para usar LEFT JOIN

```sql
LEFT JOIN Consumo_Materia_Prima_Produccion cmpp
  ON op.orden_produccion_id = cmpp.orden_produccion_id
GROUP BY op.orden_produccion_id
```

### 2. Cambiar cantidad no recalcula consumos

**Síntoma**: Editar cantidad pero los consumos no cambian  
**Causa**: PUT no detectaba cambios de cantidad  
**Solución**: ✅ **RESUELTA** - Agregar lógica de recalculation

```typescript
if (cantidadCambio || productoCambio) {
  // Eliminar consumos antiguos y calcular nuevos
}
```

### 3. Errores de compilación con TypeScript

**Síntoma**: "Cannot find module 'ws'" o tipos faltantes  
**Causa**: Dependencias no instaladas  
**Solución**: ✅ **RESUELTA**

```bash
npm install ws @types/ws
```

### 4. WebSocket en puerto diferente

**Síntoma**: No se conecta al WebSocket server  
**Causa**: Puerto hardcodeado o dinámico  
**Solución**: ✅ **RESUELTA** - Usar `/lib/websocket-config.ts` centralizado

```typescript
const config = getWebSocketConfig();
const ws = new WebSocket(config.url); // ws://localhost:3300
```

---

## 📈 Casos de Uso

### Caso 1: Producción por Encargo

```
1. Cliente ordena: 50 ventanas modelo V2
2. Sistema crea OrdenVenta
3. Crea OrdenProduccion
4. Calcula consumos automáticamente
5. Verifica stock disponible
6. Si falta material → Genera alerta
7. Crea CompraProveedor si es necesario
8. Completa producción
9. Registra entrega
```

### Caso 2: Optimización de Inventario

```
1. Sistema monitorea stock de materiales
2. Cuando stock < punto_pedido:
   - Genera alerta visual
   - Sugiere compra a proveedor
3. Cálculo automático basado en histórico
4. Evita ruptura de stock
5. Evita sobrestock innecesario
```

### Caso 3: Trazabilidad de Producción

```
1. Para cada OrdenProduccion:
   - Registra consumo requerido
   - Registra consumo real
   - Calcula merma
2. Historial completo:
   - Quién produjo
   - Cuándo (fechas exactas)
   - Cuánto se usó
   - Cuánto se desperdició
3. Permite mejora continua
```

---

## 🔐 Seguridad y Validación

### Validaciones Implementadas

✅ Transacciones ACID para operaciones complejas  
✅ Validación de entrada en API routes  
✅ Restricciones de integridad referencial  
✅ Manejo de errores robusto

### Mejoras Futuras Sugeridas

- [ ] Autenticación y autorización
- [ ] Encriptación de datos sensibles
- [ ] Auditoría de cambios
- [ ] Backups automáticos
- [ ] Rate limiting en APIs

---

## 📊 Métricas y KPIs

### KPIs Clave del Sistema

| Métrica                        | Descripción                      | Objetivo |
| ------------------------------ | -------------------------------- | -------- |
| **Ciclo de Producción**        | Desde orden hasta entrega        | < 5 días |
| **Exactitud de Consumos**      | % órdenes sin merma anormal      | > 95%    |
| **Disponibilidad de Material** | % órdenes sin ruptura stock      | > 98%    |
| **Eficiencia de Recursos**     | Órdenes completadas/operario/día | > 5      |
| **Satisfacción de Cliente**    | Entregas a tiempo                | > 90%    |

---

## 🔄 Próximas Fases de Desarrollo

### Fase 2: Análitica Avanzada

- [ ] Reportes por período
- [ ] Análisis de mermas
- [ ] Proyecciones de demanda
- [ ] Optimización de costos

### Fase 3: Automatización

- [ ] Generación automática de compras
- [ ] Asignación inteligente de operarios
- [ ] Optimización de rutas de producción

### Fase 4: Integración Externa

- [ ] Integración con proveedores
- [ ] Portal de cliente
- [ ] Notificaciones por email/SMS

---

## 📞 Soporte y Contacto

**Equipo de Desarrollo**: [Información de contacto]  
**Reportar Bugs**: [Sistema de tickets]  
**Documentación técnica**: Ver `/README.md`

---

## 📝 Notas Finales

Este sistema fue diseñado con enfoque en:

- **Automatización**: Eliminar errores manuales
- **Escalabilidad**: Crecer con la empresa
- **Eficiencia**: Optimizar recursos
- **Trazabilidad**: Registro completo de operaciones

El sistema está **listo para producción** con las características principales implementadas y funcionales.

---

**Última actualización**: Noviembre 10, 2025  
**Versión**: 1.0  
**Estado**: ✅ Documentación Completa
