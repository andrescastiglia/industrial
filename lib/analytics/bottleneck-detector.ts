/**
 * Detector de Cuellos de Botella
 * Identifica etapas lentas, productos problemáticos y proveedores con retrasos
 */

import { Pool } from "pg";
import {
  startOfMonth,
  endOfMonth,
  differenceInDays,
  subMonths,
} from "date-fns";

// Tipos de datos
export interface SlowStage {
  stageName: string;
  averageDuration: number; // Días
  ordersCount: number;
  impactLevel: "high" | "medium" | "low";
  suggestion: string;
}

export interface ProblematicProduct {
  productId: number;
  productName: string;
  averageDelay: number; // Días de retraso promedio
  delayedOrders: number;
  totalOrders: number;
  delayRate: number; // Porcentaje
  impactLevel: "high" | "medium" | "low";
  issues: string[];
}

export interface SlowSupplier {
  supplierId: number;
  supplierName: string;
  averageDeliveryTime: number; // Días
  expectedDeliveryTime: number; // Días esperados
  delayDays: number; // Días de retraso promedio
  ordersCount: number;
  impactLevel: "high" | "medium" | "low";
  reliability: number; // Porcentaje (0-100)
}

export interface BottleneckAnalysis {
  slowStages: SlowStage[];
  problematicProducts: ProblematicProduct[];
  slowSuppliers: SlowSupplier[];
  period: string;
  summary: {
    totalBottlenecks: number;
    criticalIssues: number;
    estimatedImpact: string; // Descripción del impacto
  };
}

/**
 * Clase principal para detección de cuellos de botella
 */
export class BottleneckDetector {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Analiza todos los cuellos de botella para un periodo
   */
  async detectBottlenecks(
    period: Date = new Date()
  ): Promise<BottleneckAnalysis> {
    const startDate = startOfMonth(period);
    const endDate = endOfMonth(period);
    const periodStr = `${period.getFullYear()}-${String(period.getMonth() + 1).padStart(2, "0")}`;

    // Detectar problemas en paralelo
    const [slowStages, problematicProducts, slowSuppliers] = await Promise.all([
      this.detectSlowStages(startDate, endDate),
      this.detectProblematicProducts(startDate, endDate),
      this.detectSlowSuppliers(startDate, endDate),
    ]);

    // Calcular resumen
    const totalBottlenecks =
      slowStages.length + problematicProducts.length + slowSuppliers.length;
    const criticalIssues = [
      ...slowStages.filter((s) => s.impactLevel === "high"),
      ...problematicProducts.filter((p) => p.impactLevel === "high"),
      ...slowSuppliers.filter((s) => s.impactLevel === "high"),
    ].length;

    let estimatedImpact = "Impacto bajo en la operación";
    if (criticalIssues >= 5) {
      estimatedImpact =
        "Impacto crítico: múltiples cuellos de botella detectados";
    } else if (criticalIssues >= 3) {
      estimatedImpact = "Impacto alto: se requiere atención inmediata";
    } else if (criticalIssues >= 1) {
      estimatedImpact = "Impacto moderado: revisar áreas problemáticas";
    }

    return {
      slowStages,
      problematicProducts,
      slowSuppliers,
      period: periodStr,
      summary: {
        totalBottlenecks,
        criticalIssues,
        estimatedImpact,
      },
    };
  }

  /**
   * Detecta etapas lentas en el proceso de producción
   */
  private async detectSlowStages(
    startDate: Date,
    endDate: Date
  ): Promise<SlowStage[]> {
    const client = await this.pool.connect();

    try {
      // Analizar duración promedio por estado/etapa
      const query = `
        WITH stage_durations AS (
          SELECT 
            estado,
            COUNT(*) as orders_count,
            AVG(EXTRACT(DAY FROM (fecha_fin_real - fecha_inicio))) as avg_duration
          FROM Ordenes_Produccion
          WHERE fecha_fin_real >= $1 
            AND fecha_fin_real <= $2
            AND fecha_inicio IS NOT NULL
            AND fecha_fin_real > fecha_inicio
          GROUP BY estado
          HAVING COUNT(*) >= 3
        )
        SELECT 
          estado as stage_name,
          COALESCE(avg_duration, 0) as average_duration,
          orders_count
        FROM stage_durations
        ORDER BY avg_duration DESC
      `;

      const result = await client.query(query, [startDate, endDate]);

      const stages: SlowStage[] = result.rows.map((row: any) => {
        const avgDuration = parseFloat(row.average_duration);
        const ordersCount = parseInt(row.orders_count);

        // Determinar nivel de impacto
        let impactLevel: "high" | "medium" | "low";
        if (avgDuration > 7 && ordersCount > 5) {
          impactLevel = "high";
        } else if (avgDuration > 5 || ordersCount > 10) {
          impactLevel = "medium";
        } else {
          impactLevel = "low";
        }

        // Generar sugerencia
        let suggestion = "";
        if (avgDuration > 10) {
          suggestion =
            "Etapa crítica: considerar automatización o más recursos";
        } else if (avgDuration > 7) {
          suggestion = "Etapa lenta: revisar proceso y asignar más operarios";
        } else if (avgDuration > 5) {
          suggestion = "Etapa moderada: monitorear de cerca";
        } else {
          suggestion = "Etapa dentro de parámetros normales";
        }

        return {
          stageName: this.translateStage(row.stage_name),
          averageDuration: parseFloat(avgDuration.toFixed(2)),
          ordersCount,
          impactLevel,
          suggestion,
        };
      });

      // Retornar solo las etapas problemáticas (> 5 días promedio)
      return stages.filter((s) => s.averageDuration > 5);
    } finally {
      client.release();
    }
  }

  /**
   * Detecta productos con alta tasa de retrasos
   */
  private async detectProblematicProducts(
    startDate: Date,
    endDate: Date
  ): Promise<ProblematicProduct[]> {
    const client = await this.pool.connect();

    try {
      const query = `
        WITH product_performance AS (
          SELECT 
            op.producto_id,
            p.nombre_modelo as product_name,
            COUNT(*) as total_orders,
            COUNT(*) FILTER (
              WHERE op.fecha_fin_real > op.fecha_fin_estimada
            ) as delayed_orders,
            AVG(
              CASE 
                WHEN op.fecha_fin_real > op.fecha_fin_estimada 
                THEN EXTRACT(DAY FROM (op.fecha_fin_real - op.fecha_fin_estimada))
                ELSE 0
              END
            ) as average_delay
          FROM Ordenes_Produccion op
          JOIN Productos p ON op.producto_id = p.producto_id
          WHERE op.fecha_fin_real >= $1 
            AND op.fecha_fin_real <= $2
            AND op.estado = 'completada'
          GROUP BY op.producto_id, p.nombre_modelo
          HAVING COUNT(*) >= 2
        )
        SELECT *
        FROM product_performance
        WHERE delayed_orders > 0
        ORDER BY average_delay DESC, delayed_orders DESC
        LIMIT 10
      `;

      const result = await client.query(query, [startDate, endDate]);

      const products: ProblematicProduct[] = result.rows.map((row: any) => {
        const totalOrders = parseInt(row.total_orders);
        const delayedOrders = parseInt(row.delayed_orders);
        const averageDelay = parseFloat(row.average_delay);
        const delayRate = (delayedOrders / totalOrders) * 100;

        // Identificar problemas específicos
        const issues: string[] = [];
        if (delayRate > 50) {
          issues.push("Alta tasa de retrasos en entregas");
        }
        if (averageDelay > 5) {
          issues.push("Retrasos promedio significativos");
        }
        if (totalOrders > 10 && delayRate > 30) {
          issues.push("Volumen alto con problemas de cumplimiento");
        }

        // Determinar nivel de impacto
        let impactLevel: "high" | "medium" | "low";
        if (delayRate > 60 && averageDelay > 5) {
          impactLevel = "high";
        } else if (delayRate > 40 || averageDelay > 3) {
          impactLevel = "medium";
        } else {
          impactLevel = "low";
        }

        return {
          productId: parseInt(row.producto_id),
          productName: row.product_name,
          averageDelay: parseFloat(averageDelay.toFixed(2)),
          delayedOrders,
          totalOrders,
          delayRate: parseFloat(delayRate.toFixed(2)),
          impactLevel,
          issues,
        };
      });

      return products;
    } finally {
      client.release();
    }
  }

  /**
   * Detecta proveedores con entregas lentas
   */
  private async detectSlowSuppliers(
    startDate: Date,
    endDate: Date
  ): Promise<SlowSupplier[]> {
    const client = await this.pool.connect();

    try {
      const query = `
        WITH supplier_performance AS (
          SELECT 
            c.proveedor_id,
            pr.nombre as supplier_name,
            COUNT(*) as orders_count,
            AVG(
              c.fecha_recepcion_real - c.fecha_pedido
            ) as avg_delivery_time,
            COUNT(*) FILTER (
              WHERE c.fecha_recepcion_real > c.fecha_recepcion_estimada
            ) as delayed_deliveries
          FROM Compras c
          JOIN Proveedores pr ON c.proveedor_id = pr.proveedor_id
          WHERE c.fecha_pedido >= $1 
            AND c.fecha_pedido <= $2
            AND c.estado IN ('recibida')
            AND c.fecha_recepcion_real IS NOT NULL
            AND c.fecha_recepcion_estimada IS NOT NULL
          GROUP BY c.proveedor_id, pr.nombre
          HAVING COUNT(*) >= 2
        )
        SELECT *
        FROM supplier_performance
        ORDER BY avg_delivery_time DESC
        LIMIT 10
      `;

      const result = await client.query(query, [startDate, endDate]);

      const suppliers: SlowSupplier[] = result.rows.map((row: any) => {
        const ordersCount = parseInt(row.orders_count);
        const delayedDeliveries = parseInt(row.delayed_deliveries);
        const avgDeliveryTime = parseFloat(row.avg_delivery_time);

        // Tiempo esperado estándar (asumimos 5 días como óptimo)
        const expectedDeliveryTime = 5;
        const delayDays = Math.max(0, avgDeliveryTime - expectedDeliveryTime);

        // Calcular confiabilidad (% de entregas a tiempo)
        const onTimeDeliveries = ordersCount - delayedDeliveries;
        const reliability = (onTimeDeliveries / ordersCount) * 100;

        // Determinar nivel de impacto
        let impactLevel: "high" | "medium" | "low";
        if (delayDays > 7 && reliability < 60) {
          impactLevel = "high";
        } else if (delayDays > 3 || reliability < 80) {
          impactLevel = "medium";
        } else {
          impactLevel = "low";
        }

        return {
          supplierId: parseInt(row.proveedor_id),
          supplierName: row.supplier_name,
          averageDeliveryTime: parseFloat(avgDeliveryTime.toFixed(2)),
          expectedDeliveryTime,
          delayDays: parseFloat(delayDays.toFixed(2)),
          ordersCount,
          impactLevel,
          reliability: parseFloat(reliability.toFixed(2)),
        };
      });

      // Retornar solo proveedores problemáticos (con retrasos)
      return suppliers.filter((s) => s.delayDays > 1 || s.reliability < 90);
    } finally {
      client.release();
    }
  }

  /**
   * Traduce nombres de etapas/estados
   */
  private translateStage(stage: string): string {
    const translations: { [key: string]: string } = {
      pendiente: "Pendiente de Inicio",
      en_proceso: "En Proceso",
      completada: "Completada",
      cancelada: "Cancelada",
      pausada: "Pausada",
    };
    return translations[stage] || stage;
  }
}

/**
 * Función auxiliar para crear instancia del detector
 */
export function createBottleneckDetector(pool: Pool): BottleneckDetector {
  return new BottleneckDetector(pool);
}
