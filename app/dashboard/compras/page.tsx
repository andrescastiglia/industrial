"use client";

import { useState } from "react";
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

export default function ComprasPage() {
  const { compras, refetch, createCompra, updateCompra, deleteCompra } =
    useCompras() as {
      compras: Compra[];
      refetch: () => void;
      createCompra: (data: Partial<Compra>) => Promise<Compra>;
      updateCompra: (id: number, data: Partial<Compra>) => Promise<Compra>;
      deleteCompra: (id: number) => Promise<void>;
    };
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompra, setEditingCompra] = useState<Compra | null>(null);

  const { proveedores } = useProveedores() as {
    proveedores: Proveedor[];
  };
  // Ensure proveedores is loaded before rendering
  const proveedoresLoaded = proveedores && proveedores.length > 0;

  const filteredCompras = compras.filter((compra) => {
    const proveedor = proveedores.find(
      (p) => p.proveedor_id === compra.proveedor_id
    );
    return (
      compra.compra_id.toString().includes(searchTerm.toLowerCase()) ||
      proveedor?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      compra.estado.toLowerCase().includes(searchTerm.toLowerCase()) ||
      compra.cotizacion_ref.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("es-AR");
  };

  const calcularDiasRetraso = (fechaEstimada: Date, fechaReal?: Date) => {
    const estimada = new Date(fechaEstimada);
    const actual = fechaReal ?? new Date();
    const diffTime = actual.getTime() - estimada.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const compraData: Compra = {
      compra_id: editingCompra ? editingCompra.compra_id : 0,
      proveedor_id: Number(formData.get("proveedor_id")),
      fecha_pedido: new Date(formData.get("fecha_pedido") as string),
      fecha_recepcion_estimada: new Date(
        formData.get("fecha_recepcion_estimada") as string
      ),
      fecha_recepcion_real: formData.get("fecha_recepcion_real")
        ? new Date(formData.get("fecha_recepcion_real") as string)
        : undefined,
      estado: formData.get("estado") as string,
      total_compra: Number(formData.get("total_compra")),
      cotizacion_ref: formData.get("cotizacion_ref") as string,
    };

    try {
      if (editingCompra) {
        await updateCompra(editingCompra.compra_id, compraData);
      } else {
        await createCompra(compraData);
      }
      refetch();
      setIsDialogOpen(false);
      setEditingCompra(null);
    } catch {
      // Manejo de error opcional
    }
  };

  const handleEdit = (compra: Compra) => {
    setEditingCompra(compra);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteCompra(id);
      refetch();
    } catch {
      // Manejo de error opcional
    }
  };

  const resetForm = () => {
    setEditingCompra(null);
    setIsDialogOpen(false);
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "Pendiente":
        return <Badge variant="secondary">Pendiente</Badge>;
      case "Recibida":
        return <Badge variant="default">Recibida</Badge>;
      case "Cancelada":
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="secondary">{estado}</Badge>;
    }
  };

  const getProveedorNombre = (proveedor_id: number) => {
    const proveedor = proveedores.find((p) => p.proveedor_id === proveedor_id);
    return proveedor ? proveedor.nombre : `Proveedor #${proveedor_id}`;
  };

  const comprasConRetraso = compras.filter(
    (compra) =>
      !compra.fecha_recepcion_real &&
      calcularDiasRetraso(compra.fecha_recepcion_estimada) > 0
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Compras</h2>
          <p className="text-muted-foreground">
            Gestión de órdenes de compra y proveedores
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Compra
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingCompra ? "Editar Compra" : "Nueva Compra"}
              </DialogTitle>
              <DialogDescription>
                {editingCompra
                  ? "Modifica los datos de la compra"
                  : "Completa los datos de la nueva compra"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <Label htmlFor="cotizacion_ref">Referencia de Cotización</Label>
                <Input
                  id="cotizacion_ref"
                  name="cotizacion_ref"
                  defaultValue={
                    editingCompra?.cotizacion_ref ||
                    `COT-${new Date().getFullYear()}-${String(
                      compras.length + 1
                    ).padStart(3, "0")}`
                  }
                  placeholder="COT-2024-001"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fecha_pedido">Fecha de Pedido</Label>
                  <Input
                    id="fecha_pedido"
                    name="fecha_pedido"
                    type="date"
                    defaultValue={
                      editingCompra?.fecha_pedido
                        ? new Date(editingCompra.fecha_pedido)
                            .toISOString()
                            .slice(0, 10)
                        : ""
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fecha_recepcion_estimada">
                    Recepción Estimada
                  </Label>
                  <Input
                    id="fecha_recepcion_estimada"
                    name="fecha_recepcion_estimada"
                    type="date"
                    defaultValue={
                      editingCompra?.fecha_recepcion_estimada
                        ? new Date(editingCompra.fecha_recepcion_estimada)
                            .toISOString()
                            .slice(0, 10)
                        : ""
                    }
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fecha_recepcion_real">Recepción Real</Label>
                  <Input
                    id="fecha_recepcion_real"
                    name="fecha_recepcion_real"
                    type="date"
                    defaultValue={
                      editingCompra?.fecha_recepcion_real
                        ? new Date(editingCompra.fecha_recepcion_real)
                            .toISOString()
                            .slice(0, 10)
                        : ""
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <select
                    id="estado"
                    name="estado"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    defaultValue={editingCompra?.estado || "Pendiente"}
                    required
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="Recibida">Recibida</option>
                    <option value="Cancelada">Cancelada</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="total_compra">Total de Compra</Label>
                <Input
                  id="total_compra"
                  name="total_compra"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={editingCompra?.total_compra || ""}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit">
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
            <CardTitle className="text-sm font-medium">Demorada</CardTitle>
            <Calendar className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {
                compras.filter(
                  (c) =>
                    c.fecha_recepcion_real == null &&
                    c.fecha_recepcion_estimada >= new Date()
                ).length
              }
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendiente</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {compras.filter((c) => c.fecha_recepcion_real == null).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerta de compras con retraso */}
      {comprasConRetraso.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">
              ⚠️ Compras con Retraso
            </CardTitle>
            <CardDescription className="text-red-600">
              {comprasConRetraso.length} compra(s) han superado su fecha de
              recepción estimada
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
                    {calcularDiasRetraso(compra.fecha_recepcion_estimada)} días
                    de retraso
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
            Gestión completa de órdenes de compra
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
                  Cotización
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  Fecha Pedido
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                  Recepción Estimada
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
                        {getEstadoBadge(compra.estado)} • S/{" "}
                        {compra.total_compra.toFixed(2)}
                      </div>
                      <div className="md:hidden text-xs text-muted-foreground mt-1">
                        {formatDate(compra.fecha_pedido)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                      {compra.cotizacion_ref}
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
                            días retraso
                          </Badge>
                        )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {getEstadoBadge(compra.estado)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    S/ {compra.total_compra.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(compra)}
                      >
                        <span className="sr-only">Editar</span>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(compra.compra_id)}
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
