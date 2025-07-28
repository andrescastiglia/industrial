"use client";

import { useState, useEffect } from "react";
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
  Users,
  Shield,
  Wrench,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Operario {
  operario_id: number;
  nombre: string;
  apellido: string;
  rol: string;
}

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
];

  const [operarios, setOperarios] = useState<Operario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const fetchOperarios = async () => {
      setLoading(true);
      try {
        const data = await apiClient.getOperarios();
        setOperarios(data as Operario[]);
      } catch (err) {
        setError("Error al cargar operarios");
      } finally {
        setLoading(false);
      }
    };
    fetchOperarios();
  }, []);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOperario, setEditingOperario] = useState<Operario | null>(null);

  const filteredOperarios = operarios.filter(
    (operario) =>
      operario.operario_id.toString().includes(searchTerm.toLowerCase()) ||
      operario.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      operario.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      operario.rol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (formData: FormData) => {
    const operarioData = {
      nombre: formData.get("nombre") as string,
      apellido: formData.get("apellido") as string,
      rol: formData.get("rol") as string,
    };
    try {
      if (editingOperario) {
        await apiClient.updateOperario(editingOperario.operario_id, operarioData);
      } else {
        await apiClient.createOperario(operarioData);
      }
      const data = await apiClient.getOperarios();
      setOperarios(data as Operario[]);
    } catch (err) {
      setError("Error al guardar operario");
    }
    setIsDialogOpen(false);
    setEditingOperario(null);
  };

  const handleEdit = (operario: Operario) => {
    setEditingOperario(operario);
    setIsDialogOpen(true);
  };

  const handleDelete = async (operario_id: number) => {
    try {
      await apiClient.deleteOperario(operario_id);
      const data = await apiClient.getOperarios();
      setOperarios(data as Operario[]);
    } catch (err) {
      setError("Error al eliminar operario");
    }
  };

  const resetForm = () => {
    setEditingOperario(null);
    setIsDialogOpen(false);
  };

  const getInitials = (nombre: string, apellido: string) => {
    return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
  };

  const getRolIcon = (rol: string) => {
    if (rol.includes("Supervisor") || rol.includes("Jefe")) {
      return <Shield className="h-4 w-4" />;
    }
    if (rol.includes("Técnico") || rol.includes("Mantenimiento")) {
      return <Wrench className="h-4 w-4" />;
    }
    return <User className="h-4 w-4" />;
  };

  const getRolColor = (rol: string) => {
    if (rol.includes("Supervisor") || rol.includes("Jefe")) {
      return "bg-purple-100 text-purple-800";
    }
    if (rol.includes("Técnico") || rol.includes("Mantenimiento")) {
      return "bg-blue-100 text-blue-800";
    }
    if (rol.includes("Control") || rol.includes("Calidad")) {
      return "bg-green-100 text-green-800";
    }
    return "bg-gray-100 text-gray-800";
  };

  const contarPorTipo = (tipo: string) => {
    return operarios.filter((operario) => {
      const rol = operario.rol.toLowerCase();
      switch (tipo) {
        case "supervisores":
          return rol.includes("supervisor") || rol.includes("jefe");
        case "tecnicos":
          return (
            rol.includes("técnico") ||
            rol.includes("mantenimiento") ||
            rol.includes("electricista") ||
            rol.includes("mecánico")
          );
        case "operadores":
          return (
            rol.includes("operador") ||
            rol.includes("operadora") ||
            rol.includes("soldador") ||
            rol.includes("almacen")
          );
        default:
          return false;
      }
    }).length;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Operarios</h2>
          <p className="text-muted-foreground">
            Gestión del personal operativo
          </p>
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
              <DialogTitle>
                {editingOperario ? "Editar Operario" : "Nuevo Operario"}
              </DialogTitle>
              <DialogDescription>
                {editingOperario
                  ? "Modifica los datos del operario"
                  : "Completa los datos del nuevo operario"}
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
                <Button type="submit">
                  {editingOperario ? "Actualizar" : "Crear"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Operarios
            </CardTitle>
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
            <div className="text-2xl font-bold text-purple-600">
              {contarPorTipo("supervisores")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Técnicos</CardTitle>
            <Wrench className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {contarPorTipo("tecnicos")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Operadores</CardTitle>
            <User className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {contarPorTipo("operadores")}
            </div>
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
                <TableHead className="hidden md:table-cell">ID</TableHead>
                <TableHead>Operario</TableHead>
                <TableHead className="hidden lg:table-cell">
                  Nombre Completo
                </TableHead>
                <TableHead className="hidden md:table-cell">Rol</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOperarios.map((operario) => (
                <TableRow key={operario.operario_id}>
                  <TableCell className="hidden md:table-cell font-medium">
                    #{operario.operario_id.toString().padStart(3, "0")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8 bg-blue-100">
                        <AvatarFallback className="text-blue-800 text-sm">
                          {getInitials(operario.nombre, operario.apellido)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{operario.nombre}</div>
                        <div className="text-sm text-muted-foreground">
                          {operario.apellido}
                        </div>
                        <div className="md:hidden mt-1">
                          <Badge className={getRolColor(operario.rol)}>
                            <div className="flex items-center space-x-1">
                              {getRolIcon(operario.rol)}
                              <span>{operario.rol}</span>
                            </div>
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {operario.nombre} {operario.apellido}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge className={getRolColor(operario.rol)}>
                      <div className="flex items-center space-x-1">
                        {getRolIcon(operario.rol)}
                        <span>{operario.rol}</span>
                      </div>
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(operario)}
                        title="Editar Operario"
                      >
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Editar Operario</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(operario.operario_id)}
                        title="Eliminar Operario"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Eliminar Operario</span>
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
