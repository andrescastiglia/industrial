import { type NextRequest, NextResponse } from "next/server";



import { pool } from "@/lib/database";

import {
  authenticateApiRequest,
  checkApiPermission,
  logApiOperation,
} from "@/lib/api-auth";

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      `/api/materia-prima/${params.id}`,
      user,
      "Obtener materia prima"
    );

    const client = await pool.connect();

    const result = await client.query(
      `
      SELECT 
        mp.materia_prima_id,
        mp.nombre,
        mp.descripcion,
        mp.referencia_proveedor,
        mp.unidad_medida,
        mp.stock_actual,
        mp.punto_pedido,
        mp.tiempo_entrega_dias,
        mp.longitud_estandar_m,
        mp.color,
        mp.id_tipo_componente,
        tc.nombre_tipo
      FROM Materia_Prima mp
      LEFT JOIN Tipo_Componente tc ON mp.id_tipo_componente = tc.tipo_componente_id
      WHERE mp.materia_prima_id = $1
    `,
      [params.id]
    );

    client.release();

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Material no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching materia prima:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      nombre,
      descripcion,
      referencia_proveedor,
      unidad_medida,
      stock_actual,
      punto_pedido,
      tiempo_entrega_dias,
      longitud_estandar_m,
      color,
      id_tipo_componente,
    } = body;

    logApiOperation(
      "PUT",
      `/api/materia-prima/${params.id}`,
      user,
      "Actualizar materia prima",
      nombre
    );

    const client = await pool.connect();

    const result = await client.query(
      `
      UPDATE Materia_Prima SET
        nombre = $1,
        descripcion = $2,
        referencia_proveedor = $3,
        unidad_medida = $4,
        stock_actual = $5,
        punto_pedido = $6,
        tiempo_entrega_dias = $7,
        longitud_estandar_m = $8,
        color = $9,
        id_tipo_componente = $10
      WHERE materia_prima_id = $11
      RETURNING *
    `,
      [
        nombre,
        descripcion,
        referencia_proveedor,
        unidad_medida,
        stock_actual,
        punto_pedido,
        tiempo_entrega_dias,
        longitud_estandar_m,
        color,
        id_tipo_componente,
        params.id,
      ]
    );

    client.release();

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Material no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating materia prima:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Autenticar usuario
    const auth = authenticateApiRequest(request);
    if (auth.error) {
      return NextResponse.json(auth.error, { status: auth.error.statusCode });
    }
    const { user } = auth;

    // Verificar permisos
    const permissionError = checkApiPermission(user, "delete:all");
    if (permissionError) return permissionError;

    logApiOperation(
      "DELETE",
      `/api/materia-prima/${params.id}`,
      user,
      "Eliminar materia prima"
    );

    const client = await pool.connect();

    const result = await client.query(
      "DELETE FROM Materia_Prima WHERE materia_prima_id = $1 RETURNING *",
      [params.id]
    );

    client.release();

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Material no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Material eliminado correctamente" });
  } catch (error) {
    console.error("Error deleting materia prima:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
