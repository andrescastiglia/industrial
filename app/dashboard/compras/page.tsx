"use client";

import { FormEvent, useState } from "react";
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
  ShoppingCart,
  Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCompras } from "@/hooks/useCompras";
import { useProveedores } from "@/hooks/useProveedores";
import { Compra, Proveedor } from "@/lib/database";
import {
  COMPRA_ESTADOS,
  getCompraEstadoLabel,
  normalizeCompraEstado,
} from "@/lib/business-constants";

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

function calcularDiasRetraso(
  fechaEstimada?: Date | string | null,
  fechaReal?: Date | string | null
) {
  if (!fechaEstimada) return 0;

  const actual = fechaReal ? new Date(fechaReal) : new Date();
  const diffTime = actual.getTime() - new Date(fechaEstimada).getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 0;
}

function getEstadoBadge(estado: string) {
  const normalized = normalizeCompraEstado(estado);
  const label = getCompraEstadoLabel(estado);

  switch (normalized) {
    case "recibida":
      return <Badge variant="default">{label}</Badge>;
    case "cancelada":
      return <Badge variant="destructive">{label}</Badge>;
    default:
      return <Badge variant="secondary">{label}</Badge>;
  }
}

export default function ComprasPage() {
  const { compras, loading, error, createCompra, updateCompra, deleteCompra } =
    useCompras() as {
      compras: Compra[];
      loading: boolean;
      error: string | null;
      createCompra: (data: Partial<Compra>) => Promise<Compra>;
      updateCompra: (id: number, data: Partial<Compra>) => Promise<Compra>;
      deleteCompra: (id: number) => Promise<void>;
    };
  const { proveedores } = useProveedores() as {
    proveedores: Proveedor[];
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompra, setEditingCompra] = useState<Compra | null>(null);

  const proveedoresLoaded = proveedores.length > 0;

  const getProveedorNombre = (proveedorId: number) => {
    const proveedor = proveedores.find(
      (item) => item.proveedor_id === proveedorId
    );
    return proveedor?.nombre || `Proveedor #${proveedorId}`;
  };

  const filteredCompras = compras.filter((compra) => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return true;

    return (
      String(compra.compra_id).includes(query) ||
      getProveedorNombre(compra.proveedor_id).toLowerCase().includes(query) ||
      getCompraEstadoLabel(compra.estado).toLowerCase().includes(query) ||
      String(compra.cotizacion_ref || "")
        .toLowerCase()
        .includes(query)
    );
  });

  const comprasConRetraso = compras.filter(
    (compra) =>
      !compra.fecha_recepcion_real &&
      calcularDiasRetraso(compra.fecha_recepcion_estimada) > 0
  );

  const totalComprado = compras.reduce(
    (total, compra) => total + Number(compra.total_compra || 0),
    0
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const payload = {
      proveedor_id: Number(formData.get("proveedor_id")),
      fecha_pedido: new Date(String(formData.get("fecha_pedido"))),
      fecha_recepcion_estimada: formData.get("fecha_recepcion_estimada")
        ? new Date(String(formData.get("fecha_recepcion_estimada")))
        : null,
      fecha_recepcion_real: formData.get("fecha_recepcion_real")
        ? new Date(String(formData.get("fecha_recepcion_real")))
        : null,
      estado: String(formData.get("estado")),
      total_compra: Number(formData.get("total_compra") || 0),
      cotizacion_ref:
        String(formData.get("cotizacion_ref") || "").trim() || null,
    };

    try {
      if (editingCompra) {
        await updateCompra(editingCompra.compra_id, payload);
      } else {
        await createCompra(payload);
      }

      setEditingCompra(null);
      setIsDialogOpen(false);
    } catch {
      // El hook ya expone el error
    }
  };

  const handleEdit = (compra: Compra) => {
    setEditingCompra(compra);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteCompra(id);
    } catch {
      // El hook ya expone el error
    }
  };

  const resetForm = () => {
    setEditingCompra(null);
    setIsDialogOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Cargando compras...</div>
      </div>
    );
  }

  if (error && compras.length === 0) {
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
          <h2 className="text-3xl font-bold tracking-tight">Compras</h2>
          <p className="text-muted-foreground">
            Gestion de ordenes de compra y proveedores
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-gray-800 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Compra
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px] bg-gray-100">
            <DialogHeader>
              <DialogTitle>
                {editingCompra ? "Editar Compra" : "Nueva Compra"}
              </DialogTitle>
              <DialogDescription>
                {editingCompra
                  ? "Actualiza los datos de la compra"
                  : "Completa los datos de la nueva compra"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="proveedor_id">Proveedor</Label>
                <select
                  id="proveedor_id"
                  name="proveedor_id"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  defaultValue={
                    editingCompra?.proveedor_id ||
                    (proveedoresLoaded ? proveedores[0].proveedor_id : "")
                  }
                  required
                  disabled={!proveedoresLoaded}
                >
                  {!proveedoresLoaded ? (
                    <option value="" disabled>
                      Cargando proveedores...
                    </option>
                  ) : (
                    proveedores.map((proveedor) => (
                      <option
                        key={proveedor.proveedor_id}
                        value={proveedor.proveedor_id}
                      >
                        {proveedor.nombre}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cotizacion_ref">Referencia</Label>
                <Input
                  id="cotizacion_ref"
                  name="cotizacion_ref"
                  defaultValue={editingCompra?.cotizacion_ref || ""}
                  placeholder="COT-2026-001"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fecha_pedido">Fecha de Pedido</Label>
                  <Input
                    id="fecha_pedido"
                    name="fecha_pedido"
                    type="date"
                    defaultValue={toDateInputValue(editingCompra?.fecha_pedido)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fecha_recepcion_estimada">
                    Recepcion Estimada
                  </Label>
                  <Input
                    id="fecha_recepcion_estimada"
                    name="fecha_recepcion_estimada"
                    type="date"
                    defaultValue={toDateInputValue(
                      editingCompra?.fecha_recepcion_estimada
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fecha_recepcion_real">Recepcion Real</Label>
                  <Input
                    id="fecha_recepcion_real"
                    name="fecha_recepcion_real"
                    type="date"
                    defaultValue={toDateInputValue(
                      editingCompra?.fecha_recepcion_real
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <select
                    id="estado"
                    name="estado"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    defaultValue={editingCompra?.estado || "pendiente"}
                    required
                  >
                    {COMPRA_ESTADOS.map((estado) => (
                      <option key={estado} value={estado}>
                        {getCompraEstadoLabel(estado)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="total_compra">Total</Label>
                <Input
                  id="total_compra"
                  name="total_compra"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={editingCompra?.total_compra || 0}
                  required
                />
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
                <Button type="submit" className="bg-gray-800 text-white">
                  {editingCompra ? "Actualizar" : "Crear"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Compras</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{compras.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Demoradas</CardTitle>
            <Calendar className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {comprasConRetraso.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {
                compras.filter(
                  (compra) =>
                    normalizeCompraEstado(compra.estado) === "pendiente"
                ).length
              }
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invertido</CardTitle>
            <ShoppingCart className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalComprado)}
            </div>
          </CardContent>
        </Card>
      </div>

      {comprasConRetraso.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Compras con Retraso</CardTitle>
            <CardDescription className="text-red-600">
              {comprasConRetraso.length} compra(s) superaron la fecha estimada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {comprasConRetraso.map((compra) => (
                <div
                  key={compra.compra_id}
                  className="flex justify-between items-center"
                >
                  <span>
                    Compra #{compra.compra_id} -{" "}
                    {getProveedorNombre(compra.proveedor_id)}
                  </span>
                  <Badge variant="destructive">
                    {calcularDiasRetraso(compra.fecha_recepcion_estimada)} dias
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Registro de Compras</CardTitle>
          <CardDescription>
            Gestion completa de ordenes de compra
          </CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar compras..."
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
                <TableHead>Proveedor</TableHead>
                <TableHead className="hidden lg:table-cell">
                  Referencia
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  Fecha Pedido
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                  Recepcion Estimada
                </TableHead>
                <TableHead className="hidden md:table-cell">Estado</TableHead>
                <TableHead className="hidden md:table-cell">Total</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCompras.map((compra) => (
                <TableRow key={compra.compra_id}>
                  <TableCell className="hidden md:table-cell font-medium">
                    #{compra.compra_id}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {getProveedorNombre(compra.proveedor_id)}
                      </div>
                      <div className="md:hidden text-sm text-muted-foreground">
                        {getEstadoBadge(compra.estado)} •{" "}
                        {formatCurrency(compra.total_compra)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                      {compra.cotizacion_ref || "-"}
                    </code>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatDate(compra.fecha_pedido)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex flex-col">
                      <span>{formatDate(compra.fecha_recepcion_estimada)}</span>
                      {!compra.fecha_recepcion_real &&
                        calcularDiasRetraso(compra.fecha_recepcion_estimada) >
                          0 && (
                          <Badge variant="destructive" className="text-xs mt-1">
                            {calcularDiasRetraso(
                              compra.fecha_recepcion_estimada
                            )}{" "}
                            dias retraso
                          </Badge>
                        )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {getEstadoBadge(compra.estado)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatCurrency(compra.total_compra)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(compra)}
                        className="bg-gray-800 text-white"
                      >
                        <span className="sr-only">Editar</span>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(compra.compra_id)}
                        className="bg-gray-800 text-white"
                      >
                        <span className="sr-only">Eliminar</span>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
