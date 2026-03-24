/**
 * API endpoint para enviar reportes por email
 * POST /api/reports/email
 */

import { NextRequest, NextResponse } from "next/server";

import { authenticateApiRequest } from "@/lib/api-auth";

import { apiLogger } from "@/lib/logger";

import { pool } from "@/lib/database";

import { mapDatabaseError } from "@/lib/error-handler";

import { emailService } from "@/lib/reports/email-service";

import {
  generateProductionReport,
  generateSalesReport,
  generateInventoryReport,
  generateCostsReport,
} from "@/lib/reports/pdf-generator";
import {
  generateProductionExcel,
  generateSalesExcel,
  generateInventoryExcel,
  generateCostsExcel,
} from "@/lib/reports/excel-generator";
import {
  getCompraEstadoLabel,
  getOrdenProduccionEstadoLabel,
  getVentaEstadoLabel,
} from "@/lib/business-constants";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

import { es } from "date-fns/locale";

export const dynamic = "force-dynamic";

interface SendReportRequest {
  type:
    | "production"
    | "sales"
    | "inventory"
    | "costs"
    | "executive-summary"
    | "critical-alert";
  recipients: string[];
  period?: string;
  alertType?: string;
  alertMessage?: string;
  alertDetails?: any;
}

export async function POST(request: NextRequest) {
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

    // Solo admin y gerente pueden enviar reportes
    if (!["admin", "gerente"].includes(user.role)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    // Body
    const body: SendReportRequest = await request.json();
    const {
      type,
      recipients,
      period: periodParam,
      alertType,
      alertMessage,
      alertDetails,
    } = body;

    if (!type || !recipients || recipients.length === 0) {
      return NextResponse.json(
        { error: "Parámetros inválidos" },
        { status: 400 }
      );
    }

    apiLogger.info("Enviando reporte por email", {
      type,
      recipients,
      user: user.email,
    });

    // Verificar conexión de email
    const isEmailConfigured = await emailService.verifyConnection();
    if (!isEmailConfigured) {
      return NextResponse.json(
        { error: "Servicio de email no configurado" },
        { status: 503 }
      );
    }

    let success = false;

    switch (type) {
      case "production": {
        // Generar reportes
        const periodDate = periodParam
          ? new Date(periodParam + "-01")
          : new Date();
        const startDate = startOfMonth(periodDate);
        const endDate = endOfMonth(periodDate);
        const period = format(periodDate, "MMMM 'de' yyyy", { locale: es });

        const client = await pool.connect();

        try {
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

          const summary = {
            totalOrders,
            totalUnits,
            completionRate: 100,
            completionTrend: 0,
            trend: trend.startsWith("-") ? trend : `+${trend}`,
          };

          const pdfBlob = await generateProductionReport({
            period,
            orders: ordersResult.rows.map((row: any) => ({
              ...row,
              estado: getOrdenProduccionEstadoLabel(row.estado),
            })),
            summary,
          });

          const excelBuffer = await generateProductionExcel({
            period,
            orders: ordersResult.rows.map((row: any) => ({
              ...row,
              estado: getOrdenProduccionEstadoLabel(row.estado),
            })),
            summary,
          });

          const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());

          success = await emailService.sendProductionReport(
            recipients,
            pdfBuffer,
            excelBuffer,
            summary
          );
        } catch (error) {
          throw error;
        } finally {
          client.release();
        }
        break;
      }

      case "sales": {
        const periodDate = periodParam
          ? new Date(periodParam + "-01")
          : new Date();
        const startDate = startOfMonth(periodDate);
        const endDate = endOfMonth(periodDate);
        const period = format(periodDate, "MMMM 'de' yyyy", { locale: es });

        const client = await pool.connect();

        try {
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
              ? parseFloat(
                  (
                    ((totalSales - prevTotalSales) / prevTotalSales) *
                    100
                  ).toFixed(1)
                )
              : 0;

          const summary = {
            totalSales,
            salesCount,
            averageTicket,
            salesTrend,
          };

          const pdfBlob = await generateSalesReport({
            period,
            sales: salesResult.rows.map((row: any) => ({
              ...row,
              estado: getVentaEstadoLabel(row.estado),
            })),
            summary,
          });

          const excelBuffer = await generateSalesExcel({
            period,
            sales: salesResult.rows.map((row: any) => ({
              ...row,
              estado: getVentaEstadoLabel(row.estado),
            })),
            summary,
          });

          const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());

          success = await emailService.sendSalesReport(
            recipients,
            pdfBuffer,
            excelBuffer,
            summary
          );
        } catch (error) {
          throw error;
        } finally {
          client.release();
        }
        break;
      }

      case "inventory": {
        const client = await pool.connect();

        try {
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

          const summary = {
            totalItems: inventoryResult.rows.length,
            lowStockItems: inventoryResult.rows.filter(
              (row: any) => row.estado === "Bajo Stock"
            ).length,
          };

          const pdfBlob = await generateInventoryReport({
            items: inventoryResult.rows,
            summary: {
              ...summary,
              totalValue: 0,
            },
          });

          const excelBuffer = await generateInventoryExcel({
            items: inventoryResult.rows,
            summary: {
              ...summary,
              totalValue: 0,
            },
          });

          const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());

          success = await emailService.sendInventoryReport(
            recipients,
            pdfBuffer,
            excelBuffer,
            summary
          );
        } catch (error) {
          throw error;
        } finally {
          client.release();
        }
        break;
      }

      case "costs": {
        const periodDate = periodParam
          ? new Date(periodParam + "-01")
          : new Date();
        const startDate = startOfMonth(periodDate);
        const endDate = endOfMonth(periodDate);
        const period = format(periodDate, "MMMM 'de' yyyy", { locale: es });

        const client = await pool.connect();

        try {
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
              ? parseFloat(
                  (
                    ((totalPurchases - prevTotalPurchases) /
                      prevTotalPurchases) *
                    100
                  ).toFixed(1)
                )
              : 0;

          const summary = {
            totalPurchases,
            purchasesCount,
            averagePurchase,
            purchasesTrend,
          };

          const pdfBlob = await generateCostsReport({
            period,
            purchases: purchasesResult.rows.map((row: any) => ({
              ...row,
              estado: getCompraEstadoLabel(row.estado),
            })),
            summary,
          });

          const excelBuffer = await generateCostsExcel({
            period,
            purchases: purchasesResult.rows.map((row: any) => ({
              ...row,
              estado: getCompraEstadoLabel(row.estado),
            })),
            summary,
          });

          const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());

          success = await emailService.sendCostsReport(
            recipients,
            pdfBuffer,
            excelBuffer,
            summary
          );
        } catch (error) {
          throw error;
        } finally {
          client.release();
        }
        break;
      }

      case "executive-summary": {
        // Obtener métricas del dashboard
        const client = await pool.connect();

        try {
          const metricsResult = await client.query(
            `SELECT 
              (SELECT COUNT(*) FROM Ordenes_Produccion 
               WHERE estado = 'completada' 
               AND fecha_fin_real >= date_trunc('month', CURRENT_DATE)) as produccion_total,
              (SELECT COUNT(*) FROM Materia_Prima) as inventario_total,
              (SELECT COUNT(*) FROM Materia_Prima 
               WHERE stock_actual < punto_pedido) as items_bajo_stock,
              (SELECT COALESCE(SUM(total_venta), 0) FROM Ordenes_Venta 
               WHERE fecha_pedido >= date_trunc('month', CURRENT_DATE)) as ventas_total,
              (SELECT COALESCE(SUM(total_compra), 0) FROM Compras 
               WHERE fecha_pedido >= date_trunc('month', CURRENT_DATE)) as costos_total,
              (SELECT COUNT(*) FROM Ordenes_Produccion 
               WHERE fecha_fin_estimada < CURRENT_DATE 
               AND estado != 'completada') as ordenes_vencidas,
              (SELECT COUNT(*) FROM Ordenes_Produccion 
               WHERE fecha_fin_estimada BETWEEN CURRENT_DATE 
               AND CURRENT_DATE + INTERVAL '3 days' 
               AND estado != 'completada') as ordenes_en_riesgo`
          );

          const row = metricsResult.rows[0];
          const metrics = {
            produccion: {
              total: parseInt(row.produccion_total || "0"),
              variacion_porcentaje: 0,
              tendencia: "stable",
            },
            inventario: {
              total: parseInt(row.inventario_total || "0"),
              items_bajo_stock: parseInt(row.items_bajo_stock || "0"),
              variacion_porcentaje: 0,
              tendencia: "stable",
            },
            ventas: {
              total: parseFloat(row.ventas_total || "0"),
              variacion_porcentaje: 0,
              tendencia: "stable",
            },
            costos: {
              total: parseFloat(row.costos_total || "0"),
              variacion_porcentaje: 0,
              tendencia: "stable",
            },
            ordenes: {
              vencidas: parseInt(row.ordenes_vencidas || "0"),
              en_riesgo: parseInt(row.ordenes_en_riesgo || "0"),
            },
          };

          const period = format(new Date(), "MMMM 'de' yyyy", { locale: es });

          success = await emailService.sendExecutiveSummary(
            recipients,
            metrics,
            period
          );
        } catch (error) {
          throw error;
        } finally {
          client.release();
        }
        break;
      }

      case "critical-alert": {
        if (!alertType || !alertMessage) {
          return NextResponse.json(
            { error: "Faltan parámetros para alerta crítica" },
            { status: 400 }
          );
        }

        success = await emailService.sendCriticalAlert(
          recipients,
          alertType,
          alertMessage,
          alertDetails
        );
        break;
      }

      default:
        return NextResponse.json(
          { error: "Tipo de reporte no soportado" },
          { status: 400 }
        );
    }

    const duration = Date.now() - startTime;

    if (success) {
      apiLogger.info("Reporte enviado por email exitosamente", {
        type,
        recipients,
        duration,
        user: user.email,
      });

      return NextResponse.json({
        success: true,
        message: "Reporte enviado exitosamente",
      });
    } else {
      apiLogger.error("Error al enviar reporte por email", {
        type,
        recipients,
        duration,
      });

      return NextResponse.json(
        { error: "Error al enviar reporte" },
        { status: 500 }
      );
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    const mappedError = mapDatabaseError(error);

    apiLogger.error("Error al procesar solicitud de email", {
      error: mappedError,
      duration,
    });

    return NextResponse.json(
      { error: "Error al procesar solicitud", details: mappedError.message },
      { status: mappedError.statusCode || 500 }
    );
  }
}
