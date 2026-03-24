import { test, expect } from "./fixtures/auth.fixture";
import { openSidebarSection } from "./helpers/auth";
import { formatDateInput, uniqueSuffix } from "./helpers/data";
import { queryValue } from "./helpers/db";

test("ventas: crea, edita y elimina una orden de venta", async ({
  authenticatedPage,
}) => {
  const page = authenticatedPage;
  const suffix = uniqueSuffix();
  const clientName = `Cliente Venta E2E ${suffix}`;
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
        "3884001111",
        `venta-${suffix}@e2e.test`,
      ]
    )
  );

  const pedido = formatDateInput(new Date());
  const entregaEstimada = formatDateInput(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  );

  await openSidebarSection(page, "Ventas");
  await expect(
    page.getByRole("heading", {
      name: "Ordenes de Venta",
      exact: true,
      level: 2,
    })
  ).toBeVisible();

  await page.getByRole("button", { name: "Nueva Orden" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Cliente").selectOption(String(clientId));
  await dialog.getByLabel("Estado").selectOption("confirmada");
  await dialog.getByLabel("Fecha de Pedido").fill(pedido);
  await dialog.getByLabel("Entrega Estimada").fill(entregaEstimada);
  await dialog.getByRole("button", { name: "Agregar Producto" }).click();
  await dialog.locator("select").nth(2).selectOption({ label: "V1" });
  await dialog.locator("input[type='number']").nth(0).fill("2");
  await dialog.locator("input[type='number']").nth(1).fill("120000");
  await dialog.getByRole("button", { name: "Crear" }).click();

  await expect
    .poll(async () =>
      Number(
        await queryValue(
          `SELECT orden_venta_id::int
             FROM Ordenes_Venta
            WHERE cliente_id = $1
            ORDER BY orden_venta_id DESC
            LIMIT 1`,
          [clientId]
        )
      )
    )
    .toBeGreaterThan(0);

  const saleId = Number(
    await queryValue(
      `SELECT orden_venta_id::int
         FROM Ordenes_Venta
        WHERE cliente_id = $1
        ORDER BY orden_venta_id DESC
        LIMIT 1`,
      [clientId]
    )
  );

  const searchInput = page.getByPlaceholder("Buscar ordenes...");
  await searchInput.fill(String(saleId));

  const saleRow = page.locator("tr", { hasText: `#${saleId}` });
  await expect(saleRow).toBeVisible();

  await saleRow.getByRole("button", { name: "Ver detalles" }).click();
  await expect(page.getByText("Cantidad: 2")).toBeVisible();
  await expect(page.getByText("V1")).toBeVisible();
  await page.keyboard.press("Escape");

  await saleRow.getByRole("button", { name: "Editar orden" }).click();

  const editDialog = page.getByRole("dialog");
  await editDialog.getByLabel("Estado").selectOption("en_produccion");
  await editDialog.locator("input[type='number']").nth(0).fill("3");
  await editDialog.locator("input[type='number']").nth(1).fill("150000");
  await editDialog.getByRole("button", { name: "Actualizar" }).click();

  await searchInput.fill(String(saleId));
  await expect(page.locator("tr", { hasText: "En Producción" })).toBeVisible();

  await expect
    .poll(async () =>
      Number(
        await queryValue(
          `SELECT total_venta::numeric::float8
             FROM Ordenes_Venta
            WHERE orden_venta_id = $1`,
          [saleId]
        )
      )
    )
    .toBe(450000);

  await expect
    .poll(async () =>
      Number(
        await queryValue(
          `SELECT cantidad::int
             FROM Detalle_Orden_Venta
            WHERE orden_venta_id = $1
            LIMIT 1`,
          [saleId]
        )
      )
    )
    .toBe(3);

  await page
    .locator("tr", { hasText: `#${saleId}` })
    .getByRole("button", { name: "Eliminar orden" })
    .click();

  await expect(page.locator("tr", { hasText: `#${saleId}` })).toHaveCount(0);

  await expect
    .poll(async () =>
      Number(
        await queryValue(
          "SELECT COUNT(*)::int FROM Ordenes_Venta WHERE orden_venta_id = $1",
          [saleId]
        )
      )
    )
    .toBe(0);

  await expect
    .poll(async () =>
      Number(
        await queryValue(
          `SELECT COUNT(*)::int
             FROM Detalle_Orden_Venta
            WHERE orden_venta_id = $1`,
          [saleId]
        )
      )
    )
    .toBe(0);
});
