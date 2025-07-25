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
import { Plus, Edit, Trash2, Search, Users, Shield, Wrench, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface Operario {
  operario_id: number
  nombre: string
  apellido: string
  rol: string
}

const operariosIniciales: Operario[] = [
  {
    operario_id: 1,
    nombre: "Carlos",
    apellido: "Mendoza",
    rol: "Operador de Máquina",
  },
  {
    operario_id: 2,
    nombre: "María",
    apellido: "García",
    rol: "Supervisora",
  },
  {
    operario_id: 3,
    nombre: "José",
    apellido: "Rodríguez",
    rol: "Técnico de Mantenimiento",
  },
  {
    operario_id: 4,
    nombre: "Ana",
    apellido: "López",
    rol: "Operadora de Línea",
  },
  {
    operario_id: 5,
    nombre: "Roberto",
    apellido: "Silva",
    rol: "Jefe de Turno",
  },
  {
    operario_id: 6,
    nombre: "Carmen",
    apellido: "Torres",
    rol: "Control de Calidad",
  },
  {
    operario_id: 7,
    nombre: "Luis",
    apellido: "Vargas",
    rol: "Soldador",
  },
  {
    operario_id: 8,
    nombre: "Patricia",
    apellido: "Morales",
    rol: "Almacenera",
  },
]

const rolesDisponibles = [
  "Operador de Máquina",
  "Operadora de Línea",
  "Técnico de Mantenimiento",
  "Supervisora",
  "Jefe de Turno",
  "Control de Calidad",
  "Almacenero",
  "Soldador",
  "Electricista",
  "Mecánico",
]

export default function OperariosPage() {
  const [operarios, setOperarios] = useState<Operario[]>(operariosIniciales)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingOperario, setEditingOperario] = useState<Operario | null>(null)

  const filteredOperarios = operarios.filter(
    (operario) =>
      operario.operario_id.toString().includes(searchTerm.toLowerCase()) ||
      operario.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      operario.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      operario.rol.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleSubmit = (formData: FormData) => {
    const newOperario: Operario = {
      operario_id: editingOperario?.operario_id || Date.now(),
      nombre: formData.get("nombre") as string,
      apellido: formData.get("apellido") as string,
      rol: formData.get("rol") as string,
    }

    if (editingOperario) {
      setOperarios(
        operarios.map((operario) => (operario.operario_id === editingOperario.operario_id ? newOperario : operario)),
      )
    } else {
      setOperarios([...operarios, newOperario])
    }

    setIsDialogOpen(false)
    setEditingOperario(null)
  }

  const handleEdit = (operario: Operario) => {
    setEditingOperario(operario)
    setIsDialogOpen(true)
  }

  const handleDelete = (operario_id: number) => {
    setOperarios(operarios.filter((operario) => operario.operario_id !== operario_id))
  }

  const resetForm = () => {
    setEditingOperario(null)
    setIsDialogOpen(false)
  }

  const getInitials = (nombre: string, apellido: string) => {
    return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase()
  }

  const getRolIcon = (rol: string) => {
    if (rol.includes("Supervisor") || rol.includes("Jefe")) {
      return <Shield className="h-4 w-4" />
    }
    if (rol.includes("Técnico") || rol.includes("Mantenimiento")) {
      return <Wrench className="h-4 w-4" />
    }
    return <User className="h-4 w-4" />
  }

  const getRolColor = (rol: string) => {
    if (rol.includes("Supervisor") || rol.includes("Jefe")) {
      return "bg-purple-100 text-purple-800"
    }
    if (rol.includes("Técnico") || rol.includes("Mantenimiento")) {
      return "bg-blue-100 text-blue-800"
    }
    if (rol.includes("Control") || rol.includes("Calidad")) {
      return "bg-green-100 text-green-800"
    }
    return "bg-gray-100 text-gray-800"
  }

  const contarPorTipo = (tipo: string) => {
    return operarios.filter((operario) => {
      const rol = operario.rol.toLowerCase()
      switch (tipo) {
        case "supervisores":
          return rol.includes("supervisor") || rol.includes("jefe")
        case "tecnicos":
          return (
            rol.includes("técnico") ||
            rol.includes("mantenimiento") ||
            rol.includes("electricista") ||
            rol.includes("mecánico")
          )
        case "operadores":
          return (
            rol.includes("operador") || rol.includes("operadora") || rol.includes("soldador") || rol.includes("almacen")
          )
        default:
          return false
      }
    }).length
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Operarios</h2>
          <p className="text-muted-foreground">Gestión del personal operativo</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Operario
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingOperario ? "Editar Operario" : "Nuevo Operario"}</DialogTitle>
              <DialogDescription>
                {editingOperario ? "Modifica los datos del operario" : "Completa los datos del nuevo operario"}
              </DialogDescription>
            </DialogHeader>
            <form action={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  name="nombre"
                  defaultValue={editingOperario?.nombre || ""}
                  placeholder="Nombre del operario"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apellido">Apellido</Label>
                <Input
                  id="apellido"
                  name="apellido"
                  defaultValue={editingOperario?.apellido || ""}
                  placeholder="Apellido del operario"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rol">Rol</Label>
                <select
                  id="rol"
                  name="rol"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  defaultValue={editingOperario?.rol || rolesDisponibles[0]}
                  required
                >
                  {rolesDisponibles.map((rol) => (
                    <option key={rol} value={rol}>
                      {rol}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit">{editingOperario ? "Actualizar" : "Crear"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Operarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{operarios.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Supervisores</CardTitle>
            <Shield className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{contarPorTipo("supervisores")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Técnicos</CardTitle>
            <Wrench className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{contarPorTipo("tecnicos")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Operadores</CardTitle>
            <User className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{contarPorTipo("operadores")}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registro de Operarios</CardTitle>
          <CardDescription>Personal operativo de la empresa</CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar operarios..."
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
                <TableHead>Operario</TableHead>
                <TableHead>Nombre Completo</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOperarios.map((operario) => (
                <TableRow key={operario.operario_id}>
                  <TableCell className="font-medium">#{operario.operario_id.toString().padStart(3, "0")}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8 bg-blue-100">
                        <AvatarFallback className="text-blue-800 text-sm">
                          {getInitials(operario.nombre, operario.apellido)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{operario.nombre}</div>
                        <div className="text-sm text-muted-foreground">{operario.apellido}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {operario.nombre} {operario.apellido}
                  </TableCell>
                  <TableCell>
                    <Badge className={getRolColor(operario.rol)}>
                      <div className="flex items-center space-x-1">
                        {getRolIcon(operario.rol)}
                        <span>{operario.rol}</span>
                      </div>
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(operario)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(operario.operario_id)}>
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
