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
      "SELECT id, nombre, estado FROM clientes WHERE id = $1",
      [clienteId]
    );

    if (result.rows.length === 0) {
      return {
        valid: false,
        error: `Cliente con ID ${clienteId} no existe`,
      };
    }

    const cliente = result.rows[0];

    if (cliente.estado !== "activo") {
      return {
        valid: false,
        error: `Cliente "${cliente.nombre}" está inactivo`,
      };
    }

    return {
      valid: true,
      data: cliente,
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
      "SELECT id, codigo, nombre, estado, stock_actual FROM productos WHERE id = $1",
      [productoId]
    );

    if (result.rows.length === 0) {
      return {
        valid: false,
        error: `Producto con ID ${productoId} no existe`,
      };
    }

    const producto = result.rows[0];

    if (producto.estado !== "activo") {
      return {
        valid: false,
        error: `Producto "${producto.nombre}" está inactivo`,
      };
    }

    return {
      valid: true,
      data: producto,
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
      "SELECT id, codigo, nombre, estado, stock_actual FROM materia_prima WHERE id = $1",
      [materiaPrimaId]
    );

    if (result.rows.length === 0) {
      return {
        valid: false,
        error: `Materia prima con ID ${materiaPrimaId} no existe`,
      };
    }

    const materiaPrima = result.rows[0];

    if (materiaPrima.estado !== "activo") {
      return {
        valid: false,
        error: `Materia prima "${materiaPrima.nombre}" está inactiva`,
      };
    }

    return {
      valid: true,
      data: materiaPrima,
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
      "SELECT id, nombre, estado FROM proveedores WHERE id = $1",
      [proveedorId]
    );

    if (result.rows.length === 0) {
      return {
        valid: false,
        error: `Proveedor con ID ${proveedorId} no existe`,
      };
    }

    const proveedor = result.rows[0];

    if (proveedor.estado !== "activo") {
      return {
        valid: false,
        error: `Proveedor "${proveedor.nombre}" está inactivo`,
      };
    }

    return {
      valid: true,
      data: proveedor,
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
      "SELECT id, nombre, estado, turno FROM operarios WHERE id = $1",
      [operarioId]
    );

    if (result.rows.length === 0) {
      return {
        valid: false,
        error: `Operario con ID ${operarioId} no existe`,
      };
    }

    const operario = result.rows[0];

    if (operario.estado !== "activo") {
      return {
        valid: false,
        error: `Operario "${operario.nombre}" está inactivo`,
      };
    }

    return {
      valid: true,
      data: operario,
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
      "SELECT id, nombre FROM tipo_componente WHERE id = $1",
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
      "SELECT id, nombre, stock_actual, stock_minimo FROM productos WHERE id = $1",
      [productoId]
    );

    if (result.rows.length === 0) {
      return {
        valid: false,
        error: `Producto con ID ${productoId} no existe`,
      };
    }

    const producto = result.rows[0];
    const warnings: string[] = [];

    if (producto.stock_actual < cantidadRequerida) {
      return {
        valid: false,
        error: `Stock insuficiente de "${producto.nombre}". Disponible: ${producto.stock_actual}, Requerido: ${cantidadRequerida}`,
      };
    }

    const stockRestante = producto.stock_actual - cantidadRequerida;
    if (stockRestante < producto.stock_minimo) {
      warnings.push(
        `Stock de "${producto.nombre}" quedará por debajo del mínimo (${producto.stock_minimo})`
      );
    }

    return {
      valid: true,
      warnings,
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
      "SELECT id, nombre, stock_actual, stock_minimo FROM materia_prima WHERE id = $1",
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
    if (stockRestante < materiaPrima.stock_minimo) {
      warnings.push(
        `Stock de "${materiaPrima.nombre}" quedará por debajo del mínimo (${materiaPrima.stock_minimo})`
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
      ? "SELECT id FROM clientes WHERE LOWER(email) = LOWER($1) AND id != $2"
      : "SELECT id FROM clientes WHERE LOWER(email) = LOWER($1)";

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
 */
export async function validateProductoCodigoUnique(
  codigo: string,
  excludeId?: number
): Promise<{ valid: boolean; error?: string }> {
  try {
    const params = excludeId ? [codigo, excludeId] : [codigo];
    const query_text = excludeId
      ? "SELECT id FROM productos WHERE UPPER(codigo) = UPPER($1) AND id != $2"
      : "SELECT id FROM productos WHERE UPPER(codigo) = UPPER($1)";

    const result = await pool.query(query_text, params);

    if (result.rows.length > 0) {
      return {
        valid: false,
        error: "Ya existe un producto con este código",
      };
    }

    return { valid: true };
  } catch (error) {
    console.error("[VALIDATION] Error validating producto codigo:", error);
    return {
      valid: false,
      error: "Error al validar código de producto",
    };
  }
}

/**
 * Check if a materia prima codigo already exists
 */
export async function validateMateriaPrimaCodigoUnique(
  codigo: string,
  excludeId?: number
): Promise<{ valid: boolean; error?: string }> {
  try {
    const params = excludeId ? [codigo, excludeId] : [codigo];
    const query_text = excludeId
      ? "SELECT id FROM materia_prima WHERE UPPER(codigo) = UPPER($1) AND id != $2"
      : "SELECT id FROM materia_prima WHERE UPPER(codigo) = UPPER($1)";

    const result = await pool.query(query_text, params);

    if (result.rows.length > 0) {
      return {
        valid: false,
        error: "Ya existe una materia prima con este código",
      };
    }

    return { valid: true };
  } catch (error) {
    console.error("[VALIDATION] Error validating materia prima codigo:", error);
    return {
      valid: false,
      error: "Error al validar código de materia prima",
    };
  }
}

/**
 * Check if an operario numero_documento already exists
 */
export async function validateOperarioDocumentoUnique(
  numeroDocumento: string,
  excludeId?: number
): Promise<{ valid: boolean; error?: string }> {
  try {
    const params = excludeId ? [numeroDocumento, excludeId] : [numeroDocumento];
    const query_text = excludeId
      ? "SELECT id FROM operarios WHERE numero_documento = $1 AND id != $2"
      : "SELECT id FROM operarios WHERE numero_documento = $1";

    const result = await pool.query(query_text, params);

    if (result.rows.length > 0) {
      return {
        valid: false,
        error: "Ya existe un operario con este número de documento",
      };
    }

    return { valid: true };
  } catch (error) {
    console.error("[VALIDATION] Error validating operario documento:", error);
    return {
      valid: false,
      error: "Error al validar número de documento",
    };
  }
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
