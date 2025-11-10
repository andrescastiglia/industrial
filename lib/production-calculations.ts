import { pool } from "./database";

export interface ConsumoCalculado {
  materia_prima_id: number;
  nombre: string;
  cantidad_necesaria_por_unidad: number;
  cantidad_total: number;
  cantidad_orden: number;
}

/**
 * Calcula automáticamente el consumo de materiales basándose en:
 * - Los componentes del producto (Productos_Componentes)
 * - La cantidad de productos a fabricar
 */
export async function calculateMaterialConsumption(
  producto_id: number,
  cantidad: number
): Promise<ConsumoCalculado[]> {
  const client = await pool.connect();

  try {
    // Obtener componentes del producto con sus cantidades necesarias
    const result = await client.query(
      `SELECT 
        pc.componente_id,
        c.nombre,
        pc.cantidad_necesaria,
        mp.materia_prima_id
      FROM Productos_Componentes pc
      JOIN Componentes c ON pc.componente_id = c.componente_id
      LEFT JOIN Componentes_Materia_Prima cmp ON c.componente_id = cmp.componente_id
      LEFT JOIN Materia_Prima mp ON cmp.materia_prima_id = mp.materia_prima_id
      WHERE pc.producto_id = $1
      ORDER BY c.nombre`,
      [producto_id]
    );

    // Calcular consumo total por componente
    return result.rows
      .filter((row) => row.materia_prima_id) // Solo incluir si tiene materia prima asignada
      .map((row) => ({
        materia_prima_id: row.materia_prima_id,
        nombre: row.nombre,
        cantidad_necesaria_por_unidad: row.cantidad_necesaria,
        cantidad_total: row.cantidad_necesaria * cantidad,
        cantidad_orden: cantidad,
      }));
  } finally {
    client.release();
  }
}
