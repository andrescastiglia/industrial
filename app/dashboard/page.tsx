"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import useDashboard from "@/hooks/useDashboard";
import {
  ClipboardList,
  Package,
  ShoppingCart,
  TrendingUp,
  Truck,
  User,
  UserCheck,
  Warehouse,
} from "lucide-react";

export default function DashboardPage() {
  const { dashboard, isLoading } = useDashboard();

  if (isLoading) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Panel Control</h2>
        <p className="text-muted-foreground">
          Resumen general del sistema de gestión industrial
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Operarios Activos
            </CardTitle>
            <UserCheck className={`h-4 w-4 text-blue-600`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard?.operariosActivos}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <User className={`h-4 w-4 text-green-600`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.clientes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proveedores</CardTitle>
            <Truck className={`h-4 w-4 text-purple-600`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.proveedores}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Productos Stock
            </CardTitle>
            <Package className={`h-4 w-4 text-orange-600`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Compras del Mes
            </CardTitle>
            <ShoppingCart className={`h-4 w-4 text-red-600`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.comprasMes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ventas del Mes
            </CardTitle>
            <TrendingUp className={`h-4 w-4 text-esmerald-600`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.ventasMes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Órdenes Producción Pendientes
            </CardTitle>
            <ClipboardList className={`h-4 w-4 text-yellow-600`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard?.ordenesPendientes}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventario</CardTitle>
            <Warehouse className={`h-4 w-4 text-indigo-600`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>Últimas acciones en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                <div className="text-sm">
                  <p className="font-medium">
                    Nueva orden de producción creada hace{" "}
                    {dashboard?.ultimaOrden || "mucho"}
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-600 rounded-full mr-3"></div>
                <div className="text-sm">
                  <p className="font-medium">
                    Compra de materia prima completada hace{" "}
                    {dashboard?.ultimaCompra || "mucho"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alertas del Sistema</CardTitle>
            <CardDescription>Notificaciones importantes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboard?.alertas.map((alerta, index) => (
                <div className="flex items-center" key={index}>
                  <div className="w-2 h-2 bg-red-600 rounded-full mr-3"></div>
                  <div className="text-sm">
                    <p className="font-medium">{alerta.nombre}</p>
                    <p className="text-muted-foreground">{alerta.detalle}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
