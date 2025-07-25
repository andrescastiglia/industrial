"use client"

import { Button } from "@/components/ui/button"
import { logout } from "@/lib/auth"
import { LogOut, User } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function Header() {
  return (
    <header className="bg-white shadow-sm border-b h-16 flex items-center justify-between px-6">
      <h1 className="text-xl font-semibold text-gray-800">Sistema de Gestión Industrial</h1>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <User className="h-4 w-4 mr-2" />
            Administrador
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => logout()}>
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar Sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
