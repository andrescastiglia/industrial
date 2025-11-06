"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import useDashboard from "@/hooks/useDashboard";
import { useIndustrialWebSocket } from "@/hooks/useIndustrialWebSocket";
import { IndustrialDevPanel } from "@/components/IndustrialDevPanel";
import {
  ClipboardList,
  Package,
  ShoppingCart,
  TrendingUp,
  Truck,
  User,
  UserCheck,
  Warehouse,
  Wifi,
  WifiOff,
  Bell,
} from "lucide-react";

export default function DashboardPage() {
  const { dashboard, isLoading } = useDashboard();
  const { isConnected, dashboardData, notifications, clearNotifications } =
    useIndustrialWebSocket();

  // Usar datos en tiempo real si están disponibles, sino usar datos estáticos
  const currentData = dashboardData || dashboard;

  if (isLoading && !currentData) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Panel Control</h2>
          <p className="text-muted-foreground">
            Resumen general del sistema de gestión industrial
          </p>
        </div>

        {/* Indicador de conexión en tiempo real */}
        <div className="flex items-center gap-4">
          <Badge
            variant={isConnected ? "default" : "secondary"}
            className="flex items-center gap-1"
          >
            {isConnected ? (
              <Wifi className="h-3 w-3" />
            ) : (
              <WifiOff className="h-3 w-3" />
            )}
            {isConnected ? "Tiempo Real" : "Datos Estáticos"}
          </Badge>

          {notifications.length > 0 && (
            <Badge
              variant="destructive"
              className="flex items-center gap-1 cursor-pointer"
              onClick={clearNotifications}
            >
              <Bell className="h-3 w-3" />
              {notifications.length} alertas
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className={isConnected ? "border-green-200 bg-green-50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Operarios Activos
            </CardTitle>
            <UserCheck className={`h-4 w-4 text-blue-600`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentData?.operariosActivos}
            </div>
            {isConnected && dashboardData && (
              <p className="text-xs text-green-600 mt-1">
                📊 Actualizado en tiempo real
              </p>
            )}
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
              {/* Mostrar notificaciones en tiempo real si están disponibles */}
              {notifications.length > 0
                ? notifications.slice(0, 3).map((notification) => (
                    <div className="flex items-center" key={notification.id}>
                      <div
                        className={`w-2 h-2 rounded-full mr-3 ${
                          notification.type === "error"
                            ? "bg-red-600"
                            : notification.type === "warning"
                              ? "bg-yellow-500"
                              : notification.type === "success"
                                ? "bg-green-600"
                                : "bg-blue-600"
                        }`}
                      ></div>
                      <div className="text-sm">
                        <p className="font-medium">{notification.title}</p>
                        <p className="text-muted-foreground">
                          {notification.message}
                        </p>
                        {isConnected && (
                          <p className="text-xs text-green-600">🔴 En vivo</p>
                        )}
                      </div>
                    </div>
                  ))
                : dashboard?.alertas.map((alerta, index) => (
                    <div className="flex items-center" key={index}>
                      <div className="w-2 h-2 bg-red-600 rounded-full mr-3"></div>
                      <div className="text-sm">
                        <p className="font-medium">{alerta.nombre}</p>
                        <p className="text-muted-foreground">
                          {alerta.detalle}
                        </p>
                      </div>
                    </div>
                  ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Panel de DevTools Industrial (solo en desarrollo) */}
      <IndustrialDevPanel />
    </div>
  );
}
