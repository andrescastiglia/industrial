import { test, expect } from "./fixtures/auth.fixture";
import { openSidebarSection } from "./helpers/auth";
import { formatDateTimeLocalInput, uniqueSuffix } from "./helpers/data";
import { queryValue } from "./helpers/db";

test("produccion: crea, recalcula consumos y elimina una orden", async ({
  authenticatedPage,
}) => {
  const page = authenticatedPage;
  const suffix = uniqueSuffix();
  const clientName = `Cliente Produccion E2E ${suffix}`;
  const clientId = Number(
    await queryValue(
      `
        INSERT INTO Clientes (nombre, contacto, direccion, telefono, email)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING cliente_id::int
      `,
      [
        clientName,
        `Contacto ${suffix}`,
        `Direccion ${suffix}`,
        "3884002222",
        `produccion-${suffix}@e2e.test`,
      ]
    )
  );

  const productoId = Number(
    await queryValue(
      "SELECT producto_id::int FROM Productos WHERE nombre_modelo = 'V1' LIMIT 1"
    )
  );

  const ventaId = Number(
    await queryValue(
      `
        INSERT INTO Ordenes_Venta (
          cliente_id,
          fecha_pedido,
          fecha_entrega_estimada,
          estado,
          total_venta
        )
        VALUES ($1, CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', 'confirmada', 120000)
        RETURNING orden_venta_id::int
      `,
      [clientId]
    )
  );

  await queryValue(
    `
      INSERT INTO Detalle_Orden_Venta (
        orden_venta_id,
        producto_id,
        cantidad,
        precio_unitario_venta
      )
      VALUES ($1, $2, 1, 120000)
      RETURNING detalle_orden_venta_id::int
    `,
    [ventaId, productoId]
  );

  await openSidebarSection(page, "Órdenes de Producción");
  await expect(
    page.getByRole("heading", {
      name: "Ordenes de Produccion",
      exact: true,
      level: 2,
    })
  ).toBeVisible();

  const createdAt = new Date();
  const startedAt = new Date(createdAt.getTime() + 60 * 60 * 1000);
  const eta = new Date(createdAt.getTime() + 48 * 60 * 60 * 1000);

  await page.getByRole("button", { name: "Nueva Orden" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Producto").selectOption(String(productoId));
  await dialog.getByLabel("Cantidad").fill("2");
  await dialog.getByLabel("Orden de Venta").fill(String(ventaId));
  await dialog
    .getByLabel("Fecha de Creacion")
    .fill(formatDateTimeLocalInput(createdAt));
  await dialog
    .getByLabel("Fecha de Inicio")
    .fill(formatDateTimeLocalInput(startedAt));
  await dialog
    .getByLabel("Fecha Fin Estimada")
    .fill(formatDateTimeLocalInput(eta));
  await dialog.getByRole("button", { name: "Crear" }).click();

  await expect
    .poll(async () =>
      Number(
        await queryValue(
          `SELECT orden_produccion_id::int
             FROM Ordenes_Produccion
            WHERE orden_venta_id = $1
            ORDER BY orden_produccion_id DESC
            LIMIT 1`,
          [ventaId]
        )
      )
    )
    .toBeGreaterThan(0);

  const productionOrderId = Number(
    await queryValue(
      `SELECT orden_produccion_id::int
         FROM Ordenes_Produccion
        WHERE orden_venta_id = $1
        ORDER BY orden_produccion_id DESC
        LIMIT 1`,
      [ventaId]
    )
  );

  const searchInput = page.getByPlaceholder("Buscar ordenes...");
  await searchInput.fill(String(ventaId));

  const orderRow = page.locator("tr", { hasText: `OV-${ventaId}` });
  await expect(orderRow).toBeVisible();

  const expectedComponents = Number(
    await queryValue(
      "SELECT COUNT(*)::int FROM Componentes_Producto WHERE producto_id = $1",
      [productoId]
    )
  );

  await expect
    .poll(async () =>
      Number(
        await queryValue(
          `SELECT COUNT(*)::int
             FROM Consumo_Materia_Prima_Produccion
            WHERE orden_produccion_id = $1`,
          [productionOrderId]
        )
      )
    )
    .toBe(expectedComponents);

  await orderRow.getByRole("button", { name: "Editar orden" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Consumos Calculados",
      exact: true,
    })
  ).toBeVisible();
  await expect(page.getByText("Riel de aluminio EDS Superior")).toBeVisible();

  const editDialog = page.getByRole("dialog");
  await editDialog.getByLabel("Cantidad").fill("3");
  await editDialog.getByLabel("Estado").selectOption("en_proceso");
  await editDialog.getByRole("button", { name: "Actualizar" }).click();

  await searchInput.fill(String(ventaId));
  await expect(page.locator("tr", { hasText: "En Proceso" })).toBeVisible();

  await expect
    .poll(async () =>
      Number(
        Number(
          await queryValue(
            `
              SELECT cantidad_requerida::numeric::float8
                FROM Consumo_Materia_Prima_Produccion
               WHERE orden_produccion_id = $1
                 AND materia_prima_id = (
                   SELECT materia_prima_id
                     FROM Materia_Prima
                    WHERE referencia_proveedor = 'REHAU-EDS-SUP-001'
                    LIMIT 1
                 )
            `,
            [productionOrderId]
          )
        ).toFixed(2)
      )
    )
    .toBe(3.6);

  await page
    .locator("tr", { hasText: `OV-${ventaId}` })
    .getByRole("button", { name: "Eliminar orden" })
    .click();

  await expect(page.locator("tr", { hasText: `OV-${ventaId}` })).toHaveCount(0);

  await expect
    .poll(async () =>
      Number(
        await queryValue(
          `SELECT COUNT(*)::int
             FROM Ordenes_Produccion
            WHERE orden_produccion_id = $1`,
          [productionOrderId]
        )
      )
    )
    .toBe(0);

  await expect
    .poll(async () =>
      Number(
        await queryValue(
          `SELECT COUNT(*)::int
             FROM Consumo_Materia_Prima_Produccion
            WHERE orden_produccion_id = $1`,
          [productionOrderId]
        )
      )
    )
    .toBe(0);
});
