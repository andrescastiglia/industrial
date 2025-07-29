import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { OrdenProduccion } from "@/lib/database";

export function useOrdenesProduccion() {
  const [ordenes, setOrdenes] = useState<OrdenProduccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrdenes = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getOrdenesProduccion();
      setOrdenes(data as OrdenProduccion[]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const createOrden = async (ordenData: OrdenProduccion) => {
    try {
      const newOrden = await apiClient.createOrdenProduccion(ordenData);
      setOrdenes((prev) => [newOrden as OrdenProduccion, ...prev]);
      return newOrden;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear orden");
      throw err;
    }
  };

  const updateOrden = async (id: number, ordenData: OrdenProduccion) => {
    try {
      const updatedOrden = await apiClient.updateOrdenProduccion(id, ordenData);
      setOrdenes((prev) =>
        prev.map((orden: OrdenProduccion) =>
          orden.orden_produccion_id === id
            ? (updatedOrden as OrdenProduccion)
            : orden
        )
      );
      return updatedOrden;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al actualizar orden"
      );
      throw err;
    }
  };

  const deleteOrden = async (id: number) => {
    try {
      await apiClient.deleteOrdenProduccion(id);
      setOrdenes((prev) =>
        prev.filter(
          (orden: OrdenProduccion) => orden.orden_produccion_id !== id
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar orden");
      throw err;
    }
  };

  useEffect(() => {
    fetchOrdenes();
  }, []);

  return {
    ordenes,
    loading,
    error,
    refetch: fetchOrdenes,
    createOrden,
    updateOrden,
    deleteOrden,
  };
}
