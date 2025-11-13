/**
 * Servicio de generación de reportes en formato PDF
 * Utiliza jsPDF y jspdf-autotable para crear documentos profesionales
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ReportHeader {
  title: string;
  subtitle?: string;
  period?: string;
  generatedAt?: Date;
}

interface TableColumn {
  header: string;
  dataKey: string;
  width?: number;
}

interface ReportSection {
  title: string;
  data: any[];
  columns: TableColumn[];
  summary?: Record<string, string | number>;
}

interface ChartData {
  title: string;
  labels: string[];
  values: number[];
}

/**
 * Clase base para generación de reportes PDF
 */
export class PDFGenerator {
  private doc: jsPDF;
  private currentY: number = 20;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number = 20;

  constructor() {
    this.doc = new jsPDF("p", "mm", "a4");
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
  }

  /**
   * Agrega el encabezado del reporte
   */
  addHeader(header: ReportHeader): void {
    // Logo o título de la empresa
    this.doc.setFontSize(20);
    this.doc.setFont("helvetica", "bold");
    this.doc.text("Sistema Industrial", this.margin, this.currentY);
    this.currentY += 10;

    // Título del reporte
    this.doc.setFontSize(16);
    this.doc.text(header.title, this.margin, this.currentY);
    this.currentY += 8;

    // Subtítulo
    if (header.subtitle) {
      this.doc.setFontSize(12);
      this.doc.setFont("helvetica", "normal");
      this.doc.text(header.subtitle, this.margin, this.currentY);
      this.currentY += 6;
    }

    // Periodo
    if (header.period) {
      this.doc.setFontSize(10);
      this.doc.setTextColor(100, 100, 100);
      this.doc.text(`Periodo: ${header.period}`, this.margin, this.currentY);
      this.currentY += 5;
    }

    // Fecha de generación
    const generatedAt = header.generatedAt || new Date();
    const formattedDate = format(generatedAt, "d 'de' MMMM 'de' yyyy, HH:mm", {
      locale: es,
    });
    this.doc.text(`Generado: ${formattedDate}`, this.margin, this.currentY);
    this.currentY += 10;

    // Línea separadora
    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(
      this.margin,
      this.currentY,
      this.pageWidth - this.margin,
      this.currentY
    );
    this.currentY += 10;

    // Reset colors
    this.doc.setTextColor(0, 0, 0);
  }

  /**
   * Agrega una sección con tabla
   */
  addTableSection(section: ReportSection): void {
    // Título de la sección
    this.doc.setFontSize(14);
    this.doc.setFont("helvetica", "bold");
    this.doc.text(section.title, this.margin, this.currentY);
    this.currentY += 8;

    // Generar tabla
    autoTable(this.doc, {
      startY: this.currentY,
      head: [section.columns.map((col) => col.header)],
      body: section.data.map((row) =>
        section.columns.map((col) => this.formatCellValue(row[col.dataKey]))
      ),
      theme: "striped",
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: "bold",
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      columnStyles: this.generateColumnStyles(section.columns),
      margin: { left: this.margin, right: this.margin },
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10;

    // Resumen si existe
    if (section.summary) {
      this.addSummary(section.summary);
    }
  }

  /**
   * Agrega un resumen al final de una sección
   */
  private addSummary(summary: Record<string, string | number>): void {
    this.doc.setFontSize(10);
    this.doc.setFont("helvetica", "bold");

    Object.entries(summary).forEach(([key, value]) => {
      const text = `${key}: ${this.formatCellValue(value)}`;
      this.doc.text(text, this.pageWidth - this.margin - 60, this.currentY, {
        align: "right",
      });
      this.currentY += 6;
    });

    this.currentY += 5;
  }

  /**
   * Agrega KPIs destacados
   */
  addKPIs(
    kpis: Array<{ label: string; value: string | number; trend?: string }>
  ): void {
    this.doc.setFontSize(12);
    this.doc.setFont("helvetica", "bold");
    this.doc.text("Indicadores Clave", this.margin, this.currentY);
    this.currentY += 8;

    const boxWidth = (this.pageWidth - 2 * this.margin - 20) / 3;
    const boxHeight = 25;
    let currentX = this.margin;

    kpis.forEach((kpi, index) => {
      if (index > 0 && index % 3 === 0) {
        this.currentY += boxHeight + 5;
        currentX = this.margin;
      }

      // Box
      this.doc.setDrawColor(200, 200, 200);
      this.doc.setFillColor(245, 245, 245);
      this.doc.rect(currentX, this.currentY, boxWidth, boxHeight, "FD");

      // Label
      this.doc.setFontSize(9);
      this.doc.setFont("helvetica", "normal");
      this.doc.setTextColor(100, 100, 100);
      this.doc.text(kpi.label, currentX + 5, this.currentY + 8);

      // Value
      this.doc.setFontSize(14);
      this.doc.setFont("helvetica", "bold");
      this.doc.setTextColor(0, 0, 0);
      this.doc.text(String(kpi.value), currentX + 5, this.currentY + 18);

      // Trend
      if (kpi.trend) {
        this.doc.setFontSize(9);
        if (kpi.trend.startsWith("+")) {
          this.doc.setTextColor(0, 150, 0);
        } else {
          this.doc.setTextColor(200, 0, 0);
        }
        this.doc.text(kpi.trend, currentX + boxWidth - 20, this.currentY + 18);
      }

      currentX += boxWidth + 10;
    });

    this.currentY += boxHeight + 15;
    this.doc.setTextColor(0, 0, 0);
  }

  /**
   * Agrega una página nueva
   */
  addPage(): void {
    this.doc.addPage();
    this.currentY = 20;
  }

  /**
   * Agrega pie de página con número de página
   */
  private addFooter(): void {
    const pageCount = this.doc.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      this.doc.setFontSize(8);
      this.doc.setTextColor(100, 100, 100);
      this.doc.text(
        `Página ${i} de ${pageCount}`,
        this.pageWidth / 2,
        this.pageHeight - 10,
        { align: "center" }
      );
    }
  }

  /**
   * Formatea valores de celdas
   */
  private formatCellValue(value: any): string {
    if (value === null || value === undefined) return "-";
    if (typeof value === "number") {
      return new Intl.NumberFormat("es-CO").format(value);
    }
    if (value instanceof Date) {
      return format(value, "dd/MM/yyyy", { locale: es });
    }
    return String(value);
  }

  /**
   * Genera estilos para columnas
   */
  private generateColumnStyles(columns: TableColumn[]): Record<number, any> {
    const styles: Record<number, any> = {};
    columns.forEach((col, index) => {
      if (col.width) {
        styles[index] = { cellWidth: col.width };
      }
    });
    return styles;
  }

  /**
   * Genera el documento y retorna como blob
   */
  generate(): Blob {
    this.addFooter();
    return this.doc.output("blob");
  }

  /**
   * Genera el documento y retorna como ArrayBuffer
   */
  generateBuffer(): ArrayBuffer {
    this.addFooter();
    return this.doc.output("arraybuffer");
  }

  /**
   * Descarga el documento
   */
  download(filename: string): void {
    this.addFooter();
    this.doc.save(filename);
  }
}

/**
 * Genera reporte de producción mensual
 */
export async function generateProductionReport(data: {
  period: string;
  orders: any[];
  summary: any;
}): Promise<Blob> {
  const generator = new PDFGenerator();

  generator.addHeader({
    title: "Reporte de Producción",
    subtitle: "Órdenes de Producción Completadas",
    period: data.period,
  });

  generator.addKPIs([
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

  generator.addTableSection({
    title: "Detalle de Órdenes",
    columns: [
      { header: "Orden", dataKey: "id", width: 20 },
      { header: "Producto", dataKey: "producto", width: 50 },
      { header: "Cantidad", dataKey: "cantidad", width: 30 },
      { header: "Estado", dataKey: "estado", width: 30 },
      { header: "Fecha", dataKey: "fecha", width: 30 },
    ],
    data: data.orders,
    summary: {
      "Total Órdenes": data.orders.length,
      "Total Unidades": data.summary.totalUnits,
    },
  });

  return generator.generate();
}

/**
 * Genera reporte de ventas
 */
export async function generateSalesReport(data: {
  period: string;
  sales: any[];
  summary: any;
}): Promise<Blob> {
  const generator = new PDFGenerator();

  generator.addHeader({
    title: "Reporte de Ventas",
    subtitle: "Análisis de Ventas por Periodo",
    period: data.period,
  });

  generator.addKPIs([
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

  generator.addTableSection({
    title: "Detalle de Ventas",
    columns: [
      { header: "ID", dataKey: "id", width: 20 },
      { header: "Cliente", dataKey: "cliente", width: 50 },
      { header: "Monto", dataKey: "monto", width: 30 },
      { header: "Estado", dataKey: "estado", width: 30 },
      { header: "Fecha", dataKey: "fecha", width: 30 },
    ],
    data: data.sales,
    summary: {
      "Total Ventas": data.sales.length,
      "Monto Total": `$${new Intl.NumberFormat("es-CO").format(data.summary.totalSales)}`,
    },
  });

  return generator.generate();
}

/**
 * Genera reporte de inventario
 */
export async function generateInventoryReport(data: {
  items: any[];
  summary: any;
}): Promise<Blob> {
  const generator = new PDFGenerator();

  generator.addHeader({
    title: "Reporte de Inventario",
    subtitle: "Estado Actual del Inventario",
  });

  generator.addKPIs([
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

  generator.addTableSection({
    title: "Detalle de Inventario",
    columns: [
      { header: "Código", dataKey: "codigo", width: 25 },
      { header: "Material", dataKey: "nombre", width: 60 },
      { header: "Cantidad", dataKey: "cantidad", width: 25 },
      { header: "Mínimo", dataKey: "minimo", width: 25 },
      { header: "Estado", dataKey: "estado", width: 25 },
    ],
    data: data.items,
  });

  return generator.generate();
}

/**
 * Genera reporte de costos
 */
export async function generateCostsReport(data: {
  period: string;
  purchases: any[];
  summary: any;
}): Promise<Blob> {
  const generator = new PDFGenerator();

  generator.addHeader({
    title: "Reporte de Costos",
    subtitle: "Análisis de Compras y Gastos",
    period: data.period,
  });

  generator.addKPIs([
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

  generator.addTableSection({
    title: "Detalle de Compras",
    columns: [
      { header: "ID", dataKey: "id", width: 20 },
      { header: "Proveedor", dataKey: "proveedor", width: 50 },
      { header: "Monto", dataKey: "monto", width: 30 },
      { header: "Estado", dataKey: "estado", width: 30 },
      { header: "Fecha", dataKey: "fecha", width: 30 },
    ],
    data: data.purchases,
    summary: {
      "Total Compras": data.purchases.length,
      "Monto Total": `$${new Intl.NumberFormat("es-CO").format(data.summary.totalPurchases)}`,
    },
  });

  return generator.generate();
}
