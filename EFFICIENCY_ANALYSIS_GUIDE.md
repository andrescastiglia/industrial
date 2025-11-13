# Análisis de Eficiencia - Documentación Técnica

## 📊 Descripción General

El módulo de Análisis de Eficiencia proporciona una visión completa del desempeño operativo mediante el cálculo de KPIs, detección automática de cuellos de botella y generación de recomendaciones inteligentes para mejorar la productividad.

---

## 🎯 KPIs Calculados

### 1. Eficiencia de Producción

**Definición**: Mide qué tan bien se está cumpliendo con la planificación de producción.

**Fórmula**:

```
Eficiencia = (Unidades Producidas / Unidades Planificadas) × 100
```

**Interpretación**:

- **Excellent** (≥95%): Cumplimiento óptimo, producción eficiente
- **Good** (85-94%): Cumplimiento aceptable, margen de mejora
- **Warning** (70-84%): Bajo cumplimiento, requiere atención
- **Critical** (<70%): Muy bajo cumplimiento, acción inmediata

**Datos de Entrada**:

```sql
SELECT
  SUM(cantidad_planificada) as planned,
  SUM(cantidad_real) as produced
FROM Ordenes_Produccion
WHERE fecha_finalizacion >= $startDate
  AND fecha_finalizacion <= $endDate
  AND estado IN ('completada', 'en_proceso')
```

**Ejemplo de Uso**:

```typescript
const analyzer = createEfficiencyAnalyzer(pool);
const metrics = await analyzer.analyzeEfficiency(new Date("2024-11-01"));
console.log(metrics.productionEfficiency.efficiencyRate); // 87.5%
```

---

### 2. Utilización de Capacidad

**Definición**: Mide qué porcentaje de la capacidad productiva disponible se está usando.

**Fórmula**:

```
Utilización = (Horas Utilizadas / Horas Disponibles) × 100

Horas Disponibles = Operarios Activos × Días Laborables × 8 horas
Horas Utilizadas = Suma de duración de órdenes completadas
```

**Interpretación**:

- **Excellent** (80-95%): Utilización óptima, balance perfecto
- **Good** (70-79% o 96-100%): Utilización aceptable
- **Warning** (50-69% o >100%): Sub o sobre-utilización
- **Critical** (<50%): Capacidad muy sub-utilizada

**Datos de Entrada**:

```sql
-- Operarios activos
SELECT COUNT(*) FROM Operarios WHERE estado = 'activo'

-- Horas utilizadas
SELECT SUM(EXTRACT(EPOCH FROM (fecha_finalizacion - fecha_inicio)) / 3600)
FROM Ordenes_Produccion
WHERE fecha_finalizacion BETWEEN $startDate AND $endDate
  AND estado = 'completada'
```

---

### 3. Costo por Unidad

**Definición**: Mide el costo promedio de producir cada unidad.

**Fórmula**:

```
Costo por Unidad = Costos Totales / Unidades Producidas

Costos Totales = Suma de compras de materia prima en el periodo
```

**Interpretación**:

- **Excellent**: Reducción ≥5% vs mes anterior
- **Good**: Reducción 0-5% o estable
- **Warning**: Aumento 1-10%
- **Critical**: Aumento >10%

**Datos de Entrada**:

```sql
-- Costos totales
SELECT SUM(costo_total)
FROM Compras
WHERE fecha_compra BETWEEN $startDate AND $endDate
  AND estado IN ('completada', 'recibida')

-- Unidades producidas
SELECT SUM(cantidad_real)
FROM Ordenes_Produccion
WHERE fecha_finalizacion BETWEEN $startDate AND $endDate
  AND estado = 'completada'
```

**Nota**: Los costos laborales y overhead NO están incluidos en esta versión.

---

### 4. Lead Time Promedio

**Definición**: Tiempo promedio desde que inicia una orden hasta que se completa.

**Fórmula**:

```
Lead Time = Promedio de (Fecha Finalización - Fecha Inicio)
```

**Interpretación**:

- **Excellent** (≤3 días): Producción muy rápida
- **Good** (4-5 días): Producción eficiente
- **Warning** (6-7 días): Producción lenta
- **Critical** (>7 días): Producción muy lenta

**Datos de Entrada**:

```sql
SELECT
  AVG(EXTRACT(DAY FROM (fecha_finalizacion - fecha_inicio))) as avg_days,
  MIN(EXTRACT(DAY FROM (fecha_finalizacion - fecha_inicio))) as min_days,
  MAX(EXTRACT(DAY FROM (fecha_finalizacion - fecha_inicio))) as max_days
FROM Ordenes_Produccion
WHERE fecha_finalizacion BETWEEN $startDate AND $endDate
  AND estado = 'completada'
  AND fecha_inicio IS NOT NULL
```

---

## 🔍 Detección de Cuellos de Botella

### Etapas Lentas

**Criterio**: Etapas del proceso que tarden >5 días en promedio.

**Análisis**:

```sql
SELECT
  estado,
  COUNT(*) as orders_count,
  AVG(EXTRACT(DAY FROM (fecha_finalizacion - fecha_inicio))) as avg_duration
FROM Ordenes_Produccion
WHERE fecha_finalizacion BETWEEN $startDate AND $endDate
  AND fecha_inicio IS NOT NULL
GROUP BY estado
HAVING COUNT(*) >= 3
ORDER BY avg_duration DESC
```

**Niveles de Impacto**:

- **High**: >7 días promedio Y >5 órdenes afectadas
- **Medium**: >5 días promedio O >10 órdenes afectadas
- **Low**: Otros casos

**Sugerencias Automáticas**:

- > 10 días: "Etapa crítica: considerar automatización o más recursos"
- > 7 días: "Etapa lenta: revisar proceso y asignar más operarios"
- > 5 días: "Etapa moderada: monitorear de cerca"

---

### Productos Problemáticos

**Criterio**: Productos con alta tasa de retrasos o producción bajo lo planificado.

**Análisis**:

```sql
SELECT
  op.producto_id,
  p.nombre,
  COUNT(*) as total_orders,
  COUNT(*) FILTER (WHERE fecha_finalizacion > fecha_planificada) as delayed_orders,
  AVG(CASE WHEN fecha_finalizacion > fecha_planificada
      THEN EXTRACT(DAY FROM (fecha_finalizacion - fecha_planificada))
      ELSE 0 END) as average_delay
FROM Ordenes_Produccion op
JOIN Productos p ON op.producto_id = p.id
WHERE fecha_finalizacion BETWEEN $startDate AND $endDate
  AND estado = 'completada'
GROUP BY op.producto_id, p.nombre
HAVING COUNT(*) >= 2
```

**Niveles de Impacto**:

- **High**: Tasa de retrasos >60% Y retraso promedio >5 días
- **Medium**: Tasa de retrasos >40% O retraso promedio >3 días
- **Low**: Otros casos

**Issues Identificados**:

- Alta tasa de retrasos en entregas (>50%)
- Retrasos promedio significativos (>5 días)
- Producción por debajo de lo planificado
- Volumen alto con problemas de cumplimiento

---

### Proveedores Lentos

**Criterio**: Proveedores con entregas >5 días promedio o confiabilidad <90%.

**Análisis**:

```sql
SELECT
  c.proveedor_id,
  pr.nombre,
  COUNT(*) as orders_count,
  AVG(EXTRACT(DAY FROM (fecha_recepcion - fecha_compra))) as avg_delivery_time,
  COUNT(*) FILTER (WHERE fecha_recepcion > fecha_entrega_esperada) as delayed_deliveries
FROM Compras c
JOIN Proveedores pr ON c.proveedor_id = pr.id
WHERE fecha_compra BETWEEN $startDate AND $endDate
  AND estado IN ('completada', 'recibida')
  AND fecha_recepcion IS NOT NULL
GROUP BY c.proveedor_id, pr.nombre
HAVING COUNT(*) >= 2
```

**Métricas Calculadas**:

- **Tiempo de Entrega Promedio**: Días desde compra hasta recepción
- **Días de Retraso**: Diferencia con tiempo esperado (5 días)
- **Confiabilidad**: % de entregas a tiempo

**Niveles de Impacto**:

- **High**: >7 días de retraso Y confiabilidad <60%
- **Medium**: >3 días de retraso O confiabilidad <80%
- **Low**: Otros casos

---

## 💡 Motor de Recomendaciones

### Sistema de Priorización

**Prioridades**:

1. **Critical**: Requiere acción inmediata (horas/días)
2. **High**: Requiere atención prioritaria (semanas)
3. **Medium**: Mejora recomendada (meses)
4. **Low**: Optimización futura (trimestres)

**Urgencia**:

- **Immediate**: Actuar hoy/mañana
- **Short-term**: 1-2 semanas
- **Medium-term**: 1-3 meses
- **Long-term**: >3 meses

---

### Reglas de Negocio

#### Eficiencia de Producción

**Regla 1**: Si eficiencia <70% → **Recomendación CRITICAL**

```
Título: "Eficiencia de producción crítica"
Acciones:
- Analizar causas de baja producción
- Revisar planificación
- Implementar control en tiempo real
- Capacitar personal
```

**Regla 2**: Si eficiencia <85% → **Recomendación HIGH**

```
Título: "Mejorar eficiencia de producción"
Acciones:
- Identificar cuellos de botella
- Optimizar tiempos de cambio
- Revisar asignación de personal
```

**Regla 3**: Si tendencia negativa >10% → **Recomendación HIGH**

```
Título: "Tendencia negativa en eficiencia"
Acciones:
- Realizar auditoría de procesos
- Verificar estado de equipos
- Revisar rotación de personal
```

---

#### Utilización de Capacidad

**Regla 1**: Si utilización <60% → **Recomendación HIGH**

```
Título: "Capacidad productiva sub-utilizada"
Acciones:
- Aumentar volumen de órdenes
- Buscar nuevos clientes
- Considerar reducción temporal de personal
- Implementar productos complementarios
```

**Regla 2**: Si utilización >100% → **Recomendación CRITICAL**

```
Título: "Sobre-utilización de capacidad"
Acciones:
- Contratar personal adicional
- Implementar turnos adicionales
- Invertir en automatización
```

**Regla 3**: Si utilización >95% → **Recomendación HIGH**

```
Título: "Capacidad cerca del límite"
Acciones:
- Planificar expansión de capacidad
- Evaluar inversión en equipos
- Optimizar procesos
```

---

#### Costos

**Regla 1**: Si aumento >15% → **Recomendación CRITICAL**

```
Título: "Aumento crítico en costos de producción"
Acciones:
- Negociar mejores precios con proveedores
- Buscar proveedores alternativos
- Optimizar uso de materia prima
- Implementar compras por volumen
```

**Regla 2**: Si aumento >5% → **Recomendación HIGH**

```
Título: "Costos en aumento"
Acciones:
- Revisar contratos con proveedores
- Analizar desperdicio de materiales
- Implementar control de costos más estricto
```

---

#### Lead Time

**Regla 1**: Si lead time >10 días → **Recomendación CRITICAL**

```
Título: "Lead time excesivamente largo"
Acciones:
- Identificar etapas más lentas
- Implementar producción lean
- Mejorar coordinación entre departamentos
- Reducir tiempos de espera
```

**Regla 2**: Si lead time >7 días → **Recomendación HIGH**

```
Título: "Lead time por encima del objetivo"
Acciones:
- Mapear proceso completo
- Identificar pasos que no agregan valor
- Mejorar flujo de trabajo
```

---

#### Inventario

**Regla 1**: Si items con stock <mínimo → **Recomendación CRITICAL**

```
Título: "N items de materia prima con stock crítico"
Acciones:
- Generar orden de compra urgente
- Contactar proveedores para entrega express
- Ajustar cantidades mínimas
- Implementar alertas automáticas
```

**Regla 2**: Si items con stock <mínimo×1.2 → **Recomendación HIGH**

```
Título: "N items cerca del stock mínimo"
Acciones:
- Programar orden de compra
- Verificar lead time de proveedores
- Priorizar productos de alta rotación
```

---

## 📡 API Endpoint

### GET /api/analytics/efficiency

**Autenticación**: JWT Bearer token (cualquier rol)

**Parámetros Query**:

```typescript
{
  period?: string;           // Formato: YYYY-MM (default: mes actual)
  includeHistory?: boolean;  // true = incluir últimos 6 meses
  historyMonths?: number;    // Cantidad de meses históricos (default: 6)
}
```

**Ejemplo Request**:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/analytics/efficiency?period=2024-11&includeHistory=true"
```

**Respuesta Exitosa (200)**:

```json
{
  "success": true,
  "data": {
    "period": "2024-11",
    "kpis": {
      "productionEfficiency": {
        "period": "2024-11",
        "plannedUnits": 1000,
        "producedUnits": 875,
        "efficiencyRate": 87.5,
        "trend": "+5.3%",
        "status": "good"
      },
      "capacityUtilization": {
        "period": "2024-11",
        "totalCapacity": 3520,
        "usedCapacity": 2816,
        "utilizationRate": 80.0,
        "trend": "+2.1%",
        "status": "excellent"
      },
      "costPerUnit": {
        "period": "2024-11",
        "totalCost": 50000000,
        "unitsProduced": 875,
        "costPerUnit": 57142.86,
        "trend": "-3.2%",
        "status": "good"
      },
      "leadTime": {
        "period": "2024-11",
        "averageLeadTime": 4.5,
        "minLeadTime": 2.0,
        "maxLeadTime": 8.0,
        "trend": "-1.5%",
        "status": "good"
      }
    },
    "bottlenecks": {
      "slowStages": [
        {
          "stageName": "En Proceso",
          "averageDuration": 6.2,
          "ordersCount": 15,
          "impactLevel": "medium",
          "suggestion": "Etapa moderada: monitorear de cerca"
        }
      ],
      "problematicProducts": [
        {
          "productId": 5,
          "productName": "Ventana Doble",
          "averageDelay": 3.5,
          "delayedOrders": 8,
          "totalOrders": 12,
          "delayRate": 66.67,
          "impactLevel": "high",
          "issues": [
            "Alta tasa de retrasos en entregas",
            "Retrasos promedio significativos"
          ]
        }
      ],
      "slowSuppliers": [
        {
          "supplierId": 3,
          "supplierName": "Proveedor ABC",
          "averageDeliveryTime": 8.5,
          "expectedDeliveryTime": 5,
          "delayDays": 3.5,
          "ordersCount": 10,
          "impactLevel": "medium",
          "reliability": 70.0
        }
      ],
      "summary": {
        "totalBottlenecks": 3,
        "criticalIssues": 0,
        "estimatedImpact": "Impacto moderado en la operación"
      }
    },
    "recommendations": {
      "items": [
        {
          "id": "REC-1699876543210-1",
          "type": "production",
          "priority": "high",
          "title": "Mejorar eficiencia de producción",
          "description": "La eficiencia actual es de 87.5%, por debajo del objetivo óptimo de 95%.",
          "impact": "Capacidad productiva no aprovechada completamente",
          "actionItems": [
            "Identificar cuellos de botella en línea de producción",
            "Optimizar tiempos de cambio entre órdenes",
            "Revisar asignación de personal por turno"
          ],
          "estimatedBenefit": "Aumento del 10-15% en producción mensual",
          "urgency": "short-term",
          "affectedArea": "Producción"
        }
      ],
      "summary": {
        "totalRecommendations": 5,
        "criticalCount": 0,
        "highPriorityCount": 2,
        "estimatedImpact": "Mejoras recomendadas para optimizar operación"
      }
    },
    "historicalData": [...] // Si includeHistory=true
  },
  "meta": {
    "generatedAt": "2024-11-13T10:30:00.000Z",
    "durationMs": 245
  }
}
```

**Errores Posibles**:

- **401 Unauthorized**: Token inválido o expirado
- **400 Bad Request**: Formato de periodo inválido
- **500 Internal Server Error**: Error en el servidor

---

## 🖥️ Interfaz de Usuario

### Ruta: /dashboard/analisis-eficiencia

**Componentes Principales**:

1. **Header**
   - Título y descripción
   - Botón "Actualizar"
   - Periodo seleccionado

2. **Grid de KPIs (4 cards)**
   - Color por estado (verde, azul, amarillo, rojo)
   - Valor principal grande
   - Sub-texto descriptivo
   - Tendencia con icono (↑/↓)
   - Progress bar
   - Icono de estado (✓/⚠)

3. **Card de Cuellos de Botella**
   - 3 columnas: Etapas / Productos / Proveedores
   - Lista de top 3 problemas por categoría
   - Alerta general con impacto estimado

4. **Card de Recomendaciones**
   - Filtrado por prioridad (badges de color)
   - Expandible para ver detalles
   - Acciones sugeridas en lista
   - Beneficio estimado
   - Área afectada
   - Border lateral por prioridad

**Estados de Carga**:

- **Loading**: Spinner animado
- **Error**: Alert con mensaje
- **Success**: Datos visualizados

**Interactividad**:

- Click en "Actualizar" → Reload datos
- Scroll en recomendaciones
- Hover en cards para más info

---

## 🔧 Configuración y Uso

### Instalación

No requiere dependencias adicionales. Usa las librerías ya instaladas:

- `pg` (PostgreSQL)
- `date-fns` (manejo de fechas)
- `next` (framework)

### Uso Programático

```typescript
import { pool } from "@/lib/database";
import { createEfficiencyAnalyzer } from "@/lib/analytics/efficiency-analyzer";
import { createBottleneckDetector } from "@/lib/analytics/bottleneck-detector";
import { createRecommendationEngine } from "@/lib/analytics/recommendation-engine";

// Análisis para un periodo específico
const analyzer = createEfficiencyAnalyzer(pool);
const metrics = await analyzer.analyzeEfficiency(new Date("2024-11-01"));

// Detección de cuellos de botella
const detector = createBottleneckDetector(pool);
const bottlenecks = await detector.detectBottlenecks(new Date("2024-11-01"));

// Generar recomendaciones
const engine = createRecommendationEngine(pool);
const recommendations = await engine.generateRecommendations(
  metrics,
  bottlenecks
);

console.log("KPIs:", metrics);
console.log("Bottlenecks:", bottlenecks);
console.log("Recommendations:", recommendations);
```

### Uso desde Frontend

```typescript
// En un componente React
const loadAnalysis = async () => {
  const token = localStorage.getItem("token");
  const response = await fetch("/api/analytics/efficiency", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const result = await response.json();
  setData(result.data);
};
```

---

## 📈 Mejoras Futuras

- [ ] Gráficos de tendencias (Chart.js o Recharts)
- [ ] Exportar análisis a PDF/Excel
- [ ] Comparar múltiples periodos
- [ ] Alertas por email automáticas
- [ ] Predicción de KPIs (ML)
- [ ] Análisis de causas raíz (5 Whys)
- [ ] Benchmarking con industria
- [ ] Optimización de parámetros (A/B testing)
- [ ] Dashboard ejecutivo agregado
- [ ] Integración con ERP externo

---

**Versión**: 1.0.0  
**Última actualización**: 13 de noviembre de 2025  
**Autor**: Equipo de Desarrollo Industrial
