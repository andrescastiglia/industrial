"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Edit, Trash2, Search, Eye, Clock, AlertCircle, Package, Factory } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useOrdenesProduccion, useMateriaPrima, useProductos, useClientes } from "@/hooks/useApi"

interface ConsumoTemp {
  materia_prima_id: number
  cantidad_requerida: number
  cantidad_usada: number
  merma_calculada: number
  fecha_registro: string
}

export default function OrdenesProduccionPage() {
  const { ordenes, loading, error, createOrden, updateOrden, deleteOrden } = useOrdenesProduccion()
  const { materiales } = useMateriaPrima()
  const { productos } = useProductos()
  const { clientes } = useClientes()

  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingOrden, setEditingOrden] = useState<any>(null)
  const [viewingOrden, setViewingOrden] = useState<any>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [consumosTemp, setConsumosTemp] = useState<ConsumoTemp[]>([])

  const filteredOrdenes = ordenes.filter((orden: any) => {
    const producto = productos.find((p: any) => p.producto_id === orden.producto_id)
    return (
      orden.orden_produccion_id.toString().includes(searchTerm.toLowerCase()) ||
      producto?.nombre_modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orden.cliente_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orden.estado.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("es-PE")
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-PE")
  }

  const calcularProgreso = (orden: any) => {
    if (orden.estado === "Completada") return 100
    if (orden.estado === "Cancelada") return 0
    if (orden.estado === "Planificada") return 0

    if (orden.fecha_inicio && orden.fecha_fin_estimada) {
      const inicio = new Date(orden.fecha_inicio).getTime()
      const finEstimado = new Date(orden.fecha_fin_estimada).getTime()
      const ahora = new Date().getTime()

      if (ahora >= finEstimado) return 95
      if (ahora <= inicio) return 5

      const progreso = ((ahora - inicio) / (finEstimado - inicio)) * 100
      return Math.min(Math.max(progreso, 5), 95)
    }

    return orden.estado === "En Proceso" ? 50 : 10
  }

  const agregarConsumo = () => {
    const nuevoConsumo: ConsumoTemp = {
      materia_prima_id: materiales[0]?.materia_prima_id || 1,
      cantidad_requerida: 1,
      cantidad_usada: 0,
      merma_calculada: 0,
      fecha_registro: new Date().toISOString(),
    }
    setConsumosTemp([...consumosTemp, nuevoConsumo])
  }

  const actualizarConsumo = (index: number, campo: string, valor: any) => {
    const nuevosConsumos = [...consumosTemp]
    nuevosConsumos[index] = {
      ...nuevosConsumos[index],
      [campo]: campo.includes("cantidad") || campo.includes("merma") ? Number.parseFloat(valor) || 0 : valor,
    }

    if (campo === "cantidad_usada") {
      const cantidadRequerida = nuevosConsumos[index].cantidad_requerida
      const cantidadUsada = Number.parseFloat(valor) || 0
      nuevosConsumos[index].merma_calculada = Math.max(0, cantidadUsada - cantidadRequerida)
    }

    setConsumosTemp(nuevosConsumos)
  }

  const eliminarConsumo = (index: number) => {
    setConsumosTemp(consumosTemp.filter((_, i) => i !== index))
  }

  const handleSubmit = async (formData: FormData) => {
    try {
      const ordenData = {
        orden_venta_id: formData.get("orden_venta_id")
          ? Number.parseInt(formData.get("orden_venta_id") as string)
          : null,
        producto_id: Number.parseInt(formData.get("producto_id") as string),
        cantidad_a_producir: Number.parseInt(formData.get("cantidad_a_producir") as string),
        fecha_creacion: formData.get("fecha_creacion") as string,
        fecha_inicio: (formData.get("fecha_inicio") as string) || null,
        fecha_fin_estimada: formData.get("fecha_fin_estimada") as string,
        fecha_fin_real: (formData.get("fecha_fin_real") as string) || null,
        estado: formData.get("estado") as string,
        consumos: consumosTemp,
      }

      if (editingOrden) {
        await updateOrden(editingOrden.orden_produccion_id, ordenData)
      } else {
        await createOrden(ordenData)
      }

      setIsDialogOpen(false)
      setEditingOrden(null)
      setConsumosTemp([])
    } catch (error) {
      console.error("Error al guardar orden:", error)
    }
  }

  const handleEdit = (orden: any) => {
    setEditingOrden(orden)
    setConsumosTemp(orden.consumos || [])
    setIsDialogOpen(true)
  }

  const handleView = (orden: any) => {
    setViewingOrden(orden)
    setIsViewDialogOpen(true)
  }

  const handleDelete = async (orden_produccion_id: number) => {
    try {
      await deleteOrden(orden_produccion_id)
    } catch (error) {
      console.error("Error al eliminar orden:", error)
    }
  }

  const resetForm = () => {
    setEditingOrden(null)
    setConsumosTemp([])
    setIsDialogOpen(false)
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "Planificada":
        return <Badge variant="secondary">Planificada</Badge>
      case "En Proceso":
        return <Badge className="bg-blue-100 text-blue-800">En Proceso</Badge>
      case "Pausada":
        return <Badge className="bg-yellow-100 text-yellow-800">Pausada</Badge>
      case "Completada":
        return <Badge variant="default">Completada</Badge>
      case "Cancelada":
        return <Badge variant="destructive">Cancelada</Badge>
      default:
        return <Badge variant="secondary">{estado}</Badge>
    }
  }

  const getProductoNombre = (producto_id: number) => {
    const producto = productos.find((p: any) => p.producto_id === producto_id)
    return producto ? producto.nombre_modelo : `Producto #${producto_id}`
  }

  const getMaterialNombre = (materia_prima_id: number) => {
    const material = materiales.find((m: any) => m.materia_prima_id === materia_prima_id)
    return material ? material.nombre : `Material #${materia_prima_id}`
  }

  const getMaterialUnidad = (materia_prima_id: number) => {
    const material = materiales.find((m: any) => m.materia_prima_id === materia_prima_id)
    return material ? material.unidad_medida : "ud"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Cargando órdenes de producción...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Órdenes de Producción</h2>
          <p className="text-muted-foreground">Gestión y control de la producción industrial</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Orden de Producción
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingOrden ? "Editar Orden de Producción" : "Nueva Orden de Producción"}</DialogTitle>
              <DialogDescription>
                {editingOrden ? "Modifica los datos de la orden" : "Completa los datos de la nueva orden"}
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="general">Información General</TabsTrigger>
                <TabsTrigger value="materiales">Consumo de Materiales</TabsTrigger>
              </TabsList>

              <form action={handleSubmit}>
                <TabsContent value="general" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="producto_id">Producto a Producir *</Label>
                      <select
                        id="producto_id"
                        name="producto_id"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        defaultValue={editingOrden?.producto_id || productos[0]?.producto_id}
                        required
                      >
                        {productos.map((producto: any) => (
                          <option key={producto.producto_id} value={producto.producto_id}>
                            {producto.nombre_modelo}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cantidad_a_producir">Cantidad a Producir *</Label>
                      <Input
                        id="cantidad_a_producir"
                        name="cantidad_a_producir"
                        type="number"
                        min="1"
                        defaultValue={editingOrden?.cantidad_a_producir || ""}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fecha_creacion">Fecha de Creación *</Label>
                      <Input
                        id="fecha_creacion"
                        name="fecha_creacion"
                        type="datetime-local"
                        defaultValue={
                          editingOrden?.fecha_creacion
                            ? new Date(editingOrden.fecha_creacion).toISOString().slice(0, 16)
                            : new Date().toISOString().slice(0, 16)
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fecha_fin_estimada">Fecha Fin Estimada *</Label>
                      <Input
                        id="fecha_fin_estimada"
                        name="fecha_fin_estimada"
                        type="datetime-local"
                        defaultValue={
                          editingOrden?.fecha_fin_estimada
                            ? new Date(editingOrden.fecha_fin_estimada).toISOString().slice(0, 16)
                            : ""
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fecha_inicio">Fecha de Inicio</Label>
                      <Input
                        id="fecha_inicio"
                        name="fecha_inicio"
                        type="datetime-local"
                        defaultValue={
                          editingOrden?.fecha_inicio
                            ? new Date(editingOrden.fecha_inicio).toISOString().slice(0, 16)
                            : ""
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fecha_fin_real">Fecha Fin Real</Label>
                      <Input
                        id="fecha_fin_real"
                        name="fecha_fin_real"
                        type="datetime-local"
                        defaultValue={
                          editingOrden?.fecha_fin_real
                            ? new Date(editingOrden.fecha_fin_real).toISOString().slice(0, 16)
                            : ""
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="estado">Estado *</Label>
                      <select
                        id="estado"
                        name="estado"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        defaultValue={editingOrden?.estado || "Planificada"}
                        required
                      >
                        <option value="Planificada">Planificada</option>
                        <option value="En Proceso">En Proceso</option>
                        <option value="Pausada">Pausada</option>
                        <option value="Completada">Completada</option>
                        <option value="Cancelada">Cancelada</option>
                      </select>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="materiales" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-lg font-medium">Consumo de Materia Prima</h4>
                    <Button type="button" onClick={agregarConsumo} size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar Material
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {consumosTemp.map((consumo, index) => (
                      <Card key={index} className="p-4">
                        <div className="grid grid-cols-12 gap-3 items-end">
                          <div className="col-span-4">
                            <Label className="text-sm">Materia Prima</Label>
                            <select
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background"
                              value={consumo.materia_prima_id}
                              onChange={(e) => actualizarConsumo(index, "materia_prima_id", e.target.value)}
                            >
                              {materiales.map((mp: any) => (
                                <option key={mp.materia_prima_id} value={mp.materia_prima_id}>
                                  {mp.nombre}
                                </option>
                              ))}
                            </select>
                            <div className="text-xs text-muted-foreground mt-1">
                              Stock:{" "}
                              {
                                materiales.find((m: any) => m.materia_prima_id === consumo.materia_prima_id)
                                  ?.stock_actual
                              }{" "}
                              {getMaterialUnidad(consumo.materia_prima_id)}
                            </div>
                          </div>

                          <div className="col-span-2">
                            <Label className="text-sm">Cant. Requerida</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={consumo.cantidad_requerida}
                              onChange={(e) => actualizarConsumo(index, "cantidad_requerida", e.target.value)}
                              className="h-9"
                            />
                          </div>

                          <div className="col-span-2">
                            <Label className="text-sm">Cant. Usada</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={consumo.cantidad_usada}
                              onChange={(e) => actualizarConsumo(index, "cantidad_usada", e.target.value)}
                              className="h-9"
                            />
                          </div>

                          <div className="col-span-2">
                            <Label className="text-sm">Merma</Label>
                            <div className="h-9 flex items-center text-sm font-medium">
                              {consumo.merma_calculada.toFixed(2)} {getMaterialUnidad(consumo.materia_prima_id)}
                            </div>
                          </div>

                          <div className="col-span-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => eliminarConsumo(index)}
                              className="h-9 w-full"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}

                    {consumosTemp.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No hay materiales agregados. Haz clic en "Agregar Material" para comenzar.
                      </div>
                    )}
                  </div>
                </TabsContent>

                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button type="submit">{editingOrden ? "Actualizar" : "Crear"}</Button>
                </div>
              </form>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Órdenes</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ordenes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Proceso</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {ordenes.filter((o: any) => o.estado === "En Proceso").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completadas</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {ordenes.filter((o: any) => o.estado === "Completada").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planificadas</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {ordenes.filter((o: any) => o.estado === "Planificada").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Órdenes de Producción</CardTitle>
          <CardDescription>Control completo del proceso productivo</CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar órdenes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Progreso</TableHead>
                <TableHead>Fecha Estimada</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrdenes.map((orden: any) => {
                const progreso = calcularProgreso(orden)
                return (
                  <TableRow key={orden.orden_produccion_id}>
                    <TableCell className="font-medium">OP-{orden.orden_produccion_id}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{getProductoNombre(orden.producto_id)}</div>
                        <div className="text-sm text-muted-foreground">ID: {orden.producto_id}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{orden.cantidad_a_producir}</span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{orden.cliente_nombre || "Producción Interna"}</div>
                    </TableCell>
                    <TableCell>{getEstadoBadge(orden.estado)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Progress value={progreso} className="w-16" />
                        <span className="text-xs text-muted-foreground">{progreso.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{formatDate(orden.fecha_fin_estimada)}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleView(orden)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(orden)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(orden.orden_produccion_id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
