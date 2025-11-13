/**
 * Motor de Recomendaciones Automáticas
 * Genera sugerencias basadas en análisis de KPIs y cuellos de botella
 */

import { Pool } from "pg";
import { EfficiencyMetrics } from "./efficiency-analyzer";
import { BottleneckAnalysis } from "./bottleneck-detector";

// Tipos de datos
export interface Recommendation {
  id: string;
  type:
    | "inventory"
    | "production"
    | "supplier"
    | "capacity"
    | "cost"
    | "quality";
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  impact: string;
  actionItems: string[];
  estimatedBenefit: string;
  urgency: "immediate" | "short-term" | "medium-term" | "long-term";
  affectedArea: string;
  metrics?: {
    current: number;
    target: number;
    unit: string;
  };
}

export interface RecommendationReport {
  recommendations: Recommendation[];
  summary: {
    totalRecommendations: number;
    criticalCount: number;
    highPriorityCount: number;
    estimatedImpact: string;
  };
  period: string;
  generatedAt: Date;
}

/**
 * Clase principal para generación de recomendaciones
 */
export class RecommendationEngine {
  private pool: Pool;
  private recommendationCounter: number = 0;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Genera todas las recomendaciones basadas en métricas y cuellos de botella
   */
  async generateRecommendations(
    metrics: EfficiencyMetrics,
    bottlenecks: BottleneckAnalysis
  ): Promise<RecommendationReport> {
    const recommendations: Recommendation[] = [];

    // Generar recomendaciones de diferentes categorías
    const productionRecs = await this.analyzeProductionEfficiency(
      metrics.productionEfficiency
    );
    const capacityRecs = await this.analyzeCapacityUtilization(
      metrics.capacityUtilization
    );
    const costRecs = await this.analyzeCostPerUnit(metrics.costPerUnit);
    const leadTimeRecs = await this.analyzeLeadTime(metrics.leadTime);
    const stageRecs = await this.analyzeSlowStages(bottlenecks.slowStages);
    const productRecs = await this.analyzeProblematicProducts(
      bottlenecks.problematicProducts
    );
    const supplierRecs = await this.analyzeSlowSuppliers(
      bottlenecks.slowSuppliers
    );
    const inventoryRecs = await this.analyzeInventoryLevels();

    recommendations.push(
      ...productionRecs,
      ...capacityRecs,
      ...costRecs,
      ...leadTimeRecs,
      ...stageRecs,
      ...productRecs,
      ...supplierRecs,
      ...inventoryRecs
    );

    // Ordenar por prioridad
    const priorityOrder: { [key: string]: number } = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    recommendations.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );

    // Calcular resumen
    const criticalCount = recommendations.filter(
      (r) => r.priority === "critical"
    ).length;
    const highPriorityCount = recommendations.filter(
      (r) => r.priority === "high"
    ).length;

    let estimatedImpact = "Operación estable con oportunidades de mejora";
    if (criticalCount >= 3) {
      estimatedImpact =
        "Acción inmediata requerida: múltiples problemas críticos";
    } else if (criticalCount >= 1 || highPriorityCount >= 5) {
      estimatedImpact =
        "Atención prioritaria: problemas significativos detectados";
    } else if (highPriorityCount >= 2) {
      estimatedImpact = "Mejoras recomendadas para optimizar operación";
    }

    return {
      recommendations,
      summary: {
        totalRecommendations: recommendations.length,
        criticalCount,
        highPriorityCount,
        estimatedImpact,
      },
      period: metrics.period,
      generatedAt: new Date(),
    };
  }

  private async analyzeProductionEfficiency(
    kpi: any
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    if (kpi.status === "critical" || kpi.efficiencyRate < 70) {
      recommendations.push({
        id: this.generateId(),
        type: "production",
        priority: "critical",
        title: "Eficiencia de producción crítica",
        description: `La eficiencia actual es de ${kpi.efficiencyRate.toFixed(1)}%, muy por debajo del objetivo de 95%. Se están produciendo solo ${kpi.producedUnits} de ${kpi.plannedUnits} unidades planificadas.`,
        impact: "Pérdida de productividad y capacidad de cumplir con pedidos",
        actionItems: [
          "Analizar causas de baja producción (equipos, personal, materiales)",
          "Revisar planificación de órdenes y ajustar cantidades realistas",
          "Implementar sistema de control de producción en tiempo real",
          "Capacitar al personal en técnicas de mejora continua",
        ],
        estimatedBenefit: `Aumentar eficiencia a 85% = ${Math.round(kpi.plannedUnits * 0.85 - kpi.producedUnits)} unidades adicionales/mes`,
        urgency: "immediate",
        affectedArea: "Producción",
        metrics: {
          current: kpi.efficiencyRate,
          target: 95,
          unit: "%",
        },
      });
    } else if (kpi.status === "warning" || kpi.efficiencyRate < 85) {
      recommendations.push({
        id: this.generateId(),
        type: "production",
        priority: "high",
        title: "Mejorar eficiencia de producción",
        description: `La eficiencia actual es de ${kpi.efficiencyRate.toFixed(1)}%, por debajo del objetivo óptimo de 95%.`,
        impact: "Capacidad productiva no aprovechada completamente",
        actionItems: [
          "Identificar cuellos de botella en línea de producción",
          "Optimizar tiempos de cambio entre órdenes",
          "Revisar asignación de personal por turno",
        ],
        estimatedBenefit: "Aumento del 10-15% en producción mensual",
        urgency: "short-term",
        affectedArea: "Producción",
      });
    }

    if (kpi.trend.startsWith("-") && Math.abs(parseFloat(kpi.trend)) > 10) {
      recommendations.push({
        id: this.generateId(),
        type: "production",
        priority: "high",
        title: "Tendencia negativa en eficiencia",
        description: `La eficiencia ha disminuido ${kpi.trend} respecto al mes anterior.`,
        impact: "Deterioro progresivo de la capacidad productiva",
        actionItems: [
          "Realizar auditoría de procesos de producción",
          "Verificar estado de equipos y mantenimiento",
          "Revisar rotación y capacitación del personal",
        ],
        estimatedBenefit:
          "Prevenir mayor deterioro y recuperar niveles previos",
        urgency: "short-term",
        affectedArea: "Producción",
      });
    }

    return recommendations;
  }

  private async analyzeCapacityUtilization(
    kpi: any
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    if (kpi.utilizationRate < 60) {
      recommendations.push({
        id: this.generateId(),
        type: "capacity",
        priority: "high",
        title: "Capacidad productiva sub-utilizada",
        description: `Solo se está utilizando el ${kpi.utilizationRate.toFixed(1)}% de la capacidad disponible.`,
        impact: "Recursos ociosos y costos fijos no aprovechados",
        actionItems: [
          "Aumentar volumen de órdenes de producción",
          "Buscar nuevos clientes o mercados",
          "Considerar reducción temporal de personal o turnos",
          "Implementar productos complementarios",
        ],
        estimatedBenefit: `Potencial de ${(kpi.totalCapacity * 0.8 - kpi.usedCapacity).toFixed(0)} horas adicionales`,
        urgency: "medium-term",
        affectedArea: "Planeación",
      });
    }

    if (kpi.utilizationRate > 100) {
      recommendations.push({
        id: this.generateId(),
        type: "capacity",
        priority: "critical",
        title: "Sobre-utilización de capacidad",
        description: `La utilización es del ${kpi.utilizationRate.toFixed(1)}%, excediendo la capacidad normal.`,
        impact: "Riesgo de burnout del personal, errores y retrasos",
        actionItems: [
          "Contratar personal adicional",
          "Implementar turnos adicionales",
          "Invertir en automatización o equipos adicionales",
        ],
        estimatedBenefit: "Reducir sobrecarga a niveles sostenibles (80-90%)",
        urgency: "immediate",
        affectedArea: "Recursos Humanos",
      });
    } else if (kpi.utilizationRate > 95) {
      recommendations.push({
        id: this.generateId(),
        type: "capacity",
        priority: "high",
        title: "Capacidad cerca del límite",
        description: `La utilización está al ${kpi.utilizationRate.toFixed(1)}%, muy cerca del máximo.`,
        impact: "Imposibilidad de aceptar nuevos pedidos sin retrasos",
        actionItems: [
          "Planificar expansión de capacidad",
          "Evaluar inversión en equipos o personal",
          "Optimizar procesos para liberar capacidad",
        ],
        estimatedBenefit: "Permitir crecimiento del 20-30% adicional",
        urgency: "short-term",
        affectedArea: "Planeación",
      });
    }

    return recommendations;
  }

  private async analyzeCostPerUnit(kpi: any): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    if (
      kpi.status === "critical" ||
      (kpi.trend.startsWith("+") && parseFloat(kpi.trend) > 15)
    ) {
      recommendations.push({
        id: this.generateId(),
        type: "cost",
        priority: "critical",
        title: "Aumento crítico en costos de producción",
        description: `El costo por unidad ha aumentado ${kpi.trend} a $${kpi.costPerUnit.toFixed(2)}.`,
        impact: "Reducción significativa de márgenes de ganancia",
        actionItems: [
          "Negociar mejores precios con proveedores",
          "Buscar proveedores alternativos",
          "Optimizar uso de materia prima (reducir desperdicios)",
          "Implementar compras por volumen",
        ],
        estimatedBenefit: `Reducir 10% = ahorro de $${(kpi.totalCost * 0.1).toFixed(2)}/mes`,
        urgency: "immediate",
        affectedArea: "Compras y Producción",
      });
    } else if (
      kpi.status === "warning" ||
      (kpi.trend.startsWith("+") && parseFloat(kpi.trend) > 5)
    ) {
      recommendations.push({
        id: this.generateId(),
        type: "cost",
        priority: "high",
        title: "Costos en aumento",
        description: `El costo por unidad ha aumentado ${kpi.trend}.`,
        impact: "Presión sobre márgenes de rentabilidad",
        actionItems: [
          "Revisar contratos con proveedores",
          "Analizar desperdicio de materiales",
          "Implementar control de costos más estricto",
        ],
        estimatedBenefit: "Estabilizar costos y prevenir mayor aumento",
        urgency: "short-term",
        affectedArea: "Compras",
      });
    }

    return recommendations;
  }

  private async analyzeLeadTime(kpi: any): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    if (kpi.status === "critical" || kpi.averageLeadTime > 10) {
      recommendations.push({
        id: this.generateId(),
        type: "production",
        priority: "critical",
        title: "Lead time excesivamente largo",
        description: `El tiempo promedio de producción es de ${kpi.averageLeadTime.toFixed(1)} días.`,
        impact: "Insatisfacción de clientes y pérdida de competitividad",
        actionItems: [
          "Identificar etapas más lentas del proceso",
          "Implementar producción lean",
          "Mejorar coordinación entre departamentos",
          "Reducir tiempos de espera entre etapas",
        ],
        estimatedBenefit: `Reducir a 5 días = mejora de ${(((kpi.averageLeadTime - 5) / kpi.averageLeadTime) * 100).toFixed(0)}% en velocidad`,
        urgency: "immediate",
        affectedArea: "Producción",
      });
    } else if (kpi.status === "warning" || kpi.averageLeadTime > 7) {
      recommendations.push({
        id: this.generateId(),
        type: "production",
        priority: "high",
        title: "Lead time por encima del objetivo",
        description: `El tiempo promedio de producción es de ${kpi.averageLeadTime.toFixed(1)} días.`,
        impact: "Tiempos de entrega mayores a la competencia",
        actionItems: [
          "Mapear proceso completo de producción",
          "Identificar pasos que no agregan valor",
          "Mejorar flujo de trabajo entre etapas",
        ],
        estimatedBenefit: "Reducción del 20-30% en tiempo de entrega",
        urgency: "short-term",
        affectedArea: "Producción",
      });
    }

    return recommendations;
  }

  private async analyzeSlowStages(stages: any[]): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    for (const stage of stages) {
      if (stage.impactLevel === "high") {
        recommendations.push({
          id: this.generateId(),
          type: "production",
          priority: "high",
          title: `Etapa "${stage.stageName}" es un cuello de botella`,
          description: `Esta etapa tarda en promedio ${stage.averageDuration.toFixed(1)} días, afectando ${stage.ordersCount} órdenes.`,
          impact: "Retraso en todo el proceso de producción",
          actionItems: [
            stage.suggestion,
            "Asignar más recursos a esta etapa",
            "Capacitar al personal especializado",
          ],
          estimatedBenefit: "Reducir lead time general en 15-20%",
          urgency: "short-term",
          affectedArea: "Producción",
        });
      }
    }

    return recommendations;
  }

  private async analyzeProblematicProducts(
    products: any[]
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    for (const product of products.slice(0, 3)) {
      if (product.impactLevel === "high") {
        recommendations.push({
          id: this.generateId(),
          type: "quality",
          priority: "high",
          title: `Producto "${product.productName}" con alta tasa de problemas`,
          description: `${product.delayRate.toFixed(0)}% de órdenes retrasadas.`,
          impact: "Afecta satisfacción del cliente y rentabilidad",
          actionItems: [
            ...product.issues.map((issue: string) => `Solucionar: ${issue}`),
            "Revisar proceso de producción específico",
            "Verificar disponibilidad de materias primas",
          ],
          estimatedBenefit: "Reducir tasa de retrasos al 20% o menos",
          urgency: "short-term",
          affectedArea: "Producción",
        });
      }
    }

    return recommendations;
  }

  private async analyzeSlowSuppliers(
    suppliers: any[]
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    for (const supplier of suppliers.slice(0, 3)) {
      if (supplier.impactLevel === "high") {
        recommendations.push({
          id: this.generateId(),
          type: "supplier",
          priority: "high",
          title: `Proveedor "${supplier.supplierName}" con entregas lentas`,
          description: `Tiempo promedio de entrega: ${supplier.averageDeliveryTime.toFixed(1)} días.`,
          impact: "Retrasos en producción por falta de materiales",
          actionItems: [
            "Negociar mejores tiempos de entrega",
            "Buscar proveedores alternativos",
            "Aumentar stock de seguridad para este proveedor",
          ],
          estimatedBenefit: "Reducir retrasos de producción en 10-15%",
          urgency: "medium-term",
          affectedArea: "Compras",
        });
      } else if (supplier.reliability < 80) {
        recommendations.push({
          id: this.generateId(),
          type: "supplier",
          priority: "medium",
          title: `Baja confiabilidad de "${supplier.supplierName}"`,
          description: `Solo ${supplier.reliability.toFixed(0)}% de entregas a tiempo.`,
          impact: "Riesgo de desabastecimiento",
          actionItems: [
            "Diversificar proveedores",
            "Incrementar stock de seguridad",
            "Monitorear desempeño más frecuentemente",
          ],
          estimatedBenefit: "Mayor estabilidad en suministro",
          urgency: "medium-term",
          affectedArea: "Compras",
        });
      }
    }

    return recommendations;
  }

  private async analyzeInventoryLevels(): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    const client = await this.pool.connect();

    try {
      const lowStockQuery = `
        SELECT 
          codigo,
          nombre,
          cantidad_actual,
          cantidad_minima,
          unidad_medida
        FROM Materia_Prima
        WHERE cantidad_actual <= cantidad_minima * 1.2
        ORDER BY (cantidad_actual / NULLIF(cantidad_minima, 0)) ASC
        LIMIT 10
      `;

      const result = await client.query(lowStockQuery);

      if (result.rows.length > 0) {
        const criticalItems = result.rows.filter(
          (row: any) =>
            parseFloat(row.cantidad_actual) < parseFloat(row.cantidad_minima)
        );

        if (criticalItems.length > 0) {
          recommendations.push({
            id: this.generateId(),
            type: "inventory",
            priority: "critical",
            title: `${criticalItems.length} items de materia prima con stock crítico`,
            description: `Items por debajo del mínimo: ${criticalItems.map((i: any) => i.nombre).join(", ")}`,
            impact: "Riesgo de parar producción por falta de materiales",
            actionItems: [
              "Generar orden de compra urgente",
              "Contactar proveedores para entrega express",
              "Ajustar cantidades mínimas si es recurrente",
            ],
            estimatedBenefit: "Prevenir paros de producción",
            urgency: "immediate",
            affectedArea: "Compras e Inventario",
          });
        }

        const warningItems = result.rows.filter((row: any) => {
          const actual = parseFloat(row.cantidad_actual);
          const minimo = parseFloat(row.cantidad_minima);
          return actual >= minimo && actual <= minimo * 1.2;
        });

        if (warningItems.length > 0) {
          recommendations.push({
            id: this.generateId(),
            type: "inventory",
            priority: "high",
            title: `${warningItems.length} items cerca del stock mínimo`,
            description: `Items que requieren reposición pronto: ${warningItems
              .map((i: any) => i.nombre)
              .slice(0, 5)
              .join(", ")}`,
            impact: "Posibles interrupciones si no se repone a tiempo",
            actionItems: [
              "Programar orden de compra",
              "Verificar lead time de proveedores",
              "Priorizar productos de alta rotación",
            ],
            estimatedBenefit: "Mantener flujo de producción continuo",
            urgency: "short-term",
            affectedArea: "Compras e Inventario",
          });
        }
      }
    } finally {
      client.release();
    }

    return recommendations;
  }

  private generateId(): string {
    this.recommendationCounter++;
    return `REC-${Date.now()}-${this.recommendationCounter}`;
  }
}

export function createRecommendationEngine(pool: Pool): RecommendationEngine {
  return new RecommendationEngine(pool);
}
