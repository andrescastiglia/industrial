/**
 * Servicio de generación de reportes en formato Excel
 * Utiliza ExcelJS para crear hojas de cálculo con fórmulas y formato
 */

import ExcelJS from "exceljs";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type TableOptions = {
  autoFilter?: boolean;
  totals?: boolean;
  formatColumns?: Record<number, string>;
};

/**
 * Clase base para generación de reportes Excel
 */
export class ExcelGenerator {
  private workbook: ExcelJS.Workbook;
  private worksheet: ExcelJS.Worksheet | null = null;

  constructor() {
    this.workbook = new ExcelJS.Workbook();
    this.workbook.creator = "Sistema Industrial";
    this.workbook.created = new Date();
  }

  /**
   * Crea una nueva hoja
   */
  createSheet(name: string): ExcelJS.Worksheet {
    this.worksheet = this.workbook.addWorksheet(name);
    return this.worksheet;
  }

  /**
   * Agrega encabezado al reporte
   */
  addHeader(
    sheet: ExcelJS.Worksheet,
    title: string,
    subtitle?: string,
    period?: string
  ): void {
    // Título principal
    sheet.mergeCells("A1:F1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = title;
    titleCell.font = { size: 18, bold: true, color: { argb: "FF2980B9" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(1).height = 30;

    // Subtítulo
    if (subtitle) {
      sheet.mergeCells("A2:F2");
      const subtitleCell = sheet.getCell("A2");
      subtitleCell.value = subtitle;
      subtitleCell.font = { size: 12, italic: true };
      subtitleCell.alignment = { horizontal: "center" };
      sheet.getRow(2).height = 20;
    }

    // Periodo y fecha
    const infoRow = subtitle ? 3 : 2;
    sheet.mergeCells(`A${infoRow}:C${infoRow}`);
    const periodCell = sheet.getCell(`A${infoRow}`);
    periodCell.value = period ? `Periodo: ${period}` : "";
    periodCell.font = { size: 10 };

    sheet.mergeCells(`D${infoRow}:F${infoRow}`);
    const dateCell = sheet.getCell(`D${infoRow}`);
    dateCell.value = `Generado: ${format(new Date(), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}`;
    dateCell.font = { size: 10 };
    dateCell.alignment = { horizontal: "right" };
  }

  /**
   * Agrega tabla con datos
   */
  addTable(
    sheet: ExcelJS.Worksheet,
    startRow: number,
    headers: string[],
    data: any[][],
    options?: TableOptions
  ): void {
    this.addTableHeaders(sheet, startRow, headers);
    this.addTableRows(sheet, startRow, data, options);
    this.autoSizeColumns(sheet, headers, data);

    if (options?.autoFilter) {
      sheet.autoFilter = {
        from: { row: startRow, column: 1 },
        to: { row: startRow + data.length, column: headers.length },
      };
    }

    if (options?.totals) {
      this.addTotalsRow(sheet, startRow, headers, data, options);
    }
  }

  private addTableHeaders(
    sheet: ExcelJS.Worksheet,
    startRow: number,
    headers: string[]
  ): void {
    const headerRow = sheet.getRow(startRow);

    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = this.createFill("FF2980B9");
      cell.alignment = { horizontal: "center", vertical: "middle" };
      this.applyBorder(cell);
    });

    headerRow.height = 25;
  }

  private addTableRows(
    sheet: ExcelJS.Worksheet,
    startRow: number,
    data: any[][],
    options?: TableOptions
  ): void {
    data.forEach((row, rowIndex) => {
      const dataRow = sheet.getRow(startRow + rowIndex + 1);
      const isAlternateRow = rowIndex % 2 === 0;

      row.forEach((value, colIndex) => {
        const cell = dataRow.getCell(colIndex + 1);
        cell.value = value;
        this.applyBorder(cell);

        const columnFormat = options?.formatColumns?.[colIndex];
        if (columnFormat) {
          cell.numFmt = columnFormat;
        }

        if (isAlternateRow) {
          cell.fill = this.createFill("FFF5F5F5");
        }
      });
    });
  }

  private autoSizeColumns(
    sheet: ExcelJS.Worksheet,
    headers: string[],
    data: any[][]
  ): void {
    headers.forEach((header, index) => {
      const column = sheet.getColumn(index + 1);
      const maxLength = data.reduce((currentMax, row) => {
        return Math.max(currentMax, String(row[index] || "").length);
      }, header.length);

      column.width = Math.min(Math.max(maxLength + 2, 10), 50);
    });
  }

  private addTotalsRow(
    sheet: ExcelJS.Worksheet,
    startRow: number,
    headers: string[],
    data: any[][],
    options?: TableOptions
  ): void {
    const totalsRow = sheet.getRow(startRow + data.length + 1);
    totalsRow.getCell(1).value = "TOTAL";

    headers.forEach((_, colIndex) => {
      const cell = totalsRow.getCell(colIndex + 1);
      const sampleValue = data[0]?.[colIndex];

      cell.fill = this.createFill("FFE0E0E0");
      cell.font = { bold: true };
      this.applyBorder(cell);

      if (typeof sampleValue !== "number") {
        return;
      }

      cell.value = {
        formula: this.getTotalsFormula(
          sheet,
          colIndex + 1,
          startRow + 1,
          startRow + data.length
        ),
      };

      const columnFormat = options?.formatColumns?.[colIndex];
      if (columnFormat) {
        cell.numFmt = columnFormat;
      }
    });
  }

  private getTotalsFormula(
    sheet: ExcelJS.Worksheet,
    columnIndex: number,
    firstRow: number,
    lastRow: number
  ): string {
    const columnLetter = sheet.getColumn(columnIndex).letter;
    return `SUM(${columnLetter}${firstRow}:${columnLetter}${lastRow})`;
  }

  private createFill(color: string): ExcelJS.FillPattern {
    return {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: color },
    };
  }

  private applyBorder(cell: ExcelJS.Cell): void {
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  }

  /**
   * Agrega KPIs en formato de tarjetas
   */
  addKPIs(
    sheet: ExcelJS.Worksheet,
    startRow: number,
    kpis: Array<{ label: string; value: string | number; trend?: string }>
  ): void {
    const kpiStartCol = 1;
    const kpiWidth = 2;

    kpis.forEach((kpi, index) => {
      const col = kpiStartCol + index * kpiWidth;
      const row = startRow;

      // Merge cells para la tarjeta
      sheet.mergeCells(row, col, row + 1, col + kpiWidth - 1);

      // Label
      const labelCell = sheet.getCell(row, col);
      labelCell.value = kpi.label;
      labelCell.font = { size: 10, color: { argb: "FF666666" } };
      labelCell.alignment = { horizontal: "center", vertical: "top" };
      labelCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF5F5F5" },
      };
      labelCell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };

      // Value (next row)
      const valueCell = sheet.getCell(row + 2, col);
      valueCell.value = kpi.value;
      valueCell.font = { size: 14, bold: true };
      valueCell.alignment = { horizontal: "center", vertical: "middle" };
      valueCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF5F5F5" },
      };
      valueCell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };

      sheet.mergeCells(row + 2, col, row + 2, col + kpiWidth - 1);

      // Trend (if exists)
      if (kpi.trend) {
        const trendCell = sheet.getCell(row + 3, col);
        trendCell.value = kpi.trend;
        trendCell.font = {
          size: 10,
          color: {
            argb: kpi.trend.startsWith("+") ? "FF00AA00" : "FFCC0000",
          },
        };
        trendCell.alignment = { horizontal: "center", vertical: "middle" };
        trendCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF5F5F5" },
        };
        trendCell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        sheet.mergeCells(row + 3, col, row + 3, col + kpiWidth - 1);
      }

      sheet.getRow(row).height = 20;
      sheet.getRow(row + 2).height = 25;
      if (kpi.trend) {
        sheet.getRow(row + 3).height = 20;
      }
    });
  }

  /**
   * Genera el archivo y retorna como buffer
   */
  async generate(): Promise<any> {
    return await this.workbook.xlsx.writeBuffer();
  }

  /**
   * Genera el archivo y retorna como Blob
   */
  async generateBlob(): Promise<Blob> {
    const buffer: any = await this.generate();
    return new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  }
}

/**
 * Genera reporte de producción en Excel
 */
export async function generateProductionExcel(data: {
  period: string;
  orders: any[];
  summary: any;
}): Promise<Buffer> {
  const generator = new ExcelGenerator();
  const sheet = generator.createSheet("Producción");

  generator.addHeader(
    sheet,
    "Reporte de Producción",
    "Órdenes Completadas",
    data.period
  );

  generator.addKPIs(sheet, 5, [
    {
      label: "Total Órdenes",
      value: data.summary.totalOrders,
      trend: data.summary.trend,
    },
    {
      label: "Unidades Producidas",
      value: data.summary.totalUnits,
    },
    {
      label: "Tasa de Cumplimiento",
      value: `${data.summary.completionRate}%`,
      trend: `${data.summary.completionTrend > 0 ? "+" : ""}${data.summary.completionTrend}%`,
    },
  ]);

  const tableData = data.orders.map((order) => [
    order.id,
    order.producto,
    order.cantidad,
    order.estado,
    format(new Date(order.fecha), "dd/MM/yyyy", { locale: es }),
  ]);

  generator.addTable(
    sheet,
    10,
    ["Orden", "Producto", "Cantidad", "Estado", "Fecha"],
    tableData,
    {
      autoFilter: true,
      totals: true,
      formatColumns: {
        2: "#,##0", // Cantidad
      },
    }
  );

  return await generator.generate();
}

/**
 * Genera reporte de ventas en Excel
 */
export async function generateSalesExcel(data: {
  period: string;
  sales: any[];
  summary: any;
}): Promise<Buffer> {
  const generator = new ExcelGenerator();
  const sheet = generator.createSheet("Ventas");

  generator.addHeader(
    sheet,
    "Reporte de Ventas",
    "Análisis de Ventas",
    data.period
  );

  generator.addKPIs(sheet, 5, [
    {
      label: "Ventas Totales",
      value: `$${new Intl.NumberFormat("es-CO").format(data.summary.totalSales)}`,
      trend: `${data.summary.salesTrend > 0 ? "+" : ""}${data.summary.salesTrend}%`,
    },
    {
      label: "Cantidad de Ventas",
      value: data.summary.salesCount,
    },
    {
      label: "Ticket Promedio",
      value: `$${new Intl.NumberFormat("es-CO").format(data.summary.averageTicket)}`,
    },
  ]);

  const tableData = data.sales.map((sale) => [
    sale.id,
    sale.cliente,
    sale.monto,
    sale.estado,
    format(new Date(sale.fecha), "dd/MM/yyyy", { locale: es }),
  ]);

  generator.addTable(
    sheet,
    10,
    ["ID", "Cliente", "Monto", "Estado", "Fecha"],
    tableData,
    {
      autoFilter: true,
      totals: true,
      formatColumns: {
        2: "$#,##0.00", // Monto
      },
    }
  );

  return await generator.generate();
}

/**
 * Genera reporte de inventario en Excel
 */
export async function generateInventoryExcel(data: {
  items: any[];
  summary: any;
}): Promise<Buffer> {
  const generator = new ExcelGenerator();
  const sheet = generator.createSheet("Inventario");

  generator.addHeader(sheet, "Reporte de Inventario", "Estado Actual");

  generator.addKPIs(sheet, 5, [
    {
      label: "Total Items",
      value: data.summary.totalItems,
    },
    {
      label: "Items Bajo Stock",
      value: data.summary.lowStockItems,
    },
    {
      label: "Valor Total",
      value: `$${new Intl.NumberFormat("es-CO").format(data.summary.totalValue)}`,
    },
  ]);

  const tableData = data.items.map((item) => [
    item.codigo,
    item.nombre,
    item.cantidad,
    item.minimo,
    item.estado,
  ]);

  generator.addTable(
    sheet,
    10,
    ["Código", "Material", "Cantidad", "Mínimo", "Estado"],
    tableData,
    {
      autoFilter: true,
      formatColumns: {
        2: "#,##0", // Cantidad
        3: "#,##0", // Mínimo
      },
    }
  );

  return await generator.generate();
}

/**
 * Genera reporte de costos en Excel
 */
export async function generateCostsExcel(data: {
  period: string;
  purchases: any[];
  summary: any;
}): Promise<Buffer> {
  const generator = new ExcelGenerator();
  const sheet = generator.createSheet("Costos");

  generator.addHeader(
    sheet,
    "Reporte de Costos",
    "Análisis de Compras",
    data.period
  );

  generator.addKPIs(sheet, 5, [
    {
      label: "Total Compras",
      value: `$${new Intl.NumberFormat("es-CO").format(data.summary.totalPurchases)}`,
      trend: `${data.summary.purchasesTrend > 0 ? "+" : ""}${data.summary.purchasesTrend}%`,
    },
    {
      label: "Cantidad de Compras",
      value: data.summary.purchasesCount,
    },
    {
      label: "Compra Promedio",
      value: `$${new Intl.NumberFormat("es-CO").format(data.summary.averagePurchase)}`,
    },
  ]);

  const tableData = data.purchases.map((purchase) => [
    purchase.id,
    purchase.proveedor,
    purchase.monto,
    purchase.estado,
    format(new Date(purchase.fecha), "dd/MM/yyyy", { locale: es }),
  ]);

  generator.addTable(
    sheet,
    10,
    ["ID", "Proveedor", "Monto", "Estado", "Fecha"],
    tableData,
    {
      autoFilter: true,
      totals: true,
      formatColumns: {
        2: "$#,##0.00", // Monto
      },
    }
  );

  return await generator.generate();
}
