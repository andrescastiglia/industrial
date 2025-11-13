"use client";

/**
 * Página: Análisis de Eficiencia
 * Visualiza KPIs, cuellos de botella y recomendaciones automáticas
 */

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Package,
  Users,
  RefreshCw,
  Lightbulb,
  Target,
  Activity,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface KPIData {
  period: string;
  value: number;
  trend: string;
  status: "excellent" | "good" | "warning" | "critical";
}

interface Recommendation {
  id: string;
  type: string;
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  impact: string;
  actionItems: string[];
  estimatedBenefit: string;
  urgency: string;
  affectedArea: string;
}

interface AnalysisData {
  period: string;
  kpis: {
    productionEfficiency: KPIData & {
      plannedUnits: number;
      producedUnits: number;
      efficiencyRate: number;
    };
    capacityUtilization: KPIData & {
      totalCapacity: number;
      usedCapacity: number;
      utilizationRate: number;
    };
    costPerUnit: KPIData & {
      totalCost: number;
      unitsProduced: number;
      costPerUnit: number;
    };
    leadTime: KPIData & {
      averageLeadTime: number;
      minLeadTime: number;
      maxLeadTime: number;
    };
  };
  bottlenecks: {
    slowStages: any[];
    problematicProducts: any[];
    slowSuppliers: any[];
    summary: {
      totalBottlenecks: number;
      criticalIssues: number;
      estimatedImpact: string;
    };
  };
  recommendations: {
    items: Recommendation[];
    summary: {
      totalRecommendations: number;
      criticalCount: number;
      highPriorityCount: number;
      estimatedImpact: string;
    };
  };
}

export default function AnalisisEficienciaPage() {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    loadAnalysis();
  }, []);

  const loadAnalysis = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/analytics/efficiency", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Error al cargar análisis");
      }

      const result = await response.json();
      setData(result.data);
      setSelectedPeriod(result.data.period);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo cargar el análisis",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      excellent: "bg-green-100 text-green-800 border-green-300",
      good: "bg-blue-100 text-blue-800 border-blue-300",
      warning: "bg-yellow-100 text-yellow-800 border-yellow-300",
      critical: "bg-red-100 text-red-800 border-red-300",
    };
    return colors[status as keyof typeof colors] || colors.good;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      critical: "destructive",
      high: "default",
      medium: "secondary",
      low: "outline",
    };
    return colors[priority as keyof typeof colors] || "default";
  };

  const getStatusIcon = (status: string) => {
    if (status === "excellent" || status === "good") {
      return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    } else if (status === "warning") {
      return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    } else {
      return <AlertTriangle className="w-5 h-5 text-red-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            No se pudo cargar el análisis de eficiencia.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">Análisis de Eficiencia</h1>
          <p className="text-gray-600">
            Periodo: {selectedPeriod} | KPIs, cuellos de botella y
            recomendaciones automáticas
          </p>
        </div>
        <Button onClick={loadAnalysis} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* KPIs principales */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Eficiencia de Producción */}
        <Card
          className={`border-2 ${getStatusColor(data.kpis.productionEfficiency.status)}`}
        >
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <CardTitle className="text-sm font-medium">
                Eficiencia de Producción
              </CardTitle>
              {getStatusIcon(data.kpis.productionEfficiency.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.kpis.productionEfficiency.efficiencyRate.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {data.kpis.productionEfficiency.producedUnits} de{" "}
              {data.kpis.productionEfficiency.plannedUnits} unidades
            </p>
            <div className="flex items-center mt-2">
              {data.kpis.productionEfficiency.trend.startsWith("+") ? (
                <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
              )}
              <span className="text-xs font-medium">
                {data.kpis.productionEfficiency.trend}
              </span>
            </div>
            <Progress
              value={data.kpis.productionEfficiency.efficiencyRate}
              className="mt-3"
            />
          </CardContent>
        </Card>

        {/* Utilización de Capacidad */}
        <Card
          className={`border-2 ${getStatusColor(data.kpis.capacityUtilization.status)}`}
        >
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <CardTitle className="text-sm font-medium">
                Utilización de Capacidad
              </CardTitle>
              {getStatusIcon(data.kpis.capacityUtilization.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.kpis.capacityUtilization.utilizationRate.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {data.kpis.capacityUtilization.usedCapacity.toFixed(0)} de{" "}
              {data.kpis.capacityUtilization.totalCapacity.toFixed(0)} horas
            </p>
            <div className="flex items-center mt-2">
              {data.kpis.capacityUtilization.trend.startsWith("+") ? (
                <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
              )}
              <span className="text-xs font-medium">
                {data.kpis.capacityUtilization.trend}
              </span>
            </div>
            <Progress
              value={Math.min(
                data.kpis.capacityUtilization.utilizationRate,
                100
              )}
              className="mt-3"
            />
          </CardContent>
        </Card>

        {/* Costo por Unidad */}
        <Card
          className={`border-2 ${getStatusColor(data.kpis.costPerUnit.status)}`}
        >
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <CardTitle className="text-sm font-medium">
                Costo por Unidad
              </CardTitle>
              {getStatusIcon(data.kpis.costPerUnit.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {data.kpis.costPerUnit.costPerUnit.toLocaleString("es-CO", {
                minimumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {data.kpis.costPerUnit.unitsProduced.toFixed(0)} unidades
              producidas
            </p>
            <div className="flex items-center mt-2">
              {data.kpis.costPerUnit.trend.startsWith("-") ? (
                <TrendingDown className="w-4 h-4 text-green-600 mr-1" />
              ) : (
                <TrendingUp className="w-4 h-4 text-red-600 mr-1" />
              )}
              <span className="text-xs font-medium">
                {data.kpis.costPerUnit.trend}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Costo total: $
              {data.kpis.costPerUnit.totalCost.toLocaleString("es-CO")}
            </p>
          </CardContent>
        </Card>

        {/* Lead Time */}
        <Card
          className={`border-2 ${getStatusColor(data.kpis.leadTime.status)}`}
        >
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <CardTitle className="text-sm font-medium">
                Lead Time Promedio
              </CardTitle>
              {getStatusIcon(data.kpis.leadTime.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.kpis.leadTime.averageLeadTime.toFixed(1)} días
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Min: {data.kpis.leadTime.minLeadTime.toFixed(1)} | Max:{" "}
              {data.kpis.leadTime.maxLeadTime.toFixed(1)}
            </p>
            <div className="flex items-center mt-2">
              {data.kpis.leadTime.trend.startsWith("-") ? (
                <TrendingDown className="w-4 h-4 text-green-600 mr-1" />
              ) : (
                <TrendingUp className="w-4 h-4 text-red-600 mr-1" />
              )}
              <span className="text-xs font-medium">
                {data.kpis.leadTime.trend}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">Objetivo: ≤ 5 días</p>
          </CardContent>
        </Card>
      </div>

      {/* Resumen de Cuellos de Botella */}
      {data.bottlenecks.summary.totalBottlenecks > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Cuellos de Botella Detectados
            </CardTitle>
            <CardDescription>
              {data.bottlenecks.summary.estimatedImpact}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">
                  Etapas Lentas
                </p>
                <p className="text-3xl font-bold">
                  {data.bottlenecks.slowStages.length}
                </p>
                {data.bottlenecks.slowStages.length > 0 && (
                  <ul className="text-sm space-y-1">
                    {data.bottlenecks.slowStages
                      .slice(0, 3)
                      .map((stage: any, idx: number) => (
                        <li key={idx} className="text-gray-600">
                          • {stage.stageName}:{" "}
                          {stage.averageDuration.toFixed(1)} días
                        </li>
                      ))}
                  </ul>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">
                  Productos Problemáticos
                </p>
                <p className="text-3xl font-bold">
                  {data.bottlenecks.problematicProducts.length}
                </p>
                {data.bottlenecks.problematicProducts.length > 0 && (
                  <ul className="text-sm space-y-1">
                    {data.bottlenecks.problematicProducts
                      .slice(0, 3)
                      .map((product: any, idx: number) => (
                        <li key={idx} className="text-gray-600">
                          • {product.productName}:{" "}
                          {product.delayRate.toFixed(0)}% retrasos
                        </li>
                      ))}
                  </ul>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">
                  Proveedores Lentos
                </p>
                <p className="text-3xl font-bold">
                  {data.bottlenecks.slowSuppliers.length}
                </p>
                {data.bottlenecks.slowSuppliers.length > 0 && (
                  <ul className="text-sm space-y-1">
                    {data.bottlenecks.slowSuppliers
                      .slice(0, 3)
                      .map((supplier: any, idx: number) => (
                        <li key={idx} className="text-gray-600">
                          • {supplier.supplierName}: +
                          {supplier.delayDays.toFixed(1)} días
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recomendaciones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            Recomendaciones Automáticas
          </CardTitle>
          <CardDescription>
            {data.recommendations.summary.totalRecommendations} recomendaciones
            |{data.recommendations.summary.criticalCount} críticas |
            {data.recommendations.summary.highPriorityCount} alta prioridad
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <Activity className="h-4 w-4" />
            <AlertTitle>Impacto Estimado</AlertTitle>
            <AlertDescription>
              {data.recommendations.summary.estimatedImpact}
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            {data.recommendations.items.map((rec) => (
              <Card
                key={rec.id}
                className="border-l-4"
                style={{
                  borderLeftColor:
                    rec.priority === "critical"
                      ? "#ef4444"
                      : rec.priority === "high"
                        ? "#f97316"
                        : rec.priority === "medium"
                          ? "#eab308"
                          : "#6b7280",
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base">{rec.title}</CardTitle>
                    <div className="flex gap-2">
                      <Badge variant={getPriorityColor(rec.priority) as any}>
                        {rec.priority.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">{rec.type}</Badge>
                    </div>
                  </div>
                  <CardDescription>{rec.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        Impacto:
                      </p>
                      <p className="text-sm text-gray-600">{rec.impact}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        Acciones Recomendadas:
                      </p>
                      <ul className="text-sm space-y-1">
                        {rec.actionItems.map((action, idx) => (
                          <li
                            key={idx}
                            className="text-gray-600 flex items-start"
                          >
                            <span className="mr-2">•</span>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t">
                      <div>
                        <p className="text-xs text-gray-500">
                          Beneficio Estimado
                        </p>
                        <p className="text-sm font-medium">
                          {rec.estimatedBenefit}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Área Afectada</p>
                        <p className="text-sm font-medium">
                          {rec.affectedArea}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
