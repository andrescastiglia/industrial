"use client";

import { Button } from "@/components/ui/button";
import { logout } from "@/lib/auth";
import { LogOut, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  return (
    <header className="bg-white shadow-sm border-b h-16 flex items-center sticky top-0">
      <div className="flex-1 px-6">
        <h1 className="text-xl font-semibold text-gray-800 hidden md:block">
          Sistema de Gestión Industrial
        </h1>
        <h1 className="text-xl font-semibold text-gray-800 md:hidden">SGI</h1>
      </div>
      <div className="flex items-center pr-20 lg:pr-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="flex items-center">
              <User className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Administrador</span>
              <span className="sm:hidden">Admin</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => logout()}>
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
