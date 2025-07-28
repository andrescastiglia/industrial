"use client";

import { useState, useEffect } from "react";
import { useMateriaPrima, useTiposComponente } from "@/hooks/useApi";
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
  AlertTriangle,
  Package,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

interface TipoComponente {
  tipo_componente_id: number;
  nombre_tipo: string;
}

interface MateriaPrima {
  materia_prima_id: number;
  nombre: string;
  descripcion: string;
  referencia_proveedor: string;
  unidad_medida: string;
  stock_actual: number;
  punto_pedido: number;
  tiempo_entrega_dias: number;
  longitud_estandar_m: number;
  color: string;
  id_tipo_componente: number;
  // Campos adicionales para la gestión
  proveedor?: string;
  precio_unitario?: number;
  ubicacion_almacen?: string;
  fecha_actualizacion?: string;
}

  const {
    materiales: materiaPrima,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    refetch,
    loading,
    error,
  } = useMateriaPrima() as {
    materiales: MateriaPrima[];
    createMaterial: (data: any) => Promise<any>;
    updateMaterial: (id: number, data: any) => Promise<any>;
    deleteMaterial: (id: number) => Promise<any>;
    refetch: () => void;
    loading: boolean;
    error: string | null;
  };

  const {
    tipos: tiposComponente,
    loading: loadingTipos,
    error: errorTipos,
    refetch: refetchTipos,
  } = useTiposComponente() as {
    tipos: TipoComponente[];
    loading: boolean;
    error: string | null;
    refetch: () => void;
  };
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MateriaPrima | null>(
    null
  );

  const filteredMateriales = materiaPrima.filter(
    (material) =>
      material.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.referencia_proveedor
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      material.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tiposComponente
        .find((tc) => tc.tipo_componente_id === material.id_tipo_componente)
        ?.nombre_tipo.toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  const materialesBajoStock = materiaPrima.filter(
    (material) => material.stock_actual <= material.punto_pedido
  );
  const materialesSinStock = materiaPrima.filter(
    (material) => material.stock_actual === 0
  );

  const handleSubmit = async (formData: FormData) => {
    const materialData = {
      materia_prima_id: editingMaterial?.materia_prima_id,
      nombre: formData.get("nombre") as string,
      descripcion: formData.get("descripcion") as string,
      referencia_proveedor: formData.get("referencia_proveedor") as string,
      unidad_medida: formData.get("unidad_medida") as string,
      stock_actual: Number.parseFloat(formData.get("stock_actual") as string),
      punto_pedido: Number.parseFloat(formData.get("punto_pedido") as string),
      tiempo_entrega_dias: Number.parseInt(formData.get("tiempo_entrega_dias") as string),
      longitud_estandar_m: Number.parseFloat(formData.get("longitud_estandar_m") as string),
      color: formData.get("color") as string,
      id_tipo_componente: Number.parseInt(formData.get("id_tipo_componente") as string),
      proveedor: formData.get("proveedor") as string,
      precio_unitario: Number.parseFloat(formData.get("precio_unitario") as string),
      ubicacion_almacen: formData.get("ubicacion_almacen") as string,
      fecha_actualizacion: new Date().toISOString().split("T")[0],
    };

    if (editingMaterial) {
      await updateMaterial(editingMaterial.materia_prima_id, materialData);
    } else {
      await createMaterial(materialData);
    }
    refetch();
    setIsDialogOpen(false);
    setEditingMaterial(null);
  };

  const handleEdit = (material: MateriaPrima) => {
    setEditingMaterial(material);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    await deleteMaterial(id);
    refetch();
  };

  const resetForm = () => {
    setEditingMaterial(null);
    setIsDialogOpen(false);
  };

  const getStockStatus = (material: MateriaPrima) => {
    if (material.stock_actual === 0) {
      return { status: "Sin Stock", variant: "destructive" as const };
    } else if (material.stock_actual <= material.punto_pedido) {
      return { status: "Punto de Pedido", variant: "destructive" as const };
    } else if (material.stock_actual <= material.punto_pedido * 1.5) {
      return { status: "Stock Bajo", variant: "secondary" as const };
    } else {
      return { status: "Stock Normal", variant: "default" as const };
    }
  };

  const getTipoComponenteNombre = (id: number) => {
    return (
      tiposComponente.find((tc) => tc.tipo_componente_id === id)?.nombre_tipo ||
      "No definido"
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Materia Prima</h2>
          <p className="text-muted-foreground">
            Gestión de materias primas y componentes industriales
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Materia Prima
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingMaterial
                  ? "Editar Materia Prima"
                  : "Nueva Materia Prima"}
              </DialogTitle>
              <DialogDescription>
                {editingMaterial
                  ? "Modifica los datos de la materia prima"
                  : "Completa los datos de la nueva materia prima"}
              </DialogDescription>
            </DialogHeader>
            <form action={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    id="nombre"
                    name="nombre"
                    defaultValue={editingMaterial?.nombre || ""}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="id_tipo_componente">
                    Tipo de Componente *
                  </Label>
                  <select
                    id="id_tipo_componente"
                    name="id_tipo_componente"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    defaultValue={
                      editingMaterial?.id_tipo_componente ||
                      tiposComponente[0].tipo_componente_id
                    }
                    required
                  >
                    {tiposComponente.map((tipo) => (
                      <option
                        key={tipo.tipo_componente_id}
                        value={tipo.tipo_componente_id}
                      >
                        {tipo.nombre_tipo}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  name="descripcion"
                  defaultValue={editingMaterial?.descripcion || ""}
                  placeholder="Descripción detallada del material"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="referencia_proveedor">
                    Referencia del Proveedor *
                  </Label>
                  <Input
                    id="referencia_proveedor"
                    name="referencia_proveedor"
                    defaultValue={editingMaterial?.referencia_proveedor || ""}
                    placeholder="Ej: SS304-2MM-1250X2500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unidad_medida">Unidad de Medida *</Label>
                  <select
                    id="unidad_medida"
                    name="unidad_medida"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    defaultValue={editingMaterial?.unidad_medida || "kg"}
                    required
                  >
                    <option value="kg">Kilogramo (kg)</option>
                    <option value="g">Gramo (g)</option>
                    <option value="tonelada">Tonelada (t)</option>
                    <option value="litro">Litro (L)</option>
                    <option value="m">Metro (m)</option>
                    <option value="m2">Metro cuadrado (m²)</option>
                    <option value="m3">Metro cúbico (m³)</option>
                    <option value="unidad">Unidad (ud)</option>
                    <option value="pieza">Pieza (pz)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stock_actual">Stock Actual *</Label>
                  <Input
                    id="stock_actual"
                    name="stock_actual"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={editingMaterial?.stock_actual || ""}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="punto_pedido">Punto de Pedido *</Label>
                  <Input
                    id="punto_pedido"
                    name="punto_pedido"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={editingMaterial?.punto_pedido || ""}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tiempo_entrega_dias">
                    Tiempo Entrega (días) *
                  </Label>
                  <Input
                    id="tiempo_entrega_dias"
                    name="tiempo_entrega_dias"
                    type="number"
                    min="1"
                    defaultValue={editingMaterial?.tiempo_entrega_dias || ""}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="longitud_estandar_m">
                    Longitud Estándar (m) *
                  </Label>
                  <Input
                    id="longitud_estandar_m"
                    name="longitud_estandar_m"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={editingMaterial?.longitud_estandar_m || ""}
                    placeholder="0.00 si no aplica"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Color *</Label>
                  <Input
                    id="color"
                    name="color"
                    defaultValue={editingMaterial?.color || ""}
                    placeholder="Ej: Plateado Natural"
                    required
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-3">
                  Información Adicional de Gestión
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="proveedor">Proveedor</Label>
                    <select
                      id="proveedor"
                      name="proveedor"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      defaultValue={
                        editingMaterial?.proveedor || "MetalCorp S.A."
                      }
                    >
                      <option value="MetalCorp S.A.">MetalCorp S.A.</option>
                      <option value="Aceros del Norte">Aceros del Norte</option>
                      <option value="Herrajes Industriales">
                        Herrajes Industriales
                      </option>
                      <option value="Plásticos Industriales SAC">
                        Plásticos Industriales SAC
                      </option>
                      <option value="Químicos y Lubricantes EIRL">
                        Químicos y Lubricantes EIRL
                      </option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="precio_unitario">Precio Unitario</Label>
                    <Input
                      id="precio_unitario"
                      name="precio_unitario"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={editingMaterial?.precio_unitario || ""}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  <Label htmlFor="ubicacion_almacen">
                    Ubicación en Almacén
                  </Label>
                  <Input
                    id="ubicacion_almacen"
                    name="ubicacion_almacen"
                    defaultValue={editingMaterial?.ubicacion_almacen || ""}
                    placeholder="Ej: A-1-001"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingMaterial ? "Actualizar" : "Crear"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Materiales
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{materiaPrima.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Normal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {
                materiaPrima.filter(
                  (m) => m.stock_actual > m.punto_pedido * 1.5
                ).length
              }
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Punto de Pedido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {materialesBajoStock.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sin Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {materialesSinStock.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Valor Inventario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              S/{" "}
              {materiaPrima
                .reduce(
                  (acc, m) => acc + m.stock_actual * (m.precio_unitario || 0),
                  0
                )
                .toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {(materialesBajoStock.length > 0 || materialesSinStock.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {materialesBajoStock.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center text-orange-800">
                  <AlertTriangle className="mr-2 h-5 w-5" />
                  Materiales en Punto de Pedido
                </CardTitle>
                <CardDescription className="text-orange-700">
                  {materialesBajoStock.length} materiales han alcanzado el punto
                  de pedido
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {materialesBajoStock.slice(0, 3).map((material) => (
                    <div
                      key={material.materia_prima_id}
                      className="flex justify-between items-center p-2 bg-white rounded"
                    >
                      <div>
                        <span className="font-medium">{material.nombre}</span>
                        <div className="text-xs text-orange-600">
                          Entrega: {material.tiempo_entrega_dias} días | Ref:{" "}
                          {material.referencia_proveedor}
                        </div>
                      </div>
                      <span className="text-sm text-orange-600">
                        {material.stock_actual} / {material.punto_pedido}{" "}
                        {material.unidad_medida}
                      </span>
                    </div>
                  ))}
                  {materialesBajoStock.length > 3 && (
                    <div className="text-sm text-orange-600 text-center">
                      +{materialesBajoStock.length - 3} materiales más
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {materialesSinStock.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center text-red-800">
                  <AlertTriangle className="mr-2 h-5 w-5" />
                  Materiales Sin Stock
                </CardTitle>
                <CardDescription className="text-red-700">
                  {materialesSinStock.length} materiales están agotados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {materialesSinStock.slice(0, 3).map((material) => (
                    <div
                      key={material.materia_prima_id}
                      className="flex justify-between items-center p-2 bg-white rounded"
                    >
                      <div>
                        <span className="font-medium">{material.nombre}</span>
                        <div className="text-xs text-red-600">
                          Entrega: {material.tiempo_entrega_dias} días |{" "}
                          {getTipoComponenteNombre(material.id_tipo_componente)}
                        </div>
                      </div>
                      <span className="text-sm text-red-600 font-medium">
                        AGOTADO
                      </span>
                    </div>
                  ))}
                  {materialesSinStock.length > 3 && (
                    <div className="text-sm text-red-600 text-center">
                      +{materialesSinStock.length - 3} materiales más
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Inventario de Materia Prima</CardTitle>
          <CardDescription>
            Gestión completa de materias primas según especificaciones técnicas
          </CardDescription>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, referencia, color..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <select
              className="flex h-10 w-64 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              onChange={(e) => {
                const tipoId = e.target.value;
                if (tipoId === "all") {
                  setSearchTerm("");
                } else {
                  const tipoNombre = tiposComponente.find(
                    (tc) => tc.tipo_componente_id === Number.parseInt(tipoId)
                  )?.nombre_tipo;
                  setSearchTerm(tipoNombre || "");
                }
              }}
            >
              <option value="all">Todos los tipos de componente</option>
              {tiposComponente.map((tipo) => (
                <option
                  key={tipo.tipo_componente_id}
                  value={tipo.tipo_componente_id}
                >
                  {tipo.nombre_tipo}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead className="hidden md:table-cell">Tipo</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="hidden md:table-cell">
                  Punto Pedido
                </TableHead>
                <TableHead className="hidden lg:table-cell">Entrega</TableHead>
                <TableHead className="hidden md:table-cell">Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMateriales.map((material) => {
                const stockStatus = getStockStatus(material);
                return (
                  <TableRow key={material.materia_prima_id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{material.nombre}</div>
                        <div className="text-sm text-muted-foreground md:hidden">
                          <Badge variant={stockStatus.variant} className="mb-1">
                            {stockStatus.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <span className="md:hidden">
                            {getTipoComponenteNombre(
                              material.id_tipo_componente
                            )}{" "}
                            |
                          </span>
                          {material.longitud_estandar_m > 0 &&
                            `${material.longitud_estandar_m}m | `}
                          <span className="hidden md:inline">
                            {material.proveedor}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline">
                        {getTipoComponenteNombre(material.id_tipo_componente)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">
                          {material.stock_actual} {material.unidad_medida}
                        </span>
                        {material.precio_unitario && (
                          <div className="text-xs text-muted-foreground">
                            S/{" "}
                            {(
                              material.stock_actual * material.precio_unitario
                            ).toFixed(2)}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground lg:hidden">
                          {material.tiempo_entrega_dias} días entrega
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {material.punto_pedido} {material.unidad_medida}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {material.tiempo_entrega_dias} días
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={stockStatus.variant}>
                        {stockStatus.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(material)}
                          title="Editar Material"
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Editar Material</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleDelete(material.materia_prima_id)
                          }
                          title="Eliminar Material"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Eliminar Material</span>
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
