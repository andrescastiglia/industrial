import { type NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";
import {
  authenticateApiRequest,
  checkApiPermission,
  logApiOperation,
} from "@/lib/api-auth";

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

    logApiOperation("GET", "/api/ventas", user, "Listar todas las ventas");

    const client = await pool.connect();

    const result = await client.query(`
      SELECT 
        ov.orden_venta_id,
        ov.cliente_id,
        ov.fecha_pedido,
        ov.fecha_entrega_estimada,
        ov.fecha_entrega_real,
        ov.estado,
        ov.total_venta,
        c.nombre as cliente_nombre,
        c.contacto as cliente_contacto
      FROM Ordenes_Venta ov
      JOIN Clientes c ON ov.cliente_id = c.cliente_id
      ORDER BY ov.fecha_pedido DESC
    `);

    client.release();

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching ventas:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Autenticar usuario
    const auth = authenticateApiRequest(request);
    if (auth.error) {
      return NextResponse.json(auth.error, { status: auth.error.statusCode });
    }
    const { user } = auth;

    // Verificar permisos
    const permissionError = checkApiPermission(user, "write:all");
    if (permissionError) return permissionError;

    const body = await request.json();
    const {
      cliente_id,
      fecha_pedido,
      fecha_entrega_estimada,
      fecha_entrega_real,
      estado,
      total_venta,
      detalles = [],
    } = body;

    logApiOperation(
      "POST",
      "/api/ventas",
      user,
      "Crear nueva venta",
      `cliente_id: ${cliente_id}`
    );

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Insertar orden de venta
      const ordenResult = await client.query(
        `
        INSERT INTO Ordenes_Venta (
          cliente_id, fecha_pedido, fecha_entrega_estimada,
          fecha_entrega_real, estado, total_venta
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
        [
          cliente_id,
          fecha_pedido,
          fecha_entrega_estimada,
          fecha_entrega_real,
          estado,
          total_venta,
        ]
      );

      const nuevaOrden = ordenResult.rows[0];

      // Insertar detalles de la orden
      for (const detalle of detalles) {
        await client.query(
          `
          INSERT INTO Detalle_Orden_Venta (
            orden_venta_id, producto_id, cantidad
          ) VALUES ($1, $2, $3)
        `,
          [nuevaOrden.orden_venta_id, detalle.producto_id, detalle.cantidad]
        );
      }

      await client.query("COMMIT");
      client.release();

      return NextResponse.json(nuevaOrden, { status: 201 });
    } catch (error) {
      await client.query("ROLLBACK");
      client.release();
      throw error;
    }
  } catch (error) {
    console.error("Error creating venta:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
