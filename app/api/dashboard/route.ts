import { NextResponse, NextRequest } from "next/server";
import type { PoolClient } from "pg";
import { pool } from "@/lib/database";
import { Dashboard } from "@/lib/dashboard";
import {
  authenticateApiRequest,
  checkApiPermission,
  logApiOperation,
} from "@/lib/api-auth";

export const dynamic = "force-dynamic";

type IntervalLike = {
  years?: number;
  months?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
};

function formatInterval(iv: IntervalLike | null | undefined): string | null {
  if (!iv) return null;

  const {
    years = 0,
    months = 0,
    days = 0,
    hours = 0,
    minutes = 0,
    seconds = 0,
  } = iv;
  const parts: string[] = [];

  if (years) parts.push(`${years}a`);
  if (months) parts.push(`${months}m`);
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}min`);

  const roundedSeconds = Math.floor(seconds);
  if (roundedSeconds) {
    parts.push(`${roundedSeconds}s`);
  }

  return parts.length ? parts.slice(0, 4).join(" ") : "0s";
}

async function fetchDashboardData(client: PoolClient) {
  return Promise.all([
    client.query("SELECT COUNT(*) AS count FROM Operarios"),
    client.query("SELECT COUNT(*) AS count FROM Clientes"),
    client.query("SELECT COUNT(*) AS count FROM Proveedores"),
    client.query(
      "SELECT COUNT(*) AS count FROM Compras WHERE EXTRACT(MONTH FROM fecha_pedido) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM fecha_pedido) = EXTRACT(YEAR FROM CURRENT_DATE)"
    ),
    client.query(
      "SELECT COUNT(*) AS count FROM Ordenes_Venta WHERE EXTRACT(MONTH FROM fecha_pedido) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM fecha_pedido) = EXTRACT(YEAR FROM CURRENT_DATE)"
    ),
    client.query(
      "SELECT COUNT(*) AS count FROM Ordenes_Produccion WHERE fecha_fin_real IS NULL"
    ),
    client.query(
      "SELECT NOW() - MAX(fecha_creacion) AS tiempo FROM Ordenes_Produccion"
    ),
    client.query("SELECT NOW() - MAX(fecha_pedido) AS tiempo FROM Compras"),
    client.query(
      "SELECT nombre, unidad_medida, stock_actual FROM Materia_Prima WHERE stock_actual <= punto_pedido"
    ),
    client.query(
      `SELECT c.nombre AS cliente_nombre
       FROM Ordenes_Produccion op
       JOIN Ordenes_Venta ov ON op.orden_venta_id = ov.orden_venta_id
       JOIN Clientes c ON ov.cliente_id = c.cliente_id
       WHERE op.fecha_fin_real IS NULL AND op.fecha_fin_estimada < NOW()`
    ),
  ]);
}

function buildDashboardResponse(
  queryResults: Awaited<ReturnType<typeof fetchDashboardData>>
): Dashboard {
  const [
    operariosActivos,
    clientes,
    proveedores,
    comprasMes,
    ventasMes,
    ordenesPendientes,
    ultimaOrden,
    ultimaCompra,
    stockBajo,
    ordenesRetrasadas,
  ] = queryResults;

  return {
    operariosActivos: parseInt(operariosActivos.rows[0].count, 10),
    clientes: parseInt(clientes.rows[0].count, 10),
    proveedores: parseInt(proveedores.rows[0].count, 10),
    comprasMes: parseInt(comprasMes.rows[0].count, 10),
    ventasMes: parseInt(ventasMes.rows[0].count, 10),
    ordenesPendientes: parseInt(ordenesPendientes.rows[0].count, 10),
    ultimaOrden: formatInterval(ultimaOrden.rows[0].tiempo),
    ultimaCompra: formatInterval(ultimaCompra.rows[0].tiempo),
    alertas: [
      ...stockBajo.rows.map(
        (row: {
          nombre: string;
          unidad_medida: string;
          stock_actual: number;
        }) => ({
          nombre: "Stock bajo",
          detalle: `Quedan ${row.stock_actual} ${row.unidad_medida} de ${row.nombre}`,
        })
      ),
      ...ordenesRetrasadas.rows.map((row: { cliente_nombre: string }) => ({
        nombre: "Retraso Orden Producción",
        detalle: `Cliente afectado: ${row.cliente_nombre}`,
      })),
    ],
  };
}

export async function GET(request: NextRequest) {
  try {
    // Autenticar usuario
    const auth = authenticateApiRequest(request);
    if (auth.error) {
      return NextResponse.json(auth.error, { status: auth.error.statusCode });
    }
    const { user } = auth;

    // Verificar permisos
    const permissionError = checkApiPermission(user, "read:all");
    if (permissionError) return permissionError;

    logApiOperation(
      "GET",
      "/api/dashboard",
      user,
      "Obtener datos del dashboard"
    );

    const client = await pool.connect();

    try {
      const queryResults = await fetchDashboardData(client);
      return NextResponse.json(buildDashboardResponse(queryResults));
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
