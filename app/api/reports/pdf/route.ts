/**
 * API endpoint para generar reportes en PDF
 * GET /api/reports/pdf?type=production|sales|inventory|costs&period=YYYY-MM
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { apiLogger } from "@/lib/logger";
import { pool } from "@/lib/database";
import { mapDatabaseError } from "@/lib/error-handler";
import {
  generateProductionReport,
  generateSalesReport,
  generateInventoryReport,
  generateCostsReport,
} from "@/lib/reports/pdf-generator";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Autenticación
    const authResult = authenticateApiRequest(request);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error.error },
        { status: authResult.error.statusCode }
      );
    }

    const { user } = authResult;

    // Parámetros
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") as
      | "production"
      | "sales"
      | "inventory"
      | "costs";
    const periodParam = searchParams.get("period");

    if (
      !type ||
      !["production", "sales", "inventory", "costs"].includes(type)
    ) {
      return NextResponse.json(
        { error: "Tipo de reporte inválido" },
        { status: 400 }
      );
    }

    // Periodo (default: mes actual)
    const periodDate = periodParam ? new Date(periodParam + "-01") : new Date();
    const startDate = startOfMonth(periodDate);
    const endDate = endOfMonth(periodDate);
    const period = format(periodDate, "MMMM 'de' yyyy", { locale: es });

    apiLogger.info("Generando reporte PDF", {
      type,
      period,
      user: user.email,
    });

    const client = await pool.connect();

    try {
      let pdfBlob: Blob;

      switch (type) {
        case "production": {
          // Obtener órdenes de producción
          const ordersResult = await client.query(
            `SELECT 
              op.orden_produccion_id as id,
              p.nombre_modelo as producto,
              op.cantidad_a_producir as cantidad,
              op.estado,
              op.fecha_fin_real as fecha
            FROM Ordenes_Produccion op
            JOIN Productos p ON op.producto_id = p.producto_id
            WHERE op.fecha_fin_real >= $1 
              AND op.fecha_fin_real <= $2
              AND op.estado = 'completada'
            ORDER BY op.fecha_fin_real DESC`,
            [startDate, endDate]
          );

          // Calcular resumen
          const totalOrders = ordersResult.rows.length;
          const totalUnits = ordersResult.rows.reduce(
            (sum: number, row: any) => sum + (row.cantidad || 0),
            0
          );

          // Comparar con mes anterior
          const prevMonthStart = startOfMonth(subMonths(periodDate, 1));
          const prevMonthEnd = endOfMonth(subMonths(periodDate, 1));
          const prevOrdersResult = await client.query(
            `SELECT COUNT(*) as count FROM Ordenes_Produccion
            WHERE fecha_fin_real >= $1 
              AND fecha_fin_real <= $2
              AND estado = 'completada'`,
            [prevMonthStart, prevMonthEnd]
          );

          const prevTotalOrders = parseInt(
            prevOrdersResult.rows[0]?.count || "0"
          );
          const trend =
            prevTotalOrders > 0
              ? `${(((totalOrders - prevTotalOrders) / prevTotalOrders) * 100).toFixed(1)}%`
              : "0%";

          pdfBlob = await generateProductionReport({
            period,
            orders: ordersResult.rows,
            summary: {
              totalOrders,
              totalUnits,
              completionRate: 100, // Calculado si hay datos de planificación
              completionTrend: 0,
              trend: trend.startsWith("-") ? trend : `+${trend}`,
            },
          });
          break;
        }

        case "sales": {
          // Obtener ventas
          const salesResult = await client.query(
            `SELECT 
              v.orden_venta_id as id,
              c.nombre as cliente,
              v.total_venta as monto,
              v.estado,
              v.fecha_pedido as fecha
            FROM Ordenes_Venta v
            JOIN Clientes c ON v.cliente_id = c.cliente_id
            WHERE v.fecha_pedido >= $1 
              AND v.fecha_pedido <= $2
            ORDER BY v.fecha_pedido DESC`,
            [startDate, endDate]
          );

          const totalSales = salesResult.rows.reduce(
            (sum: number, row: any) => sum + parseFloat(row.monto || "0"),
            0
          );
          const salesCount = salesResult.rows.length;
          const averageTicket = salesCount > 0 ? totalSales / salesCount : 0;

          // Comparar con mes anterior
          const prevMonthStart = startOfMonth(subMonths(periodDate, 1));
          const prevMonthEnd = endOfMonth(subMonths(periodDate, 1));
          const prevSalesResult = await client.query(
            `SELECT COALESCE(SUM(total_venta), 0) as total FROM Ordenes_Venta
            WHERE fecha_pedido >= $1 AND fecha_pedido <= $2`,
            [prevMonthStart, prevMonthEnd]
          );

          const prevTotalSales = parseFloat(
            prevSalesResult.rows[0]?.total || "0"
          );
          const salesTrend =
            prevTotalSales > 0
              ? (
                  ((totalSales - prevTotalSales) / prevTotalSales) *
                  100
                ).toFixed(1)
              : "0";

          pdfBlob = await generateSalesReport({
            period,
            sales: salesResult.rows,
            summary: {
              totalSales,
              salesCount,
              averageTicket,
              salesTrend: parseFloat(salesTrend),
            },
          });
          break;
        }

        case "inventory": {
          // Obtener inventario
          const inventoryResult = await client.query(
            `SELECT 
              materia_prima_id as id,
              referencia_proveedor as codigo,
              nombre,
              stock_actual as cantidad,
              punto_pedido as minimo,
              CASE 
                WHEN stock_actual < punto_pedido THEN 'Bajo Stock'
                WHEN stock_actual < punto_pedido * 1.5 THEN 'Alerta'
                ELSE 'OK'
              END as estado
            FROM Materia_Prima
            ORDER BY 
              CASE 
                WHEN stock_actual < punto_pedido THEN 1
                WHEN stock_actual < punto_pedido * 1.5 THEN 2
                ELSE 3
              END,
              nombre`
          );

          const totalItems = inventoryResult.rows.length;
          const lowStockItems = inventoryResult.rows.filter(
            (row: any) => row.estado === "Bajo Stock"
          ).length;

          pdfBlob = await generateInventoryReport({
            items: inventoryResult.rows,
            summary: {
              totalItems,
              lowStockItems,
              totalValue: 0, // Se puede calcular si hay precios
            },
          });
          break;
        }

        case "costs": {
          // Obtener compras
          const purchasesResult = await client.query(
            `SELECT 
              c.compra_id as id,
              p.nombre as proveedor,
              c.total_compra as monto,
              c.estado,
              c.fecha_pedido as fecha
            FROM Compras c
            JOIN Proveedores p ON c.proveedor_id = p.proveedor_id
            WHERE c.fecha_pedido >= $1 
              AND c.fecha_pedido <= $2
            ORDER BY c.fecha_pedido DESC`,
            [startDate, endDate]
          );

          const totalPurchases = purchasesResult.rows.reduce(
            (sum: number, row: any) => sum + parseFloat(row.monto || "0"),
            0
          );
          const purchasesCount = purchasesResult.rows.length;
          const averagePurchase =
            purchasesCount > 0 ? totalPurchases / purchasesCount : 0;

          // Comparar con mes anterior
          const prevMonthStart = startOfMonth(subMonths(periodDate, 1));
          const prevMonthEnd = endOfMonth(subMonths(periodDate, 1));
          const prevPurchasesResult = await client.query(
            `SELECT COALESCE(SUM(total_compra), 0) as total FROM Compras
            WHERE fecha_pedido >= $1 AND fecha_pedido <= $2`,
            [prevMonthStart, prevMonthEnd]
          );

          const prevTotalPurchases = parseFloat(
            prevPurchasesResult.rows[0]?.total || "0"
          );
          const purchasesTrend =
            prevTotalPurchases > 0
              ? (
                  ((totalPurchases - prevTotalPurchases) / prevTotalPurchases) *
                  100
                ).toFixed(1)
              : "0";

          pdfBlob = await generateCostsReport({
            period,
            purchases: purchasesResult.rows,
            summary: {
              totalPurchases,
              purchasesCount,
              averagePurchase,
              purchasesTrend: parseFloat(purchasesTrend),
            },
          });
          break;
        }

        default:
          return NextResponse.json(
            { error: "Tipo de reporte no implementado" },
            { status: 400 }
          );
      }

      const duration = Date.now() - startTime;
      apiLogger.info("Reporte PDF generado exitosamente", {
        type,
        duration,
        user: user.email,
      });

      // Retornar PDF
      return new NextResponse(pdfBlob, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="Reporte_${type}_${format(periodDate, "yyyy-MM")}.pdf"`,
        },
      });
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    const mappedError = mapDatabaseError(error);

    apiLogger.error("Error al generar reporte PDF", {
      error: mappedError,
      duration,
    });

    return NextResponse.json(
      { error: "Error al generar reporte", details: mappedError.message },
      { status: mappedError.statusCode || 500 }
    );
  }
}
