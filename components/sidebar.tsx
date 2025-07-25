"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Building2,
  Users,
  UserCheck,
  Truck,
  Package,
  ShoppingCart,
  TrendingUp,
  Warehouse,
  ClipboardList,
  Home,
  Layers,
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Operarios", href: "/dashboard/operarios", icon: UserCheck },
  { name: "Clientes", href: "/dashboard/clientes", icon: Users },
  { name: "Proveedores", href: "/dashboard/proveedores", icon: Truck },
  { name: "Materia Prima", href: "/dashboard/materia-prima", icon: Package },
  { name: "Productos", href: "/dashboard/productos", icon: Layers },
  { name: "Compras", href: "/dashboard/compras", icon: ShoppingCart },
  { name: "Ventas", href: "/dashboard/ventas", icon: TrendingUp },
  { name: "Inventario", href: "/dashboard/inventario", icon: Warehouse },
  { name: "Órdenes de Producción", href: "/dashboard/ordenes-produccion", icon: ClipboardList },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex flex-col w-64 bg-white shadow-lg">
      <div className="flex items-center justify-center h-16 border-b">
        <Building2 className="h-8 w-8 text-blue-600" />
        <span className="ml-2 text-xl font-semibold">Sistema Industrial</span>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                pathname === item.href
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
              )}
            >
              <Icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
