import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { Proveedor } from "@/lib/database";

export function useProveedores() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProveedores = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getProveedores();
      setProveedores(data as Proveedor[]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProveedores();
  }, []);

  return {
    proveedores,
    loading,
    error,
    refetch: fetchProveedores,
  };
}
