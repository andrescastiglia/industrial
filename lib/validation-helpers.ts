/**
 * Validation Helpers
 * Functions to validate entity existence and relationships
 */

import { pool } from "./database";

// ==================== Entity Existence Validation ====================

/**
 * Check if a cliente exists by ID
 */
export async function validateClienteExists(
  clienteId: number
): Promise<{ valid: boolean; error?: string; data?: any }> {
  try {
    const result = await pool.query(
      "SELECT cliente_id, nombre FROM clientes WHERE cliente_id = $1",
      [clienteId]
    );

    if (result.rows.length === 0) {
      return {
        valid: false,
        error: `Cliente con ID ${clienteId} no existe`,
      };
    }

    return {
      valid: true,
      data: result.rows[0],
    };
  } catch (error) {
    console.error("[VALIDATION] Error validating cliente:", error);
    return {
      valid: false,
      error: "Error al validar cliente",
    };
  }
}

/**
 * Check if a producto exists by ID
 */
export async function validateProductoExists(
  productoId: number
): Promise<{ valid: boolean; error?: string; data?: any }> {
  try {
    const result = await pool.query(
      "SELECT producto_id, nombre_modelo FROM productos WHERE producto_id = $1",
      [productoId]
    );

    if (result.rows.length === 0) {
      return {
        valid: false,
        error: `Producto con ID ${productoId} no existe`,
      };
    }

    return {
      valid: true,
      data: result.rows[0],
    };
  } catch (error) {
    console.error("[VALIDATION] Error validating producto:", error);
    return {
      valid: false,
      error: "Error al validar producto",
    };
  }
}

/**
 * Check if a materia prima exists by ID
 */
export async function validateMateriaPrimaExists(
  materiaPrimaId: number
): Promise<{ valid: boolean; error?: string; data?: any }> {
  try {
    const result = await pool.query(
      "SELECT materia_prima_id, nombre, stock_actual FROM materia_prima WHERE materia_prima_id = $1",
      [materiaPrimaId]
    );

    if (result.rows.length === 0) {
      return {
        valid: false,
        error: `Materia prima con ID ${materiaPrimaId} no existe`,
      };
    }

    return {
      valid: true,
      data: result.rows[0],
    };
  } catch (error) {
    console.error("[VALIDATION] Error validating materia prima:", error);
    return {
      valid: false,
      error: "Error al validar materia prima",
    };
  }
}

/**
 * Check if a proveedor exists by ID
 */
export async function validateProveedorExists(
  proveedorId: number
): Promise<{ valid: boolean; error?: string; data?: any }> {
  try {
    const result = await pool.query(
      "SELECT proveedor_id, nombre FROM proveedores WHERE proveedor_id = $1",
      [proveedorId]
    );

    if (result.rows.length === 0) {
      return {
        valid: false,
        error: `Proveedor con ID ${proveedorId} no existe`,
      };
    }

    return {
      valid: true,
      data: result.rows[0],
    };
  } catch (error) {
    console.error("[VALIDATION] Error validating proveedor:", error);
    return {
      valid: false,
      error: "Error al validar proveedor",
    };
  }
}

/**
 * Check if an operario exists by ID
 */
export async function validateOperarioExists(
  operarioId: number
): Promise<{ valid: boolean; error?: string; data?: any }> {
  try {
    const result = await pool.query(
      "SELECT operario_id, nombre, apellido, rol FROM operarios WHERE operario_id = $1",
      [operarioId]
    );

    if (result.rows.length === 0) {
      return {
        valid: false,
        error: `Operario con ID ${operarioId} no existe`,
      };
    }

    return {
      valid: true,
      data: result.rows[0],
    };
  } catch (error) {
    console.error("[VALIDATION] Error validating operario:", error);
    return {
      valid: false,
      error: "Error al validar operario",
    };
  }
}

/**
 * Check if a tipo de componente exists by ID
 */
export async function validateTipoComponenteExists(
  tipoComponenteId: number
): Promise<{ valid: boolean; error?: string; data?: any }> {
  try {
    const result = await pool.query(
      "SELECT tipo_componente_id, nombre_tipo FROM tipo_componente WHERE tipo_componente_id = $1",
      [tipoComponenteId]
    );

    if (result.rows.length === 0) {
      return {
        valid: false,
        error: `Tipo de componente con ID ${tipoComponenteId} no existe`,
      };
    }

    return {
      valid: true,
      data: result.rows[0],
    };
  } catch (error) {
    console.error("[VALIDATION] Error validating tipo componente:", error);
    return {
      valid: false,
      error: "Error al validar tipo de componente",
    };
  }
}

// ==================== Stock Validation ====================

/**
 * Validate that producto has sufficient stock
 */
export async function validateProductoStock(
  productoId: number,
  cantidadRequerida: number
): Promise<{ valid: boolean; error?: string; warnings?: string[] }> {
  try {
    const result = await pool.query(
      "SELECT producto_id, nombre_modelo FROM productos WHERE producto_id = $1",
      [productoId]
    );

    if (result.rows.length === 0) {
      return {
        valid: false,
        error: `Producto con ID ${productoId} no existe`,
      };
    }

    // Productos no tienen control de stock en el schema
    return {
      valid: true,
    };
  } catch (error) {
    console.error("[VALIDATION] Error validating producto stock:", error);
    return {
      valid: false,
      error: "Error al validar stock de producto",
    };
  }
}

/**
 * Validate that materia prima has sufficient stock
 */
export async function validateMateriaPrimaStock(
  materiaPrimaId: number,
  cantidadRequerida: number
): Promise<{ valid: boolean; error?: string; warnings?: string[] }> {
  try {
    const result = await pool.query(
      "SELECT materia_prima_id, nombre, stock_actual, punto_pedido FROM materia_prima WHERE materia_prima_id = $1",
      [materiaPrimaId]
    );

    if (result.rows.length === 0) {
      return {
        valid: false,
        error: `Materia prima con ID ${materiaPrimaId} no existe`,
      };
    }

    const materiaPrima = result.rows[0];
    const warnings: string[] = [];

    if (materiaPrima.stock_actual < cantidadRequerida) {
      return {
        valid: false,
        error: `Stock insuficiente de "${materiaPrima.nombre}". Disponible: ${materiaPrima.stock_actual}, Requerido: ${cantidadRequerida}`,
      };
    }

    const stockRestante = materiaPrima.stock_actual - cantidadRequerida;
    if (
      materiaPrima.punto_pedido &&
      stockRestante < materiaPrima.punto_pedido
    ) {
      warnings.push(
        `Stock de "${materiaPrima.nombre}" quedará por debajo del punto de pedido (${materiaPrima.punto_pedido})`
      );
    }

    return {
      valid: true,
      warnings,
    };
  } catch (error) {
    console.error("[VALIDATION] Error validating materia prima stock:", error);
    return {
      valid: false,
      error: "Error al validar stock de materia prima",
    };
  }
}

// ==================== Uniqueness Validation ====================

/**
 * Check if a cliente email already exists
 */
export async function validateClienteEmailUnique(
  email: string,
  excludeId?: number
): Promise<{ valid: boolean; error?: string }> {
  try {
    const params = excludeId ? [email, excludeId] : [email];
    const query_text = excludeId
      ? "SELECT cliente_id FROM clientes WHERE LOWER(email) = LOWER($1) AND cliente_id != $2"
      : "SELECT cliente_id FROM clientes WHERE LOWER(email) = LOWER($1)";

    const result = await pool.query(query_text, params);

    if (result.rows.length > 0) {
      return {
        valid: false,
        error: "Ya existe un cliente con este email",
      };
    }

    return { valid: true };
  } catch (error) {
    console.error("[VALIDATION] Error validating cliente email:", error);
    return {
      valid: false,
      error: "Error al validar email de cliente",
    };
  }
}

/**
 * Check if a producto codigo already exists
 * NOTE: Productos table doesn't have a 'codigo' column - this validation always passes
 */
export async function validateProductoCodigoUnique(
  codigo: string,
  excludeId?: number
): Promise<{ valid: boolean; error?: string }> {
  // Productos no tienen columna 'codigo' en el schema
  return { valid: true };
}

/**
 * Check if a materia prima referencia_proveedor already exists
 */
export async function validateMateriaPrimaCodigoUnique(
  codigo: string,
  excludeId?: number
): Promise<{ valid: boolean; error?: string }> {
  try {
    const params = excludeId ? [codigo, excludeId] : [codigo];
    const query_text = excludeId
      ? "SELECT materia_prima_id FROM materia_prima WHERE referencia_proveedor = $1 AND materia_prima_id != $2"
      : "SELECT materia_prima_id FROM materia_prima WHERE referencia_proveedor = $1";

    const result = await pool.query(query_text, params);

    if (result.rows.length > 0) {
      return {
        valid: false,
        error: "Ya existe una materia prima con esta referencia",
      };
    }

    return { valid: true };
  } catch (error) {
    console.error(
      "[VALIDATION] Error validating materia prima referencia:",
      error
    );
    return {
      valid: false,
      error: "Error al validar referencia de materia prima",
    };
  }
}

/**
 * Check if an operario numero_documento already exists
 * NOTE: Operarios table doesn't have a 'numero_documento' column - this validation always passes
 */
export async function validateOperarioDocumentoUnique(
  numeroDocumento: string,
  excludeId?: number
): Promise<{ valid: boolean; error?: string }> {
  // Operarios no tienen columna 'numero_documento' en el schema
  return { valid: true };
}

// ==================== Batch Validation ====================

/**
 * Validate multiple entities exist
 */
export async function validateMultipleEntitiesExist(
  entities: Array<{
    type: "cliente" | "producto" | "materia_prima" | "proveedor" | "operario";
    id: number;
  }>
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  for (const entity of entities) {
    let result;

    switch (entity.type) {
      case "cliente":
        result = await validateClienteExists(entity.id);
        break;
      case "producto":
        result = await validateProductoExists(entity.id);
        break;
      case "materia_prima":
        result = await validateMateriaPrimaExists(entity.id);
        break;
      case "proveedor":
        result = await validateProveedorExists(entity.id);
        break;
      case "operario":
        result = await validateOperarioExists(entity.id);
        break;
    }

    if (result && !result.valid) {
      errors.push(result.error || `${entity.type} inválido`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
