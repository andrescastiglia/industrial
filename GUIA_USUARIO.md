# Guía Rápida de Usuario - Sistema de Gestión Industrial

**Versión**: 1.0  
**Para**: Usuarios finales de la planta  
**Tiempo de lectura**: 10 minutos

---

## 🚀 Inicio Rápido

### Acceso al Sistema

1. Abre tu navegador
2. Ve a: `http://localhost:3000`
3. Verás el **Dashboard Principal**

### Estructura del Sistema

```
┌─────────────────────────────────────────┐
│  PANEL PRINCIPAL (Dashboard)            │
├─────────────────────────────────────────┤
│  Menú Lateral:                          │
│  ├── Dashboard                          │
│  ├── Clientes                           │
│  ├── Productos                          │
│  ├── Materia Prima                      │
│  ├── Órdenes de Venta                   │
│  ├── Órdenes de Producción ⭐ IMPORTANTE
│  ├── Compras                            │
│  ├── Operarios                          │
│  └── Inventario                         │
└─────────────────────────────────────────┘
```

---

## 📋 Tareas Principales

### Tarea 1: Crear Nueva Orden de Producción

**Objetivo**: Planificar la fabricación de productos

**Pasos**:

1. Click en menú **"Órdenes de Producción"**
2. Click en botón azul **"Nueva Orden de Producción"** (arriba derecha)

3. Se abre un formulario. Completa:

   ```
   Producto a Producir *: [Selecciona de lista]
   Cantidad a Producir *: [Ingresa número]
   Fecha de Creación *: [Fecha actual]
   Fecha Fin Estimada *: [Fecha objetivo]
   Fecha de Inicio: [Opcional]
   Fecha Fin Real: [Opcional]
   Estado *: [Selecciona: Planificada, En Proceso, etc]
   ```

4. **Sistema calcula automáticamente** los consumos de materiales
   - No debes hacerlo manualmente ✓
   - Es exacto y consistente ✓

5. Click **"Crear"**

6. ✅ Orden creada exitosamente

**Ejemplo Visual**:

```
┌────────────────────────────────────┐
│ Nueva Orden de Producción          │
├────────────────────────────────────┤
│ Producto: [V1 - Ventana 60x80]    │
│ Cantidad: [100]  ← (100 unidades) │
│ Fecha Inicio: [10/11/2025]        │
│ Fecha Fin: [15/11/2025]           │
│ Estado: [Planificada]             │
│                                    │
│        [Cancelar] [Crear]         │
└────────────────────────────────────┘

(El sistema calcula automáticamente:)
- Vidrio: 200 m²
- Marco: 500 m
- Herrajes: 400 unidades
```

---

### Tarea 2: Editar Orden Existente

**Objetivo**: Cambiar datos de una orden ya creada

**Pasos**:

1. Ve a **"Órdenes de Producción"**

2. Busca tu orden en la tabla (usa **Búsqueda** si es necesario)

3. Click en icono **"Editar"** (lápiz)

4. Modifica los datos que necesites:
   - ⚠️ **Si cambias la cantidad**: Los consumos se recalculan automáticamente
   - ✓ Otros campos: Sin cambios en consumos

5. Click **"Actualizar"**

6. ✅ Orden actualizada

---

### Tarea 3: Gestionar Inventario

**Objetivo**: Controlar el stock de materiales

**Pasos**:

1. Ve a **"Inventario"** o **"Materia Prima"**

2. Visualiza los materiales:

   ```
   ✅ Verde:  Stock normal (suficiente)
   ⚠️ Amarillo: Stock bajo (próximo a punto de pedido)
   🔴 Rojo:   Stock crítico (¡ALERTA!)
   ```

3. Para registrar entrada/salida de material:
   - Click **"Entrada"** (material recibido)
   - Click **"Salida"** (material usado)
   - Ingresa cantidad
   - Ingresa motivo
   - Click **"Registrar"**

4. ✅ Stock actualizado automáticamente

**Ejemplo**:

```
Material: Vidrio Templado
Stock Actual: 150 m²
Punto de Pedido: 100 m²

Estado: ✅ NORMAL
(150 > 100)

┌─────────────────────┐
│ [Entrada] [Salida]  │
└─────────────────────┘
```

---

### Tarea 4: Crear Cliente Nuevo

**Objetivo**: Registrar un nuevo cliente

**Pasos**:

1. Ve a **"Clientes"**

2. Click **"Nuevo Cliente"** (botón azul)

3. Completa el formulario:

   ```
   Nombre: [Nombre del cliente]
   Contacto: [Persona responsable]
   Dirección: [Calle y número]
   Teléfono: [Número]
   Email: [email@ejemplo.com]
   ```

4. Click **"Crear"**

5. ✅ Cliente creado

---

### Tarea 5: Crear Producto Nuevo

**Objetivo**: Definir un producto que se puede fabricar

**Pasos**:

1. Ve a **"Productos"**

2. Click **"Nuevo Producto"**

3. **PASO 1 - Información General**:

   ```
   Nombre Modelo: [ej: V3]
   Descripción: [ej: Ventana grande de aluminio]
   Ancho: [milímetros]
   Alto: [milímetros]
   Color: [ej: Blanco, Negro]
   Tipo Accionamiento: [ej: Proyectante, Deslizante]
   ```

4. **PASO 2 - Agregar Componentes**:
   - Click **"Agregar Componente"**
   - Selecciona material (ej: Vidrio Templado)
   - Ingresa cantidad necesaria por unidad (ej: 2)
   - Ej: 1 ventana necesita 2 m² de vidrio
5. Repite paso 4 para cada material

6. Click **"Crear"**

7. ✅ Producto creado y listo para usar

**Importante**: Una vez creado el producto con sus componentes:

- Cuando crees una orden: **Los consumos se calculan automáticamente**
- Si cambias cantidades: **Los consumos se recalculan automáticamente**

---

## 📊 Lectura del Dashboard

### Panel Principal

```
┌──────────────────────────────────────────────────────┐
│            DASHBOARD - Resumen Ejecutivo             │
├──────────────────────────────────────────────────────┤
│                                                       │
│  Total Órdenes: 42          En Proceso: 5            │
│  Completadas: 35            Planificadas: 2          │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │ Órdenes de Producción (Listado)             │    │
│  ├─────────────────────────────────────────────┤    │
│  │ ID | Producto | Cantidad | Estado | Acción │    │
│  ├─────────────────────────────────────────────┤    │
│  │ OP-1 | V1 | 100 | En Proceso | [✏️ 🗑️]    │    │
│  │ OP-2 | V2 | 50  | Planificada | [✏️ 🗑️]  │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
└──────────────────────────────────────────────────────┘
```

---

## 🔍 Búsqueda y Filtrado

### Buscar una Orden

```
En cualquier tabla, verás un campo:
┌──────────────────────────┐
│ 🔍 Buscar órdenes...    │
└──────────────────────────┘

Puedes buscar por:
- ID de orden (ej: "OP-42")
- Nombre de producto (ej: "V1")
- Estado (ej: "Completada")
```

---

## ✋ Iconos y Botones

| Icono  | Significado   | Acción                |
| ------ | ------------- | --------------------- |
| **✏️** | Editar        | Modificar el registro |
| **🗑️** | Eliminar      | Borrar el registro    |
| **🔍** | Ver/Buscar    | Mostrar detalles      |
| **➕** | Agregar/Nuevo | Crear nuevo registro  |
| **✅** | Guardar       | Confirmar cambios     |
| **❌** | Cancelar      | Abandonar sin guardar |

---

## ⚠️ Alertas y Estados

### Estados de Orden de Producción

```
🔵 Planificada   → Orden creada, no ha empezado
🟡 En Proceso    → Se está fabricando actualmente
⚫ Pausada        → Detenida temporalmente
🟢 Completada     → Finalizada exitosamente
🔴 Cancelada      → Descartada
```

### Estados de Stock de Material

```
✅ Verde/OK       → Stock suficiente
⚠️ Amarillo/Bajo  → Acercándose al límite
🔴 Rojo/Crítico   → ¡ALERTA! Actúa ahora
```

---

## 🆘 Problemas Comunes

### "No veo mis consumos de materiales"

**Causa**: La orden fue creada correctamente  
**Solución**: Los consumos se calculan automáticamente cuando creas la orden

- No son visibles en el formulario
- Están guardados en la BD
- Se usan para cálculos de inventario

---

### "¿Cómo cambio la cantidad de materiales?"

**Respuesta**: No lo haces manualmente

- Solo cambias la **cantidad de productos** en la orden
- El sistema **recalcula automáticamente** los consumos
- Ejemplo:
  ```
  Orden: 100 unidades → 150 unidades
  ↓
  Consumos automáticamente:
  Vidrio: 200 m² → 300 m²
  Marco: 500 m → 750 m
  ```

---

### "¿Qué es 'punto de pedido'?"

**Respuesta**: Nivel mínimo de stock

- Cuando stock cae por debajo: **ALERTA**
- El sistema sugiere comprar más
- Previene ruptura de inventario
- Ejemplo:
  ```
  Material: Vidrio Templado
  Stock Actual: 95 m²
  Punto de Pedido: 100 m²
  ⚠️ ¡BAJO! Ordena más
  ```

---

### "Cambié una orden pero los consumos no cambiaron"

**Causa**: Solo cambiar otros campos (fechas, estado) no recalcula  
**Solución**: Para recalcular consumos, cambiar:

- ✓ **Cantidad a Producir** → Recalcula
- ✓ **Producto** → Recalcula
- ✗ Fechas → No recalcula
- ✗ Estado → No recalcula

---

## 📱 Atajos Útiles

| Acción           | Atajo                          |
| ---------------- | ------------------------------ |
| Crear nuevo      | Click botón **"Nuevo"** (azul) |
| Buscar           | Click **🔍** o Ctrl+F          |
| Editar           | Click ✏️ en fila               |
| Eliminar         | Click 🗑️ en fila               |
| Actualizar datos | F5 o Click "Refrescar"         |

---

## 🎯 Checklist Diario

```
☐ Revisar órdenes de producción en estado "En Proceso"
☐ Verificar alertas de stock bajo (❌ amarillo/rojo)
☐ Registrar entradas/salidas de inventario
☐ Crear nuevas órdenes según demanda
☐ Actualizar estado de órdenes completadas
☐ Verificar órdenes de venta pendientes
```

---

## 📞 Soporte

**¿Dudas o problemas?**

1. Consulta esta guía primero
2. Revisa la sección **"Problemas Comunes"**
3. Contacta al equipo de TI

---

**Última actualización**: Noviembre 2025  
**Versión**: 1.0  
**Estado**: ✅ Guía Completa para Usuarios Finales
