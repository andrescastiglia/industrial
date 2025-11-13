/**
 * Servicio de Análisis de Eficiencia
 * Calcula KPIs de producción, utilización de capacidad, costos y tiempos
 */

import { Pool } from "pg";
import {
  startOfMonth,
  endOfMonth,
  differenceInDays,
  subMonths,
} from "date-fns";

// Tipos de datos
export interface ProductionEfficiencyKPI {
  period: string;
  plannedUnits: number;
  producedUnits: number;
  efficiencyRate: number; // Porcentaje (0-100+)
  trend: string; // '+X%' o '-X%'
  status: "excellent" | "good" | "warning" | "critical";
}

export interface CapacityUtilizationKPI {
  period: string;
  totalCapacity: number; // Horas disponibles
  usedCapacity: number; // Horas utilizadas
  utilizationRate: number; // Porcentaje (0-100)
  trend: string;
  status: "excellent" | "good" | "warning" | "critical";
}

export interface CostPerUnitKPI {
  period: string;
  totalCost: number; // COP
  unitsProduced: number;
  costPerUnit: number; // COP por unidad
  trend: string;
  status: "excellent" | "good" | "warning" | "critical";
}

export interface LeadTimeKPI {
  period: string;
  averageLeadTime: number; // Días
  minLeadTime: number;
  maxLeadTime: number;
  trend: string;
  status: "excellent" | "good" | "warning" | "critical";
}

export interface EfficiencyMetrics {
  productionEfficiency: ProductionEfficiencyKPI;
  capacityUtilization: CapacityUtilizationKPI;
  costPerUnit: CostPerUnitKPI;
  leadTime: LeadTimeKPI;
  period: string;
}

/**
 * Clase principal para análisis de eficiencia
 */
export class EfficiencyAnalyzer {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Calcula todos los KPIs de eficiencia para un periodo
   */
  async analyzeEfficiency(
    period: Date = new Date()
  ): Promise<EfficiencyMetrics> {
    const startDate = startOfMonth(period);
    const endDate = endOfMonth(period);
    const periodStr = `${period.getFullYear()}-${String(period.getMonth() + 1).padStart(2, "0")}`;

    // Calcular KPIs en paralelo
    const [productionEfficiency, capacityUtilization, costPerUnit, leadTime] =
      await Promise.all([
        this.calculateProductionEfficiency(startDate, endDate, period),
        this.calculateCapacityUtilization(startDate, endDate, period),
        this.calculateCostPerUnit(startDate, endDate, period),
        this.calculateLeadTime(startDate, endDate, period),
      ]);

    return {
      productionEfficiency,
      capacityUtilization,
      costPerUnit,
      leadTime,
      period: periodStr,
    };
  }

  /**
   * Calcula la eficiencia de producción (real vs planificado)
   */
  private async calculateProductionEfficiency(
    startDate: Date,
    endDate: Date,
    period: Date
  ): Promise<ProductionEfficiencyKPI> {
    const client = await this.pool.connect();

    try {
      // Obtener unidades planificadas y producidas del periodo actual
      const query = `
        SELECT 
          COALESCE(SUM(cantidad_planificada), 0) as planned,
          COALESCE(SUM(cantidad_real), 0) as produced
        FROM Ordenes_Produccion
        WHERE fecha_finalizacion >= $1 
          AND fecha_finalizacion <= $2
          AND estado IN ('completada', 'en_proceso')
      `;

      const currentResult = await client.query(query, [startDate, endDate]);
      const plannedUnits = parseFloat(currentResult.rows[0].planned) || 0;
      const producedUnits = parseFloat(currentResult.rows[0].produced) || 0;

      // Calcular eficiencia
      const efficiencyRate =
        plannedUnits > 0 ? (producedUnits / plannedUnits) * 100 : 0;

      // Obtener datos del mes anterior para comparación
      const previousMonth = subMonths(period, 1);
      const prevStart = startOfMonth(previousMonth);
      const prevEnd = endOfMonth(previousMonth);

      const previousResult = await client.query(query, [prevStart, prevEnd]);
      const prevPlanned = parseFloat(previousResult.rows[0].planned) || 0;
      const prevProduced = parseFloat(previousResult.rows[0].produced) || 0;
      const prevEfficiency =
        prevPlanned > 0 ? (prevProduced / prevPlanned) * 100 : 0;

      // Calcular tendencia
      const variation =
        prevEfficiency > 0
          ? ((efficiencyRate - prevEfficiency) / prevEfficiency) * 100
          : 0;
      const trend =
        variation >= 0
          ? `+${variation.toFixed(1)}%`
          : `${variation.toFixed(1)}%`;

      // Determinar estado
      let status: "excellent" | "good" | "warning" | "critical";
      if (efficiencyRate >= 95) status = "excellent";
      else if (efficiencyRate >= 85) status = "good";
      else if (efficiencyRate >= 70) status = "warning";
      else status = "critical";

      return {
        period: `${period.getFullYear()}-${String(period.getMonth() + 1).padStart(2, "0")}`,
        plannedUnits,
        producedUnits,
        efficiencyRate: parseFloat(efficiencyRate.toFixed(2)),
        trend,
        status,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Calcula la utilización de capacidad productiva
   */
  private async calculateCapacityUtilization(
    startDate: Date,
    endDate: Date,
    period: Date
  ): Promise<CapacityUtilizationKPI> {
    const client = await this.pool.connect();

    try {
      // Calcular días laborables en el periodo (asumiendo 22 días al mes)
      const daysInPeriod = differenceInDays(endDate, startDate) + 1;
      const workingDays = Math.floor(daysInPeriod * 0.71); // ~22 días de 31

      // Obtener número de operarios activos
      const operariosQuery = `
        SELECT COUNT(*) as count
        FROM Operarios
        WHERE estado = 'activo'
      `;
      const operariosResult = await client.query(operariosQuery);
      const activeOperarios = parseInt(operariosResult.rows[0].count) || 1;

      // Capacidad total: operarios * días * 8 horas
      const totalCapacity = activeOperarios * workingDays * 8;

      // Horas realmente utilizadas (calculadas desde órdenes)
      const usageQuery = `
        SELECT 
          COALESCE(SUM(
            EXTRACT(EPOCH FROM (fecha_finalizacion - fecha_inicio)) / 3600
          ), 0) as used_hours
        FROM Ordenes_Produccion
        WHERE fecha_finalizacion >= $1 
          AND fecha_finalizacion <= $2
          AND estado = 'completada'
          AND fecha_inicio IS NOT NULL
      `;

      const usageResult = await client.query(usageQuery, [startDate, endDate]);
      const usedCapacity = parseFloat(usageResult.rows[0].used_hours) || 0;

      // Calcular utilización
      const utilizationRate =
        totalCapacity > 0 ? (usedCapacity / totalCapacity) * 100 : 0;

      // Obtener datos del mes anterior
      const previousMonth = subMonths(period, 1);
      const prevStart = startOfMonth(previousMonth);
      const prevEnd = endOfMonth(previousMonth);

      const prevUsageResult = await client.query(usageQuery, [
        prevStart,
        prevEnd,
      ]);
      const prevUsed = parseFloat(prevUsageResult.rows[0].used_hours) || 0;
      const prevUtilization =
        totalCapacity > 0 ? (prevUsed / totalCapacity) * 100 : 0;

      // Calcular tendencia
      const variation =
        prevUtilization > 0
          ? ((utilizationRate - prevUtilization) / prevUtilization) * 100
          : 0;
      const trend =
        variation >= 0
          ? `+${variation.toFixed(1)}%`
          : `${variation.toFixed(1)}%`;

      // Determinar estado
      let status: "excellent" | "good" | "warning" | "critical";
      if (utilizationRate >= 80 && utilizationRate <= 95)
        status = "excellent"; // Óptimo
      else if (utilizationRate >= 70 && utilizationRate < 100) status = "good";
      else if (utilizationRate >= 50 || utilizationRate > 100)
        status = "warning"; // Baja o sobre-utilización
      else status = "critical"; // Muy baja

      return {
        period: `${period.getFullYear()}-${String(period.getMonth() + 1).padStart(2, "0")}`,
        totalCapacity: parseFloat(totalCapacity.toFixed(2)),
        usedCapacity: parseFloat(usedCapacity.toFixed(2)),
        utilizationRate: parseFloat(utilizationRate.toFixed(2)),
        trend,
        status,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Calcula el costo por unidad producida
   */
  private async calculateCostPerUnit(
    startDate: Date,
    endDate: Date,
    period: Date
  ): Promise<CostPerUnitKPI> {
    const client = await this.pool.connect();

    try {
      // Obtener costos totales (compras de materia prima)
      const costQuery = `
        SELECT COALESCE(SUM(costo_total), 0) as total_cost
        FROM Compras
        WHERE fecha_compra >= $1 
          AND fecha_compra <= $2
          AND estado IN ('completada', 'recibida')
      `;

      const costResult = await client.query(costQuery, [startDate, endDate]);
      const totalCost = parseFloat(costResult.rows[0].total_cost) || 0;

      // Obtener unidades producidas
      const unitsQuery = `
        SELECT COALESCE(SUM(cantidad_real), 0) as units
        FROM Ordenes_Produccion
        WHERE fecha_finalizacion >= $1 
          AND fecha_finalizacion <= $2
          AND estado = 'completada'
      `;

      const unitsResult = await client.query(unitsQuery, [startDate, endDate]);
      const unitsProduced = parseFloat(unitsResult.rows[0].units) || 0;

      // Calcular costo por unidad
      const costPerUnit = unitsProduced > 0 ? totalCost / unitsProduced : 0;

      // Obtener datos del mes anterior
      const previousMonth = subMonths(period, 1);
      const prevStart = startOfMonth(previousMonth);
      const prevEnd = endOfMonth(previousMonth);

      const prevCostResult = await client.query(costQuery, [
        prevStart,
        prevEnd,
      ]);
      const prevCost = parseFloat(prevCostResult.rows[0].total_cost) || 0;

      const prevUnitsResult = await client.query(unitsQuery, [
        prevStart,
        prevEnd,
      ]);
      const prevUnits = parseFloat(prevUnitsResult.rows[0].units) || 0;

      const prevCostPerUnit = prevUnits > 0 ? prevCost / prevUnits : 0;

      // Calcular tendencia (costo menor es mejor, así que invertimos el signo)
      const variation =
        prevCostPerUnit > 0
          ? ((costPerUnit - prevCostPerUnit) / prevCostPerUnit) * 100
          : 0;
      const trend =
        variation <= 0
          ? `${variation.toFixed(1)}%`
          : `+${variation.toFixed(1)}%`;

      // Determinar estado (basado en variación: reducción es bueno)
      let status: "excellent" | "good" | "warning" | "critical";
      if (variation <= -5)
        status = "excellent"; // Reducción significativa
      else if (variation <= 0)
        status = "good"; // Reducción o estable
      else if (variation <= 10)
        status = "warning"; // Aumento moderado
      else status = "critical"; // Aumento significativo

      return {
        period: `${period.getFullYear()}-${String(period.getMonth() + 1).padStart(2, "0")}`,
        totalCost: parseFloat(totalCost.toFixed(2)),
        unitsProduced: parseFloat(unitsProduced.toFixed(2)),
        costPerUnit: parseFloat(costPerUnit.toFixed(2)),
        trend,
        status,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Calcula el lead time promedio de producción
   */
  private async calculateLeadTime(
    startDate: Date,
    endDate: Date,
    period: Date
  ): Promise<LeadTimeKPI> {
    const client = await this.pool.connect();

    try {
      // Obtener lead times (días entre inicio y fin de orden)
      const query = `
        SELECT 
          AVG(EXTRACT(DAY FROM (fecha_finalizacion - fecha_inicio))) as avg_days,
          MIN(EXTRACT(DAY FROM (fecha_finalizacion - fecha_inicio))) as min_days,
          MAX(EXTRACT(DAY FROM (fecha_finalizacion - fecha_inicio))) as max_days
        FROM Ordenes_Produccion
        WHERE fecha_finalizacion >= $1 
          AND fecha_finalizacion <= $2
          AND estado = 'completada'
          AND fecha_inicio IS NOT NULL
          AND fecha_finalizacion > fecha_inicio
      `;

      const currentResult = await client.query(query, [startDate, endDate]);
      const averageLeadTime = parseFloat(currentResult.rows[0].avg_days) || 0;
      const minLeadTime = parseFloat(currentResult.rows[0].min_days) || 0;
      const maxLeadTime = parseFloat(currentResult.rows[0].max_days) || 0;

      // Obtener datos del mes anterior
      const previousMonth = subMonths(period, 1);
      const prevStart = startOfMonth(previousMonth);
      const prevEnd = endOfMonth(previousMonth);

      const previousResult = await client.query(query, [prevStart, prevEnd]);
      const prevAverage = parseFloat(previousResult.rows[0].avg_days) || 0;

      // Calcular tendencia (lead time menor es mejor)
      const variation =
        prevAverage > 0
          ? ((averageLeadTime - prevAverage) / prevAverage) * 100
          : 0;
      const trend =
        variation <= 0
          ? `${variation.toFixed(1)}%`
          : `+${variation.toFixed(1)}%`;

      // Determinar estado
      let status: "excellent" | "good" | "warning" | "critical";
      if (averageLeadTime <= 3)
        status = "excellent"; // 3 días o menos
      else if (averageLeadTime <= 5)
        status = "good"; // 5 días o menos
      else if (averageLeadTime <= 7)
        status = "warning"; // 1 semana
      else status = "critical"; // Más de 1 semana

      return {
        period: `${period.getFullYear()}-${String(period.getMonth() + 1).padStart(2, "0")}`,
        averageLeadTime: parseFloat(averageLeadTime.toFixed(2)),
        minLeadTime: parseFloat(minLeadTime.toFixed(2)),
        maxLeadTime: parseFloat(maxLeadTime.toFixed(2)),
        trend,
        status,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Obtiene el historial de KPIs (últimos N meses)
   */
  async getHistoricalMetrics(months: number = 6): Promise<EfficiencyMetrics[]> {
    const metrics: EfficiencyMetrics[] = [];
    const today = new Date();

    for (let i = 0; i < months; i++) {
      const period = subMonths(today, i);
      const monthMetrics = await this.analyzeEfficiency(period);
      metrics.unshift(monthMetrics); // Agregar al inicio para orden cronológico
    }

    return metrics;
  }
}

/**
 * Función auxiliar para crear instancia del analizador
 */
export function createEfficiencyAnalyzer(pool: Pool): EfficiencyAnalyzer {
  return new EfficiencyAnalyzer(pool);
}
