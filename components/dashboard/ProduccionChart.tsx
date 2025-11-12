/**
 * Componente de gráfico de líneas para mostrar producción diaria
 */

"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface ProduccionChartProps {
  data: Array<{
    fecha: string;
    cantidad: number;
  }>;
  loading?: boolean;
}

export function ProduccionChart({
  data,
  loading = false,
}: ProduccionChartProps) {
  // Transformar datos para el gráfico
  const chartData = data.map((item) => ({
    fecha: format(parseISO(item.fecha), "dd/MM", { locale: es }),
    fechaCompleta: format(parseISO(item.fecha), "dd MMMM yyyy", { locale: es }),
    cantidad: item.cantidad,
  }));

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Producción por Día</CardTitle>
          <CardDescription>Últimos 30 días</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Producción por Día</CardTitle>
          <CardDescription>Últimos 30 días</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No hay datos de producción disponibles
          </div>
        </CardContent>
      </Card>
    );
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="text-sm font-medium">
            {payload[0].payload.fechaCompleta}
          </p>
          <p className="text-sm text-blue-600 font-semibold">
            {payload[0].value} órdenes completadas
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Producción por Día</CardTitle>
        <CardDescription>Órdenes completadas - Últimos 30 días</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 0,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="fecha"
              className="text-xs"
              tick={{ fontSize: 12 }}
              tickLine={false}
            />
            <YAxis
              className="text-xs"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: "14px", paddingTop: "10px" }}
              iconType="line"
            />
            <Line
              type="monotone"
              dataKey="cantidad"
              name="Órdenes Completadas"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
