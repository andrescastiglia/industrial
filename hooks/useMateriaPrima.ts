import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { MateriaPrima } from "@/lib/database";

export function useMateriaPrima() {
  const [materiales, setMateriales] = useState<MateriaPrima[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMateriales = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getMateriaPrima();
      setMateriales(data as MateriaPrima[]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const createMaterial = async (materialData: MateriaPrima) => {
    try {
      const newMaterial = await apiClient.createMateriaPrima(materialData);
      setMateriales((prev) => [newMaterial as MateriaPrima, ...prev]);
      return newMaterial;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear material");
      throw err;
    }
  };

  const updateMaterial = async (id: number, materialData: MateriaPrima) => {
    try {
      const updatedMaterial = await apiClient.updateMateriaPrima(
        id,
        materialData
      );
      setMateriales((prev) =>
        prev.map((material: MateriaPrima) =>
          material.materia_prima_id === id
            ? (updatedMaterial as MateriaPrima)
            : material
        )
      );
      return updatedMaterial;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al actualizar material"
      );
      throw err;
    }
  };

  const deleteMaterial = async (id: number) => {
    try {
      await apiClient.deleteMateriaPrima(id);
      setMateriales((prev) =>
        prev.filter(
          (material: MateriaPrima) => material.materia_prima_id !== id
        )
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al eliminar material"
      );
      throw err;
    }
  };

  useEffect(() => {
    fetchMateriales();
  }, []);

  return {
    materiales,
    loading,
    error,
    refetch: fetchMateriales,
    createMaterial,
    updateMaterial,
    deleteMaterial,
  };
}
