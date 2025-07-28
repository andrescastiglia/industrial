"use client";

import { useState, useEffect } from "react";
import { useProductos, useMateriaPrima } from "@/hooks/useApi";
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
import { Plus, Edit, Trash2, Search, Package, Layers, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Producto {
  producto_id: number;
  nombre_modelo: string;
  descripcion: string;
  ancho: number;
  alto: number;
  color: string;
  tipo_accionamiento: string;
  // Campos calculados
  componentes?: ComponenteProducto[];
  costo_total?: number;
  fecha_creacion?: string;
}

interface ComponenteProducto {
  producto_id: number;
  materia_prima_id: number;
  cantidad_necesaria: number;
  angulo_corte: string;
  // Datos de la materia prima para mostrar
  nombre_material?: string;
  unidad_medida?: string;
  precio_unitario?: number;
  stock_disponible?: number;
  referencia_proveedor?: string;
}

interface MateriaPrima {
  materia_prima_id: number;
  nombre: string;
  unidad_medida: string;
  stock_actual: number;
  precio_unitario?: number;
  referencia_proveedor: string;
}

  const {
    productos,
    createProducto,
    updateProducto,
    deleteProducto,
    refetch: refetchProductos,
    loading: loadingProductos,
    error: errorProductos,
  } = useProductos() as {
    productos: Producto[];
    createProducto: (data: any) => Promise<any>;
    updateProducto: (id: number, data: any) => Promise<any>;
    deleteProducto: (id: number) => Promise<any>;
    refetch: () => void;
    loading: boolean;
    error: string | null;
  };

  const {
    materiales: materiaPrimaDisponible,
    loading: loadingMateriaPrima,
    error: errorMateriaPrima,
    refetch: refetchMateriaPrima,
  } = useMateriaPrima() as {
    materiales: MateriaPrima[];
    loading: boolean;
    error: string | null;
    refetch: () => void;
  };
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);
  const [viewingProducto, setViewingProducto] = useState<Producto | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Estados para gestión de componentes
  const [componentesTemp, setComponentesTemp] = useState<ComponenteProducto[]>(
    []
  );

  const filteredProductos = productos.filter(
    (producto) =>
      producto.nombre_modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      producto.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      producto.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
      producto.tipo_accionamiento
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (formData: FormData) => {
    const productoData = {
      producto_id: editingProducto?.producto_id,
      nombre_modelo: formData.get("nombre_modelo") as string,
      descripcion: formData.get("descripcion") as string,
      ancho: Number.parseFloat(formData.get("ancho") as string),
      alto: Number.parseFloat(formData.get("alto") as string),
      color: formData.get("color") as string,
      tipo_accionamiento: formData.get("tipo_accionamiento") as string,
      componentes: componentesTemp,
      costo_total: componentesTemp.reduce(
        (acc, comp) =>
          acc + comp.cantidad_necesaria * (comp.precio_unitario || 0),
        0
      ),
      fecha_creacion:
        editingProducto?.fecha_creacion ||
        new Date().toISOString().split("T")[0],
    };

    try {
      if (editingProducto) {
        await updateProducto(editingProducto.producto_id, productoData);
      } else {
        await createProducto(productoData);
      }
      refetchProductos();
    } catch (err) {
      // Puedes mostrar error si lo deseas
    }
    setIsDialogOpen(false);
    setEditingProducto(null);
    setComponentesTemp([]);
  };

  const handleEdit = (producto: Producto) => {
    setEditingProducto(producto);
    setComponentesTemp(producto.componentes || []);
    setIsDialogOpen(true);
  };

  const handleView = (producto: Producto) => {
    setViewingProducto(producto);
    setIsViewDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteProducto(id);
      refetchProductos();
    } catch (err) {
      // Puedes mostrar error si lo deseas
    }
  };

  const resetForm = () => {
    setEditingProducto(null);
    setComponentesTemp([]);
    setIsDialogOpen(false);
  };

  const agregarComponente = () => {
    const nuevoComponente: ComponenteProducto = {
      producto_id: editingProducto?.producto_id || 0,
      materia_prima_id: materiaPrimaDisponible[0].materia_prima_id,
      cantidad_necesaria: 1,
      angulo_corte: "90°",
      nombre_material: materiaPrimaDisponible[0].nombre,
      unidad_medida: materiaPrimaDisponible[0].unidad_medida,
      precio_unitario: materiaPrimaDisponible[0].precio_unitario,
      stock_disponible: materiaPrimaDisponible[0].stock_actual,
      referencia_proveedor: materiaPrimaDisponible[0].referencia_proveedor,
    };
    setComponentesTemp([...componentesTemp, nuevoComponente]);
  };

  const actualizarComponente = (index: number, campo: string, valor: any) => {
    const nuevosComponentes = [...componentesTemp];

    if (campo === "materia_prima_id") {
      const materiaPrima = materiaPrimaDisponible.find(
        (mp) => mp.materia_prima_id === Number.parseInt(valor)
      );
      if (materiaPrima) {
        nuevosComponentes[index] = {
          ...nuevosComponentes[index],
          materia_prima_id: materiaPrima.materia_prima_id,
          nombre_material: materiaPrima.nombre,
          unidad_medida: materiaPrima.unidad_medida,
          precio_unitario: materiaPrima.precio_unitario,
          stock_disponible: materiaPrima.stock_actual,
          referencia_proveedor: materiaPrima.referencia_proveedor,
        };
      }
    } else {
      nuevosComponentes[index] = {
        ...nuevosComponentes[index],
        [campo]:
          campo === "cantidad_necesaria" ? Number.parseFloat(valor) : valor,
      };
    }

    setComponentesTemp(nuevosComponentes);
  };

  const eliminarComponente = (index: number) => {
    setComponentesTemp(componentesTemp.filter((_, i) => i !== index));
  };

  const getColorBadge = (color: string) => {
    const colorMap: { [key: string]: string } = {
      "Gris Metalizado": "bg-gray-100 text-gray-800",
      "Blanco Mate": "bg-gray-50 text-gray-900 border",
      "Negro Industrial": "bg-gray-800 text-white",
      "Azul Corporativo": "bg-blue-100 text-blue-800",
      "Verde Militar": "bg-green-100 text-green-800",
      "Rojo Seguridad": "bg-red-100 text-red-800",
    };

    return (
      <Badge
        className={colorMap[color] || "bg-gray-100 text-gray-800"}
        variant="secondary"
      >
        {color}
      </Badge>
    );
  };

  const verificarDisponibilidadStock = (producto: Producto) => {
    if (!producto.componentes) return true;

    return producto.componentes.every(
      (comp) => (comp.stock_disponible || 0) >= comp.cantidad_necesaria
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Productos</h2>
          <p className="text-muted-foreground">
            Gestión de productos y sus componentes
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Producto
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProducto ? "Editar Producto" : "Nuevo Producto"}
              </DialogTitle>
              <DialogDescription>
                {editingProducto
                  ? "Modifica los datos del producto"
                  : "Completa los datos del nuevo producto"}
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="general">Información General</TabsTrigger>
                <TabsTrigger value="componentes">Componentes</TabsTrigger>
              </TabsList>

              <form action={handleSubmit}>
                <TabsContent value="general" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nombre_modelo">Nombre del Modelo *</Label>
                      <Input
                        id="nombre_modelo"
                        name="nombre_modelo"
                        defaultValue={editingProducto?.nombre_modelo || ""}
                        placeholder="Ej: Puerta Industrial PI-2500"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="color">Color *</Label>
                      <select
                        id="color"
                        name="color"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        defaultValue={
                          editingProducto?.color || "Gris Metalizado"
                        }
                        required
                      >
                        <option value="Gris Metalizado">Gris Metalizado</option>
                        <option value="Blanco Mate">Blanco Mate</option>
                        <option value="Negro Industrial">
                          Negro Industrial
                        </option>
                        <option value="Azul Corporativo">
                          Azul Corporativo
                        </option>
                        <option value="Verde Militar">Verde Militar</option>
                        <option value="Rojo Seguridad">Rojo Seguridad</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="descripcion">Descripción *</Label>
                    <Textarea
                      id="descripcion"
                      name="descripcion"
                      defaultValue={editingProducto?.descripcion || ""}
                      placeholder="Descripción detallada del producto, características y aplicaciones"
                      rows={3}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ancho">Ancho (m) *</Label>
                      <Input
                        id="ancho"
                        name="ancho"
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={editingProducto?.ancho || ""}
                        placeholder="2.50"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="alto">Alto (m) *</Label>
                      <Input
                        id="alto"
                        name="alto"
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={editingProducto?.alto || ""}
                        placeholder="3.00"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tipo_accionamiento">
                      Tipo de Accionamiento *
                    </Label>
                    <Input
                      id="tipo_accionamiento"
                      name="tipo_accionamiento"
                      defaultValue={editingProducto?.tipo_accionamiento || ""}
                      placeholder="Ej: Motor eléctrico con control remoto"
                      required
                    />
                  </div>
                </TabsContent>

                <TabsContent value="componentes" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-lg font-medium">
                      Componentes del Producto
                    </h4>
                    <Button type="button" onClick={agregarComponente} size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar Componente
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {componentesTemp.map((componente, index) => (
                      <Card key={index} className="p-4">
                        <div className="grid grid-cols-12 gap-3 items-end">
                          <div className="col-span-4">
                            <Label className="text-sm">Materia Prima</Label>
                            <select
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background"
                              value={componente.materia_prima_id}
                              onChange={(e) =>
                                actualizarComponente(
                                  index,
                                  "materia_prima_id",
                                  e.target.value
                                )
                              }
                            >
                              {materiaPrimaDisponible.map((mp) => (
                                <option
                                  key={mp.materia_prima_id}
                                  value={mp.materia_prima_id}
                                >
                                  {mp.nombre}
                                </option>
                              ))}
                            </select>
                            <div className="text-xs text-muted-foreground mt-1">
                              Stock: {componente.stock_disponible}{" "}
                              {componente.unidad_medida}
                            </div>
                          </div>

                          <div className="col-span-2">
                            <Label className="text-sm">Cantidad</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={componente.cantidad_necesaria}
                              onChange={(e) =>
                                actualizarComponente(
                                  index,
                                  "cantidad_necesaria",
                                  e.target.value
                                )
                              }
                              className="h-9"
                            />
                            <div className="text-xs text-muted-foreground mt-1">
                              {componente.unidad_medida}
                            </div>
                          </div>

                          <div className="col-span-2">
                            <Label className="text-sm">Ángulo Corte</Label>
                            <select
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background"
                              value={componente.angulo_corte}
                              onChange={(e) =>
                                actualizarComponente(
                                  index,
                                  "angulo_corte",
                                  e.target.value
                                )
                              }
                            >
                              <option value="90°">90°</option>
                              <option value="45°">45°</option>
                              <option value="30°">30°</option>
                              <option value="60°">60°</option>
                              <option value="90°, 45°">90°, 45°</option>
                              <option value="N/A">N/A</option>
                            </select>
                          </div>

                          <div className="col-span-2">
                            <Label className="text-sm">Costo</Label>
                            <div className="h-9 flex items-center text-sm font-medium">
                              S/{" "}
                              {(
                                componente.cantidad_necesaria *
                                (componente.precio_unitario || 0)
                              ).toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              @ S/ {componente.precio_unitario?.toFixed(2)}
                            </div>
                          </div>

                          <div className="col-span-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => eliminarComponente(index)}
                              className="h-9 w-full"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {componente.cantidad_necesaria >
                          (componente.stock_disponible || 0) && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                            ⚠️ Stock insuficiente: Se requieren{" "}
                            {componente.cantidad_necesaria}{" "}
                            {componente.unidad_medida}, disponible:{" "}
                            {componente.stock_disponible}{" "}
                            {componente.unidad_medida}
                          </div>
                        )}
                      </Card>
                    ))}

                    {componentesTemp.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No hay componentes agregados. Haz clic en "Agregar
                        Componente" para comenzar.
                      </div>
                    )}

                    {componentesTemp.length > 0 && (
                      <Card className="p-4 bg-blue-50 border-blue-200">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">
                            Costo Total del Producto:
                          </span>
                          <span className="text-lg font-bold text-blue-700">
                            S/{" "}
                            {componentesTemp
                              .reduce(
                                (acc, comp) =>
                                  acc +
                                  comp.cantidad_necesaria *
                                    (comp.precio_unitario || 0),
                                0
                              )
                              .toFixed(2)}
                          </span>
                        </div>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingProducto ? "Actualizar" : "Crear"}
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
            <CardTitle className="text-sm font-medium">
              Total Productos
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productos.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Con Stock Suficiente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {productos.filter(verificarDisponibilidadStock).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Stock Insuficiente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {productos.filter((p) => !verificarDisponibilidadStock(p)).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Valor Productos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              S/{" "}
              {productos
                .reduce((acc, p) => acc + (p.costo_total || 0), 0)
                .toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Catálogo de Productos</CardTitle>
          <CardDescription>
            Gestión completa de productos y sus componentes
          </CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar productos..."
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
                <TableHead>Producto</TableHead>
                <TableHead className="hidden md:table-cell">
                  Dimensiones
                </TableHead>
                <TableHead className="hidden lg:table-cell">Color</TableHead>
                <TableHead className="hidden lg:table-cell">
                  Componentes
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  Costo Total
                </TableHead>
                <TableHead className="hidden md:table-cell">Stock</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProductos.map((producto) => {
                const stockSuficiente = verificarDisponibilidadStock(producto);
                return (
                  <TableRow key={producto.producto_id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {producto.nombre_modelo}
                        </div>
                        <div className="text-sm text-muted-foreground line-clamp-2">
                          {producto.descripcion}
                        </div>
                        <div className="md:hidden mt-1 space-y-1">
                          <div className="text-sm font-medium">
                            S/ {producto.costo_total?.toFixed(2)} •{" "}
                            {producto.ancho}m × {producto.alto}m
                          </div>
                          <Badge
                            variant={
                              stockSuficiente ? "default" : "destructive"
                            }
                          >
                            {stockSuficiente ? "Disponible" : "Sin Stock"}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="text-sm">
                        <div>
                          {producto.ancho}m × {producto.alto}m
                        </div>
                        <div className="text-muted-foreground">
                          {(producto.ancho * producto.alto).toFixed(2)} m²
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {getColorBadge(producto.color)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center space-x-1">
                        <Layers className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {producto.componentes?.length || 0}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="font-medium">
                        S/ {producto.costo_total?.toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge
                        variant={stockSuficiente ? "default" : "destructive"}
                      >
                        {stockSuficiente ? "Disponible" : "Sin Stock"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleView(producto)}
                        >
                          <span className="sr-only">Ver detalles</span>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(producto)}
                        >
                          <span className="sr-only">Editar</span>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(producto.producto_id)}
                        >
                          <span className="sr-only">Eliminar</span>
                          <Trash2 className="h-4 w-4" />
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

      {/* Dialog para ver detalles */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles del Producto</DialogTitle>
            <DialogDescription>
              Información completa del producto {viewingProducto?.nombre_modelo}
            </DialogDescription>
          </DialogHeader>
          {viewingProducto && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Modelo</Label>
                  <p className="text-sm text-muted-foreground">
                    {viewingProducto.nombre_modelo}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Color</Label>
                  <div className="mt-1">
                    {getColorBadge(viewingProducto.color)}
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Descripción</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {viewingProducto.descripcion}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium">Dimensiones</Label>
                  <p className="text-sm text-muted-foreground">
                    {viewingProducto.ancho}m × {viewingProducto.alto}m
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Área</Label>
                  <p className="text-sm text-muted-foreground">
                    {(viewingProducto.ancho * viewingProducto.alto).toFixed(2)}{" "}
                    m²
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Costo Total</Label>
                  <p className="text-sm font-medium text-green-600">
                    S/ {viewingProducto.costo_total?.toFixed(2)}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">
                  Tipo de Accionamiento
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {viewingProducto.tipo_accionamiento}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">
                  Lista de Componentes
                </Label>
                <div className="mt-2 space-y-2">
                  {viewingProducto.componentes?.map((componente, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded border">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium">
                            {componente.nombre_material}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Ref: {componente.referencia_proveedor}
                          </div>
                          <div className="text-sm mt-1">
                            <span className="font-medium">Cantidad:</span>{" "}
                            {componente.cantidad_necesaria}{" "}
                            {componente.unidad_medida} |
                            <span className="font-medium"> Corte:</span>{" "}
                            {componente.angulo_corte} |
                            <span className="font-medium"> Stock:</span>{" "}
                            {componente.stock_disponible}{" "}
                            {componente.unidad_medida}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="font-medium">
                            S/{" "}
                            {(
                              componente.cantidad_necesaria *
                              (componente.precio_unitario || 0)
                            ).toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            @ S/ {componente.precio_unitario?.toFixed(2)}
                          </div>
                          {componente.cantidad_necesaria >
                            (componente.stock_disponible || 0) && (
                            <Badge
                              variant="destructive"
                              className="mt-1 text-xs"
                            >
                              Stock Insuficiente
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
