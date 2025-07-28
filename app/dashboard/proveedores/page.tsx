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
import { Plus, Edit, Trash2, Search, Truck, Phone, Mail } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface Proveedor {
  proveedor_id: number;
  nombre: string;
  contacto: string;
  direccion: string;
  telefono: string;
  email: string;
  cuit: string;
}

  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const fetchProveedores = async () => {
      setLoading(true);
      try {
        const data = await apiClient.getProveedores();
        setProveedores(data as Proveedor[]);
      } catch (err) {
        setError("Error al cargar proveedores");
      } finally {
        setLoading(false);
      }
    };
    fetchProveedores();
  }, []);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(
    null
  );

  const filteredProveedores = proveedores.filter(
    (proveedor) =>
      proveedor.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proveedor.contacto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proveedor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proveedor.telefono.includes(searchTerm) ||
      proveedor.cuit.includes(searchTerm) ||
      proveedor.direccion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (formData: FormData) => {
    const proveedorData = {
      proveedor_id: editingProveedor?.proveedor_id,
      nombre: formData.get("nombre") as string,
      contacto: formData.get("contacto") as string,
      direccion: formData.get("direccion") as string,
      telefono: formData.get("telefono") as string,
      email: formData.get("email") as string,
      cuit: formData.get("cuit") as string,
    };
    try {
      if (editingProveedor) {
        await apiClient.updateProveedor(editingProveedor.proveedor_id, proveedorData);
      } else {
        await apiClient.createProveedor(proveedorData);
      }
      const data = await apiClient.getProveedores();
      setProveedores(data as Proveedor[]);
    } catch (err) {
      setError("Error al guardar proveedor");
    }
    setIsDialogOpen(false);
    setEditingProveedor(null);
  };

  const handleEdit = (proveedor: Proveedor) => {
    setEditingProveedor(proveedor);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await apiClient.deleteProveedor(id);
      const data = await apiClient.getProveedores();
      setProveedores(data as Proveedor[]);
    } catch (err) {
      setError("Error al eliminar proveedor");
    }
  };

  const resetForm = () => {
    setEditingProveedor(null);
    setIsDialogOpen(false);
  };

  const getInitials = (nombre: string) => {
    return nombre
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Proveedores</h2>
          <p className="text-muted-foreground">
            Gestión de proveedores y suministros
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Proveedor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingProveedor ? "Editar Proveedor" : "Nuevo Proveedor"}
              </DialogTitle>
              <DialogDescription>
                {editingProveedor
                  ? "Modifica los datos del proveedor"
                  : "Completa los datos del nuevo proveedor"}
              </DialogDescription>
            </DialogHeader>
            <form action={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre de la Empresa *</Label>
                <Input
                  id="nombre"
                  name="nombre"
                  defaultValue={editingProveedor?.nombre || ""}
                  placeholder="Ej: MetalCorp S.A."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contacto">Persona de Contacto *</Label>
                <Input
                  id="contacto"
                  name="contacto"
                  defaultValue={editingProveedor?.contacto || ""}
                  placeholder="Ej: Carlos Mendoza"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="direccion">Dirección Completa *</Label>
                <Textarea
                  id="direccion"
                  name="direccion"
                  defaultValue={editingProveedor?.direccion || ""}
                  placeholder="Ej: Av. Industrial 1234, Zona Industrial Norte, Lima, Perú"
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono *</Label>
                  <Input
                    id="telefono"
                    name="telefono"
                    defaultValue={editingProveedor?.telefono || ""}
                    placeholder="Ej: 555-2001"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cuit">CUIT *</Label>
                  <Input
                    id="cuit"
                    name="cuit"
                    defaultValue={editingProveedor?.cuit || ""}
                    placeholder="20-12345678-9"
                    maxLength={13}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={editingProveedor?.email || ""}
                  placeholder="contacto@empresa.com"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingProveedor ? "Actualizar" : "Crear"}
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
              Total Proveedores
            </CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{proveedores.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empresas S.A.</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {proveedores.filter((p) => p.nombre.includes("S.A.")).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Empresas S.R.L.
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {proveedores.filter((p) => p.nombre.includes("S.R.L.")).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Otras Empresas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {
                proveedores.filter(
                  (p) =>
                    p.nombre.includes("E.I.R.L.") || p.nombre.includes("S.A.C.")
                ).length
              }
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Proveedores</CardTitle>
          <CardDescription>
            Total: {proveedores.length} proveedores registrados
          </CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por empresa, contacto, CUIT, email o teléfono..."
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
                <TableHead>Proveedor</TableHead>
                <TableHead className="hidden md:table-cell">Contacto</TableHead>
                <TableHead className="hidden md:table-cell">Teléfono</TableHead>
                <TableHead className="hidden lg:table-cell">Email</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProveedores.map((proveedor) => (
                <TableRow key={proveedor.proveedor_id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0 h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-orange-700">
                          {getInitials(proveedor.nombre)}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">{proveedor.nombre}</div>
                        <div className="text-sm text-muted-foreground md:hidden">
                          {proveedor.contacto} • {proveedor.telefono}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center space-x-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <span>{proveedor.contacto}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{proveedor.telefono}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={`mailto:${proveedor.email}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {proveedor.email}
                      </a>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(proveedor)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(proveedor.proveedor_id)}
                      >
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
