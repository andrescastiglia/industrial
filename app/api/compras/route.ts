import { type NextRequest, NextResponse } from "next/server";



import { pool } from "@/lib/database";

import {
  authenticateApiRequest,
  checkApiPermission,
  logApiOperation,
} from "@/lib/api-auth";

export const dynamic = 'force-dynamic';

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

    logApiOperation("GET", "/api/compras", user, "Listar todas las compras");

    const client = await pool.connect();

    const result = await client.query(`
      SELECT 
        c.compra_id,
        c.proveedor_id,
        c.fecha_pedido,
        c.fecha_recepcion_estimada,
        c.fecha_recepcion_real,
        c.estado,
        c.total_compra,
        c.cotizacion_ref,
        p.nombre as proveedor_nombre
      FROM Compras c
      JOIN Proveedores p ON c.proveedor_id = p.proveedor_id
      ORDER BY c.fecha_pedido DESC
    `);

    client.release();

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching compras:", error);
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
      proveedor_id,
      fecha_pedido,
      fecha_recepcion_estimada,
      fecha_recepcion_real,
      estado,
      total_compra,
      cotizacion_ref,
      detalles = [],
    } = body;

    logApiOperation(
      "POST",
      "/api/compras",
      user,
      "Crear nueva compra",
      `proveedor_id: ${proveedor_id}`
    );

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Insertar compra
      const compraResult = await client.query(
        `
        INSERT INTO Compras (
          proveedor_id, fecha_pedido, fecha_recepcion_estimada,
          fecha_recepcion_real, estado, total_compra, cotizacion_ref
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
        [
          proveedor_id,
          fecha_pedido,
          fecha_recepcion_estimada,
          fecha_recepcion_real,
          estado,
          total_compra,
          cotizacion_ref,
        ]
      );

      const nuevaCompra = compraResult.rows[0];

      // Insertar detalles de la compra
      for (const detalle of detalles) {
        await client.query(
          `
          INSERT INTO Detalle_Compra_Materia_Prima (
            compra_id, materia_prima_id, cantidad_pedida, cantidad_recibida, unidad_medida
          ) VALUES ($1, $2, $3, $4, $5)
        `,
          [
            nuevaCompra.compra_id,
            detalle.materia_prima_id,
            detalle.cantidad_pedida,
            detalle.cantidad_recibida || 0,
            detalle.unidad_medida,
          ]
        );
      }

      await client.query("COMMIT");
      client.release();

      return NextResponse.json(nuevaCompra, { status: 201 });
    } catch (error) {
      await client.query("ROLLBACK");
      client.release();
      throw error;
    }
  } catch (error) {
    console.error("Error creating compra:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
