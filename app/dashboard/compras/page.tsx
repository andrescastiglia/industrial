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
import { Plus, Edit, Trash2, Search, ShoppingCart, Calendar, DollarSign } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Compra {
  compra_id: number
  proveedor_id: number
  fecha_pedido: string
  fecha_recepcion_estimada: string
  fecha_recepcion_real?: string
  estado: string
  total_compra: number
  cotizacion_ref: string
}

// Datos de ejemplo para proveedores (simulando FK)
const proveedores = [
  { proveedor_id: 1, nombre: "Aceros del Norte S.A.C." },
  { proveedor_id: 2, nombre: "Metales Industriales Lima" },
  { proveedor_id: 3, nombre: "Suministros Técnicos Perú" },
  { proveedor_id: 4, nombre: "Materiales Especializados S.R.L." },
  { proveedor_id: 5, nombre: "Distribuidora Industrial del Sur" },
]

const comprasIniciales: Compra[] = [
  {
    compra_id: 1,
    proveedor_id: 1,
    fecha_pedido: "2024-01-10",
    fecha_recepcion_estimada: "2024-01-20",
    fecha_recepcion_real: "2024-01-19",
    estado: "Recibida",
    total_compra: 15750.0,
    cotizacion_ref: "COT-2024-001",
  },
  {
    compra_id: 2,
    proveedor_id: 2,
    fecha_pedido: "2024-01-15",
    fecha_recepcion_estimada: "2024-01-25",
    estado: "En Tránsito",
    total_compra: 8900.5,
    cotizacion_ref: "COT-2024-002",
  },
  {
    compra_id: 3,
    proveedor_id: 3,
    fecha_pedido: "2024-01-18",
    fecha_recepcion_estimada: "2024-01-22",
    estado: "Confirmada",
    total_compra: 12300.75,
    cotizacion_ref: "COT-2024-003",
  },
  {
    compra_id: 4,
    proveedor_id: 4,
    fecha_pedido: "2024-01-12",
    fecha_recepcion_estimada: "2024-01-18",
    estado: "En Tránsito",
    total_compra: 5600.25,
    cotizacion_ref: "COT-2024-004",
  },
  {
    compra_id: 5,
    proveedor_id: 5,
    fecha_pedido: "2024-01-08",
    fecha_recepcion_estimada: "2024-01-16",
    estado: "Pendiente",
    total_compra: 9800.0,
    cotizacion_ref: "COT-2024-005",
  },
]

export default function ComprasPage() {
  const [compras, setCompras] = useState<Compra[]>(comprasIniciales)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCompra, setEditingCompra] = useState<Compra | null>(null)

  const filteredCompras = compras.filter((compra) => {
    const proveedor = proveedores.find((p) => p.proveedor_id === compra.proveedor_id)
    return (
      compra.compra_id.toString().includes(searchTerm.toLowerCase()) ||
      proveedor?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      compra.estado.toLowerCase().includes(searchTerm.toLowerCase()) ||
      compra.cotizacion_ref.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-PE")
  }

  const calcularDiasRetraso = (fechaEstimada: string, fechaReal?: string) => {
    const estimada = new Date(fechaEstimada)
    const actual = fechaReal ? new Date(fechaReal) : new Date()
    const diffTime = actual.getTime() - estimada.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 0 ? diffDays : 0
  }

  const handleSubmit = (formData: FormData) => {
    const newCompra: Compra = {
      compra_id: editingCompra?.compra_id || Date.now(),
      proveedor_id: Number.parseInt(formData.get("proveedor_id") as string),
      fecha_pedido: formData.get("fecha_pedido") as string,
      fecha_recepcion_estimada: formData.get("fecha_recepcion_estimada") as string,
      fecha_recepcion_real: (formData.get("fecha_recepcion_real") as string) || undefined,
      estado: formData.get("estado") as string,
      total_compra: Number.parseFloat(formData.get("total_compra") as string),
      cotizacion_ref: formData.get("cotizacion_ref") as string,
    }

    if (editingCompra) {
      setCompras(compras.map((compra) => (compra.compra_id === editingCompra.compra_id ? newCompra : compra)))
    } else {
      setCompras([...compras, newCompra])
    }

    setIsDialogOpen(false)
    setEditingCompra(null)
  }

  const handleEdit = (compra: Compra) => {
    setEditingCompra(compra)
    setIsDialogOpen(true)
  }

  const handleDelete = (compra_id: number) => {
    setCompras(compras.filter((compra) => compra.compra_id !== compra_id))
  }

  const resetForm = () => {
    setEditingCompra(null)
    setIsDialogOpen(false)
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "Pendiente":
        return <Badge variant="secondary">Pendiente</Badge>
      case "Confirmada":
        return <Badge className="bg-blue-100 text-blue-800">Confirmada</Badge>
      case "En Tránsito":
        return <Badge className="bg-yellow-100 text-yellow-800">En Tránsito</Badge>
      case "Recibida":
        return <Badge variant="default">Recibida</Badge>
      case "Cancelada":
        return <Badge variant="destructive">Cancelada</Badge>
      default:
        return <Badge variant="secondary">{estado}</Badge>
    }
  }

  const getProveedorNombre = (proveedor_id: number) => {
    const proveedor = proveedores.find((p) => p.proveedor_id === proveedor_id)
    return proveedor ? proveedor.nombre : `Proveedor #${proveedor_id}`
  }

  const comprasConRetraso = compras.filter(
    (compra) => !compra.fecha_recepcion_real && calcularDiasRetraso(compra.fecha_recepcion_estimada) > 0,
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Compras</h2>
          <p className="text-muted-foreground">Gestión de órdenes de compra y proveedores</p>
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
              <DialogTitle>{editingCompra ? "Editar Compra" : "Nueva Compra"}</DialogTitle>
              <DialogDescription>
                {editingCompra ? "Modifica los datos de la compra" : "Completa los datos de la nueva compra"}
              </DialogDescription>
            </DialogHeader>
            <form action={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="proveedor_id">Proveedor</Label>
                <select
                  id="proveedor_id"
                  name="proveedor_id"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  defaultValue={editingCompra?.proveedor_id || proveedores[0].proveedor_id}
                  required
                >
                  {proveedores.map((proveedor) => (
                    <option key={proveedor.proveedor_id} value={proveedor.proveedor_id}>
                      {proveedor.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cotizacion_ref">Referencia de Cotización</Label>
                <Input
                  id="cotizacion_ref"
                  name="cotizacion_ref"
                  defaultValue={
                    editingCompra?.cotizacion_ref ||
                    `COT-${new Date().getFullYear()}-${String(compras.length + 1).padStart(3, "0")}`
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
                    defaultValue={editingCompra?.fecha_pedido || new Date().toISOString().split("T")[0]}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fecha_recepcion_estimada">Recepción Estimada</Label>
                  <Input
                    id="fecha_recepcion_estimada"
                    name="fecha_recepcion_estimada"
                    type="date"
                    defaultValue={editingCompra?.fecha_recepcion_estimada || ""}
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
                    defaultValue={editingCompra?.fecha_recepcion_real || ""}
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
                    <option value="Confirmada">Confirmada</option>
                    <option value="En Tránsito">En Tránsito</option>
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
                <Button type="submit">{editingCompra ? "Actualizar" : "Crear"}</Button>
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
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Calendar className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {compras.filter((c) => c.estado === "Pendiente").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Tránsito</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {compras.filter((c) => c.estado === "En Tránsito").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recibidas</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {compras.filter((c) => c.estado === "Recibida").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerta de compras con retraso */}
      {comprasConRetraso.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">⚠️ Compras con Retraso</CardTitle>
            <CardDescription className="text-red-600">
              {comprasConRetraso.length} compra(s) han superado su fecha de recepción estimada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {comprasConRetraso.map((compra) => (
                <div key={compra.compra_id} className="flex justify-between items-center">
                  <span>
                    Compra #{compra.compra_id} - {getProveedorNombre(compra.proveedor_id)}
                  </span>
                  <Badge variant="destructive">
                    {calcularDiasRetraso(compra.fecha_recepcion_estimada)} días de retraso
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
          <CardDescription>Gestión completa de órdenes de compra</CardDescription>
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
                <TableHead>ID</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Cotización</TableHead>
                <TableHead>Fecha Pedido</TableHead>
                <TableHead>Recepción Estimada</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCompras.map((compra) => (
                <TableRow key={compra.compra_id}>
                  <TableCell className="font-medium">#{compra.compra_id}</TableCell>
                  <TableCell>{getProveedorNombre(compra.proveedor_id)}</TableCell>
                  <TableCell>
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">{compra.cotizacion_ref}</code>
                  </TableCell>
                  <TableCell>{formatDate(compra.fecha_pedido)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{formatDate(compra.fecha_recepcion_estimada)}</span>
                      {!compra.fecha_recepcion_real && calcularDiasRetraso(compra.fecha_recepcion_estimada) > 0 && (
                        <Badge variant="destructive" className="text-xs mt-1">
                          {calcularDiasRetraso(compra.fecha_recepcion_estimada)} días retraso
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getEstadoBadge(compra.estado)}</TableCell>
                  <TableCell>S/ {compra.total_compra.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(compra)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(compra.compra_id)}>
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
  )
}
