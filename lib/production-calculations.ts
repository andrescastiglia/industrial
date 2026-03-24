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
 * - Los componentes del producto (Componentes_Producto)
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
        cp.materia_prima_id,
        mp.nombre,
        cp.cantidad_necesaria
      FROM Componentes_Producto cp
      JOIN Materia_Prima mp ON cp.materia_prima_id = mp.materia_prima_id
      WHERE cp.producto_id = $1
      ORDER BY mp.nombre`,
      [producto_id]
    );

    // Calcular consumo total por componente
    return result.rows.map((row) => ({
      materia_prima_id: row.materia_prima_id,
      nombre: row.nombre,
      cantidad_necesaria_por_unidad: Number(row.cantidad_necesaria),
      cantidad_total: Number(row.cantidad_necesaria) * cantidad,
      cantidad_orden: cantidad,
    }));
  } finally {
    client.release();
  }
}
