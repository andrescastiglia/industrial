import type { PoolClient } from "pg";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import {
  getCompraEstadoLabel,
  getOrdenProduccionEstadoLabel,
  getVentaEstadoLabel,
} from "@/lib/business-constants";

export type StandardReportType = "production" | "sales" | "inventory" | "costs";

export type ReportPeriodInfo = {
  periodDate: Date;
  startDate: Date;
  endDate: Date;
  label: string;
  fileSuffix: string;
};

export type ProductionReportData = {
  type: "production";
  period: string;
  orders: Record<string, any>[];
  summary: {
    totalOrders: number;
    totalUnits: number;
    completionRate: number;
    completionTrend: number;
    trend: string;
  };
};

export type SalesReportData = {
  type: "sales";
  period: string;
  sales: Record<string, any>[];
  summary: {
    totalSales: number;
    salesCount: number;
    averageTicket: number;
    salesTrend: number;
  };
};

export type InventoryReportData = {
  type: "inventory";
  items: Record<string, any>[];
  summary: {
    totalItems: number;
    lowStockItems: number;
    totalValue: number;
  };
};

export type CostsReportData = {
  type: "costs";
  period: string;
  purchases: Record<string, any>[];
  summary: {
    totalPurchases: number;
    purchasesCount: number;
    averagePurchase: number;
    purchasesTrend: number;
  };
};

export type StandardReportData =
  | ProductionReportData
  | SalesReportData
  | InventoryReportData
  | CostsReportData;

export type ExecutiveSummaryMetrics = {
  produccion: {
    total: number;
    variacion_porcentaje: number;
    tendencia: "stable";
  };
  inventario: {
    total: number;
    items_bajo_stock: number;
    variacion_porcentaje: number;
    tendencia: "stable";
  };
  ventas: {
    total: number;
    variacion_porcentaje: number;
    tendencia: "stable";
  };
  costos: {
    total: number;
    variacion_porcentaje: number;
    tendencia: "stable";
  };
  ordenes: {
    vencidas: number;
    en_riesgo: number;
  };
};

function parseInteger(value: unknown): number {
  return Number.parseInt(String(value ?? "0"), 10);
}

function parseAmount(value: unknown): number {
  return Number.parseFloat(String(value ?? "0"));
}

function calculateTrendPercentage(current: number, previous: number): number {
  if (previous <= 0) {
    return 0;
  }

  return Number.parseFloat(
    (((current - previous) / previous) * 100).toFixed(1)
  );
}

function createProductionTrend(current: number, previous: number): string {
  const variation = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  const formattedVariation = `${variation.toFixed(1)}%`;

  return formattedVariation.startsWith("-")
    ? formattedVariation
    : `+${formattedVariation}`;
}

function mapProductionRows(rows: Record<string, any>[]) {
  return rows.map((row) => ({
    ...row,
    estado: getOrdenProduccionEstadoLabel(row.estado),
  }));
}

function mapSalesRows(rows: Record<string, any>[]) {
  return rows.map((row) => ({
    ...row,
    estado: getVentaEstadoLabel(row.estado),
  }));
}

function mapCostRows(rows: Record<string, any>[]) {
  return rows.map((row) => ({
    ...row,
    estado: getCompraEstadoLabel(row.estado),
  }));
}

export function parseStandardReportType(
  type: string | null
): StandardReportType | null {
  if (!type) {
    return null;
  }

  return ["production", "sales", "inventory", "costs"].includes(type)
    ? (type as StandardReportType)
    : null;
}

export function createReportPeriodInfo(
  periodParam?: string | null
): ReportPeriodInfo {
  const periodDate = periodParam ? new Date(`${periodParam}-01`) : new Date();

  return {
    periodDate,
    startDate: startOfMonth(periodDate),
    endDate: endOfMonth(periodDate),
    label: format(periodDate, "MMMM 'de' yyyy", { locale: es }),
    fileSuffix: format(periodDate, "yyyy-MM"),
  };
}

async function getProductionReportData(
  client: PoolClient,
  periodInfo: ReportPeriodInfo
): Promise<ProductionReportData> {
  const { periodDate, startDate, endDate, label } = periodInfo;
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
    (sum: number, row: Record<string, any>) => sum + (row.cantidad || 0),
    0
  );

  const prevOrdersResult = await client.query(
    `SELECT COUNT(*) as count
     FROM Ordenes_Produccion
     WHERE fecha_fin_real >= $1
       AND fecha_fin_real <= $2
       AND estado = 'completada'`,
    [
      startOfMonth(subMonths(periodDate, 1)),
      endOfMonth(subMonths(periodDate, 1)),
    ]
  );

  const prevTotalOrders = parseInteger(prevOrdersResult.rows[0]?.count);

  return {
    type: "production",
    period: label,
    orders: mapProductionRows(ordersResult.rows),
    summary: {
      totalOrders,
      totalUnits,
      completionRate: 100,
      completionTrend: 0,
      trend: createProductionTrend(totalOrders, prevTotalOrders),
    },
  };
}

async function getSalesReportData(
  client: PoolClient,
  periodInfo: ReportPeriodInfo
): Promise<SalesReportData> {
  const { periodDate, startDate, endDate, label } = periodInfo;
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
    (sum: number, row: Record<string, any>) => sum + parseAmount(row.monto),
    0
  );
  const salesCount = salesResult.rows.length;
  const averageTicket = salesCount > 0 ? totalSales / salesCount : 0;

  const prevSalesResult = await client.query(
    `SELECT COALESCE(SUM(total_venta), 0) as total
     FROM Ordenes_Venta
     WHERE fecha_pedido >= $1
       AND fecha_pedido <= $2`,
    [
      startOfMonth(subMonths(periodDate, 1)),
      endOfMonth(subMonths(periodDate, 1)),
    ]
  );

  const prevTotalSales = parseAmount(prevSalesResult.rows[0]?.total);

  return {
    type: "sales",
    period: label,
    sales: mapSalesRows(salesResult.rows),
    summary: {
      totalSales,
      salesCount,
      averageTicket,
      salesTrend: calculateTrendPercentage(totalSales, prevTotalSales),
    },
  };
}

async function getInventoryReportData(
  client: PoolClient
): Promise<InventoryReportData> {
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

  const lowStockItems = inventoryResult.rows.filter(
    (row: Record<string, any>) => row.estado === "Bajo Stock"
  ).length;

  return {
    type: "inventory",
    items: inventoryResult.rows,
    summary: {
      totalItems: inventoryResult.rows.length,
      lowStockItems,
      totalValue: 0,
    },
  };
}

async function getCostsReportData(
  client: PoolClient,
  periodInfo: ReportPeriodInfo
): Promise<CostsReportData> {
  const { periodDate, startDate, endDate, label } = periodInfo;
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
    (sum: number, row: Record<string, any>) => sum + parseAmount(row.monto),
    0
  );
  const purchasesCount = purchasesResult.rows.length;
  const averagePurchase =
    purchasesCount > 0 ? totalPurchases / purchasesCount : 0;

  const prevPurchasesResult = await client.query(
    `SELECT COALESCE(SUM(total_compra), 0) as total
     FROM Compras
     WHERE fecha_pedido >= $1
       AND fecha_pedido <= $2`,
    [
      startOfMonth(subMonths(periodDate, 1)),
      endOfMonth(subMonths(periodDate, 1)),
    ]
  );

  const prevTotalPurchases = parseAmount(prevPurchasesResult.rows[0]?.total);

  return {
    type: "costs",
    period: label,
    purchases: mapCostRows(purchasesResult.rows),
    summary: {
      totalPurchases,
      purchasesCount,
      averagePurchase,
      purchasesTrend: calculateTrendPercentage(
        totalPurchases,
        prevTotalPurchases
      ),
    },
  };
}

export async function getStandardReportData(
  client: PoolClient,
  type: StandardReportType,
  periodInfo: ReportPeriodInfo
): Promise<StandardReportData> {
  switch (type) {
    case "production":
      return getProductionReportData(client, periodInfo);
    case "sales":
      return getSalesReportData(client, periodInfo);
    case "inventory":
      return getInventoryReportData(client);
    case "costs":
      return getCostsReportData(client, periodInfo);
  }
}

export async function getExecutiveSummaryMetrics(
  client: PoolClient
): Promise<ExecutiveSummaryMetrics> {
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

  return {
    produccion: {
      total: parseInteger(row.produccion_total),
      variacion_porcentaje: 0,
      tendencia: "stable",
    },
    inventario: {
      total: parseInteger(row.inventario_total),
      items_bajo_stock: parseInteger(row.items_bajo_stock),
      variacion_porcentaje: 0,
      tendencia: "stable",
    },
    ventas: {
      total: parseAmount(row.ventas_total),
      variacion_porcentaje: 0,
      tendencia: "stable",
    },
    costos: {
      total: parseAmount(row.costos_total),
      variacion_porcentaje: 0,
      tendencia: "stable",
    },
    ordenes: {
      vencidas: parseInteger(row.ordenes_vencidas),
      en_riesgo: parseInteger(row.ordenes_en_riesgo),
    },
  };
}
