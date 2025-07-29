import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { Cliente } from "@/lib/database";

export function useClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClientes = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getClientes();
      setClientes(data as Cliente[]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const createCliente = async (clienteData: Cliente) => {
    try {
      const newCliente = await apiClient.createCliente(clienteData);
      setClientes((prev) => [newCliente as Cliente, ...prev]);
      return newCliente;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear cliente");
      throw err;
    }
  };

  const updateCliente = async (id: number, clienteData: Cliente) => {
    try {
      const updatedCliente = await apiClient.updateCliente(id, clienteData);
      setClientes((prev) =>
        prev.map((cliente: Cliente) =>
          cliente.cliente_id === id ? (updatedCliente as Cliente) : cliente
        )
      );
      return updatedCliente;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al actualizar cliente"
      );
      throw err;
    }
  };

  const deleteCliente = async (id: number) => {
    try {
      await apiClient.deleteCliente(id);
      setClientes((prev) =>
        prev.filter((cliente: Cliente) => cliente.cliente_id !== id)
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al eliminar cliente"
      );
      throw err;
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  return {
    clientes,
    loading,
    error,
    refetch: fetchClientes,
    createCliente,
    updateCliente,
    deleteCliente,
  };
}
