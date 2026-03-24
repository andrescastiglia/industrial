"use client";

import { useEffect, useState, type SyntheticEvent } from "react";
import { apiClient } from "@/lib/api";
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
  ShoppingCart,
  Calendar,
  Package,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useProductos } from "@/hooks/useProductos";
import { Cliente, OrdenVenta, Producto } from "@/lib/database";
import { useClientes } from "@/hooks/useClientes";
import {
  getVentaEstadoLabel,
  normalizeVentaEstado,
  VENTA_ESTADOS,
} from "@/lib/business-constants";

type VentaDetalleDraft = {
  tempId: string;
  producto_id: number;
  cantidad: number;
  precio_unitario_venta: number;
};

type DateInputValue = Date | string | null | undefined;

function createVentaDetalleDraft(
  detalle?: Partial<Omit<VentaDetalleDraft, "tempId">>
): VentaDetalleDraft {
  return {
    tempId: crypto.randomUUID(),
    producto_id: detalle?.producto_id ?? 0,
    cantidad: detalle?.cantidad ?? 1,
    precio_unitario_venta: detalle?.precio_unitario_venta ?? 0,
  };
}

function formatDate(value?: Date | string | null) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-AR");
}

function toDateInputValue(value?: Date | string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function calculateDiasRetraso(
  fechaEstimada?: DateInputValue,
  fechaReal?: DateInputValue
) {
  if (!fechaEstimada) return 0;

  const actual = fechaReal ? new Date(fechaReal) : new Date();
  const diffTime = actual.getTime() - new Date(fechaEstimada).getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 0;
}

function getEstadoBadge(estado: string) {
  const normalized = normalizeVentaEstado(estado);
  const label = getVentaEstadoLabel(estado);

  switch (normalized) {
    case "confirmada":
      return <Badge className="bg-blue-100 text-blue-800">{label}</Badge>;
    case "en_produccion":
      return <Badge className="bg-yellow-100 text-yellow-800">{label}</Badge>;
    case "lista":
      return <Badge className="bg-green-100 text-green-800">{label}</Badge>;
    case "entregada":
      return <Badge variant="default">{label}</Badge>;
    case "cancelada":
      return <Badge variant="destructive">{label}</Badge>;
    default:
      return <Badge variant="secondary">{label}</Badge>;
  }
}

export default function VentasPage() {
  const { clientes } = useClientes() as { clientes: Cliente[] };
  const { productos } = useProductos() as { productos: Producto[] };

  const [ordenesVenta, setOrdenesVenta] = useState<OrdenVenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrden, setEditingOrden] = useState<OrdenVenta | null>(null);
  const [viewingOrden, setViewingOrden] = useState<OrdenVenta | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [detallesTemp, setDetallesTemp] = useState<VentaDetalleDraft[]>([]);

  const clientesLoaded = clientes.length > 0;
  const productosLoaded = productos.length > 0;

  const loadOrdenesVenta = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getVentas();
      setOrdenesVenta(data);
      setError(null);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Error al cargar ventas"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrdenesVenta();
  }, []);

  const getClienteNombre = (clienteId: number) => {
    const cliente = clientes.find((item) => item.cliente_id === clienteId);
    return cliente?.nombre || `Cliente #${clienteId}`;
  };

  const getClienteContacto = (clienteId: number) => {
    const cliente = clientes.find((item) => item.cliente_id === clienteId);
    return cliente?.contacto || "Sin contacto";
  };

  const getProductoNombre = (productoId: number) => {
    const producto = productos.find((item) => item.producto_id === productoId);
    return producto?.nombre_modelo || `Producto #${productoId}`;
  };

  const calculateTotalDetalles = () => {
    return detallesTemp.reduce(
      (total, detalle) =>
        total + detalle.cantidad * Number(detalle.precio_unitario_venta || 0),
      0
    );
  };

  const filteredOrdenes = ordenesVenta.filter((orden) => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return true;

    return (
      String(orden.orden_venta_id).includes(query) ||
      getClienteNombre(orden.cliente_id).toLowerCase().includes(query) ||
      getVentaEstadoLabel(orden.estado).toLowerCase().includes(query)
    );
  });

  const ordenesConRetraso = ordenesVenta.filter(
    (orden) =>
      !orden.fecha_entrega_real &&
      calculateDiasRetraso(orden.fecha_entrega_estimada) > 0
  );

  const totalFacturado = ordenesVenta.reduce(
    (total, orden) => total + Number(orden.total_venta || 0),
    0
  );

  const resetForm = () => {
    setEditingOrden(null);
    setDetallesTemp([]);
    setIsDialogOpen(false);
  };

  const agregarDetalle = () => {
    if (!productosLoaded) return;

    setDetallesTemp((current) => [
      ...current,
      createVentaDetalleDraft({
        producto_id: productos[0].producto_id,
        cantidad: 1,
        precio_unitario_venta: 0,
      }),
    ]);
  };

  const actualizarDetalle = (
    index: number,
    updates: Partial<VentaDetalleDraft>
  ) => {
    setDetallesTemp((current) =>
      current.map((detalle, detailIndex) =>
        detailIndex === index ? { ...detalle, ...updates } : detalle
      )
    );
  };

  const eliminarDetalle = (index: number) => {
    setDetallesTemp((current) =>
      current.filter((_, detailIndex) => detailIndex !== index)
    );
  };

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (detallesTemp.length === 0) {
      setError("Debe incluir al menos un producto");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const payload = {
      cliente_id: Number(formData.get("cliente_id")),
      fecha_pedido: new Date(String(formData.get("fecha_pedido"))),
      fecha_entrega_estimada: new Date(
        String(formData.get("fecha_entrega_estimada"))
      ),
      fecha_entrega_real: formData.get("fecha_entrega_real")
        ? new Date(String(formData.get("fecha_entrega_real")))
        : null,
      estado: String(formData.get("estado")),
      total_venta: calculateTotalDetalles(),
      detalles: detallesTemp.map((detalle) => ({
        producto_id: detalle.producto_id,
        cantidad: detalle.cantidad,
        precio_unitario_venta: detalle.precio_unitario_venta,
      })),
    };

    try {
      if (editingOrden) {
        await apiClient.updateVenta(editingOrden.orden_venta_id, payload);
      } else {
        await apiClient.createVenta(payload);
      }

      await loadOrdenesVenta();
      resetForm();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Error al guardar venta"
      );
    }
  };

  const handleEdit = (orden: OrdenVenta) => {
    setEditingOrden(orden);
    setDetallesTemp(
      (orden.detalle || []).map((detalle) =>
        createVentaDetalleDraft({
          producto_id: detalle.producto_id,
          cantidad: detalle.cantidad,
          precio_unitario_venta: Number(detalle.precio_unitario_venta || 0),
        })
      )
    );
    setError(null);
    setIsDialogOpen(true);
  };

  const handleView = (orden: OrdenVenta) => {
    setViewingOrden(orden);
    setIsViewDialogOpen(true);
  };

  const handleDelete = async (ordenVentaId: number) => {
    try {
      await apiClient.deleteVenta(ordenVentaId);
      await loadOrdenesVenta();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Error al eliminar venta"
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Cargando ventas...</div>
      </div>
    );
  }

  if (error && ordenesVenta.length === 0) {
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
            Ordenes de Venta
          </h2>
          <p className="text-muted-foreground">
            Gestion de cotizaciones, pedidos y entregas
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-gray-800 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Orden
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[820px] max-h-[90vh] overflow-y-auto bg-gray-100">
            <DialogHeader>
              <DialogTitle>
                {editingOrden
                  ? "Editar Orden de Venta"
                  : "Nueva Orden de Venta"}
              </DialogTitle>
              <DialogDescription>
                {editingOrden
                  ? "Actualiza los datos de la orden y sus lineas"
                  : "Completa los datos de la venta y sus lineas"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cliente_id">Cliente</Label>
                  <select
                    id="cliente_id"
                    name="cliente_id"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    defaultValue={
                      editingOrden?.cliente_id ||
                      (clientesLoaded ? clientes[0].cliente_id : "")
                    }
                    required
                    disabled={!clientesLoaded}
                  >
                    {!clientesLoaded ? (
                      <option value="" disabled>
                        Cargando clientes...
                      </option>
                    ) : (
                      clientes.map((cliente) => (
                        <option
                          key={cliente.cliente_id}
                          value={cliente.cliente_id}
                        >
                          {cliente.nombre} -{" "}
                          {cliente.contacto || "Sin contacto"}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <select
                    id="estado"
                    name="estado"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    defaultValue={editingOrden?.estado || "cotizacion"}
                    required
                  >
                    {VENTA_ESTADOS.map((estado) => (
                      <option key={estado} value={estado}>
                        {getVentaEstadoLabel(estado)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fecha_pedido">Fecha de Pedido</Label>
                  <Input
                    id="fecha_pedido"
                    name="fecha_pedido"
                    type="date"
                    defaultValue={toDateInputValue(editingOrden?.fecha_pedido)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fecha_entrega_estimada">
                    Entrega Estimada
                  </Label>
                  <Input
                    id="fecha_entrega_estimada"
                    name="fecha_entrega_estimada"
                    type="date"
                    defaultValue={toDateInputValue(
                      editingOrden?.fecha_entrega_estimada
                    )}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fecha_entrega_real">Entrega Real</Label>
                  <Input
                    id="fecha_entrega_real"
                    name="fecha_entrega_real"
                    type="date"
                    defaultValue={toDateInputValue(
                      editingOrden?.fecha_entrega_real
                    )}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-lg font-semibold">Detalle</Label>
                  <Button
                    type="button"
                    onClick={agregarDetalle}
                    size="sm"
                    className="bg-gray-800 text-white"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar Producto
                  </Button>
                </div>

                {detallesTemp.map((detalle, index) => (
                  <div
                    key={detalle.tempId}
                    className="p-4 border rounded-lg space-y-3"
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Linea #{index + 1}</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => eliminarDetalle(index)}
                        className="bg-gray-800 text-white"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Producto</Label>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                          value={detalle.producto_id}
                          onChange={(e) =>
                            actualizarDetalle(index, {
                              producto_id: Number(e.target.value),
                            })
                          }
                        >
                          {productos.map((producto) => (
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
                        <Label>Cantidad</Label>
                        <Input
                          type="number"
                          min="1"
                          value={detalle.cantidad}
                          onChange={(e) =>
                            actualizarDetalle(index, {
                              cantidad: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Precio Unitario</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={detalle.precio_unitario_venta}
                          onChange={(e) =>
                            actualizarDetalle(index, {
                              precio_unitario_venta: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {detallesTemp.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay productos agregados todavia.
                  </div>
                )}

                <div className="text-right text-lg font-bold">
                  Total de la Orden: {formatCurrency(calculateTotalDetalles())}
                </div>
              </div>

              <div className="flex justify-end space-x-2">
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
                  disabled={detallesTemp.length === 0 || !clientesLoaded}
                  className="bg-gray-800 text-white"
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
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ordenesVenta.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Demoradas</CardTitle>
            <Package className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {ordenesConRetraso.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Produccion</CardTitle>
            <Calendar className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {
                ordenesVenta.filter(
                  (orden) =>
                    normalizeVentaEstado(orden.estado) === "en_produccion"
                ).length
              }
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturado</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(totalFacturado)}
            </div>
          </CardContent>
        </Card>
      </div>

      {ordenesConRetraso.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Ordenes con Retraso</CardTitle>
            <CardDescription className="text-red-600">
              {ordenesConRetraso.length} orden(es) superaron su fecha estimada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ordenesConRetraso.map((orden) => (
                <div
                  key={orden.orden_venta_id}
                  className="flex justify-between items-center"
                >
                  <span>
                    Orden #{orden.orden_venta_id} -{" "}
                    {getClienteNombre(orden.cliente_id)}
                  </span>
                  <Badge variant="destructive">
                    {calculateDiasRetraso(orden.fecha_entrega_estimada)} dias
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Registro de Ordenes de Venta</CardTitle>
          <CardDescription>
            Gestion completa de cotizaciones, confirmaciones y entregas
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
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden lg:table-cell">
                  Fecha Pedido
                </TableHead>
                <TableHead className="hidden md:table-cell">Entrega</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="hidden md:table-cell">Total</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrdenes.map((orden) => (
                <TableRow key={orden.orden_venta_id}>
                  <TableCell className="hidden md:table-cell font-medium">
                    #{orden.orden_venta_id}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {getClienteNombre(orden.cliente_id)}
                      </div>
                      <div className="text-sm text-muted-foreground md:hidden">
                        #{orden.orden_venta_id}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {getClienteContacto(orden.cliente_id)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {formatDate(orden.fecha_pedido)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-col">
                      <span>{formatDate(orden.fecha_entrega_estimada)}</span>
                      {!orden.fecha_entrega_real &&
                        calculateDiasRetraso(orden.fecha_entrega_estimada) >
                          0 && (
                          <Badge variant="destructive" className="text-xs mt-1">
                            {calculateDiasRetraso(orden.fecha_entrega_estimada)}{" "}
                            dias retraso
                          </Badge>
                        )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      {getEstadoBadge(orden.estado)}
                      {!orden.fecha_entrega_real &&
                        calculateDiasRetraso(orden.fecha_entrega_estimada) >
                          0 && (
                          <div className="md:hidden mt-1">
                            <Badge variant="destructive" className="text-xs">
                              {calculateDiasRetraso(
                                orden.fecha_entrega_estimada
                              )}
                              d retraso
                            </Badge>
                          </div>
                        )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatCurrency(orden.total_venta)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleView(orden)}
                        className="bg-gray-800 text-white"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">Ver detalles</span>
                      </Button>
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
                        onClick={() => handleDelete(orden.orden_venta_id)}
                        className="bg-gray-800 text-white"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Eliminar orden</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[700px] bg-gray-100">
          <DialogHeader>
            <DialogTitle>Detalle de Orden de Venta</DialogTitle>
            <DialogDescription>
              Informacion completa de la orden #{viewingOrden?.orden_venta_id}
            </DialogDescription>
          </DialogHeader>
          {viewingOrden && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Cliente</Label>
                  <p className="text-sm text-muted-foreground">
                    {getClienteNombre(viewingOrden.cliente_id)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Estado</Label>
                  <div className="mt-1">
                    {getEstadoBadge(viewingOrden.estado)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium">Fecha de Pedido</Label>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(viewingOrden.fecha_pedido)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">
                    Entrega Estimada
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(viewingOrden.fecha_entrega_estimada)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Entrega Real</Label>
                  <p className="text-sm text-muted-foreground">
                    {viewingOrden.fecha_entrega_real
                      ? formatDate(viewingOrden.fecha_entrega_real)
                      : "Pendiente"}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Productos</Label>
                <div className="mt-2 space-y-2">
                  {viewingOrden.detalle?.map((detalle, index) => (
                    <div
                      key={detalle.detalle_orden_venta_id || index}
                      className="p-3 bg-gray-50 rounded"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <div className="font-medium">
                            {getProductoNombre(detalle.producto_id)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Cantidad: {detalle.cantidad}
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <div className="font-medium">
                            {formatCurrency(detalle.precio_unitario_venta)}
                          </div>
                          <div className="text-muted-foreground">
                            Subtotal:{" "}
                            {formatCurrency(
                              Number(detalle.precio_unitario_venta || 0) *
                                detalle.cantidad
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end border-t pt-4">
                <div className="text-lg font-semibold">
                  Total: {formatCurrency(viewingOrden.total_venta)}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
