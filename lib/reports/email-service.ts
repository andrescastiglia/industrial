/**
 * Servicio de envío de reportes por email
 * Utiliza Nodemailer para enviar reportes automáticos
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import nodemailer, { Transporter } from "nodemailer";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { apiLogger } from "@/lib/logger";

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  requireTLS: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailAttachment {
  filename: string;
  content: Buffer | Blob;
  contentType: string;
}

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
}

interface ReportSchedule {
  type: "daily" | "weekly" | "monthly";
  recipients: string[];
  reports: ("production" | "sales" | "inventory" | "costs")[];
  time?: string; // HH:mm format
}

type ExecutiveTrend = "up" | "down" | "stable";

type ExecutiveMetric = {
  total?: number;
  variacion_porcentaje?: number;
  tendencia?: ExecutiveTrend;
  items_bajo_stock?: number;
};

type ExecutiveSummaryMetrics = {
  produccion?: ExecutiveMetric;
  inventario?: ExecutiveMetric;
  ventas?: ExecutiveMetric;
  costos?: ExecutiveMetric;
  ordenes?: {
    vencidas?: number;
    en_riesgo?: number;
  };
};

function formatSignedPercentage(value: number): string {
  return `${value > 0 ? "+" : ""}${value}%`;
}

function renderTrendMarkup(trend?: string | number): string {
  if (trend == null || trend === "" || trend === 0) {
    return "";
  }

  if (typeof trend === "string") {
    const trendClass = trend.startsWith("+") ? "trend-up" : "trend-down";
    return `<div class="${trendClass}">${trend}</div>`;
  }

  const trendClass = trend > 0 ? "trend-up" : "trend-down";
  return `<div class="${trendClass}">${formatSignedPercentage(trend)}</div>`;
}

function renderOptionalHtml(content?: string): string {
  return content || "";
}

function renderCriticalAlertDetails(details?: unknown): string {
  if (!details) {
    return "";
  }

  return `
    <div class="details">
      <h3>Detalles:</h3>
      <pre>${JSON.stringify(details, null, 2)}</pre>
    </div>
  `;
}

function renderExecutiveMetricCard(options: {
  label: string;
  value: string | number;
  trend?: string;
}): string {
  return `
    <div class="metric">
      <div class="metric-label">${options.label}</div>
      <div class="metric-value">${options.value}</div>
      ${renderOptionalHtml(options.trend)}
    </div>
  `;
}

function renderExecutiveMetricTrend(
  metric?: ExecutiveMetric,
  invertDirection?: boolean
): string {
  if (!metric?.tendencia) {
    return "";
  }

  const isUp = invertDirection
    ? metric.tendencia !== "up"
    : metric.tendencia === "up";
  const trendClass = isUp ? "up" : "down";
  const variation = metric.variacion_porcentaje || 0;

  return `<div class="trend trend-${trendClass}">${formatSignedPercentage(variation)}</div>`;
}

function renderInventoryStockAlert(metric?: ExecutiveMetric): string {
  if (!metric?.items_bajo_stock) {
    return "";
  }

  return `<div class="trend trend-down">${metric.items_bajo_stock} bajo stock</div>`;
}

function renderExecutiveAlerts(metrics: ExecutiveSummaryMetrics): string {
  const alertItems: string[] = [];
  const vencidas = metrics.ordenes?.vencidas || 0;
  const enRiesgo = metrics.ordenes?.en_riesgo || 0;

  if (vencidas > 0) {
    alertItems.push(`<li>${vencidas} órdenes vencidas</li>`);
  }

  if (enRiesgo > 0) {
    alertItems.push(`<li>${enRiesgo} órdenes en riesgo</li>`);
  }

  if (alertItems.length === 0) {
    return "";
  }

  return `
    <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107;">
      <strong>⚠️ Alertas:</strong>
      <ul>
        ${alertItems.join("")}
      </ul>
    </div>
  `;
}

/**
 * Clase para gestionar el envío de emails
 */
export class EmailService {
  private transporter: Transporter | null = null;
  private config: EmailConfig | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private getCaptureDirectory(): string | null {
    return process.env.EMAIL_CAPTURE_DIR || null;
  }

  private isCaptureModeEnabled(): boolean {
    return Boolean(this.getCaptureDirectory());
  }

  private async normalizeAttachmentContent(content: Buffer | Blob) {
    if (content instanceof Blob) {
      return Buffer.from(await content.arrayBuffer());
    }

    return content;
  }

  private async captureEmail(options: EmailOptions): Promise<boolean> {
    const captureDirectory = this.getCaptureDirectory();
    if (!captureDirectory) {
      return false;
    }

    const messageId = `${Date.now()}-${randomUUID()}`;
    const messageDirectory = path.join(captureDirectory, messageId);

    await mkdir(messageDirectory, { recursive: true });

    const attachments = await Promise.all(
      (options.attachments || []).map(async (attachment) => {
        const content = await this.normalizeAttachmentContent(
          attachment.content
        );
        const filePath = path.join(messageDirectory, attachment.filename);

        await writeFile(filePath, content);

        return {
          filename: attachment.filename,
          contentType: attachment.contentType,
          size: content.length,
        };
      })
    );

    const manifest = {
      id: messageId,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text || null,
      attachments,
    };

    await writeFile(
      path.join(messageDirectory, "message.json"),
      JSON.stringify(manifest, null, 2)
    );

    apiLogger.info("Email capturado en disco para testing", {
      messageId,
      recipients: manifest.to,
    });

    return true;
  }

  /**
   * Inicializa el transporter de nodemailer
   */
  private initializeTransporter(): void {
    try {
      if (this.isCaptureModeEnabled()) {
        apiLogger.info("Email capture mode enabled");
        return;
      }

      // Configuración desde variables de entorno
      const smtpUser = process.env.SMTP_USER || "";
      const smtpPass = process.env.SMTP_PASS || "";
      const secureTransport = process.env.SMTP_SECURE !== "false";
      const defaultPort = secureTransport ? "465" : "587";
      const config: EmailConfig = {
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT || defaultPort, 10),
        secure: secureTransport,
        requireTLS: true,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      };

      // Validar configuración
      if (!config.auth.user || !config.auth.pass) {
        apiLogger.warn(
          "SMTP credentials not configured. Email service disabled."
        );
        return;
      }

      if (!config.secure) {
        apiLogger.warn(
          "SMTP insecure transport is disabled. Enable SMTPS or use capture mode."
        );
        return;
      }

      this.config = config;
      this.transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: true,
        requireTLS: true,
        auth: config.auth,
      });

      apiLogger.info("Email service initialized successfully");
    } catch (error: any) {
      apiLogger.error("Failed to initialize email service", {
        error: error as Error,
      });
    }
  }

  /**
   * Verifica la conexión con el servidor SMTP
   */
  async verifyConnection(): Promise<boolean> {
    if (this.isCaptureModeEnabled()) {
      return true;
    }

    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      apiLogger.info("Email connection verified");
      return true;
    } catch (error) {
      apiLogger.error("Email connection verification failed", {
        error: error as Error,
      });
      return false;
    }
  }

  /**
   * Envía un email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (this.isCaptureModeEnabled()) {
      return this.captureEmail(options);
    }

    if (!this.transporter) {
      apiLogger.error("Email service not initialized");
      return false;
    }

    try {
      const recipients = Array.isArray(options.to)
        ? options.to.join(", ")
        : options.to;

      // Convertir Blob a Buffer si es necesario
      const attachments = options.attachments
        ? await Promise.all(
            options.attachments.map(async (att) => ({
              filename: att.filename,
              content: await this.normalizeAttachmentContent(att.content),
              contentType: att.contentType,
            }))
          )
        : undefined;

      const info = await this.transporter.sendMail({
        from: `"Sistema Industrial" <${this.config?.auth.user}>`,
        to: recipients,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments,
      });

      apiLogger.info("Email sent successfully", {
        messageId: info.messageId,
        recipients,
      });

      return true;
    } catch (error: any) {
      apiLogger.error("Failed to send email", { error: error as Error });
      return false;
    }
  }

  /**
   * Envía reporte de producción por email
   */
  async sendProductionReport(
    recipients: string[],
    pdfBuffer: Buffer,
    excelBuffer: Buffer,
    summary: any
  ): Promise<boolean> {
    const today = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2980b9; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f5f5f5; }
            .kpi { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #2980b9; }
            .kpi-label { font-size: 12px; color: #666; }
            .kpi-value { font-size: 24px; font-weight: bold; color: #2980b9; }
            .trend-up { color: #27ae60; }
            .trend-down { color: #e74c3c; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Reporte de Producción</h1>
              <p>${today}</p>
            </div>
            <div class="content">
              <p>Estimado equipo,</p>
              <p>Adjunto encontrará el reporte de producción con el resumen de las órdenes completadas.</p>
              
              <div class="kpi">
                <div class="kpi-label">Total de Órdenes</div>
                <div class="kpi-value">${summary.totalOrders}</div>
                ${renderTrendMarkup(summary.trend)}
              </div>
              
              <div class="kpi">
                <div class="kpi-label">Unidades Producidas</div>
                <div class="kpi-value">${new Intl.NumberFormat("es-CO").format(summary.totalUnits)}</div>
              </div>
              
              <div class="kpi">
                <div class="kpi-label">Tasa de Cumplimiento</div>
                <div class="kpi-value">${summary.completionRate}%</div>
              </div>
              
              <p><strong>Archivos adjuntos:</strong></p>
              <ul>
                <li>Reporte_Produccion.pdf - Vista ejecutiva del reporte</li>
                <li>Reporte_Produccion.xlsx - Datos completos con fórmulas</li>
              </ul>
            </div>
            <div class="footer">
              <p>Este es un mensaje automático generado por el Sistema Industrial.</p>
              <p>Por favor no responder a este correo.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return await this.sendEmail({
      to: recipients,
      subject: `Reporte de Producción - ${today}`,
      html,
      attachments: [
        {
          filename: "Reporte_Produccion.pdf",
          content: pdfBuffer,
          contentType: "application/pdf",
        },
        {
          filename: "Reporte_Produccion.xlsx",
          content: excelBuffer,
          contentType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      ],
    });
  }

  /**
   * Envía reporte de ventas por email
   */
  async sendSalesReport(
    recipients: string[],
    pdfBuffer: Buffer,
    excelBuffer: Buffer,
    summary: any
  ): Promise<boolean> {
    const today = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #27ae60; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f5f5f5; }
            .kpi { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #27ae60; }
            .kpi-label { font-size: 12px; color: #666; }
            .kpi-value { font-size: 24px; font-weight: bold; color: #27ae60; }
            .trend-up { color: #27ae60; }
            .trend-down { color: #e74c3c; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Reporte de Ventas</h1>
              <p>${today}</p>
            </div>
            <div class="content">
              <p>Estimado equipo,</p>
              <p>Adjunto encontrará el reporte de ventas con el análisis del periodo.</p>
              
              <div class="kpi">
                <div class="kpi-label">Ventas Totales</div>
                <div class="kpi-value">$${new Intl.NumberFormat("es-CO").format(summary.totalSales)}</div>
                ${renderTrendMarkup(summary.salesTrend)}
              </div>
              
              <div class="kpi">
                <div class="kpi-label">Cantidad de Ventas</div>
                <div class="kpi-value">${summary.salesCount}</div>
              </div>
              
              <div class="kpi">
                <div class="kpi-label">Ticket Promedio</div>
                <div class="kpi-value">$${new Intl.NumberFormat("es-CO").format(summary.averageTicket)}</div>
              </div>
              
              <p><strong>Archivos adjuntos:</strong></p>
              <ul>
                <li>Reporte_Ventas.pdf - Vista ejecutiva del reporte</li>
                <li>Reporte_Ventas.xlsx - Datos completos con fórmulas</li>
              </ul>
            </div>
            <div class="footer">
              <p>Este es un mensaje automático generado por el Sistema Industrial.</p>
              <p>Por favor no responder a este correo.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return await this.sendEmail({
      to: recipients,
      subject: `Reporte de Ventas - ${today}`,
      html,
      attachments: [
        {
          filename: "Reporte_Ventas.pdf",
          content: pdfBuffer,
          contentType: "application/pdf",
        },
        {
          filename: "Reporte_Ventas.xlsx",
          content: excelBuffer,
          contentType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      ],
    });
  }

  async sendInventoryReport(
    recipients: string[],
    pdfBuffer: Buffer,
    excelBuffer: Buffer,
    summary: {
      totalItems: number;
      lowStockItems: number;
    }
  ): Promise<boolean> {
    const today = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #0f766e; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f5f5f5; }
            .kpi { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #0f766e; }
            .kpi-label { font-size: 12px; color: #666; }
            .kpi-value { font-size: 24px; font-weight: bold; color: #0f766e; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Reporte de Inventario</h1>
              <p>${today}</p>
            </div>
            <div class="content">
              <p>Adjunto encontrará el estado consolidado del inventario del sistema.</p>
              <div class="kpi">
                <div class="kpi-label">Items inventariados</div>
                <div class="kpi-value">${summary.totalItems}</div>
              </div>
              <div class="kpi">
                <div class="kpi-label">Items bajo stock</div>
                <div class="kpi-value">${summary.lowStockItems}</div>
              </div>
            </div>
            <div class="footer">
              <p>Este es un mensaje automático generado por el Sistema Industrial.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: recipients,
      subject: `Reporte de Inventario - ${today}`,
      html,
      attachments: [
        {
          filename: "Reporte_Inventario.pdf",
          content: pdfBuffer,
          contentType: "application/pdf",
        },
        {
          filename: "Reporte_Inventario.xlsx",
          content: excelBuffer,
          contentType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      ],
    });
  }

  async sendCostsReport(
    recipients: string[],
    pdfBuffer: Buffer,
    excelBuffer: Buffer,
    summary: {
      totalPurchases: number;
      purchasesCount: number;
      averagePurchase: number;
      purchasesTrend: number;
    }
  ): Promise<boolean> {
    const today = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #b45309; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f5f5f5; }
            .kpi { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #b45309; }
            .kpi-label { font-size: 12px; color: #666; }
            .kpi-value { font-size: 24px; font-weight: bold; color: #b45309; }
            .trend { font-size: 12px; color: #666; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Reporte de Costos</h1>
              <p>${today}</p>
            </div>
            <div class="content">
              <p>Adjunto encontrará el consolidado de compras y costos del período.</p>
              <div class="kpi">
                <div class="kpi-label">Compras totales</div>
                <div class="kpi-value">$${new Intl.NumberFormat("es-CO").format(summary.totalPurchases)}</div>
                <div class="trend">${summary.purchasesTrend > 0 ? "+" : ""}${summary.purchasesTrend}% vs periodo anterior</div>
              </div>
              <div class="kpi">
                <div class="kpi-label">Cantidad de compras</div>
                <div class="kpi-value">${summary.purchasesCount}</div>
              </div>
              <div class="kpi">
                <div class="kpi-label">Compra promedio</div>
                <div class="kpi-value">$${new Intl.NumberFormat("es-CO").format(summary.averagePurchase)}</div>
              </div>
            </div>
            <div class="footer">
              <p>Este es un mensaje automático generado por el Sistema Industrial.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: recipients,
      subject: `Reporte de Costos - ${today}`,
      html,
      attachments: [
        {
          filename: "Reporte_Costos.pdf",
          content: pdfBuffer,
          contentType: "application/pdf",
        },
        {
          filename: "Reporte_Costos.xlsx",
          content: excelBuffer,
          contentType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      ],
    });
  }

  /**
   * Envía alerta crítica por email
   */
  async sendCriticalAlert(
    recipients: string[],
    alertType: string,
    alertMessage: string,
    details?: any
  ): Promise<boolean> {
    const now = format(new Date(), "d 'de' MMMM 'de' yyyy, HH:mm", {
      locale: es,
    });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #e74c3c; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f5f5f5; }
            .alert { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #e74c3c; }
            .alert-type { font-size: 16px; font-weight: bold; color: #e74c3c; }
            .alert-message { font-size: 14px; margin: 10px 0; }
            .details { background: #fff; padding: 10px; margin: 10px 0; border: 1px solid #ddd; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ Alerta Crítica</h1>
              <p>${now}</p>
            </div>
            <div class="content">
              <div class="alert">
                <div class="alert-type">${alertType}</div>
                <div class="alert-message">${alertMessage}</div>
              </div>
              
              ${renderCriticalAlertDetails(details)}
              
              <p><strong>Acción requerida:</strong> Por favor revise el sistema y tome las medidas necesarias.</p>
            </div>
            <div class="footer">
              <p>Este es un mensaje automático generado por el Sistema Industrial.</p>
              <p>Por favor responda con las acciones tomadas.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return await this.sendEmail({
      to: recipients,
      subject: `🚨 ALERTA CRÍTICA: ${alertType}`,
      html,
    });
  }

  /**
   * Envía resumen ejecutivo por email
   */
  async sendExecutiveSummary(
    recipients: string[],
    metrics: ExecutiveSummaryMetrics,
    period: string
  ): Promise<boolean> {
    const today = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #8e44ad; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f5f5f5; }
            .metrics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .metric { background: white; padding: 15px; border-left: 4px solid #8e44ad; }
            .metric-label { font-size: 12px; color: #666; }
            .metric-value { font-size: 20px; font-weight: bold; color: #8e44ad; margin: 5px 0; }
            .trend { font-size: 12px; }
            .trend-up { color: #27ae60; }
            .trend-down { color: #e74c3c; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Resumen Ejecutivo</h1>
              <p>${period}</p>
              <p>${today}</p>
            </div>
            <div class="content">
              <p>Estimado equipo ejecutivo,</p>
              <p>A continuación el resumen de los indicadores clave del negocio:</p>
              
              <div class="metrics-grid">
                ${renderExecutiveMetricCard({
                  label: "Producción",
                  value: metrics.produccion?.total || 0,
                  trend: renderExecutiveMetricTrend(metrics.produccion),
                })}
                ${renderExecutiveMetricCard({
                  label: "Inventario",
                  value: metrics.inventario?.total || 0,
                  trend: renderInventoryStockAlert(metrics.inventario),
                })}
                ${renderExecutiveMetricCard({
                  label: "Ventas",
                  value: `$${new Intl.NumberFormat("es-CO").format(metrics.ventas?.total || 0)}`,
                  trend: renderExecutiveMetricTrend(metrics.ventas),
                })}
                ${renderExecutiveMetricCard({
                  label: "Costos",
                  value: `$${new Intl.NumberFormat("es-CO").format(metrics.costos?.total || 0)}`,
                  trend: renderExecutiveMetricTrend(metrics.costos, true),
                })}
              </div>
              
              ${renderExecutiveAlerts(metrics)}
            </div>
            <div class="footer">
              <p>Este es un mensaje automático generado por el Sistema Industrial.</p>
              <p>Para más detalles, acceda al dashboard ejecutivo.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return await this.sendEmail({
      to: recipients,
      subject: `Resumen Ejecutivo - ${period}`,
      html,
    });
  }
}

// Instancia singleton del servicio
export const emailService = new EmailService();
