/**
 * Componente de tarjeta KPI para mostrar métricas del dashboard
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowUp,
  ArrowDown,
  Minus,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  variacion?: number;
  tendencia?: "up" | "down" | "stable";
  icon?: React.ReactNode;
  formato?: "numero" | "moneda" | "porcentaje";
  loading?: boolean;
}

export function KPICard({
  title,
  value,
  subtitle,
  variacion,
  tendencia,
  icon,
  formato = "numero",
  loading = false,
}: KPICardProps) {
  const formatValue = (val: string | number): string => {
    const numVal = typeof val === "string" ? parseFloat(val) : val;

    if (isNaN(numVal)) return String(val);

    switch (formato) {
      case "moneda":
        return new Intl.NumberFormat("es-CO", {
          style: "currency",
          currency: "COP",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(numVal);
      case "porcentaje":
        return `${numVal.toFixed(1)}%`;
      default:
        return new Intl.NumberFormat("es-CO").format(numVal);
    }
  };

  const getTendenciaIcon = () => {
    if (!tendencia || tendencia === "stable") {
      return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
    if (tendencia === "up") {
      return <ArrowUp className="h-4 w-4 text-green-600" />;
    }
    return <ArrowDown className="h-4 w-4 text-red-600" />;
  };

  const getTendenciaColor = () => {
    if (!variacion) return "text-muted-foreground";
    if (tendencia === "up") return "text-green-600";
    if (tendencia === "down") return "text-red-600";
    return "text-muted-foreground";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-24 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-16"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value)}</div>
        {variacion !== undefined && (
          <div
            className={cn(
              "flex items-center text-xs mt-1",
              getTendenciaColor()
            )}
          >
            {getTendenciaIcon()}
            <span className="ml-1">
              {variacion > 0 ? "+" : ""}
              {variacion.toFixed(1)}% vs mes anterior
            </span>
          </div>
        )}
        {subtitle && !variacion && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
