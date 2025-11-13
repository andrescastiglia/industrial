/**
 * Servicio de envío de reportes por email
 * Utiliza Nodemailer para enviar reportes automáticos
 */

import nodemailer, { Transporter } from "nodemailer";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { apiLogger } from "@/lib/logger";

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
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

/**
 * Clase para gestionar el envío de emails
 */
export class EmailService {
  private transporter: Transporter | null = null;
  private config: EmailConfig | null = null;

  constructor() {
    this.initializeTransporter();
  }

  /**
   * Inicializa el transporter de nodemailer
   */
  private initializeTransporter(): void {
    try {
      // Configuración desde variables de entorno
      const config: EmailConfig = {
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER || "",
          pass: process.env.SMTP_PASS || "",
        },
      };

      // Validar configuración
      if (!config.auth.user || !config.auth.pass) {
        apiLogger.warn(
          "SMTP credentials not configured. Email service disabled."
        );
        return;
      }

      this.config = config;
      this.transporter = nodemailer.createTransport(config as any);

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
    if (!this.transporter) {
      apiLogger.error("Email service not initialized");
      return false;
    }

    try {
      const recipients = Array.isArray(options.to)
        ? options.to.join(", ")
        : options.to;

      // Convertir Blob a Buffer si es necesario
      const attachments = options.attachments?.map((att) => ({
        filename: att.filename,
        content:
          att.content instanceof Blob
            ? Buffer.from(att.content as any)
            : att.content,
        contentType: att.contentType,
      }));

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
                ${summary.trend ? `<div class="${summary.trend.startsWith("+") ? "trend-up" : "trend-down"}">${summary.trend}</div>` : ""}
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
                ${summary.salesTrend ? `<div class="${summary.salesTrend > 0 ? "trend-up" : "trend-down"}">${summary.salesTrend > 0 ? "+" : ""}${summary.salesTrend}%</div>` : ""}
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
              
              ${
                details
                  ? `
                <div class="details">
                  <h3>Detalles:</h3>
                  <pre>${JSON.stringify(details, null, 2)}</pre>
                </div>
              `
                  : ""
              }
              
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
    metrics: any,
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
                <div class="metric">
                  <div class="metric-label">Producción</div>
                  <div class="metric-value">${metrics.produccion?.total || 0}</div>
                  ${metrics.produccion?.tendencia ? `<div class="trend trend-${metrics.produccion.tendencia === "up" ? "up" : "down"}">${metrics.produccion.variacion_porcentaje > 0 ? "+" : ""}${metrics.produccion.variacion_porcentaje}%</div>` : ""}
                </div>
                
                <div class="metric">
                  <div class="metric-label">Inventario</div>
                  <div class="metric-value">${metrics.inventario?.total || 0}</div>
                  ${metrics.inventario?.items_bajo_stock ? `<div class="trend trend-down">${metrics.inventario.items_bajo_stock} bajo stock</div>` : ""}
                </div>
                
                <div class="metric">
                  <div class="metric-label">Ventas</div>
                  <div class="metric-value">$${new Intl.NumberFormat("es-CO").format(metrics.ventas?.total || 0)}</div>
                  ${metrics.ventas?.tendencia ? `<div class="trend trend-${metrics.ventas.tendencia === "up" ? "up" : "down"}">${metrics.ventas.variacion_porcentaje > 0 ? "+" : ""}${metrics.ventas.variacion_porcentaje}%</div>` : ""}
                </div>
                
                <div class="metric">
                  <div class="metric-label">Costos</div>
                  <div class="metric-value">$${new Intl.NumberFormat("es-CO").format(metrics.costos?.total || 0)}</div>
                  ${metrics.costos?.tendencia ? `<div class="trend trend-${metrics.costos.tendencia === "up" ? "down" : "up"}">${metrics.costos.variacion_porcentaje > 0 ? "+" : ""}${metrics.costos.variacion_porcentaje}%</div>` : ""}
                </div>
              </div>
              
              ${
                metrics.ordenes?.vencidas > 0 || metrics.ordenes?.en_riesgo > 0
                  ? `
                <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107;">
                  <strong>⚠️ Alertas:</strong>
                  <ul>
                    ${metrics.ordenes.vencidas > 0 ? `<li>${metrics.ordenes.vencidas} órdenes vencidas</li>` : ""}
                    ${metrics.ordenes.en_riesgo > 0 ? `<li>${metrics.ordenes.en_riesgo} órdenes en riesgo</li>` : ""}
                  </ul>
                </div>
              `
                  : ""
              }
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
