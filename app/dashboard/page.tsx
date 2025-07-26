import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  UserCheck,
  Truck,
  Package,
  ShoppingCart,
  TrendingUp,
  Warehouse,
  ClipboardList,
} from "lucide-react";

const stats = [
  {
    name: "Operarios Activos",
    value: "24",
    icon: UserCheck,
    color: "text-blue-600",
  },
  { name: "Clientes", value: "156", icon: Users, color: "text-green-600" },
  { name: "Proveedores", value: "43", icon: Truck, color: "text-purple-600" },
  {
    name: "Productos en Stock",
    value: "1,234",
    icon: Package,
    color: "text-orange-600",
  },
  {
    name: "Compras del Mes",
    value: "89",
    icon: ShoppingCart,
    color: "text-red-600",
  },
  {
    name: "Ventas del Mes",
    value: "267",
    icon: TrendingUp,
    color: "text-emerald-600",
  },
  {
    name: "Items en Inventario",
    value: "2,456",
    icon: Warehouse,
    color: "text-indigo-600",
  },
  {
    name: "Órdenes Pendientes",
    value: "12",
    icon: ClipboardList,
    color: "text-yellow-600",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Panel Control</h2>
        <p className="text-muted-foreground">
          Resumen general del sistema de gestión industrial
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.name}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.name}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
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
                    Nueva orden de producción creada
                  </p>
                  <p className="text-muted-foreground">Hace 2 horas</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-600 rounded-full mr-3"></div>
                <div className="text-sm">
                  <p className="font-medium">
                    Compra de materia prima completada
                  </p>
                  <p className="text-muted-foreground">Hace 4 horas</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-orange-600 rounded-full mr-3"></div>
                <div className="text-sm">
                  <p className="font-medium">Nuevo cliente registrado</p>
                  <p className="text-muted-foreground">Hace 6 horas</p>
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
              <div className="flex items-center">
                <div className="w-2 h-2 bg-red-600 rounded-full mr-3"></div>
                <div className="text-sm">
                  <p className="font-medium">Stock bajo: Acero inoxidable</p>
                  <p className="text-muted-foreground">Quedan 15 unidades</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-yellow-600 rounded-full mr-3"></div>
                <div className="text-sm">
                  <p className="font-medium">Orden de producción retrasada</p>
                  <p className="text-muted-foreground">OP-2024-001</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                <div className="text-sm">
                  <p className="font-medium">Mantenimiento programado</p>
                  <p className="text-muted-foreground">Máquina CNC-01 mañana</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
