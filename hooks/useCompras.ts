import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { Compra } from "@/lib/database";

export function useCompras() {
  const [compras, setCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompras = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getCompras();
      setCompras(data as Compra[]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const createCompra = async (compraData: Compra) => {
    try {
      const newCompra = await apiClient.createCompra(compraData);
      setCompras((prev) => [newCompra as Compra, ...prev]);
      return newCompra;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear compra");
      throw err;
    }
  };

  const updateCompra = async (id: number, compraData: Compra) => {
    try {
      const updatedCompra = await apiClient.updateCompra(id, compraData);
      setCompras((prev) =>
        prev.map((compra: Compra) =>
          compra.compra_id === id ? (updatedCompra as Compra) : compra
        )
      );
      return updatedCompra;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al actualizar compra"
      );
      throw err;
    }
  };

  const deleteCompra = async (id: number) => {
    try {
      await apiClient.deleteCompra(id);
      setCompras((prev) =>
        prev.filter((compra: Compra) => compra.compra_id !== id)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar compra");
      throw err;
    }
  };

  useEffect(() => {
    fetchCompras();
  }, []);

  return {
    compras,
    loading,
    error,
    refetch: fetchCompras,
    createCompra,
    updateCompra,
    deleteCompra,
  };
}
