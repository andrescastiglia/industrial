/**
 * API endpoint para métricas del dashboard ejecutivo
 * Proporciona KPIs agregados y comparativas
 */

import { NextRequest, NextResponse } from "next/server";
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

interface DashboardMetrics {
  produccion: {
    total: number;
    variacion_porcentaje: number;
    tendencia: "up" | "down" | "stable";
  };
  inventario: {
    total: number;
    variacion_porcentaje: number;
    tendencia: "up" | "down" | "stable";
    items_bajo_stock: number;
  };
  ventas: {
    total: number;
    variacion_porcentaje: number;
    tendencia: "up" | "down" | "stable";
  };
  costos: {
    total: number;
    variacion_porcentaje: number;
    tendencia: "up" | "down" | "stable";
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

/**
 * GET /api/dashboard/metrics
 * Obtiene todas las métricas del dashboard
 */
export async function GET(request: NextRequest) {
  const client = await pool.connect();

  try {
    // Verificar autenticación
    const authResult = authenticateApiRequest(request);
    if (authResult.error) {
      throw new AuthenticationError(authResult.error.error);
    }

    const { user } = authResult;

    logger.info("Obteniendo métricas del dashboard", {
      timestamp: new Date().toISOString(),
    });

    // Calcular fechas
    const hoy = new Date();
    const inicioMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const inicioMesAnterior = new Date(
      hoy.getFullYear(),
      hoy.getMonth() - 1,
      1
    );
    const finMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0);

    // 1. Métricas de Producción
    const produccionActual = await client.query(
      `SELECT COUNT(*) as total
       FROM Ordenes_Produccion
       WHERE estado = 'completada'
       AND fecha_fin_real >= $1
       AND fecha_fin_real < CURRENT_DATE`,
      [inicioMesActual]
    );

    const produccionAnterior = await client.query(
      `SELECT COUNT(*) as total
       FROM Ordenes_Produccion
       WHERE estado = 'completada'
       AND fecha_fin_real >= $1
       AND fecha_fin_real <= $2`,
      [inicioMesAnterior, finMesAnterior]
    );

    const prodActual = parseInt(produccionActual.rows[0]?.total || "0");
    const prodAnterior = parseInt(produccionAnterior.rows[0]?.total || "0");
    const variacionProduccion =
      prodAnterior > 0 ? ((prodActual - prodAnterior) / prodAnterior) * 100 : 0;

    // 2. Métricas de Inventario
    const inventario = await client.query(
      `SELECT 
        COUNT(*) as total_items,
        SUM(CASE WHEN stock_actual <= punto_pedido THEN 1 ELSE 0 END) as bajo_stock
       FROM Materia_Prima`
    );

    const invActual = parseInt(inventario.rows[0]?.total_items || "0");
    const itemsBajoStock = parseInt(inventario.rows[0]?.bajo_stock || "0");
    // No hay historial temporal en Materia_Prima, por lo que variación es 0
    const variacionInventario = 0;

    // 3. Métricas de Ventas
    const ventasActual = await client.query(
      `SELECT COALESCE(SUM(total_venta), 0) as total
       FROM Ordenes_Venta
       WHERE fecha_pedido >= $1
       AND fecha_pedido < CURRENT_DATE`,
      [inicioMesActual]
    );

    const ventasAnterior = await client.query(
      `SELECT COALESCE(SUM(total_venta), 0) as total
       FROM Ordenes_Venta
       WHERE fecha_pedido >= $1
       AND fecha_pedido <= $2`,
      [inicioMesAnterior, finMesAnterior]
    );

    const ventasAct = parseFloat(ventasActual.rows[0]?.total || "0");
    const ventasAnt = parseFloat(ventasAnterior.rows[0]?.total || "0");
    const variacionVentas =
      ventasAnt > 0 ? ((ventasAct - ventasAnt) / ventasAnt) * 100 : 0;

    // 4. Métricas de Costos (compras de materia prima)
    const costosActual = await client.query(
      `SELECT COALESCE(SUM(total_compra), 0) as total
       FROM Compras
       WHERE fecha_pedido >= $1
       AND fecha_pedido < CURRENT_DATE`,
      [inicioMesActual]
    );

    const costosAnterior = await client.query(
      `SELECT COALESCE(SUM(total_compra), 0) as total
       FROM Compras
       WHERE fecha_pedido >= $1
       AND fecha_pedido <= $2`,
      [inicioMesAnterior, finMesAnterior]
    );

    const costosAct = parseFloat(costosActual.rows[0]?.total || "0");
    const costosAnt = parseFloat(costosAnterior.rows[0]?.total || "0");
    const variacionCostos =
      costosAnt > 0 ? ((costosAct - costosAnt) / costosAnt) * 100 : 0;

    // 5. Estado de Órdenes
    const ordenesEstado = await client.query(
      `SELECT 
        COUNT(CASE WHEN fecha_fin_estimada < CURRENT_DATE AND estado != 'completada' THEN 1 END) as vencidas,
        COUNT(CASE WHEN fecha_fin_estimada BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days' 
                   AND estado != 'completada' THEN 1 END) as en_riesgo,
        COUNT(CASE WHEN estado = 'completada' 
                   AND fecha_fin_real >= $1 THEN 1 END) as completadas_mes
       FROM Ordenes_Produccion`,
      [inicioMesActual]
    );

    // 6. Producción diaria (últimos 30 días)
    const produccionDiaria = await client.query(
      `SELECT 
        DATE(fecha_fin_real) as fecha,
        COUNT(*) as cantidad
       FROM Ordenes_Produccion
       WHERE estado = 'completada'
       AND fecha_fin_real >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY DATE(fecha_fin_real)
       ORDER BY fecha ASC`
    );

    // Construir respuesta
    const metrics: DashboardMetrics = {
      produccion: {
        total: prodActual,
        variacion_porcentaje: Math.round(variacionProduccion * 10) / 10,
        tendencia:
          variacionProduccion > 2
            ? "up"
            : variacionProduccion < -2
              ? "down"
              : "stable",
      },
      inventario: {
        total: invActual,
        variacion_porcentaje: Math.round(variacionInventario * 10) / 10,
        tendencia:
          variacionInventario > 2
            ? "up"
            : variacionInventario < -2
              ? "down"
              : "stable",
        items_bajo_stock: itemsBajoStock,
      },
      ventas: {
        total: ventasAct,
        variacion_porcentaje: Math.round(variacionVentas * 10) / 10,
        tendencia:
          variacionVentas > 2 ? "up" : variacionVentas < -2 ? "down" : "stable",
      },
      costos: {
        total: costosAct,
        variacion_porcentaje: Math.round(variacionCostos * 10) / 10,
        tendencia:
          variacionCostos > 2 ? "up" : variacionCostos < -2 ? "down" : "stable",
      },
      ordenes: {
        vencidas: parseInt(ordenesEstado.rows[0]?.vencidas || "0"),
        en_riesgo: parseInt(ordenesEstado.rows[0]?.en_riesgo || "0"),
        completadas_mes: parseInt(
          ordenesEstado.rows[0]?.completadas_mes || "0"
        ),
      },
      produccion_diaria: produccionDiaria.rows.map((row) => ({
        fecha: row.fecha.toISOString().split("T")[0],
        cantidad: parseInt(row.cantidad),
      })),
    };

    logger.info("Métricas del dashboard obtenidas exitosamente", {
      produccion: metrics.produccion.total,
      ventas: metrics.ventas.total,
    });

    return NextResponse.json(metrics, { status: 200 });
  } catch (error: any) {
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
    return NextResponse.json(createErrorResponse(systemError), { status: 500 });
  } finally {
    client.release();
  }
}
