/**
 * API endpoint para métricas del dashboard ejecutivo
 * Proporciona KPIs agregados y comparativas
 */

import { NextRequest, NextResponse } from "next/server";
import type { PoolClient } from "pg";
import { pool } from "@/lib/database";
import { authenticateApiRequest } from "@/lib/api-auth";
import {
  createErrorResponse,
  DatabaseError,
  AuthenticationError,
  mapDatabaseError,
} from "@/lib/error-handler";
import { apiLogger as logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

type TrendDirection = "up" | "down" | "stable";
type MetricsClient = PoolClient;
type MonthWindow = {
  currentStart: Date;
  previousStart: Date;
  previousEnd: Date;
};

interface DashboardMetrics {
  produccion: {
    total: number;
    variacion_porcentaje: number;
    tendencia: TrendDirection;
  };
  inventario: {
    total: number;
    variacion_porcentaje: number;
    tendencia: TrendDirection;
    items_bajo_stock: number;
  };
  ventas: {
    total: number;
    variacion_porcentaje: number;
    tendencia: TrendDirection;
  };
  costos: {
    total: number;
    variacion_porcentaje: number;
    tendencia: TrendDirection;
  };
  ordenes: {
    vencidas: number;
    en_riesgo: number;
    completadas_mes: number;
  };
  produccion_diaria: Array<{
    fecha: string;
    cantidad: number;
  }>;
}

function createMonthWindow(today = new Date()): MonthWindow {
  return {
    currentStart: new Date(today.getFullYear(), today.getMonth(), 1),
    previousStart: new Date(today.getFullYear(), today.getMonth() - 1, 1),
    previousEnd: new Date(today.getFullYear(), today.getMonth(), 0),
  };
}

function parseInteger(value: unknown): number {
  return Number.parseInt(String(value ?? "0"), 10);
}

function parseFloatValue(value: unknown): number {
  return Number.parseFloat(String(value ?? "0"));
}

function calculateVariation(current: number, previous: number): number {
  return previous > 0 ? ((current - previous) / previous) * 100 : 0;
}

function getTrendDirection(variation: number): TrendDirection {
  if (variation > 2) {
    return "up";
  }

  if (variation < -2) {
    return "down";
  }

  return "stable";
}

function createTrendMetric(total: number, variation: number) {
  return {
    total,
    variacion_porcentaje: Math.round(variation * 10) / 10,
    tendencia: getTrendDirection(variation),
  };
}

function formatDailyProduction(rows: Array<{ fecha: Date; cantidad: string }>) {
  return rows.map((row) => ({
    fecha: row.fecha.toISOString().split("T")[0],
    cantidad: parseInteger(row.cantidad),
  }));
}

async function fetchDashboardMetricQueries(
  client: MetricsClient,
  monthWindow: MonthWindow
) {
  const { currentStart, previousStart, previousEnd } = monthWindow;

  return Promise.all([
    client.query(
      `SELECT COUNT(*) as total
       FROM Ordenes_Produccion
       WHERE estado = 'completada'
       AND fecha_fin_real >= $1
       AND fecha_fin_real < CURRENT_DATE`,
      [currentStart]
    ),
    client.query(
      `SELECT COUNT(*) as total
       FROM Ordenes_Produccion
       WHERE estado = 'completada'
       AND fecha_fin_real >= $1
       AND fecha_fin_real <= $2`,
      [previousStart, previousEnd]
    ),
    client.query(
      `SELECT
        COUNT(*) as total_items,
        SUM(CASE WHEN stock_actual <= punto_pedido THEN 1 ELSE 0 END) as bajo_stock
       FROM Materia_Prima`
    ),
    client.query(
      `SELECT COALESCE(SUM(total_venta), 0) as total
       FROM Ordenes_Venta
       WHERE fecha_pedido >= $1
       AND fecha_pedido < CURRENT_DATE`,
      [currentStart]
    ),
    client.query(
      `SELECT COALESCE(SUM(total_venta), 0) as total
       FROM Ordenes_Venta
       WHERE fecha_pedido >= $1
       AND fecha_pedido <= $2`,
      [previousStart, previousEnd]
    ),
    client.query(
      `SELECT COALESCE(SUM(total_compra), 0) as total
       FROM Compras
       WHERE fecha_pedido >= $1
       AND fecha_pedido < CURRENT_DATE`,
      [currentStart]
    ),
    client.query(
      `SELECT COALESCE(SUM(total_compra), 0) as total
       FROM Compras
       WHERE fecha_pedido >= $1
       AND fecha_pedido <= $2`,
      [previousStart, previousEnd]
    ),
    client.query(
      `SELECT
        COUNT(CASE WHEN fecha_fin_estimada < CURRENT_DATE AND estado != 'completada' THEN 1 END) as vencidas,
        COUNT(CASE WHEN fecha_fin_estimada BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'
                   AND estado != 'completada' THEN 1 END) as en_riesgo,
        COUNT(CASE WHEN estado = 'completada'
                   AND fecha_fin_real >= $1 THEN 1 END) as completadas_mes
       FROM Ordenes_Produccion`,
      [currentStart]
    ),
    client.query(
      `SELECT
        DATE(fecha_fin_real) as fecha,
        COUNT(*) as cantidad
       FROM Ordenes_Produccion
       WHERE estado = 'completada'
       AND fecha_fin_real >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY DATE(fecha_fin_real)
       ORDER BY fecha ASC`
    ),
  ]);
}

function buildDashboardMetrics(
  queryResults: Awaited<ReturnType<typeof fetchDashboardMetricQueries>>
): DashboardMetrics {
  const [
    produccionActual,
    produccionAnterior,
    inventario,
    ventasActual,
    ventasAnterior,
    costosActual,
    costosAnterior,
    ordenesEstado,
    produccionDiaria,
  ] = queryResults;

  const prodActual = parseInteger(produccionActual.rows[0]?.total);
  const prodAnterior = parseInteger(produccionAnterior.rows[0]?.total);
  const invActual = parseInteger(inventario.rows[0]?.total_items);
  const itemsBajoStock = parseInteger(inventario.rows[0]?.bajo_stock);
  const ventasAct = parseFloatValue(ventasActual.rows[0]?.total);
  const ventasAnt = parseFloatValue(ventasAnterior.rows[0]?.total);
  const costosAct = parseFloatValue(costosActual.rows[0]?.total);
  const costosAnt = parseFloatValue(costosAnterior.rows[0]?.total);

  return {
    produccion: createTrendMetric(
      prodActual,
      calculateVariation(prodActual, prodAnterior)
    ),
    inventario: {
      ...createTrendMetric(invActual, 0),
      items_bajo_stock: itemsBajoStock,
    },
    ventas: createTrendMetric(
      ventasAct,
      calculateVariation(ventasAct, ventasAnt)
    ),
    costos: createTrendMetric(
      costosAct,
      calculateVariation(costosAct, costosAnt)
    ),
    ordenes: {
      vencidas: parseInteger(ordenesEstado.rows[0]?.vencidas),
      en_riesgo: parseInteger(ordenesEstado.rows[0]?.en_riesgo),
      completadas_mes: parseInteger(ordenesEstado.rows[0]?.completadas_mes),
    },
    produccion_diaria: formatDailyProduction(produccionDiaria.rows),
  };
}

function createMetricsErrorResponse(error: any) {
  logger.error("Error al obtener métricas del dashboard", {
    error: error.message,
    stack: error.stack,
  });

  if (error instanceof AuthenticationError) {
    return NextResponse.json(createErrorResponse(error), { status: 401 });
  }

  if (error.code) {
    const dbError = mapDatabaseError(error);
    return NextResponse.json(createErrorResponse(dbError), {
      status: dbError.statusCode,
    });
  }

  const systemError = new DatabaseError(
    "Error al obtener métricas del dashboard"
  );

  return NextResponse.json(createErrorResponse(systemError), {
    status: systemError.statusCode,
  });
}

/**
 * GET /api/dashboard/metrics
 * Obtiene todas las métricas del dashboard
 */
export async function GET(request: NextRequest) {
  const client = await pool.connect();

  try {
    const authResult = authenticateApiRequest(request);
    if (authResult.error) {
      throw new AuthenticationError(authResult.error.error);
    }

    logger.info("Obteniendo métricas del dashboard", {
      timestamp: new Date().toISOString(),
    });

    const queryResults = await fetchDashboardMetricQueries(
      client,
      createMonthWindow()
    );
    const metrics = buildDashboardMetrics(queryResults);

    logger.info("Métricas del dashboard obtenidas exitosamente", {
      produccion: metrics.produccion.total,
      ventas: metrics.ventas.total,
    });

    return NextResponse.json(metrics, { status: 200 });
  } catch (error: any) {
    return createMetricsErrorResponse(error);
  } finally {
    client.release();
  }
}
