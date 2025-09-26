import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { Producto, ComponenteProducto } from "@/lib/database";

export function useProductos() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProductos = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getProductos();
      setProductos(data as Producto[]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const createProducto = async (
    productoData: Producto,
    componentes: ComponenteProducto[] = []
  ) => {
    try {
      const newProducto = await apiClient.createProducto(
        productoData,
        componentes
      );
      setProductos((prev) => [newProducto as Producto, ...prev]);
      return newProducto;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear producto");
      throw err;
    }
  };

  const updateProducto = async (
    id: number,
    productoData: Producto,
    componentes: ComponenteProducto[] = []
  ) => {
    try {
      const updatedProducto = await apiClient.updateProducto(
        id,
        productoData,
        componentes
      );
      setProductos((prev) =>
        prev.map((producto: Producto) =>
          producto.producto_id === id ? (updatedProducto as Producto) : producto
        )
      );
      return updatedProducto;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al actualizar producto"
      );
      throw err;
    }
  };

  const deleteProducto = async (id: number) => {
    try {
      await apiClient.deleteProducto(id);
      setProductos((prev) =>
        prev.filter((producto: Producto) => producto.producto_id !== id)
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al eliminar producto"
      );
      throw err;
    }
  };

  useEffect(() => {
    fetchProductos();
  }, []);

  return {
    productos,
    loading,
    error,
    refetch: fetchProductos,
    createProducto,
    updateProducto,
    deleteProducto,
  };
}
