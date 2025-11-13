/**
 * API: Análisis de Eficiencia
 * GET /api/analytics/efficiency
 *
 * Retorna KPIs, cuellos de botella y recomendaciones automáticas
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { pool } from "@/lib/database";
import { apiLogger } from "@/lib/logger";
import { createEfficiencyAnalyzer } from "@/lib/analytics/efficiency-analyzer";
import { createBottleneckDetector } from "@/lib/analytics/bottleneck-detector";
import { createRecommendationEngine } from "@/lib/analytics/recommendation-engine";
import { parse, isValid, startOfMonth } from "date-fns";

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verificar autenticación
    const authResult = authenticateApiRequest(request);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error.error },
        { status: authResult.error.statusCode }
      );
    }

    const { user } = authResult;

    // Obtener parámetros
    const searchParams = request.nextUrl.searchParams;
    const periodParam = searchParams.get("period"); // Formato: YYYY-MM
    const includeHistory = searchParams.get("includeHistory") === "true";
    const historyMonths = parseInt(searchParams.get("historyMonths") || "6");

    // Validar y parsear periodo
    let period = new Date();
    if (periodParam) {
      const parsedDate = parse(periodParam, "yyyy-MM", new Date());
      if (isValid(parsedDate)) {
        period = startOfMonth(parsedDate);
      } else {
        return NextResponse.json(
          { error: "Formato de periodo inválido. Use YYYY-MM" },
          { status: 400 }
        );
      }
    }

    apiLogger.info("Iniciando análisis de eficiencia", {
      user: user.email,
      period: periodParam || "current",
      includeHistory,
    });

    // Crear instancias de los analizadores
    const efficiencyAnalyzer = createEfficiencyAnalyzer(pool);
    const bottleneckDetector = createBottleneckDetector(pool);
    const recommendationEngine = createRecommendationEngine(pool);

    // Análisis principal
    const [metrics, bottlenecks] = await Promise.all([
      efficiencyAnalyzer.analyzeEfficiency(period),
      bottleneckDetector.detectBottlenecks(period),
    ]);

    // Generar recomendaciones
    const recommendations = await recommendationEngine.generateRecommendations(
      metrics,
      bottlenecks
    );

    // Datos históricos (opcional)
    let historicalData = null;
    if (includeHistory) {
      historicalData =
        await efficiencyAnalyzer.getHistoricalMetrics(historyMonths);
    }

    // Construir respuesta
    const response = {
      success: true,
      data: {
        period: metrics.period,
        kpis: {
          productionEfficiency: metrics.productionEfficiency,
          capacityUtilization: metrics.capacityUtilization,
          costPerUnit: metrics.costPerUnit,
          leadTime: metrics.leadTime,
        },
        bottlenecks: {
          slowStages: bottlenecks.slowStages,
          problematicProducts: bottlenecks.problematicProducts,
          slowSuppliers: bottlenecks.slowSuppliers,
          summary: bottlenecks.summary,
        },
        recommendations: {
          items: recommendations.recommendations,
          summary: recommendations.summary,
        },
        historicalData: includeHistory ? historicalData : undefined,
      },
      meta: {
        generatedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      },
    };

    apiLogger.info("Análisis de eficiencia completado", {
      user: user.email,
      durationMs: Date.now() - startTime,
      kpisCount: 4,
      bottlenecksCount: bottlenecks.summary.totalBottlenecks,
      recommendationsCount: recommendations.summary.totalRecommendations,
    });

    return NextResponse.json(response);
  } catch (error: any) {
    apiLogger.error("Error en análisis de eficiencia", {
      error: error.message,
      stack: error.stack,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        error: "Error al analizar eficiencia",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
