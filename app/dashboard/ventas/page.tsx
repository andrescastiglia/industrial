"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { useProductos } from "@/hooks/useApi";
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
  DollarSign,
  Package,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DetalleOrdenVenta {
  detalle_orden_venta_id: number;
  orden_venta_id: number;
  producto_id: number;
  cantidad: number;
  precio_unitario_venta: number;
}

interface OrdenVenta {
  orden_venta_id: number;
  cliente_id: number;
  fecha_pedido: string;
  fecha_entrega_estimada: string;
  fecha_entrega_real?: string;
  estado: string;
  total_venta: number;
  detalles: DetalleOrdenVenta[];
}

// Datos de ejemplo para clientes (simulando FK)
const clientes = [
  { cliente_id: 1, nombre: "Constructora ABC", contacto: "Juan Pérez" },
  { cliente_id: 2, nombre: "Industrias XYZ", contacto: "María García" },
  { cliente_id: 3, nombre: "Metales del Sur", contacto: "Carlos López" },
  { cliente_id: 4, nombre: "Aceros Unidos", contacto: "Ana Martínez" },
  { cliente_id: 5, nombre: "Fabricaciones Norte", contacto: "Roberto Silva" },
];

  const [ordenesVenta, setOrdenesVenta] = useState<OrdenVenta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    productos,
    loading: loadingProductos,
    error: errorProductos,
    refetch: refetchProductos,
  } = useProductos() as {
    productos: { producto_id: number; nombre: string; precio_base: number }[];
    loading: boolean;
    error: string | null;
    refetch: () => void;
  };
  useEffect(() => {
    const fetchOrdenesVenta = async () => {
      setLoading(true);
      try {
        const data = await apiClient.getVentas();
        setOrdenesVenta(data as OrdenVenta[]);
      } catch (err) {
        setError("Error al cargar ventas");
      } finally {
        setLoading(false);
      }
    };
    fetchOrdenesVenta();
  }, []);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrden, setEditingOrden] = useState<OrdenVenta | null>(null);
  const [viewingOrden, setViewingOrden] = useState<OrdenVenta | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [detallesTemp, setDetallesTemp] = useState<
    Omit<DetalleOrdenVenta, "detalle_orden_venta_id" | "orden_venta_id">[]
  >([]);

  const filteredOrdenes = ordenesVenta.filter((orden) => {
    const cliente = clientes.find((c) => c.cliente_id === orden.cliente_id);
    return (
      orden.orden_venta_id.toString().includes(searchTerm.toLowerCase()) ||
      cliente?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orden.estado.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-PE");
  };

  const calcularDiasRetraso = (fechaEstimada: string, fechaReal?: string) => {
    const estimada = new Date(fechaEstimada);
    const actual = fechaReal ? new Date(fechaReal) : new Date();
    const diffTime = actual.getTime() - estimada.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const agregarDetalle = () => {
    setDetallesTemp([
      ...detallesTemp,
      {
        producto_id: productos[0].producto_id,
        cantidad: 1,
        precio_unitario_venta: productos[0].precio_base,
      },
    ]);
  };

  const eliminarDetalle = (index: number) => {
    setDetallesTemp(detallesTemp.filter((_, i) => i !== index));
  };

  const actualizarDetalle = (index: number, campo: string, valor: any) => {
    const nuevosDetalles = [...detallesTemp];
    nuevosDetalles[index] = { ...nuevosDetalles[index], [campo]: valor };

    // Si cambia el producto, actualizar el precio base
    if (campo === "producto_id") {
      const producto = productos.find(
        (p) => p.producto_id === Number.parseInt(valor)
      );
      if (producto) {
        nuevosDetalles[index].precio_unitario_venta = producto.precio_base;
      }
    }

    setDetallesTemp(nuevosDetalles);
  };

  const calcularTotalDetalles = () => {
    return detallesTemp.reduce(
      (total, detalle) =>
        total + detalle.cantidad * detalle.precio_unitario_venta,
      0
    );
  };

  const handleSubmit = async (formData: FormData) => {
    const totalVenta = calcularTotalDetalles();
    const ordenId = editingOrden?.orden_venta_id ?? Date.now();
    const nuevaOrden: OrdenVenta = {
      orden_venta_id: ordenId,
      cliente_id: Number.parseInt(formData.get("cliente_id") as string),
      fecha_pedido: formData.get("fecha_pedido") as string,
      fecha_entrega_estimada: formData.get("fecha_entrega_estimada") as string,
      fecha_entrega_real:
        (formData.get("fecha_entrega_real") as string) || undefined,
      estado: formData.get("estado") as string,
      total_venta: totalVenta,
      detalles: detallesTemp.map((detalle, index) => ({
        detalle_orden_venta_id:
          editingOrden?.detalles[index]?.detalle_orden_venta_id || Date.now() + index,
        orden_venta_id: ordenId,
        ...detalle,
      })),
    };
    try {
      if (editingOrden) {
        await apiClient.createVenta(nuevaOrden); // Si hay endpoint de updateVenta, usarlo aquí
      } else {
        await apiClient.createVenta(nuevaOrden);
      }
      const data = await apiClient.getVentas();
      setOrdenesVenta(data as OrdenVenta[]);
    } catch (err) {
      setError("Error al guardar venta");
    }
    setIsDialogOpen(false);
    setEditingOrden(null);
    setDetallesTemp([]);
  };

  const handleEdit = (orden: OrdenVenta) => {
    setEditingOrden(orden);
    setDetallesTemp(
      orden.detalles.map(
        ({ detalle_orden_venta_id, orden_venta_id, ...rest }) => rest
      )
    );
    setIsDialogOpen(true);
  };

  const handleView = (orden: OrdenVenta) => {
    setViewingOrden(orden);
    setIsViewDialogOpen(true);
  };

  const handleDelete = async (orden_venta_id: number) => {
    try {
      // Si hay endpoint de deleteVenta, usarlo aquí
      // await apiClient.deleteVenta(orden_venta_id);
      const data = await apiClient.getVentas();
      setOrdenesVenta(data as OrdenVenta[]);
    } catch (err) {
      setError("Error al eliminar venta");
    }
  };

  const resetForm = () => {
    setEditingOrden(null);
    setDetallesTemp([]);
    setIsDialogOpen(false);
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "Cotización":
        return <Badge variant="secondary">Cotización</Badge>;
      case "Confirmada":
        return <Badge className="bg-blue-100 text-blue-800">Confirmada</Badge>;
      case "En Producción":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">En Producción</Badge>
        );
      case "Lista":
        return <Badge className="bg-green-100 text-green-800">Lista</Badge>;
      case "Entregada":
        return <Badge variant="default">Entregada</Badge>;
      case "Cancelada":
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="secondary">{estado}</Badge>;
    }
  };

  const getClienteNombre = (cliente_id: number) => {
    const cliente = clientes.find((c) => c.cliente_id === cliente_id);
    return cliente ? cliente.nombre : `Cliente #${cliente_id}`;
  };

  const getProductoNombre = (producto_id: number) => {
    const producto = productos.find((p) => p.producto_id === producto_id);
    return producto ? producto.nombre : `Producto #${producto_id}`;
  };

  const ordenesConRetraso = ordenesVenta.filter(
    (orden) =>
      !orden.fecha_entrega_real &&
      calcularDiasRetraso(orden.fecha_entrega_estimada) > 0
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Órdenes de Venta
          </h2>
          <p className="text-muted-foreground">
            Gestión de órdenes de venta y cotizaciones
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Orden
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingOrden
                  ? "Editar Orden de Venta"
                  : "Nueva Orden de Venta"}
              </DialogTitle>
              <DialogDescription>
                {editingOrden
                  ? "Modifica los datos de la orden de venta"
                  : "Completa los datos de la nueva orden de venta"}
              </DialogDescription>
            </DialogHeader>
            <form action={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cliente_id">Cliente</Label>
                  <select
                    id="cliente_id"
                    name="cliente_id"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    defaultValue={
                      editingOrden?.cliente_id || clientes[0].cliente_id
                    }
                    required
                  >
                    {clientes.map((cliente) => (
                      <option
                        key={cliente.cliente_id}
                        value={cliente.cliente_id}
                      >
                        {cliente.nombre} - {cliente.contacto}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <select
                    id="estado"
                    name="estado"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    defaultValue={editingOrden?.estado || "Cotización"}
                    required
                  >
                    <option value="Cotización">Cotización</option>
                    <option value="Confirmada">Confirmada</option>
                    <option value="En Producción">En Producción</option>
                    <option value="Lista">Lista</option>
                    <option value="Entregada">Entregada</option>
                    <option value="Cancelada">Cancelada</option>
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
                    defaultValue={
                      editingOrden?.fecha_pedido ||
                      new Date().toISOString().split("T")[0]
                    }
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
                    defaultValue={editingOrden?.fecha_entrega_estimada || ""}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fecha_entrega_real">Entrega Real</Label>
                  <Input
                    id="fecha_entrega_real"
                    name="fecha_entrega_real"
                    type="date"
                    defaultValue={editingOrden?.fecha_entrega_real || ""}
                  />
                </div>
              </div>

              {/* Sección de Detalles */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-lg font-semibold">
                    Detalles de la Orden
                  </Label>
                  <Button type="button" onClick={agregarDetalle} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar Producto
                  </Button>
                </div>

                {detallesTemp.map((detalle, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Producto #{index + 1}</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => eliminarDetalle(index)}
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
                            actualizarDetalle(
                              index,
                              "producto_id",
                              e.target.value
                            )
                          }
                        >
                          {productos.map((producto) => (
                            <option
                              key={producto.producto_id}
                              value={producto.producto_id}
                            >
                              {producto.nombre}
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
                            actualizarDetalle(
                              index,
                              "cantidad",
                              Number.parseInt(e.target.value)
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Precio Unitario</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={detalle.precio_unitario_venta}
                          onChange={(e) =>
                            actualizarDetalle(
                              index,
                              "precio_unitario_venta",
                              Number.parseFloat(e.target.value)
                            )
                          }
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">
                        Subtotal: S/{" "}
                        {(
                          detalle.cantidad * detalle.precio_unitario_venta
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}

                {detallesTemp.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay productos agregados. Haz clic en "Agregar Producto"
                    para comenzar.
                  </div>
                )}

                {detallesTemp.length > 0 && (
                  <div className="text-right text-lg font-bold">
                    Total de la Orden: S/ {calcularTotalDetalles().toFixed(2)}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={detallesTemp.length === 0}>
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
            <CardTitle className="text-sm font-medium">Total Órdenes</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ordenesVenta.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entregadas</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {ordenesVenta.filter((o) => o.estado === "Entregada").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Proceso</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {
                ordenesVenta.filter((o) =>
                  ["Confirmada", "En Producción", "Lista"].includes(o.estado)
                ).length
              }
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ingresos Totales
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              S/{" "}
              {ordenesVenta
                .filter((o) => o.estado === "Entregada")
                .reduce((acc, o) => acc + o.total_venta, 0)
                .toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerta de órdenes con retraso */}
      {ordenesConRetraso.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">
              ⚠️ Órdenes con Retraso
            </CardTitle>
            <CardDescription className="text-red-600">
              {ordenesConRetraso.length} orden(es) han superado su fecha de
              entrega estimada
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
                    {calcularDiasRetraso(orden.fecha_entrega_estimada)} días de
                    retraso
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Registro de Órdenes de Venta</CardTitle>
          <CardDescription>
            Gestión completa de órdenes de venta y cotizaciones
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
                        #{orden.orden_venta_id} • S/{" "}
                        {orden.total_venta.toFixed(2)}
                      </div>
                      <div className="lg:hidden text-sm text-muted-foreground">
                        {formatDate(orden.fecha_pedido)}
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
                        calcularDiasRetraso(orden.fecha_entrega_estimada) >
                          0 && (
                          <Badge variant="destructive" className="text-xs mt-1">
                            {calcularDiasRetraso(orden.fecha_entrega_estimada)}{" "}
                            días retraso
                          </Badge>
                        )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      {getEstadoBadge(orden.estado)}
                      {!orden.fecha_entrega_real &&
                        calcularDiasRetraso(orden.fecha_entrega_estimada) >
                          0 && (
                          <div className="md:hidden mt-1">
                            <Badge variant="destructive" className="text-xs">
                              {calcularDiasRetraso(
                                orden.fecha_entrega_estimada
                              )}
                              d retraso
                            </Badge>
                          </div>
                        )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    S/ {orden.total_venta.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleView(orden)}
                        title="Ver Detalles"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">Ver Detalles</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(orden)}
                        title="Editar Orden"
                      >
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Editar Orden</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(orden.orden_venta_id)}
                        title="Eliminar Orden"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Eliminar Orden</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog para ver detalles */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Detalles de Orden de Venta</DialogTitle>
            <DialogDescription>
              Información completa de la orden #{viewingOrden?.orden_venta_id}
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
                  {viewingOrden.detalles.map((detalle) => (
                    <div
                      key={detalle.detalle_orden_venta_id}
                      className="p-3 bg-gray-50 rounded"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">
                            {getProductoNombre(detalle.producto_id)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Cantidad: {detalle.cantidad} × S/{" "}
                            {detalle.precio_unitario_venta.toFixed(2)}
                          </div>
                        </div>
                        <span className="font-medium">
                          S/{" "}
                          {(
                            detalle.cantidad * detalle.precio_unitario_venta
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total de la Orden:</span>
                  <span>S/ {viewingOrden.total_venta.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
