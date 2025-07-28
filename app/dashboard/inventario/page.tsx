"use client";

import { useState, useEffect } from "react";
import { useApi, useTiposComponente } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  Minus,
  Search,
  AlertTriangle,
  Package,
  Clock,
  Layers,
  TrendingUp,
  TrendingDown,
  RotateCcw,
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
}

interface MovimientoInventario {
  movimiento_id: number;
  materia_prima_id: number;
  tipo_movimiento: "Entrada" | "Salida" | "Ajuste";
  cantidad: number;
  motivo: string;
  fecha: string;
  usuario: string;
}

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
  const [materiaPrima, setMateriaPrima] = useState<MateriaPrima[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const { get, post } = useApi();
  const [searchTerm, setSearchTerm] = useState("");
  const [isMovimientoDialogOpen, setIsMovimientoDialogOpen] = useState(false);
  const [materialSeleccionado, setMaterialSeleccionado] =
    useState<MateriaPrima | null>(null);

  useEffect(() => {
    const loadInventario = async () => {
      const data = await get("/api/inventario");
      if (data) setMateriaPrima(data);
      const movs = await get("/api/inventario/movimientos");
      if (movs) setMovimientos(movs);
    };
    loadInventario();
  }, [get]);

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
  const materialesStockNormal = materiaPrima.filter(
    (material) => material.stock_actual > material.punto_pedido * 1.5
  );

  const handleMovimientoStock = async (formData: FormData) => {
    if (!materialSeleccionado) return;
    const tipoMovimiento = formData.get("tipo_movimiento") as
      | "Entrada"
      | "Salida"
      | "Ajuste";
    const cantidad = Number.parseFloat(formData.get("cantidad") as string);
    const motivo = formData.get("motivo") as string;
    const movimientoData = {
      materia_prima_id: materialSeleccionado.materia_prima_id,
      tipo_movimiento: tipoMovimiento,
      cantidad,
      motivo,
    };
    const res = await post("/api/inventario/movimientos", movimientoData);
    if (res) {
      const data = await get("/api/inventario");
      if (data) setMateriaPrima(data);
      const movs = await get("/api/inventario/movimientos");
      if (movs) setMovimientos(movs);
    }
    setIsMovimientoDialogOpen(false);
    setMaterialSeleccionado(null);
  };

  const abrirMovimientoDialog = (
    material: MateriaPrima,
    _tipoMovimiento: "Entrada" | "Salida"
  ) => {
    setMaterialSeleccionado(material);
    setIsMovimientoDialogOpen(true);
  };

  const resetForm = () => {
    setMaterialSeleccionado(null);
    setIsMovimientoDialogOpen(false);
  };

  const getStockStatus = (material: MateriaPrima) => {
    if (material.stock_actual === 0) {
      return {
        status: "Sin Stock",
        variant: "destructive" as const,
        color: "text-red-600",
      };
    } else if (material.stock_actual <= material.punto_pedido) {
      return {
        status: "Punto de Pedido",
        variant: "destructive" as const,
        color: "text-orange-600",
      };
    } else if (material.stock_actual <= material.punto_pedido * 1.5) {
      return {
        status: "Stock Bajo",
        variant: "secondary" as const,
        color: "text-yellow-600",
      };
    } else {
      return {
        status: "Stock Normal",
        variant: "default" as const,
        color: "text-green-600",
      };
    }
  };

  const getTipoComponenteNombre = (id: number) => {
    return (
      tiposComponente.find((tc) => tc.tipo_componente_id === id)?.nombre_tipo ||
      "No definido"
    );
  };

  const getColorBadge = (color: string) => {
    const colorMap: { [key: string]: string } = {
      "Plateado Natural": "bg-gray-100 text-gray-800",
      "Plateado Mate": "bg-gray-200 text-gray-900",
      "Amarillo Transparente": "bg-yellow-100 text-yellow-800",
      "Natural Translúcido": "bg-blue-50 text-blue-700",
      "Negro Laminado": "bg-gray-800 text-white",
      Galvanizado: "bg-zinc-100 text-zinc-800",
      Dorado: "bg-yellow-200 text-yellow-900",
      "Cobre Brillante": "bg-orange-100 text-orange-800",
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

  const calcularValorInventario = () => {
    return materiaPrima.reduce((acc, m) => acc + m.stock_actual, 0);
  };

  const getMovimientoIcon = (tipo: string) => {
    switch (tipo) {
      case "Entrada":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "Salida":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case "Ajuste":
        return <RotateCcw className="h-4 w-4 text-blue-600" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Control de Inventario
          </h2>
          <p className="text-muted-foreground">
            Gestión de stock y movimientos de materia prima
          </p>
        </div>
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
            <p className="text-xs text-muted-foreground">Items en inventario</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Normal</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {materialesStockNormal.length}
            </div>
            <p className="text-xs text-muted-foreground">Sobre punto pedido</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Punto de Pedido
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {materialesBajoStock.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Requieren reposición
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sin Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {materialesSinStock.length}
            </div>
            <p className="text-xs text-muted-foreground">Agotados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Movimientos Hoy
            </CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                movimientos.filter(
                  (m) => m.fecha === new Date().toISOString().split("T")[0]
                ).length
              }
            </div>
            <p className="text-xs text-muted-foreground">Transacciones</p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas de Stock */}
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
                  {materialesBajoStock.length} materiales requieren reposición
                  urgente
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
                        <div className="text-xs text-orange-600 flex items-center space-x-2">
                          <Clock className="h-3 w-3" />
                          <span>
                            Entrega: {material.tiempo_entrega_dias} días
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-orange-600 font-medium">
                          {material.stock_actual} / {material.punto_pedido}{" "}
                          {material.unidad_medida}
                        </span>
                      </div>
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
                  {materialesSinStock.length} materiales están completamente
                  agotados
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
                          {getTipoComponenteNombre(material.id_tipo_componente)}{" "}
                          | Ref: {material.referencia_proveedor}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="destructive" className="text-xs">
                          AGOTADO
                        </Badge>
                        <div className="text-xs text-red-600 mt-1">
                          Entrega: {material.tiempo_entrega_dias} días
                        </div>
                      </div>
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
          <CardTitle>Inventario de Materiales</CardTitle>
          <CardDescription>
            Control de stock de materia prima registrada en el sistema
          </CardDescription>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar materiales en inventario..."
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
                <TableHead className="hidden lg:table-cell">
                  Referencia
                </TableHead>
                <TableHead>Stock Actual</TableHead>
                <TableHead className="hidden md:table-cell">
                  Punto Pedido
                </TableHead>
                <TableHead className="hidden lg:table-cell">Color</TableHead>
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
                          {material.longitud_estandar_m > 0 &&
                            `${material.longitud_estandar_m}m | `}
                          <span className="md:hidden">
                            {getTipoComponenteNombre(
                              material.id_tipo_componente
                            )}
                          </span>
                          <span className="hidden md:inline">
                            ID: {material.materia_prima_id}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline">
                        {getTipoComponenteNombre(material.id_tipo_componente)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                        {material.referencia_proveedor}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className={`font-medium ${stockStatus.color}`}>
                          {material.stock_actual} {material.unidad_medida}
                        </span>
                        <div className="text-xs text-muted-foreground flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{material.tiempo_entrega_dias} días</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-sm">
                        {material.punto_pedido} {material.unidad_medida}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {getColorBadge(material.color)}
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
                          onClick={() =>
                            abrirMovimientoDialog(material, "Entrada")
                          }
                          className="text-green-600 hover:text-green-700"
                          title="Entrada de Stock"
                        >
                          <Plus className="h-4 w-4" />
                          <span className="sr-only">Entrada de Stock</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            abrirMovimientoDialog(material, "Salida")
                          }
                          className="text-red-600 hover:text-red-700"
                          disabled={material.stock_actual === 0}
                          title="Salida de Stock"
                        >
                          <Minus className="h-4 w-4" />
                          <span className="sr-only">Salida de Stock</span>
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

      {/* Últimos Movimientos */}
      {movimientos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Últimos Movimientos de Inventario</CardTitle>
            <CardDescription>
              Historial de entradas, salidas y ajustes de stock
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {movimientos.slice(0, 5).map((movimiento) => {
                const material = materiaPrima.find(
                  (m) => m.materia_prima_id === movimiento.materia_prima_id
                );
                return (
                  <div
                    key={movimiento.movimiento_id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded"
                  >
                    <div className="flex items-center space-x-3">
                      {getMovimientoIcon(movimiento.tipo_movimiento)}
                      <div>
                        <div className="font-medium">{material?.nombre}</div>
                        <div className="text-sm text-muted-foreground">
                          {movimiento.motivo}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {movimiento.tipo_movimiento === "Salida" ? "-" : "+"}
                        {movimiento.cantidad} {material?.unidad_medida}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {movimiento.fecha} | {movimiento.usuario}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog para Movimientos de Stock */}
      <Dialog
        open={isMovimientoDialogOpen}
        onOpenChange={setIsMovimientoDialogOpen}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Movimiento de Stock</DialogTitle>
            <DialogDescription>
              {materialSeleccionado && (
                <>
                  Registrar movimiento para:{" "}
                  <strong>{materialSeleccionado.nombre}</strong>
                  <br />
                  Stock actual:{" "}
                  <strong>
                    {materialSeleccionado.stock_actual}{" "}
                    {materialSeleccionado.unidad_medida}
                  </strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <form action={handleMovimientoStock} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tipo_movimiento">Tipo de Movimiento</Label>
              <select
                id="tipo_movimiento"
                name="tipo_movimiento"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                required
              >
                <option value="Entrada">Entrada - Agregar stock</option>
                <option value="Salida">Salida - Reducir stock</option>
                <option value="Ajuste">
                  Ajuste - Establecer cantidad exacta
                </option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cantidad">Cantidad</Label>
              <Input
                id="cantidad"
                name="cantidad"
                type="number"
                step="0.01"
                min="0"
                placeholder={`Cantidad en ${materialSeleccionado?.unidad_medida}`}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo del Movimiento</Label>
              <Textarea
                id="motivo"
                name="motivo"
                placeholder="Describe el motivo del movimiento (ej: Recepción de compra, Consumo en producción, Ajuste por inventario físico)"
                rows={3}
                required
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <Button type="submit">Registrar Movimiento</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
