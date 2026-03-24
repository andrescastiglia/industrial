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

function createExcelResponse(
  excelBuffer: Buffer,
  type: string,
  fileSuffix: string
) {
  return new NextResponse(Buffer.from(excelBuffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Reporte_${type}_${fileSuffix}.xlsx"`,
    },
  });
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

    apiLogger.info("Generando reporte Excel", {
      type,
      period: periodInfo.label,
      user: authResult.user.email,
    });

    const client = await pool.connect();

    try {
      const reportData = await getStandardReportData(client, type, periodInfo);
      const excelBuffer = await buildExcelReport(reportData);
      const duration = Date.now() - startTime;

      apiLogger.info("Reporte Excel generado exitosamente", {
        type,
        duration,
        user: authResult.user.email,
      });

      return createExcelResponse(excelBuffer, type, periodInfo.fileSuffix);
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
