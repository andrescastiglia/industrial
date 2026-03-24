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
import {
  createReportPeriodInfo,
  getStandardReportData,
  parseStandardReportType,
  type StandardReportData,
} from "@/lib/reports/report-data";

export const dynamic = "force-dynamic";

function createInvalidTypeResponse() {
  return NextResponse.json(
    { error: "Tipo de reporte inválido" },
    { status: 400 }
  );
}

function createPdfResponse(pdfBlob: Blob, type: string, fileSuffix: string) {
  return new NextResponse(pdfBlob, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Reporte_${type}_${fileSuffix}.pdf"`,
    },
  });
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

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const authResult = authenticateApiRequest(request);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error.error },
        { status: authResult.error.statusCode }
      );
    }

    const type = parseStandardReportType(
      request.nextUrl.searchParams.get("type")
    );
    if (!type) {
      return createInvalidTypeResponse();
    }

    const periodInfo = createReportPeriodInfo(
      request.nextUrl.searchParams.get("period")
    );

    apiLogger.info("Generando reporte PDF", {
      type,
      period: periodInfo.label,
      user: authResult.user.email,
    });

    const client = await pool.connect();

    try {
      const reportData = await getStandardReportData(client, type, periodInfo);
      const pdfBlob = await buildPdfReport(reportData);
      const duration = Date.now() - startTime;

      apiLogger.info("Reporte PDF generado exitosamente", {
        type,
        duration,
        user: authResult.user.email,
      });

      return createPdfResponse(pdfBlob, type, periodInfo.fileSuffix);
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
