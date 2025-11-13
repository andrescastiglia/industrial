/**
 * API endpoint para generar reportes en PDF
 * GET /api/reports/pdf?type=production|sales|inventory|costs&period=YYYY-MM
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/auth";
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
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);

    if (!payload) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

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
      user: payload.email,
    });

    const client = await pool.connect();

    try {
      let pdfBlob: Blob;

      switch (type) {
        case "production": {
          // Obtener órdenes de producción
          const ordersResult = await client.query(
            `SELECT 
              op.id,
              p.nombre as producto,
              op.cantidad_requerida as cantidad,
              op.estado,
              op.fecha_finalizacion as fecha
            FROM Ordenes_Produccion op
            JOIN Productos p ON op.producto_id = p.id
            WHERE op.fecha_finalizacion >= $1 
              AND op.fecha_finalizacion <= $2
              AND op.estado = 'completada'
            ORDER BY op.fecha_finalizacion DESC`,
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
            WHERE fecha_finalizacion >= $1 
              AND fecha_finalizacion <= $2
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
              v.id,
              c.nombre as cliente,
              v.total as monto,
              v.estado,
              v.fecha_venta as fecha
            FROM Ventas v
            JOIN Clientes c ON v.cliente_id = c.id
            WHERE v.fecha_venta >= $1 
              AND v.fecha_venta <= $2
            ORDER BY v.fecha_venta DESC`,
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
            `SELECT COALESCE(SUM(total), 0) as total FROM Ventas
            WHERE fecha_venta >= $1 AND fecha_venta <= $2`,
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
              codigo,
              nombre,
              cantidad_actual as cantidad,
              cantidad_minima as minimo,
              CASE 
                WHEN cantidad_actual < cantidad_minima THEN 'Bajo Stock'
                WHEN cantidad_actual < cantidad_minima * 1.5 THEN 'Alerta'
                ELSE 'OK'
              END as estado
            FROM Materia_Prima
            ORDER BY 
              CASE 
                WHEN cantidad_actual < cantidad_minima THEN 1
                WHEN cantidad_actual < cantidad_minima * 1.5 THEN 2
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
              c.id,
              p.nombre as proveedor,
              c.total as monto,
              c.estado,
              c.fecha_compra as fecha
            FROM Compras c
            JOIN Proveedores p ON c.proveedor_id = p.id
            WHERE c.fecha_compra >= $1 
              AND c.fecha_compra <= $2
            ORDER BY c.fecha_compra DESC`,
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
            `SELECT COALESCE(SUM(total), 0) as total FROM Compras
            WHERE fecha_compra >= $1 AND fecha_compra <= $2`,
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

      client.release();

      const duration = Date.now() - startTime;
      apiLogger.info("Reporte PDF generado exitosamente", {
        type,
        duration,
        user: payload.email,
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
      client.release();
      throw error;
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
