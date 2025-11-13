/**
 * API endpoint para generar reportes en Excel
 * GET /api/reports/excel?type=production|sales|inventory|costs&period=YYYY-MM
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { apiLogger } from "@/lib/logger";
import { pool } from "@/lib/database";
import { mapDatabaseError } from "@/lib/error-handler";
import {
  generateProductionExcel,
  generateSalesExcel,
  generateInventoryExcel,
  generateCostsExcel,
} from "@/lib/reports/excel-generator";
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

    apiLogger.info("Generando reporte Excel", {
      type,
      period,
      user: user.email,
    });

    const client = await pool.connect();

    try {
      let excelBuffer: Buffer;

      switch (type) {
        case "production": {
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

          const totalOrders = ordersResult.rows.length;
          const totalUnits = ordersResult.rows.reduce(
            (sum: number, row: any) => sum + (row.cantidad || 0),
            0
          );

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

          excelBuffer = await generateProductionExcel({
            period,
            orders: ordersResult.rows,
            summary: {
              totalOrders,
              totalUnits,
              completionRate: 100,
              completionTrend: 0,
              trend: trend.startsWith("-") ? trend : `+${trend}`,
            },
          });
          break;
        }

        case "sales": {
          const salesResult = await client.query(
            `SELECT 
              v.id,
              c.nombre as cliente,
              v.total as monto,
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

          excelBuffer = await generateSalesExcel({
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

          excelBuffer = await generateInventoryExcel({
            items: inventoryResult.rows,
            summary: {
              totalItems,
              lowStockItems,
              totalValue: 0,
            },
          });
          break;
        }

        case "costs": {
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

          excelBuffer = await generateCostsExcel({
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
      apiLogger.info("Reporte Excel generado exitosamente", {
        type,
        duration,
        user: user.email,
      });

      // Retornar Excel
      return new NextResponse(Buffer.from(excelBuffer), {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="Reporte_${type}_${format(periodDate, "yyyy-MM")}.xlsx"`,
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

    apiLogger.error("Error al generar reporte Excel", {
      error: mappedError,
      duration,
    });

    return NextResponse.json(
      { error: "Error al generar reporte", details: mappedError.message },
      { status: mappedError.statusCode || 500 }
    );
  }
}
