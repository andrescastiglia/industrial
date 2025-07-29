import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { TipoComponente } from "@/lib/database";

export function useTiposComponente() {
  const [tipos, setTipos] = useState<TipoComponente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTipos = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getTiposComponente();
      setTipos(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTipos();
  }, []);

  return {
    tipos,
    loading,
    error,
    refetch: fetchTipos,
  };
}
