import { type NextRequest, NextResponse } from "next/server";
import { pool, Producto } from "@/lib/database";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await pool.connect();

    // Obtener producto con sus componentes (BOM)
    const productoResult = await client.query(
      `
      SELECT producto_id, nombre_modelo, descripcion, ancho, alto, color, tipo_accionamiento FROM Productos
      WHERE producto_id = $1
    `,
      [params.id]
    );

    if (productoResult.rows.length === 0) {
      client.release();
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    // Obtener componentes del producto (Bill of Materials)
    const componentesResult = await client.query(
      `
      SELECT 
        cp.producto_id,
        cp.materia_prima_id,
        cp.cantidad_necesaria,
        cp.angulo_corte,
        mp.nombre as material_nombre,
        mp.unidad_medida,
        mp.color as material_color,
        mp.referencia_proveedor,
        mp.stock_actual,
        tc.nombre_tipo as tipo_componente
      FROM Componentes_Producto cp
      JOIN Materia_Prima mp ON cp.materia_prima_id = mp.materia_prima_id
      LEFT JOIN Tipo_Componente tc ON mp.id_tipo_componente = tc.tipo_componente_id
      WHERE cp.producto_id = $1
      ORDER BY tc.nombre_tipo, mp.nombre
    `,
      [params.id]
    );

    client.release();

    const producto: Producto = {
      ...productoResult.rows[0],
      componentes: componentesResult.rows,
    };

    return NextResponse.json(producto);
  } catch (error) {
    console.error("Error fetching producto:", error);
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
    const body = await request.json();
    const {
      nombre_modelo,
      descripcion,
      ancho,
      alto,
      color,
      tipo_accionamiento,
      componentes = [],
    } = body;

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Actualizar producto
      const result = await client.query(
        `
        UPDATE Productos SET
          nombre_modelo = $1,
          descripcion = $2,
          ancho = $3,
          alto = $4,
          color = $5,
          tipo_accionamiento = $6
        WHERE producto_id = $7
        RETURNING *
      `,
        [
          nombre_modelo,
          descripcion,
          ancho,
          alto,
          color,
          tipo_accionamiento,
          params.id,
        ]
      );

      if (result.rows.length === 0) {
        await client.query("ROLLBACK");
        client.release();
        return NextResponse.json(
          { error: "Producto no encontrado" },
          { status: 404 }
        );
      }

      // Eliminar componentes existentes
      await client.query(
        "DELETE FROM Componentes_Producto WHERE producto_id = $1",
        [params.id]
      );

      // Insertar nuevos componentes
      for (const componente of componentes) {
        await client.query(
          `
          INSERT INTO Componentes_Producto (
            producto_id, materia_prima_id, cantidad_necesaria, angulo_corte
          ) VALUES ($1, $2, $3, $4)
        `,
          [
            params.id,
            componente.materia_prima_id,
            componente.cantidad_necesaria,
            componente.angulo_corte,
          ]
        );
      }

      await client.query("COMMIT");
      client.release();

      return NextResponse.json(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      client.release();
      throw error;
    }
  } catch (error) {
    console.error("Error updating producto:", error);
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
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Eliminar componentes del producto primero
      await client.query(
        "DELETE FROM Componentes_Producto WHERE producto_id = $1",
        [params.id]
      );

      // Eliminar producto
      const result = await client.query(
        "DELETE FROM Productos WHERE producto_id = $1 RETURNING *",
        [params.id]
      );

      if (result.rows.length === 0) {
        await client.query("ROLLBACK");
        client.release();
        return NextResponse.json(
          { error: "Producto no encontrado" },
          { status: 404 }
        );
      }

      await client.query("COMMIT");
      client.release();

      return NextResponse.json({ message: "Producto eliminado correctamente" });
    } catch (error) {
      await client.query("ROLLBACK");
      client.release();
      throw error;
    }
  } catch (error) {
    console.error("Error deleting producto:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
