"use client";

import { useState, type SyntheticEvent } from "react";
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
  Clock,
  AlertCircle,
  Package,
  Factory,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useOrdenesProduccion } from "@/hooks/useOrdenesProduccion";
import { useMateriaPrima } from "@/hooks/useMateriaPrima";
import { useProductos } from "@/hooks/useProductos";
import { MateriaPrima, OrdenProduccion, Producto } from "@/lib/database";
import {
  getOrdenProduccionEstadoLabel,
  normalizeOrdenProduccionEstado,
  ORDEN_PRODUCCION_ESTADOS,
} from "@/lib/business-constants";

function formatDate(value?: Date | string | null) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-AR");
}

function toDateTimeLocalValue(value?: Date | string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 16);
}

function getEstadoBadge(estado: string) {
  const normalized = normalizeOrdenProduccionEstado(estado);
  const label = getOrdenProduccionEstadoLabel(estado);

  switch (normalized) {
    case "en_proceso":
      return <Badge className="bg-blue-100 text-blue-800">{label}</Badge>;
    case "completada":
      return <Badge variant="default">{label}</Badge>;
    case "cancelada":
      return <Badge variant="destructive">{label}</Badge>;
    default:
      return <Badge variant="secondary">{label}</Badge>;
  }
}

function calcularProgreso(orden: OrdenProduccion) {
  const estado = normalizeOrdenProduccionEstado(orden.estado);

  if (estado === "completada") return 100;
  if (estado === "cancelada") return 0;
  if (estado === "pendiente") return 5;

  if (orden.fecha_inicio && orden.fecha_fin_estimada) {
    const inicio = new Date(orden.fecha_inicio).getTime();
    const finEstimado = new Date(orden.fecha_fin_estimada).getTime();
    const ahora = Date.now();

    if (ahora >= finEstimado) return 95;
    if (ahora <= inicio) return 10;

    const progreso = ((ahora - inicio) / (finEstimado - inicio)) * 100;
    return Math.min(Math.max(progreso, 10), 95);
  }

  return 50;
}

export default function OrdenesProduccionPage() {
  const { ordenes, loading, error, createOrden, updateOrden, deleteOrden } =
    useOrdenesProduccion();
  const { materiales } = useMateriaPrima() as { materiales: MateriaPrima[] };
  const { productos } = useProductos() as { productos: Producto[] };

  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrden, setEditingOrden] = useState<OrdenProduccion | null>(
    null
  );

  const getProductoNombre = (productoId: number) => {
    const producto = productos.find((item) => item.producto_id === productoId);
    return producto?.nombre_modelo || `Producto #${productoId}`;
  };

  const getMaterialNombre = (materiaPrimaId: number) => {
    const material = materiales.find(
      (item) => item.materia_prima_id === materiaPrimaId
    );
    return material?.nombre || `Material #${materiaPrimaId}`;
  };

  const getMaterialUnidad = (materiaPrimaId: number) => {
    const material = materiales.find(
      (item) => item.materia_prima_id === materiaPrimaId
    );
    return material?.unidad_medida || "ud";
  };

  const filteredOrdenes = ordenes.filter((orden) => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return true;

    return (
      String(orden.orden_produccion_id).includes(query) ||
      getProductoNombre(orden.producto_id).toLowerCase().includes(query) ||
      getOrdenProduccionEstadoLabel(orden.estado)
        .toLowerCase()
        .includes(query) ||
      String(orden.orden_venta_id || "").includes(query)
    );
  });

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const payload: OrdenProduccion = {
      orden_produccion_id: editingOrden?.orden_produccion_id || 0,
      orden_venta_id: formData.get("orden_venta_id")
        ? Number(formData.get("orden_venta_id"))
        : null,
      producto_id: Number(formData.get("producto_id")),
      cantidad_a_producir: Number(formData.get("cantidad_a_producir")),
      fecha_creacion: new Date(String(formData.get("fecha_creacion"))),
      fecha_inicio: formData.get("fecha_inicio")
        ? new Date(String(formData.get("fecha_inicio")))
        : null,
      fecha_fin_estimada: formData.get("fecha_fin_estimada")
        ? new Date(String(formData.get("fecha_fin_estimada")))
        : null,
      fecha_fin_real: formData.get("fecha_fin_real")
        ? new Date(String(formData.get("fecha_fin_real")))
        : null,
      estado: String(formData.get("estado")),
    };

    try {
      if (editingOrden) {
        await updateOrden(editingOrden.orden_produccion_id, payload);
      } else {
        await createOrden(payload);
      }

      setEditingOrden(null);
      setIsDialogOpen(false);
    } catch (submitError) {
      console.error("Error al guardar orden:", submitError);
    }
  };

  const handleEdit = (orden: OrdenProduccion) => {
    setEditingOrden(orden);
    setIsDialogOpen(true);
  };

  const handleDelete = async (ordenProduccionId: number) => {
    try {
      await deleteOrden(ordenProduccionId);
    } catch (deleteError) {
      console.error("Error al eliminar orden:", deleteError);
    }
  };

  const resetForm = () => {
    setEditingOrden(null);
    setIsDialogOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Cargando ordenes de produccion...</div>
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
            Ordenes de Produccion
          </h2>
          <p className="text-muted-foreground">
            Gestion y control del proceso productivo
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-gray-800 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Orden
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto bg-gray-100">
            <DialogHeader>
              <DialogTitle>
                {editingOrden
                  ? "Editar Orden de Produccion"
                  : "Nueva Orden de Produccion"}
              </DialogTitle>
              <DialogDescription>
                {editingOrden
                  ? "Actualiza la orden y revisa sus consumos calculados"
                  : "Completa los datos para crear una nueva orden"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="producto_id">Producto</Label>
                  <select
                    id="producto_id"
                    name="producto_id"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    defaultValue={
                      editingOrden?.producto_id ||
                      productos[0]?.producto_id ||
                      ""
                    }
                    required
                    disabled={productos.length === 0}
                  >
                    {productos.length === 0 ? (
                      <option value="" disabled>
                        Cargando productos...
                      </option>
                    ) : (
                      productos.map((producto) => (
                        <option
                          key={producto.producto_id}
                          value={producto.producto_id}
                        >
                          {producto.nombre_modelo}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cantidad_a_producir">Cantidad</Label>
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
                  <Label htmlFor="orden_venta_id">Orden de Venta</Label>
                  <Input
                    id="orden_venta_id"
                    name="orden_venta_id"
                    type="number"
                    min="1"
                    defaultValue={editingOrden?.orden_venta_id || ""}
                    placeholder="Opcional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <select
                    id="estado"
                    name="estado"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    defaultValue={editingOrden?.estado || "pendiente"}
                    required
                  >
                    {ORDEN_PRODUCCION_ESTADOS.map((estado) => (
                      <option key={estado} value={estado}>
                        {getOrdenProduccionEstadoLabel(estado)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fecha_creacion">Fecha de Creacion</Label>
                  <Input
                    id="fecha_creacion"
                    name="fecha_creacion"
                    type="datetime-local"
                    defaultValue={
                      toDateTimeLocalValue(editingOrden?.fecha_creacion) ||
                      new Date().toISOString().slice(0, 16)
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fecha_inicio">Fecha de Inicio</Label>
                  <Input
                    id="fecha_inicio"
                    name="fecha_inicio"
                    type="datetime-local"
                    defaultValue={toDateTimeLocalValue(
                      editingOrden?.fecha_inicio
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fecha_fin_estimada">Fecha Fin Estimada</Label>
                  <Input
                    id="fecha_fin_estimada"
                    name="fecha_fin_estimada"
                    type="datetime-local"
                    defaultValue={toDateTimeLocalValue(
                      editingOrden?.fecha_fin_estimada
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fecha_fin_real">Fecha Fin Real</Label>
                  <Input
                    id="fecha_fin_real"
                    name="fecha_fin_real"
                    type="datetime-local"
                    defaultValue={toDateTimeLocalValue(
                      editingOrden?.fecha_fin_real
                    )}
                  />
                </div>
              </div>

              {editingOrden?.consumos && editingOrden.consumos.length > 0 && (
                <div className="space-y-3 rounded-lg border bg-white p-4">
                  <div>
                    <h3 className="font-semibold">Consumos Calculados</h3>
                    <p className="text-sm text-muted-foreground">
                      Estos valores se recalculan en servidor cuando cambian el
                      producto o la cantidad.
                    </p>
                  </div>
                  <div className="space-y-2">
                    {editingOrden.consumos.map((consumo) => (
                      <div
                        key={consumo.consumo_id}
                        className="flex items-center justify-between rounded border px-3 py-2 text-sm"
                      >
                        <div>
                          <div className="font-medium">
                            {getMaterialNombre(consumo.materia_prima_id)}
                          </div>
                          <div className="text-muted-foreground">
                            Requerido: {consumo.cantidad_requerida}{" "}
                            {getMaterialUnidad(consumo.materia_prima_id)}
                          </div>
                        </div>
                        <div className="text-right text-muted-foreground">
                          Usado: {consumo.cantidad_usada}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="bg-gray-800 text-white"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-gray-800 text-white"
                  disabled={productos.length === 0}
                >
                  {editingOrden ? "Actualizar" : "Crear"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ordenes</CardTitle>
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
                  (orden) =>
                    normalizeOrdenProduccionEstado(orden.estado) ===
                    "en_proceso"
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
                  (orden) =>
                    normalizeOrdenProduccionEstado(orden.estado) ===
                    "completada"
                ).length
              }
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {
                ordenes.filter(
                  (orden) =>
                    normalizeOrdenProduccionEstado(orden.estado) === "pendiente"
                ).length
              }
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ordenes de Produccion</CardTitle>
          <CardDescription>
            Seguimiento completo del proceso productivo
          </CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar ordenes..."
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
                <TableHead className="hidden lg:table-cell">
                  Orden Venta
                </TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="hidden md:table-cell">Progreso</TableHead>
                <TableHead className="hidden lg:table-cell">
                  Fecha Estimada
                </TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrdenes.map((orden) => {
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
                            {orden.cantidad_a_producir} unidades
                          </span>
                          <span className="hidden md:inline">
                            ID producto: {orden.producto_id}
                          </span>
                        </div>
                        <div className="md:hidden mt-1 flex items-center space-x-2">
                          <div>{getEstadoBadge(orden.estado)}</div>
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
                    <TableCell className="hidden lg:table-cell">
                      {orden.orden_venta_id
                        ? `OV-${orden.orden_venta_id}`
                        : "-"}
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
                      {formatDate(orden.fecha_fin_estimada)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(orden)}
                          className="bg-gray-800 text-white"
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Editar orden</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleDelete(orden.orden_produccion_id)
                          }
                          className="bg-gray-800 text-white"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Eliminar orden</span>
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
