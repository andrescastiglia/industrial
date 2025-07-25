"use client"

import { useState, useEffect } from "react"
import { apiClient } from "@/lib/api"

export function useOrdenesProduccion() {
  const [ordenes, setOrdenes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrdenes = async () => {
    try {
      setLoading(true)
      const data = await apiClient.getOrdenesProduccion()
      setOrdenes(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  const createOrden = async (ordenData: any) => {
    try {
      const newOrden = await apiClient.createOrdenProduccion(ordenData)
      setOrdenes((prev) => [newOrden, ...prev])
      return newOrden
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear orden")
      throw err
    }
  }

  const updateOrden = async (id: number, ordenData: any) => {
    try {
      const updatedOrden = await apiClient.updateOrdenProduccion(id, ordenData)
      setOrdenes((prev) => prev.map((orden: any) => (orden.orden_produccion_id === id ? updatedOrden : orden)))
      return updatedOrden
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar orden")
      throw err
    }
  }

  const deleteOrden = async (id: number) => {
    try {
      await apiClient.deleteOrdenProduccion(id)
      setOrdenes((prev) => prev.filter((orden: any) => orden.orden_produccion_id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar orden")
      throw err
    }
  }

  useEffect(() => {
    fetchOrdenes()
  }, [])

  return {
    ordenes,
    loading,
    error,
    refetch: fetchOrdenes,
    createOrden,
    updateOrden,
    deleteOrden,
  }
}

export function useMateriaPrima() {
  const [materiales, setMateriales] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMateriales = async () => {
    try {
      setLoading(true)
      const data = await apiClient.getMateriaPrima()
      setMateriales(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  const createMaterial = async (materialData: any) => {
    try {
      const newMaterial = await apiClient.createMateriaPrima(materialData)
      setMateriales((prev) => [newMaterial, ...prev])
      return newMaterial
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear material")
      throw err
    }
  }

  const updateMaterial = async (id: number, materialData: any) => {
    try {
      const updatedMaterial = await apiClient.updateMateriaPrima(id, materialData)
      setMateriales((prev) =>
        prev.map((material: any) => (material.materia_prima_id === id ? updatedMaterial : material)),
      )
      return updatedMaterial
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar material")
      throw err
    }
  }

  const deleteMaterial = async (id: number) => {
    try {
      await apiClient.deleteMateriaPrima(id)
      setMateriales((prev) => prev.filter((material: any) => material.materia_prima_id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar material")
      throw err
    }
  }

  useEffect(() => {
    fetchMateriales()
  }, [])

  return {
    materiales,
    loading,
    error,
    refetch: fetchMateriales,
    createMaterial,
    updateMaterial,
    deleteMaterial,
  }
}

export function useProductos() {
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProductos = async () => {
    try {
      setLoading(true)
      const data = await apiClient.getProductos()
      setProductos(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  const createProducto = async (productoData: any) => {
    try {
      const newProducto = await apiClient.createProducto(productoData)
      setProductos((prev) => [newProducto, ...prev])
      return newProducto
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear producto")
      throw err
    }
  }

  const updateProducto = async (id: number, productoData: any) => {
    try {
      const updatedProducto = await apiClient.updateProducto(id, productoData)
      setProductos((prev) => prev.map((producto: any) => (producto.producto_id === id ? updatedProducto : producto)))
      return updatedProducto
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar producto")
      throw err
    }
  }

  const deleteProducto = async (id: number) => {
    try {
      await apiClient.deleteProducto(id)
      setProductos((prev) => prev.filter((producto: any) => producto.producto_id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar producto")
      throw err
    }
  }

  useEffect(() => {
    fetchProductos()
  }, [])

  return {
    productos,
    loading,
    error,
    refetch: fetchProductos,
    createProducto,
    updateProducto,
    deleteProducto,
  }
}

export function useClientes() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClientes = async () => {
    try {
      setLoading(true)
      const data = await apiClient.getClientes()
      setClientes(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  const createCliente = async (clienteData: any) => {
    try {
      const newCliente = await apiClient.createCliente(clienteData)
      setClientes((prev) => [newCliente, ...prev])
      return newCliente
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear cliente")
      throw err
    }
  }

  const updateCliente = async (id: number, clienteData: any) => {
    try {
      const updatedCliente = await apiClient.updateCliente(id, clienteData)
      setClientes((prev) => prev.map((cliente: any) => (cliente.cliente_id === id ? updatedCliente : cliente)))
      return updatedCliente
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar cliente")
      throw err
    }
  }

  const deleteCliente = async (id: number) => {
    try {
      await apiClient.deleteCliente(id)
      setClientes((prev) => prev.filter((cliente: any) => cliente.cliente_id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar cliente")
      throw err
    }
  }

  useEffect(() => {
    fetchClientes()
  }, [])

  return {
    clientes,
    loading,
    error,
    refetch: fetchClientes,
    createCliente,
    updateCliente,
    deleteCliente,
  }
}

export function useTiposComponente() {
  const [tipos, setTipos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTipos = async () => {
    try {
      setLoading(true)
      const data = await apiClient.getTiposComponente()
      setTipos(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTipos()
  }, [])

  return {
    tipos,
    loading,
    error,
    refetch: fetchTipos,
  }
}
