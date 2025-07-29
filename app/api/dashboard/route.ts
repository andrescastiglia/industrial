import { NextResponse } from "next/server";
import { pool } from "@/lib/database";
import { Dashboard } from "@/lib/dashboard";

export async function GET() {
  try {
    const client = await pool.connect();

    // Consultas para las estadísticas
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
    ] = await Promise.all([
      client.query(
        "SELECT COUNT(*) AS count FROM Operarios WHERE activo = true"
      ),
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
        "SELECT nombre, unidad_medida, stock_actual AS count FROM Material_Prima WHERE stock_actual <= punto_pedido"
      ),
      client.query(
        `SELECT c.nombre AS cliente_nombre
         FROM Ordenes_Produccion op
         JOIN Ordenes_Venta ov ON op.orden_venta_id = ov.orden_venta_id
         JOIN Clientes c ON ov.cliente_id = c.cliente_id
         WHERE op.fecha_fin_real IS NULL AND op.fecha_fin_estimada < NOW()`
      ),
    ]);

    client.release();

    // Formatear la respuesta
    const response: Dashboard = {
      operariosActivos: parseInt(operariosActivos.rows[0].count, 10),
      clientes: parseInt(clientes.rows[0].count, 10),
      proveedores: parseInt(proveedores.rows[0].count, 10),
      comprasMes: parseInt(comprasMes.rows[0].count, 10),
      ventasMes: parseInt(ventasMes.rows[0].count, 10),
      ordenesPendientes: parseInt(ordenesPendientes.rows[0].count, 10),
      ultimaOrden: ultimaOrden.rows[0].tiempo,
      ultimaCompra: ultimaCompra.rows[0].tiempo,
      alertas: [
        ...stockBajo.rows.map((row) => ({
          nombre: "Stock bajo",
          detalle: `Quedan ${row.stock_actual} ${row.unidad_medida} de ${row.nombre}`,
        })),
        ...ordenesRetrasadas.rows.map((row) => ({
          nombre: "Retraso Orden Producción",
          detalle: `Cliente afectado: ${row.cliente_nombre}`,
        })),
      ],
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
