/**
 * API endpoint para enviar reportes por email
 * POST /api/reports/email
 */

import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { es } from "date-fns/locale";
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
  createReportPeriodInfo,
  getExecutiveSummaryMetrics,
  getStandardReportData,
  type StandardReportData,
  type StandardReportType,
} from "@/lib/reports/report-data";

export const dynamic = "force-dynamic";

interface SendReportRequest {
  type: StandardReportType | "executive-summary" | "critical-alert";
  recipients: string[];
  period?: string;
  alertType?: string;
  alertMessage?: string;
  alertDetails?: any;
}

function validateSendReportRequest(body: SendReportRequest): string | null {
  if (!body.type || !body.recipients || body.recipients.length === 0) {
    return "Parámetros inválidos";
  }

  if (
    body.type === "critical-alert" &&
    (!body.alertType || !body.alertMessage)
  ) {
    return "Faltan parámetros para alerta crítica";
  }

  return null;
}

function buildPdfReport(reportData: StandardReportData): Promise<Blob> {
  switch (reportData.type) {
    case "production":
      return generateProductionReport(reportData);
    case "sales":
      return generateSalesReport(reportData);
    case "inventory":
      return generateInventoryReport(reportData);
    case "costs":
      return generateCostsReport(reportData);
  }
}

function buildExcelReport(reportData: StandardReportData): Promise<Buffer> {
  switch (reportData.type) {
    case "production":
      return generateProductionExcel(reportData);
    case "sales":
      return generateSalesExcel(reportData);
    case "inventory":
      return generateInventoryExcel(reportData);
    case "costs":
      return generateCostsExcel(reportData);
  }
}

async function sendStandardEmailReport(
  type: StandardReportType,
  recipients: string[],
  periodParam?: string
) {
  const client = await pool.connect();

  try {
    const periodInfo = createReportPeriodInfo(periodParam);
    const reportData = await getStandardReportData(client, type, periodInfo);
    const pdfBlob = await buildPdfReport(reportData);
    const excelBuffer = await buildExcelReport(reportData);
    const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());

    switch (reportData.type) {
      case "production":
        return emailService.sendProductionReport(
          recipients,
          pdfBuffer,
          excelBuffer,
          reportData.summary
        );
      case "sales":
        return emailService.sendSalesReport(
          recipients,
          pdfBuffer,
          excelBuffer,
          reportData.summary
        );
      case "inventory":
        return emailService.sendInventoryReport(
          recipients,
          pdfBuffer,
          excelBuffer,
          reportData.summary
        );
      case "costs":
        return emailService.sendCostsReport(
          recipients,
          pdfBuffer,
          excelBuffer,
          reportData.summary
        );
    }
  } finally {
    client.release();
  }
}

async function sendExecutiveSummaryReport(recipients: string[]) {
  const client = await pool.connect();

  try {
    const metrics = await getExecutiveSummaryMetrics(client);
    const period = format(new Date(), "MMMM 'de' yyyy", { locale: es });
    return emailService.sendExecutiveSummary(recipients, metrics, period);
  } finally {
    client.release();
  }
}

function logSuccessfulDelivery(
  type: SendReportRequest["type"],
  recipients: string[],
  duration: number,
  userEmail?: string
) {
  apiLogger.info("Reporte enviado por email exitosamente", {
    type,
    recipients,
    duration,
    user: userEmail,
  });
}

function logFailedDelivery(
  type: SendReportRequest["type"],
  recipients: string[],
  duration: number
) {
  apiLogger.error("Error al enviar reporte por email", {
    type,
    recipients,
    duration,
  });
}

async function dispatchEmailReport(body: SendReportRequest) {
  if (body.type === "executive-summary") {
    return sendExecutiveSummaryReport(body.recipients);
  }

  if (body.type === "critical-alert") {
    return emailService.sendCriticalAlert(
      body.recipients,
      body.alertType!,
      body.alertMessage!,
      body.alertDetails
    );
  }

  return sendStandardEmailReport(body.type, body.recipients, body.period);
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const authResult = authenticateApiRequest(request);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error.error },
        { status: authResult.error.statusCode }
      );
    }

    if (!["admin", "gerente"].includes(authResult.user.role)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const body = (await request.json()) as SendReportRequest;
    const validationError = validateSendReportRequest(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    apiLogger.info("Enviando reporte por email", {
      type: body.type,
      recipients: body.recipients,
      user: authResult.user.email,
    });

    if (!(await emailService.verifyConnection())) {
      return NextResponse.json(
        { error: "Servicio de email no configurado" },
        { status: 503 }
      );
    }

    const success = await dispatchEmailReport(body);

    const duration = Date.now() - startTime;

    if (!success) {
      logFailedDelivery(body.type, body.recipients, duration);
      return NextResponse.json(
        { error: "Error al enviar reporte" },
        { status: 500 }
      );
    }

    logSuccessfulDelivery(
      body.type,
      body.recipients,
      duration,
      authResult.user.email
    );

    return NextResponse.json({
      success: true,
      message: "Reporte enviado exitosamente",
    });
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
