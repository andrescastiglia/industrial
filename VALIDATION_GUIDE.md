# Guía de Validación de Datos

## 📋 Índice

- [Descripción General](#descripción-general)
- [Arquitectura](#arquitectura)
- [Schemas Disponibles](#schemas-disponibles)
- [Uso en API Routes](#uso-en-api-routes)
- [Uso en Formularios Frontend](#uso-en-formularios-frontend)
- [Validación de Relaciones](#validación-de-relaciones)
- [Mensajes de Error](#mensajes-de-error)
- [Best Practices](#best-practices)
- [Ejemplos Completos](#ejemplos-completos)

---

## Descripción General

El sistema de validación utiliza **Zod** para validación type-safe tanto en el frontend como en el backend. Esto garantiza:

✅ **Type Safety**: TypeScript infiere automáticamente los tipos desde los schemas  
✅ **Validación Consistente**: Mismas reglas en frontend y backend  
✅ **Mensajes Claros**: Errores descriptivos en español  
✅ **Sanitización**: Limpieza automática de inputs  
✅ **SQL Injection Prevention**: Protección contra ataques  
✅ **Validación de Relaciones**: Verificación de integridad referencial

---

## Arquitectura

```
lib/
├── validations/                 # Schemas Zod
│   ├── common.ts                # Patrones reutilizables (email, phone, etc.)
│   ├── clientes.ts              # Schema de clientes
│   ├── productos.ts             # Schema de productos
│   ├── materia-prima.ts         # Schema de materia prima
│   ├── ordenes-produccion.ts    # Schema de órdenes
│   ├── proveedores.ts           # Schema de proveedores
│   ├── operarios.ts             # Schema de operarios
│   ├── ventas.ts                # Schema de ventas
│   ├── compras.ts               # Schema de compras
│   └── index.ts                 # Exports centralizados
├── api-validation.ts            # Middleware para API routes
└── validation-helpers.ts        # Verificación de existencia y relaciones
```

---

## Schemas Disponibles

### Common Patterns (lib/validations/common.ts)

Patrones reutilizables para validación:

```typescript
import {
  emailSchema, // Email RFC 5322
  phoneSchema, // Teléfono (formato colombiano e internacional)
  phoneOptionalSchema, // Teléfono opcional
  nitSchema, // NIT/RUT (formato: 123456789-0)
  positiveIntSchema, // Entero positivo
  positiveDecimalSchema, // Decimal positivo
  nonNegativeDecimalSchema, // Decimal >= 0
  percentageSchema, // 0-100
  dateSchema, // Fecha ISO 8601
  futureDateSchema, // Fecha futura
  pastDateSchema, // Fecha pasada
  uuidSchema, // UUID v4
  nonEmptyStringSchema, // String no vacío
  shortTextSchema, // String ≤ 100 caracteres
  mediumTextSchema, // String ≤ 500 caracteres
  longTextSchema, // String ≤ 2000 caracteres
  urlSchema, // URL válida
  statusEnum, // 'activo' | 'inactivo'
} from "@/lib/validations/common";
```

### Clientes

```typescript
import {
  createClienteSchema, // POST: crear cliente
  updateClienteSchema, // PUT/PATCH: actualizar cliente
  filterClienteSchema, // GET: filtrar clientes
  clienteIdSchema, // Validar parámetro id
} from "@/lib/validations/clientes";
```

**Campos Validados:**

- `nombre`: string (1-150 caracteres)
- `email`: email válido (RFC 5322)
- `telefono`: formato telefónico válido
- `direccion`: string (1-500 caracteres)
- `nit`: formato NIT/RUT (opcional)
- `contacto`: string (0-150 caracteres, opcional)
- `telefono_contacto`: teléfono opcional
- `email_contacto`: email opcional
- `notas`: string (0-1000 caracteres, opcional)
- `estado`: 'activo' | 'inactivo'

### Productos

```typescript
import {
  createProductoSchema,
  updateProductoSchema,
  filterProductoSchema,
  productoIdSchema,
  validateProductoPricing, // Validación de precios
  validateProductoStock, // Validación de stock
} from "@/lib/validations/productos";
```

**Campos Validados:**

- `codigo`: string (formato: A-Z0-9-\_)
- `nombre`: string (1-200 caracteres)
- `descripcion`: string (0-500 caracteres)
- `precio_venta`: decimal positivo
- `precio_costo`: decimal >= 0
- `stock_actual`: entero >= 0
- `stock_minimo`: entero >= 0
- `unidad_medida`: 'unidad' | 'kg' | 'litro' | 'metro' | 'metro_cuadrado' | 'metro_cubico'
- `tiempo_produccion`: entero positivo (minutos)
- `imagen_url`: URL opcional
- `categoria`: string (0-100 caracteres)
- `estado`: 'activo' | 'inactivo'

### Materia Prima

```typescript
import {
  createMateriaPrimaSchema,
  updateMateriaPrimaSchema,
  filterMateriaPrimaSchema,
  materiaPrimaIdSchema,
  validateMateriaPrimaStock, // Validación de stock
  validateMateriaPrimaConsumption, // Validación de consumo
} from "@/lib/validations/materia-prima";
```

### Órdenes de Producción

```typescript
import {
  createOrdenProduccionSchema,
  updateOrdenProduccionSchema,
  filterOrdenProduccionSchema,
  ordenProduccionIdSchema,
  validateOrdenCanStart, // Puede iniciarse?
  validateOrdenCanComplete, // Puede completarse?
  validateOrdenCanCancel, // Puede cancelarse?
  validateOrdenTimeline, // Validar fechas
} from "@/lib/validations/ordenes-produccion";
```

**Estados:** `'pendiente'` | `'en_proceso'` | `'completada'` | `'cancelada'`  
**Prioridades:** `'baja'` | `'media'` | `'alta'` | `'urgente'`

### Proveedores

```typescript
import {
  createProveedorSchema,
  updateProveedorSchema,
  filterProveedorSchema,
  proveedorIdSchema,
} from "@/lib/validations/proveedores";
```

### Operarios

```typescript
import {
  createOperarioSchema,
  updateOperarioSchema,
  filterOperarioSchema,
  operarioIdSchema,
  validateOperarioAvailability, // Disponibilidad por turno
  validateOperarioExperience, // Experiencia
} from "@/lib/validations/operarios";
```

**Turnos:** `'mañana'` | `'tarde'` | `'noche'` | `'rotativo'`  
**Especialidades:** `'general'` | `'soldadura'` | `'mecanizado'` | `'ensamblaje'` | `'pintura'` | `'control_calidad'`

### Ventas

```typescript
import {
  createVentaSchema, // Incluye validación de detalles y totales
  updateVentaSchema,
  filterVentaSchema,
  ventaIdSchema,
  ventaDetalleSchema, // Schema para items de venta
  validateVentaCanCancel,
  validateVentaCanPay,
  validateVentaTaxes, // Validación de impuestos
} from "@/lib/validations/ventas";
```

**Estados:** `'pendiente'` | `'pagada'` | `'cancelada'` | `'devuelta'`  
**Métodos de Pago:** `'efectivo'` | `'tarjeta'` | `'transferencia'` | `'credito'`

### Compras

```typescript
import {
  createCompraSchema, // Incluye validación de detalles y totales
  updateCompraSchema,
  filterCompraSchema,
  compraIdSchema,
  compraDetalleSchema, // Schema para items de compra
  validateCompraCanReceive,
  validateCompraCanCancel,
  validateCompraDelivery, // Validación de fechas de entrega
} from "@/lib/validations/compras";
```

---

## Uso en API Routes

### Setup Básico

```typescript
import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/lib/api-validation";
import { createClienteSchema } from "@/lib/validations/clientes";

export async function POST(request: NextRequest) {
  // Validar y sanitizar body
  const validation = await validateRequest(request, {
    bodySchema: createClienteSchema,
    sanitize: true, // Limpia strings automáticamente
  });

  if (!validation.success) {
    return validation.response!; // Retorna error 400 con detalles
  }

  const clienteData = validation.data!.body!;

  // clienteData es type-safe y validado
  // ... lógica de negocio
}
```

### Validación Completa (Body + Query + Params)

```typescript
import { validateRequest } from "@/lib/api-validation";
import {
  updateClienteSchema,
  clienteIdSchema,
  filterClienteSchema,
} from "@/lib/validations/clientes";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const validation = await validateRequest(request, {
    bodySchema: updateClienteSchema, // Validar body
    paramsSchema: clienteIdSchema, // Validar :id
    querySchema: filterClienteSchema, // Validar ?search=...
    params: { id: params.id },
    sanitize: true,
  });

  if (!validation.success) {
    return validation.response!;
  }

  const { body, params: validParams, query } = validation.data!;

  // Todos los datos son type-safe
}
```

### Validación de Relaciones

```typescript
import {
  validateClienteExists,
  validateProductoExists,
  validateMateriaPrimaStock,
} from "@/lib/validation-helpers";

export async function POST(request: NextRequest) {
  // ... validación de schema

  // Verificar que cliente existe y está activo
  const clienteCheck = await validateClienteExists(ventaData.cliente_id);
  if (!clienteCheck.valid) {
    return NextResponse.json(
      { success: false, error: clienteCheck.error },
      { status: 404 }
    );
  }

  // Verificar que producto existe y tiene stock
  const stockCheck = await validateMateriaPrimaStock(
    materiaPrimaId,
    cantidadRequerida
  );
  if (!stockCheck.valid) {
    return NextResponse.json(
      { success: false, error: stockCheck.error },
      { status: 400 }
    );
  }

  // Advertencias (warnings) no bloquean, solo informan
  if (stockCheck.warnings && stockCheck.warnings.length > 0) {
    console.warn("[STOCK_WARNING]", stockCheck.warnings);
  }
}
```

### Validación de Unicidad

```typescript
import { validateClienteEmailUnique } from "@/lib/validation-helpers";

// Para crear
const emailCheck = await validateClienteEmailUnique(email);

// Para actualizar (excluir el id actual)
const emailCheck = await validateClienteEmailUnique(email, clienteId);

if (!emailCheck.valid) {
  return NextResponse.json(
    {
      success: false,
      error: emailCheck.error,
      validation_errors: [{ field: "email", message: emailCheck.error! }],
    },
    { status: 400 }
  );
}
```

---

## Uso en Formularios Frontend

### Con React Hook Form + Zod Resolver

```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClienteSchema } from '@/lib/validations/clientes';
import type { ClienteCreate } from '@/lib/validations/clientes';

export default function ClienteForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClienteCreate>({
    resolver: zodResolver(createClienteSchema),
    defaultValues: {
      estado: 'activo',
    },
  });

  const onSubmit = async (data: ClienteCreate) => {
    try {
      const response = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();

        // Mostrar errores de validación del backend
        if (error.validation_errors) {
          error.validation_errors.forEach((err: any) => {
            console.error(`${err.field}: ${err.message}`);
          });
        }
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="nombre">Nombre *</label>
        <input
          {...register('nombre')}
          id="nombre"
          className={errors.nombre ? 'border-red-500' : ''}
        />
        {errors.nombre && (
          <span className="text-red-500 text-sm">
            {errors.nombre.message}
          </span>
        )}
      </div>

      <div>
        <label htmlFor="email">Email *</label>
        <input
          {...register('email')}
          id="email"
          type="email"
          className={errors.email ? 'border-red-500' : ''}
        />
        {errors.email && (
          <span className="text-red-500 text-sm">
            {errors.email.message}
          </span>
        )}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Guardando...' : 'Guardar'}
      </button>
    </form>
  );
}
```

### Validación Manual (sin React Hook Form)

```typescript
import { createClienteSchema } from "@/lib/validations/clientes";

async function submitForm(formData: any) {
  try {
    // Validar manualmente
    const validatedData = createClienteSchema.parse(formData);

    // validatedData es type-safe
    await saveCliente(validatedData);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Mostrar errores
      error.errors.forEach((err) => {
        console.error(`${err.path.join(".")}: ${err.message}`);
      });
    }
  }
}
```

---

## Validación de Relaciones

### Funciones Disponibles

```typescript
import {
  // Existencia de entidades
  validateClienteExists,
  validateProductoExists,
  validateMateriaPrimaExists,
  validateProveedorExists,
  validateOperarioExists,
  validateTipoComponenteExists,

  // Validación de stock
  validateProductoStock,
  validateMateriaPrimaStock,

  // Validación de unicidad
  validateClienteEmailUnique,
  validateProductoCodigoUnique,
  validateMateriaPrimaCodigoUnique,
  validateOperarioDocumentoUnique,

  // Validación múltiple
  validateMultipleEntitiesExist,
} from "@/lib/validation-helpers";
```

### Ejemplo: Validación Múltiple

```typescript
const validation = await validateMultipleEntitiesExist([
  { type: "cliente", id: ventaData.cliente_id },
  { type: "producto", id: item1.producto_id },
  { type: "producto", id: item2.producto_id },
]);

if (!validation.valid) {
  return NextResponse.json(
    { success: false, errors: validation.errors },
    { status: 400 }
  );
}
```

---

## Mensajes de Error

### Formato de Respuesta de Error

```json
{
  "success": false,
  "error": "Errores de validación",
  "validation_errors": [
    {
      "field": "email",
      "message": "Email inválido"
    },
    {
      "field": "telefono",
      "message": "Formato de teléfono inválido"
    }
  ]
}
```

### Errores Comunes

| Campo          | Error                                                               | Significado            |
| -------------- | ------------------------------------------------------------------- | ---------------------- |
| email          | "Email inválido"                                                    | No cumple RFC 5322     |
| telefono       | "Formato de teléfono inválido"                                      | No es un número válido |
| nit            | "Formato de NIT/RUT inválido (ej: 123456789-0)"                     | Formato incorrecto     |
| precio_venta   | "Debe ser un número positivo"                                       | Valor ≤ 0              |
| stock_actual   | "No puede ser negativo"                                             | Valor < 0              |
| fecha_estimada | "La fecha estimada debe ser igual o posterior a la fecha de inicio" | Fecha inconsistente    |
| email          | "Ya existe un cliente con este email"                               | Duplicado en BD        |
| codigo         | "Ya existe un producto con este código"                             | Duplicado en BD        |

---

## Best Practices

### ✅ DO

```typescript
// ✅ Usar schemas en lugar de validación manual
const validation = await validateRequest(request, {
  bodySchema: createClienteSchema,
  sanitize: true,
});

// ✅ Verificar existencia antes de operaciones
const exists = await validateClienteExists(clienteId);
if (!exists.valid) return error404;

// ✅ Retornar errores consistentes
return NextResponse.json(
  { success: false, error: "Mensaje claro" },
  { status: 400 }
);

// ✅ Loggear advertencias pero no bloquear
if (warnings.length > 0) {
  console.warn("[VALIDATION_WARNING]", warnings);
}
```

### ❌ DON'T

```typescript
// ❌ No validar manualmente strings
if (!body.email || !body.email.includes('@')) { ... }

// ❌ No construir queries con concatenación
const query = `SELECT * FROM clientes WHERE nombre = '${nombre}'`;

// ❌ No ignorar errores de validación
const data = await request.json();  // Sin try/catch

// ❌ No mezclar formatos de error
return NextResponse.json('Error', { status: 400 });  // Inconsistente
```

---

## Ejemplos Completos

### Ejemplo 1: Crear Cliente con Validación Completa

```typescript
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";
import { validateRequest } from "@/lib/api-validation";
import { createClienteSchema } from "@/lib/validations/clientes";
import { validateClienteEmailUnique } from "@/lib/validation-helpers";

export async function POST(request: NextRequest) {
  try {
    // 1. Validar schema y sanitizar
    const validation = await validateRequest(request, {
      bodySchema: createClienteSchema,
      sanitize: true,
    });

    if (!validation.success) {
      return validation.response!;
    }

    const clienteData = validation.data!.body!;

    // 2. Validar unicidad de email
    const emailCheck = await validateClienteEmailUnique(clienteData.email);
    if (!emailCheck.valid) {
      return NextResponse.json(
        {
          success: false,
          error: emailCheck.error,
          validation_errors: [{ field: "email", message: emailCheck.error! }],
        },
        { status: 400 }
      );
    }

    // 3. Insertar en BD
    const client = await pool.connect();

    const result = await client.query(
      `INSERT INTO Clientes (nombre, email, telefono, direccion, contacto, nit, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        clienteData.nombre,
        clienteData.email,
        clienteData.telefono,
        clienteData.direccion,
        clienteData.contacto || null,
        clienteData.nit || null,
        clienteData.estado,
      ]
    );

    client.release();

    // 4. Retornar respuesta
    return NextResponse.json(
      {
        success: true,
        data: result.rows[0],
        message: "Cliente creado exitosamente",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API_ERROR] Error creating cliente:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
```

### Ejemplo 2: Crear Venta con Detalles

```typescript
import { createVentaSchema } from "@/lib/validations/ventas";
import {
  validateClienteExists,
  validateProductoStock,
} from "@/lib/validation-helpers";

export async function POST(request: NextRequest) {
  try {
    // 1. Validar schema (incluye validación de totales)
    const validation = await validateRequest(request, {
      bodySchema: createVentaSchema,
      sanitize: true,
    });

    if (!validation.success) {
      return validation.response!;
    }

    const ventaData = validation.data!.body!;

    // 2. Validar cliente existe
    const clienteCheck = await validateClienteExists(ventaData.cliente_id);
    if (!clienteCheck.valid) {
      return NextResponse.json(
        { success: false, error: clienteCheck.error },
        { status: 404 }
      );
    }

    // 3. Validar stock de cada producto
    for (const detalle of ventaData.detalles) {
      const stockCheck = await validateProductoStock(
        detalle.producto_id,
        detalle.cantidad
      );

      if (!stockCheck.valid) {
        return NextResponse.json(
          { success: false, error: stockCheck.error },
          { status: 400 }
        );
      }

      // Advertir si stock quedará bajo
      if (stockCheck.warnings && stockCheck.warnings.length > 0) {
        console.warn("[STOCK_WARNING]", stockCheck.warnings);
      }
    }

    // 4. Crear venta en transacción
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Insertar venta
      const ventaResult = await client.query(
        `INSERT INTO ventas (numero_venta, cliente_id, fecha_venta, subtotal, impuestos, total, metodo_pago, estado)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          ventaData.numero_venta,
          ventaData.cliente_id,
          ventaData.fecha_venta,
          ventaData.subtotal,
          ventaData.impuestos,
          ventaData.total,
          ventaData.metodo_pago,
          ventaData.estado,
        ]
      );

      const ventaId = ventaResult.rows[0].id;

      // Insertar detalles
      for (const detalle of ventaData.detalles) {
        await client.query(
          `INSERT INTO venta_detalles (venta_id, producto_id, cantidad, precio_unitario, subtotal)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            ventaId,
            detalle.producto_id,
            detalle.cantidad,
            detalle.precio_unitario,
            detalle.subtotal,
          ]
        );

        // Actualizar stock
        await client.query(
          `UPDATE productos SET stock_actual = stock_actual - $1 WHERE id = $2`,
          [detalle.cantidad, detalle.producto_id]
        );
      }

      await client.query("COMMIT");

      return NextResponse.json(
        {
          success: true,
          data: ventaResult.rows[0],
          message: "Venta creada exitosamente",
        },
        { status: 201 }
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("[API_ERROR] Error creating venta:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
```

---

## Agregar Nuevos Schemas

### 1. Crear archivo en /lib/validations/

```typescript
// lib/validations/mi-entidad.ts

import { z } from "zod";
import { nonEmptyStringSchema, statusEnum } from "./common";

export const miEntidadBaseSchema = z.object({
  nombre: nonEmptyStringSchema.max(200, "Máximo 200 caracteres"),
  descripcion: z.string().max(500).optional(),
  estado: statusEnum.default("activo"),
});

export const createMiEntidadSchema = miEntidadBaseSchema;
export const updateMiEntidadSchema = miEntidadBaseSchema.partial();

export type MiEntidadCreate = z.infer<typeof createMiEntidadSchema>;
export type MiEntidadUpdate = z.infer<typeof updateMiEntidadSchema>;
```

### 2. Exportar en index.ts

```typescript
// lib/validations/index.ts
export * from "./mi-entidad";
```

### 3. Usar en API route

```typescript
import { createMiEntidadSchema } from "@/lib/validations/mi-entidad";
// ... usar igual que otros schemas
```

---

## Testing

### Test de Schema

```typescript
import { describe, it, expect } from "@jest/globals";
import { createClienteSchema } from "@/lib/validations/clientes";

describe("createClienteSchema", () => {
  it("valida datos correctos", () => {
    const validData = {
      nombre: "Acme Corp",
      email: "contact@acme.com",
      telefono: "+57 300 123 4567",
      direccion: "Calle 123",
      estado: "activo",
    };

    const result = createClienteSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("rechaza email inválido", () => {
    const invalidData = {
      nombre: "Acme Corp",
      email: "invalid-email",
      telefono: "+57 300 123 4567",
      direccion: "Calle 123",
    };

    const result = createClienteSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["email"]);
    }
  });
});
```

---

## Recursos

- **Documentación de Zod**: https://zod.dev/
- **React Hook Form**: https://react-hook-form.com/
- **Zod Resolver**: https://github.com/react-hook-form/resolvers#zod

---

**Última actualización**: Noviembre 12, 2025  
**Versión**: 1.0.0
