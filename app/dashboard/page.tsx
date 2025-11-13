"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDashboard } from "@/hooks/useDashboard";
import { KPICard } from "@/components/dashboard/KPICard";
import { ProduccionChart } from "@/components/dashboard/ProduccionChart";
import { AlertasOrdenes } from "@/components/dashboard/AlertasOrdenes";
import {
  Factory,
  Package,
  TrendingUp,
  DollarSign,
  RefreshCw,
} from "lucide-react";

export default function DashboardPage() {
  const { metrics, loading, error, lastUpdate, refresh } = useDashboard();

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-destructive text-lg">Error al cargar el dashboard</p>
        <p className="text-muted-foreground text-sm">{error}</p>
        <Button onClick={refresh}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Dashboard Ejecutivo
          </h2>
          <p className="text-muted-foreground">
            Métricas clave y tendencias de producción
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdate && (
            <Badge variant="outline" className="text-xs">
              Actualizado: {new Date(lastUpdate).toLocaleTimeString("es-CO")}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Actualizar
          </Button>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Producción"
          value={metrics?.produccion.total || 0}
          subtitle="órdenes completadas"
          variacion={metrics?.produccion.variacion_porcentaje}
          tendencia={metrics?.produccion.tendencia}
          formato="numero"
          icon={<Factory className="h-4 w-4" />}
          loading={loading}
        />

        <KPICard
          title="Inventario"
          value={metrics?.inventario.total || 0}
          subtitle={`${metrics?.inventario.items_bajo_stock || 0} items bajo stock`}
          variacion={metrics?.inventario.variacion_porcentaje}
          tendencia={metrics?.inventario.tendencia}
          formato="numero"
          icon={<Package className="h-4 w-4" />}
          loading={loading}
        />

        <KPICard
          title="Ventas"
          value={metrics?.ventas.total || 0}
          subtitle="ingresos del mes"
          variacion={metrics?.ventas.variacion_porcentaje}
          tendencia={metrics?.ventas.tendencia}
          formato="moneda"
          icon={<TrendingUp className="h-4 w-4" />}
          loading={loading}
        />

        <KPICard
          title="Costos"
          value={metrics?.costos.total || 0}
          subtitle="compras del mes"
          variacion={metrics?.costos.variacion_porcentaje}
          tendencia={metrics?.costos.tendencia}
          formato="moneda"
          icon={<DollarSign className="h-4 w-4" />}
          loading={loading}
        />
      </div>

      {/* Charts and Alerts Row */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Production Chart - 2/3 width */}
        <div className="md:col-span-2">
          <ProduccionChart
            data={metrics?.produccion_diaria || []}
            loading={loading}
          />
        </div>

        {/* Alerts - 1/3 width */}
        <div className="md:col-span-1">
          <AlertasOrdenes
            vencidas={metrics?.ordenes.vencidas || 0}
            en_riesgo={metrics?.ordenes.en_riesgo || 0}
            completadas_mes={metrics?.ordenes.completadas_mes || 0}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}
