/**
 * Componente de alertas para órdenes vencidas y en riesgo
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, CheckCircle } from "lucide-react";
import Link from "next/link";

interface AlertasOrdenesProps {
  vencidas: number;
  en_riesgo: number;
  completadas_mes: number;
  loading?: boolean;
}

export function AlertasOrdenes({
  vencidas,
  en_riesgo,
  completadas_mes,
  loading = false,
}: AlertasOrdenesProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Estado de Órdenes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estado de Órdenes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Órdenes Vencidas */}
        <Link
          href="/dashboard/ordenes-produccion?filtro=vencidas"
          className="block hover:bg-muted/50 p-4 rounded-lg border border-transparent hover:border-border transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Órdenes Vencidas
                </p>
                <p className="text-2xl font-bold">{vencidas}</p>
              </div>
            </div>
            {vencidas > 0 && (
              <Badge variant="destructive" className="text-xs">
                Requiere atención
              </Badge>
            )}
          </div>
        </Link>

        {/* Órdenes en Riesgo */}
        <Link
          href="/dashboard/ordenes-produccion?filtro=en_riesgo"
          className="block hover:bg-muted/50 p-4 rounded-lg border border-transparent hover:border-border transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Órdenes en Riesgo
                </p>
                <p className="text-2xl font-bold">{en_riesgo}</p>
              </div>
            </div>
            {en_riesgo > 0 && (
              <Badge
                variant="outline"
                className="text-xs border-yellow-600 text-yellow-600"
              >
                Monitorear
              </Badge>
            )}
          </div>
        </Link>

        {/* Órdenes Completadas este Mes */}
        <div className="p-4 rounded-lg border border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Completadas este Mes
                </p>
                <p className="text-2xl font-bold">{completadas_mes}</p>
              </div>
            </div>
            <Badge
              variant="outline"
              className="text-xs border-green-600 text-green-600"
            >
              Exitosas
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
