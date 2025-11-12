/**
 * Hook para gestionar métricas del dashboard
 */

import { useState, useEffect, useCallback } from "react";
import { useApi } from "./useApi";

export interface DashboardMetrics {
  produccion: {
    total: number;
    variacion_porcentaje: number;
    tendencia: "up" | "down" | "stable";
  };
  inventario: {
    total: number;
    variacion_porcentaje: number;
    tendencia: "up" | "down" | "stable";
    items_bajo_stock: number;
  };
  ventas: {
    total: number;
    variacion_porcentaje: number;
    tendencia: "up" | "down" | "stable";
  };
  costos: {
    total: number;
    variacion_porcentaje: number;
    tendencia: "up" | "down" | "stable";
  };
  ordenes: {
    vencidas: number;
    en_riesgo: number;
    completadas_mes: number;
  };
  produccion_diaria: Array<{
    fecha: string;
    cantidad: number;
  }>;
}

export function useDashboard() {
  const { get } = useApi();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await get<DashboardMetrics>("/api/dashboard/metrics");
      setMetrics(data);
      setLastUpdate(new Date());
    } catch (err: any) {
      setError(err.message || "Error al cargar métricas del dashboard");
      console.error("Error fetching dashboard metrics:", err);
    } finally {
      setLoading(false);
    }
  }, [get]);

  // Cargar métricas al montar
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Auto-refresh cada 5 minutos
  useEffect(() => {
    const interval = setInterval(
      () => {
        fetchMetrics();
      },
      5 * 60 * 1000
    ); // 5 minutos

    return () => clearInterval(interval);
  }, [fetchMetrics]);

  return {
    metrics,
    loading,
    error,
    lastUpdate,
    refresh: fetchMetrics,
  };
}
