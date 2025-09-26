"use client";

import React, { useState } from "react";
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
import { Plus, Edit, Trash2, Search, Users, Phone, Mail } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Cliente } from "@/lib/database";
import { useClientes } from "@/hooks/useClientes";

export default function ClientesPage() {
  const { clientes, refetch, createCliente, updateCliente, deleteCliente } =
    useClientes() as {
      clientes: Cliente[];
      refetch: () => Promise<void>;
      // eslint-disable-next-line no-unused-vars
      createCliente: (data: Partial<Cliente>) => Promise<Cliente>;
      // eslint-disable-next-line no-unused-vars
      updateCliente: (id: number, data: Partial<Cliente>) => Promise<Cliente>;
      // eslint-disable-next-line no-unused-vars
      deleteCliente: (id: number) => Promise<void>;
    };
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);

  const filteredClientes = clientes.filter(
    (cliente) =>
      cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.contacto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.telefono.includes(searchTerm) ||
      cliente.direccion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // El hook useClientes ya carga los datos automáticamente

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const clienteData: Cliente = {
      cliente_id: editingCliente ? editingCliente.cliente_id : 0,
      nombre: formData.get("nombre") as string,
      contacto: formData.get("contacto") as string,
      direccion: formData.get("direccion") as string,
      telefono: formData.get("telefono") as string,
      email: formData.get("email") as string,
    };

    try {
      if (editingCliente) {
        await updateCliente(editingCliente.cliente_id, clienteData);
      } else {
        await createCliente(clienteData);
      }
      refetch();
      setIsDialogOpen(false);
      setEditingCliente(null);
    } catch {
      // Manejo de error opcional
    }
  };

  const handleEdit = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteCliente(id);
      refetch();
    } catch {
      // Manejo de error opcional
    }
  };

  const resetForm = () => {
    setEditingCliente(null);
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
          <h2 className="text-3xl font-bold tracking-tight">Clientes</h2>
          <p className="text-muted-foreground">
            Gestión de clientes y empresas
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-gray-800 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] bg-gray-100">
            <DialogHeader>
              <DialogTitle>
                {editingCliente ? "Editar Cliente" : "Nuevo Cliente"}
              </DialogTitle>
              <DialogDescription>
                {editingCliente
                  ? "Modifica los datos del cliente"
                  : "Completa los datos del nuevo cliente"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre de la Empresa *</Label>
                <Input
                  id="nombre"
                  name="nombre"
                  defaultValue={editingCliente?.nombre || ""}
                  placeholder="Ej: Constructora ABC S.A.C."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contacto">Persona de Contacto *</Label>
                <Input
                  id="contacto"
                  name="contacto"
                  defaultValue={editingCliente?.contacto || ""}
                  placeholder="Ej: Ana Martínez"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="direccion">Dirección Completa *</Label>
                <Textarea
                  id="direccion"
                  name="direccion"
                  defaultValue={editingCliente?.direccion || ""}
                  placeholder="Ej: Av. Principal 123, Distrito de San Isidro, Lima, Perú"
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
                    defaultValue={editingCliente?.telefono || ""}
                    placeholder="Ej: 555-1001"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={editingCliente?.email || ""}
                    placeholder="contacto@empresa.com"
                    required
                  />
                </div>
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
                  {editingCliente ? "Actualizar" : "Crear"}
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
              Total Clientes
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empresas S.A.</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {
                clientes.filter(
                  (c) => c.nombre.includes("S.A") || c.nombre.includes("SA")
                ).length
              }
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
              {
                clientes.filter(
                  (c) => c.nombre.includes("S.R.L.") || c.nombre.includes("SRL")
                ).length
              }
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
                clientes.filter(
                  (c) =>
                    !(
                      c.nombre.includes("S.R.L.") ||
                      c.nombre.includes("S.A.") ||
                      c.nombre.includes("SRL") ||
                      c.nombre.includes("SA")
                    )
                ).length
              }
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
          <CardDescription>
            Total: {clientes.length} clientes registrados
          </CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por empresa, contacto, email o teléfono..."
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
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden md:table-cell">Contacto</TableHead>
                <TableHead className="hidden md:table-cell">Teléfono</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClientes.map((cliente) => (
                <TableRow key={cliente.cliente_id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-700">
                          {getInitials(cliente.nombre)}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">{cliente.nombre}</div>
                        <div className="text-sm text-muted-foreground md:hidden">
                          {cliente.contacto} • {cliente.telefono}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{cliente.contacto}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{cliente.telefono}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={`mailto:${cliente.email}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {cliente.email}
                      </a>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(cliente)}
                        className="bg-gray-800 text-white"
                      >
                        <span className="sr-only">Editar</span>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(cliente.cliente_id)}
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
