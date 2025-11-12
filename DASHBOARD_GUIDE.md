# Dashboard Ejecutivo - Guía de Usuario

## 📊 Descripción General

El **Dashboard Ejecutivo** proporciona una vista consolidada de las métricas clave del negocio, permitiendo a los ejecutivos y gerentes tomar decisiones informadas basadas en datos en tiempo real.

## 🎯 Características Principales

### 1. KPIs con Comparativas Mensuales

El dashboard muestra 4 indicadores clave de rendimiento:

#### **Producción**

- **Métrica**: Total de órdenes de producción completadas en el mes actual
- **Formato**: Número entero con separadores de miles
- **Comparativa**: Porcentaje de variación vs. mes anterior
- **Indicadores de tendencia**:
  - 🟢 **Verde (↑)**: Aumento >2% respecto al mes anterior
  - 🔴 **Rojo (↓)**: Disminución <-2% respecto al mes anterior
  - ⚪ **Gris (—)**: Variación entre -2% y 2% (estable)

#### **Inventario**

- **Métrica**: Total de items de materia prima en inventario
- **Formato**: Número entero con separadores de miles
- **Comparativa**: Porcentaje de variación vs. mes anterior
- **Información adicional**: Cantidad de items bajo nivel mínimo de stock

#### **Ventas**

- **Métrica**: Total de ingresos por ventas del mes actual
- **Formato**: Moneda colombiana (COP) con formato $XX,XXX
- **Comparativa**: Porcentaje de variación vs. mes anterior

#### **Costos**

- **Métrica**: Total de gastos en compras del mes actual
- **Formato**: Moneda colombiana (COP) con formato $XX,XXX
- **Comparativa**: Porcentaje de variación vs. mes anterior

### 2. Gráfico de Producción Diaria

- **Visualización**: Gráfico de líneas interactivo (últimos 30 días)
- **Datos**: Cantidad de órdenes completadas por día
- **Interactividad**:
  - Hover sobre puntos para ver fecha completa y cantidad exacta
  - Responsive: se adapta al tamaño de la pantalla
- **Casos especiales**:
  - Si no hay datos: Muestra mensaje "No hay datos de producción disponibles"
  - Durante carga: Muestra skeleton animado

### 3. Alertas de Órdenes de Producción

Panel de estado de órdenes con 3 categorías:

#### **Órdenes Vencidas** 🔴

- **Criterio**: Fecha de entrega estimada < fecha actual AND estado != 'completada'
- **Color**: Rojo
- **Acción**: Click para filtrar en página de órdenes (`/dashboard/ordenes-produccion?filtro=vencidas`)
- **Badge**: "Requiere atención"

#### **Órdenes en Riesgo** 🟡

- **Criterio**: Fecha de entrega estimada dentro de los próximos 3 días AND estado != 'completada'
- **Color**: Amarillo
- **Acción**: Click para filtrar en página de órdenes (`/dashboard/ordenes-produccion?filtro=en_riesgo`)
- **Badge**: "Monitorear"

#### **Órdenes Completadas este Mes** 🟢

- **Métrica**: Total de órdenes completadas en el mes actual
- **Color**: Verde
- **Badge**: "Exitosas"
- **No es clickeable** (solo informativo)

### 4. Actualización Automática

- **Frecuencia**: Cada 5 minutos
- **Indicador**: Badge con timestamp de última actualización
- **Manual**: Botón "Actualizar" para refrescar datos inmediatamente
- **Estado de carga**: Icono de refresh con animación de rotación durante la carga

## 🔧 Uso del Dashboard

### Acceso

1. Navegar a `/dashboard` después de iniciar sesión
2. Requiere autenticación con token JWT válido

### Interpretación de Tendencias

**Ejemplo de lectura de KPI**:

```
Producción
847
↑ +12.0% vs mes anterior
```

- Valor actual: 847 órdenes completadas este mes
- Tendencia: Aumento del 12% respecto al mes anterior
- Indicador: Flecha verde hacia arriba (crecimiento saludable)

### Acciones Recomendadas según Alertas

| Alertas Vencidas | Acción Recomendada                            |
| ---------------- | --------------------------------------------- |
| 0                | ✅ Todo en orden                              |
| 1-3              | ⚠️ Revisar y repriorizar                      |
| 4-10             | 🔴 Atención urgente requerida                 |
| >10              | 🚨 Situación crítica - intervención inmediata |

## 📐 Layout Responsive

### Desktop (>1024px)

- **KPIs**: Grid de 4 columnas (1 fila)
- **Gráfico**: 2/3 del ancho
- **Alertas**: 1/3 del ancho (columna derecha)

### Tablet (768px - 1024px)

- **KPIs**: Grid de 2 columnas (2 filas)
- **Gráfico**: 2/3 del ancho
- **Alertas**: 1/3 del ancho

### Mobile (<768px)

- **KPIs**: 1 columna (4 filas)
- **Gráfico**: Ancho completo
- **Alertas**: Ancho completo

## 🔍 Cálculos Técnicos

### Variación Porcentual

```typescript
variacion_porcentaje = ((valor_actual - valor_anterior) / valor_anterior) * 100;
```

**Casos especiales**:

- Si `valor_anterior === 0`: `variacion_porcentaje = 0`
- Redondeo: 1 decimal de precisión

### Clasificación de Tendencias

```typescript
if (variacion_porcentaje > 2) {
  tendencia = "up"; // Verde
} else if (variacion_porcentaje < -2) {
  tendencia = "down"; // Rojo
} else {
  tendencia = "stable"; // Gris
}
```

### Periodo de Comparación

- **Mes actual**: Desde el día 1 del mes actual hasta hoy
- **Mes anterior**: Día 1 al último día del mes pasado (completo)

## 🎨 Componentes Reutilizables

### KPICard

```typescript
<KPICard
  title="Producción"
  value={847}
  subtitle="órdenes completadas"
  variacion={12.0}
  tendencia="up"
  formato="numero"  // 'numero' | 'moneda' | 'porcentaje'
  icon={<Factory className="h-4 w-4" />}
  loading={false}
/>
```

### ProduccionChart

```typescript
<ProduccionChart
  data={[
    { fecha: '2025-01-15', cantidad: 12 },
    { fecha: '2025-01-16', cantidad: 15 },
    ...
  ]}
  loading={false}
/>
```

### AlertasOrdenes

```typescript
<AlertasOrdenes
  vencidas={3}
  en_riesgo={7}
  completadas_mes={45}
  loading={false}
/>
```

## 🔐 Seguridad

- **Autenticación**: JWT token requerido en todas las llamadas al API
- **Autorización**: Solo usuarios con roles `admin` y `gerente` tienen acceso
- **Logs**: Todas las solicitudes se registran con apiLogger
- **Rate limiting**: 100 requests por minuto por usuario

## 🐛 Resolución de Problemas

### Error: "Error al cargar el dashboard"

**Causas posibles**:

1. Base de datos no disponible
2. Token JWT expirado
3. Permisos insuficientes

**Solución**:

- Click en botón "Reintentar"
- Si persiste, cerrar sesión y volver a autenticarse
- Verificar logs del servidor para más detalles

### KPIs muestran valores 0

**Causas posibles**:

1. No hay datos en el periodo actual
2. Tablas de base de datos vacías
3. Error en consultas SQL

**Solución**:

- Verificar que existan registros en las tablas:
  - `Ordenes_Produccion`
  - `Materia_Prima`
  - `Ventas`
  - `Compras`

### Gráfico no se renderiza

**Causas posibles**:

1. Datos con formato incorrecto
2. Recharts no cargó correctamente
3. Error de JavaScript en consola

**Solución**:

- Abrir consola del navegador (F12)
- Buscar errores de JavaScript
- Verificar formato de `produccion_diaria` en respuesta del API

## 📊 Métricas de Rendimiento

- **Tiempo de carga inicial**: <2 segundos
- **Tiempo de respuesta API**: <500ms
- **Actualización automática**: Cada 5 minutos
- **Consultas SQL optimizadas**: Uso de índices en fechas y estados

## 🚀 Próximas Mejoras (Roadmap)

- [ ] Filtros de fecha personalizados
- [ ] Exportación de métricas a PDF/Excel
- [ ] Comparativa año a año
- [ ] Predicciones con machine learning
- [ ] Dashboard personalizable (drag & drop)
- [ ] Notificaciones push de alertas críticas

## 📝 Notas de Implementación

- **Librería de gráficos**: Recharts v2.x
- **Fechas**: date-fns con locale español (es)
- **Moneda**: Intl.NumberFormat con locale es-CO
- **Actualización**: useEffect + setInterval (5 min)
- **Optimización**: useCallback para evitar re-renders innecesarios

---

**Versión**: 1.0.0  
**Última actualización**: 15 de Enero de 2025  
**Autor**: Equipo de Desarrollo Industrial
