"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Eye,
  Clock,
  AlertCircle,
  Package,
  Factory,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrdenesProduccion } from "@/hooks/useOrdenesProduccion";
import { useMateriaPrima } from "@/hooks/useMateriaPrima";
import { useProductos } from "@/hooks/useProductos";
import {
  ConsumoMateriaPrimaProduccion,
  MateriaPrima,
  OrdenProduccion,
  Producto,
} from "@/lib/database";

export default function OrdenesProduccionPage() {
  const { ordenes, loading, error, createOrden, updateOrden, deleteOrden } =
    useOrdenesProduccion();
  const { materiales }: { materiales: MateriaPrima[] } = useMateriaPrima();
  const { productos }: { productos: Producto[] } = useProductos();

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [editingOrden, setEditingOrden] = useState<OrdenProduccion | null>(
    null
  );
  const [, setViewingOrden] = useState<OrdenProduccion | null>(null);
  const [, setIsViewDialogOpen] = useState<boolean>(false);
  const [consumosMateriaPrimaProduccion, setConsumosMateriaPrimaProduccion] =
    useState<ConsumoMateriaPrimaProduccion[]>([]);

  const filteredOrdenes = ordenes.filter((orden: OrdenProduccion) => {
    const producto = productos.find(
      (p: Producto) => p.producto_id === orden.producto_id
    );
    return (
      orden.orden_produccion_id.toString().includes(searchTerm.toLowerCase()) ||
      producto?.nombre_modelo
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      orden.estado.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("es-AR");
  };

  const calcularProgreso = (orden: OrdenProduccion) => {
    if (orden.estado === "Completada") return 100;
    if (orden.estado === "Cancelada") return 0;
    if (orden.estado === "Planificada") return 0;

    if (orden.fecha_inicio && orden.fecha_fin_estimada) {
      const inicio = new Date(orden.fecha_inicio).getTime();
      const finEstimado = new Date(orden.fecha_fin_estimada).getTime();
      const ahora = new Date().getTime();

      if (ahora >= finEstimado) return 95;
      if (ahora <= inicio) return 5;

      const progreso = ((ahora - inicio) / (finEstimado - inicio)) * 100;
      return Math.min(Math.max(progreso, 5), 95);
    }

    return orden.estado === "En Proceso" ? 50 : 10;
  };

  const agregarConsumo = () => {
    // Función deprecada - Los consumos se calculan automáticamente
    console.warn(
      "agregarConsumo está deprecado. Los consumos se calculan automáticamente."
    );
  };

  const actualizarConsumo = () => {
    // Función deprecada - Los consumos son solo lectura
    console.warn(
      "actualizarConsumo está deprecado. Los consumos son calculados automáticamente."
    );
  };

  const eliminarConsumo = () => {
    // Función deprecada - Los consumos se calculan automáticamente
    console.warn(
      "eliminarConsumo está deprecado. Los consumos se calculan automáticamente."
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    try {
      const ordenData: OrdenProduccion = {
        orden_produccion_id: editingOrden?.orden_produccion_id || 0,
        orden_venta_id: formData.get("orden_venta_id")
          ? Number.parseInt(formData.get("orden_venta_id") as string)
          : undefined,
        producto_id: Number.parseInt(formData.get("producto_id") as string),
        cantidad_a_producir: Number.parseInt(
          formData.get("cantidad_a_producir") as string
        ),
        fecha_creacion: new Date(formData.get("fecha_creacion") as string),
        fecha_inicio: formData.get("fecha_inicio")
          ? new Date(formData.get("fecha_inicio") as string)
          : undefined,
        fecha_fin_estimada: formData.get("fecha_fin_estimada")
          ? new Date(formData.get("fecha_fin_estimada") as string)
          : new Date(),
        fecha_fin_real: formData.get("fecha_fin_real")
          ? new Date(formData.get("fecha_fin_real") as string)
          : undefined,
        estado: formData.get("estado") as string,
        // Los consumos se calculan automáticamente en el servidor
      };

      if (editingOrden) {
        await updateOrden(editingOrden.orden_produccion_id, ordenData);
      } else {
        await createOrden(ordenData);
      }

      setIsDialogOpen(false);
      setEditingOrden(null);
      setConsumosMateriaPrimaProduccion([]);
    } catch (error) {
      console.error("Error al guardar orden:", error);
    }
  };

  const handleEdit = (orden: OrdenProduccion) => {
    setEditingOrden(orden);
    // Cargar consumos para mostrarlos (solo lectura)
    setConsumosMateriaPrimaProduccion(orden.consumos || []);
    setIsDialogOpen(true);
  };

  const handleView = (orden: OrdenProduccion) => {
    setViewingOrden(orden);
    setIsViewDialogOpen(true);
  };

  const handleDelete = async (orden_produccion_id: number) => {
    try {
      await deleteOrden(orden_produccion_id);
    } catch (error) {
      console.error("Error al eliminar orden:", error);
    }
  };

  const resetForm = () => {
    setEditingOrden(null);
    setConsumosMateriaPrimaProduccion([]);
    setIsDialogOpen(false);
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "Planificada":
        return <Badge variant="secondary">Planificada</Badge>;
      case "En Proceso":
        return <Badge className="bg-blue-100 text-blue-800">En Proceso</Badge>;
      case "Pausada":
        return <Badge className="bg-yellow-100 text-yellow-800">Pausada</Badge>;
      case "Completada":
        return <Badge variant="default">Completada</Badge>;
      case "Cancelada":
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="secondary">{estado}</Badge>;
    }
  };

  const getProductoNombre = (producto_id: number) => {
    const producto = productos.find(
      (p: Producto) => p.producto_id === producto_id
    );
    return producto ? producto.nombre_modelo : `Producto #${producto_id}`;
  };

  const getMaterialUnidad = (materia_prima_id: number) => {
    const material = materiales.find(
      (m: MateriaPrima) => m.materia_prima_id === materia_prima_id
    );
    return material ? material.unidad_medida : "ud";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Cargando órdenes de producción...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Órdenes de Producción
          </h2>
          <p className="text-muted-foreground">
            Gestión y control de la producción industrial
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-gray-800 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Orden de Producción
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto bg-gray-100">
            <DialogHeader>
              <DialogTitle>
                {editingOrden
                  ? "Editar Orden de Producción"
                  : "Nueva Orden de Producción"}
              </DialogTitle>
              <DialogDescription>
                {editingOrden
                  ? "Modifica los datos de la orden"
                  : "Completa los datos de la nueva orden"}
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger
                  value="general"
                  className="bg-gray-200 text-gray-400 data-[state=active]:bg-white data-[state=active]:text-black"
                >
                  Información General
                </TabsTrigger>
                <TabsTrigger
                  value="materiales"
                  className="bg-gray-200 text-gray-400 data-[state=active]:bg-white data-[state=active]:text-black"
                >
                  Consumo de Materiales
                </TabsTrigger>
              </TabsList>

              <form onSubmit={handleSubmit}>
                <TabsContent value="general" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="producto_id">Producto a Producir *</Label>
                      <select
                        id="producto_id"
                        name="producto_id"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        defaultValue={
                          editingOrden?.producto_id || productos[0]?.producto_id
                        }
                        required
                      >
                        {productos.map((producto: Producto) => (
                          <option
                            key={producto.producto_id}
                            value={producto.producto_id}
                          >
                            {producto.nombre_modelo}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cantidad_a_producir">
                        Cantidad a Producir *
                      </Label>
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
                      <Label htmlFor="fecha_creacion">
                        Fecha de Creación *
                      </Label>
                      <Input
                        id="fecha_creacion"
                        name="fecha_creacion"
                        type="datetime-local"
                        defaultValue={
                          editingOrden?.fecha_creacion
                            ? new Date(editingOrden.fecha_creacion)
                                .toISOString()
                                .slice(0, 16)
                            : new Date().toISOString().slice(0, 16)
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fecha_fin_estimada">
                        Fecha Fin Estimada *
                      </Label>
                      <Input
                        id="fecha_fin_estimada"
                        name="fecha_fin_estimada"
                        type="datetime-local"
                        defaultValue={
                          editingOrden?.fecha_fin_estimada
                            ? new Date(editingOrden.fecha_fin_estimada)
                                .toISOString()
                                .slice(0, 16)
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
                            ? new Date(editingOrden.fecha_inicio)
                                .toISOString()
                                .slice(0, 16)
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
                            ? new Date(editingOrden.fecha_fin_real)
                                .toISOString()
                                .slice(0, 16)
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
                  <div className="mb-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <span className="font-semibold">
                          ℹ️ Consumos Automáticos:
                        </span>{" "}
                        Los materiales se calculan automáticamente basándose en
                        los componentes del producto seleccionado y la cantidad
                        a producir. Los consumos se recalcularán si cambias la
                        cantidad.
                      </p>
                    </div>
                  </div>

                  <h4 className="text-lg font-medium">
                    Consumo de Materia Prima (Calculado Automáticamente)
                  </h4>

                  <div className="space-y-3">
                    {consumosMateriaPrimaProduccion &&
                    consumosMateriaPrimaProduccion.length > 0 ? (
                      consumosMateriaPrimaProduccion.map((consumo, index) => {
                        const material = materiales.find(
                          (m: MateriaPrima) =>
                            m.materia_prima_id === consumo.materia_prima_id
                        );
                        return (
                          <Card
                            key={index}
                            className="p-4 bg-white border border-gray-200"
                          >
                            <div className="grid grid-cols-12 gap-3 items-center">
                              <div className="col-span-5">
                                <p className="text-sm font-medium text-gray-600">
                                  Materia Prima
                                </p>
                                <p className="font-semibold text-gray-900">
                                  {material?.nombre ||
                                    `Material #${consumo.materia_prima_id}`}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Stock disponible:{" "}
                                  {material?.stock_actual || 0}{" "}
                                  {material?.unidad_medida || "ud"}
                                </p>
                              </div>

                              <div className="col-span-2 text-center">
                                <p className="text-sm font-medium text-gray-600">
                                  Cantidad Requerida
                                </p>
                                <p className="font-semibold text-lg text-gray-900">
                                  {consumo.cantidad_requerida.toFixed(2)}
                                </p>
                              </div>

                              <div className="col-span-2 text-center">
                                <p className="text-sm font-medium text-gray-600">
                                  Cantidad Usada
                                </p>
                                <p className="font-semibold text-lg text-gray-900">
                                  {consumo.cantidad_usada?.toFixed(2) || "0.00"}
                                </p>
                              </div>

                              <div className="col-span-2 text-center">
                                <p className="text-sm font-medium text-gray-600">
                                  Merma
                                </p>
                                <p className="font-semibold text-lg text-orange-600">
                                  {(consumo.merma_calculada || 0).toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </Card>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 p-4 border border-dashed border-gray-300 rounded-lg">
                        <p className="text-muted-foreground">
                          No hay materiales para este producto. Asegúrate de que
                          el producto tenga componentes definidos.
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className="bg-gray-800 text-white"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-gray-800 text-white">
                    {editingOrden ? "Actualizar" : "Crear"}
                  </Button>
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
              {
                ordenes.filter(
                  (o: OrdenProduccion) => o.estado === "En Proceso"
                ).length
              }
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
              {
                ordenes.filter(
                  (o: OrdenProduccion) => o.estado === "Completada"
                ).length
              }
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
              {
                ordenes.filter(
                  (o: OrdenProduccion) => o.estado === "Planificada"
                ).length
              }
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Órdenes de Producción</CardTitle>
          <CardDescription>
            Control completo del proceso productivo
          </CardDescription>
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
                <TableHead className="hidden md:table-cell">ID</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead className="hidden md:table-cell">Cantidad</TableHead>
                <TableHead className="hidden lg:table-cell">Cliente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="hidden md:table-cell">Progreso</TableHead>
                <TableHead className="hidden lg:table-cell">
                  Fecha Estimada
                </TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrdenes.map((orden: OrdenProduccion) => {
                const progreso = calcularProgreso(orden);
                return (
                  <TableRow key={orden.orden_produccion_id}>
                    <TableCell className="hidden md:table-cell font-medium">
                      OP-{orden.orden_produccion_id}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {getProductoNombre(orden.producto_id)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <span className="md:hidden">
                            {orden.cantidad_a_producir} unidades |{" "}
                          </span>
                          <span className="hidden md:inline">
                            ID: {orden.producto_id}
                          </span>
                        </div>
                        <div className="md:hidden mt-1 flex items-center space-x-2">
                          <div className="flex-none">
                            {getEstadoBadge(orden.estado)}
                          </div>
                          <div className="flex-1">
                            <Progress value={progreso} className="w-16" />
                            <span className="text-xs text-muted-foreground">
                              {progreso.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="font-medium">
                        {orden.cantidad_a_producir}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {getEstadoBadge(orden.estado)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="space-y-1">
                        <Progress value={progreso} className="w-16" />
                        <span className="text-xs text-muted-foreground">
                          {progreso.toFixed(0)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="text-sm">
                        {formatDate(orden.fecha_fin_estimada)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleView(orden)}
                          title="Ver Detalles"
                          className="bg-gray-800 text-white"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">Ver Detalles</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(orden)}
                          title="Editar Orden"
                          className="bg-gray-800 text-white"
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Editar Orden</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleDelete(orden.orden_produccion_id)
                          }
                          title="Eliminar Orden"
                          className="bg-gray-800 text-white"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Eliminar Orden</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
