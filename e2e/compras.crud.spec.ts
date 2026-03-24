import { test, expect } from "./fixtures/auth.fixture";
import { openSidebarSection } from "./helpers/auth";
import { formatDateInput, uniqueSuffix } from "./helpers/data";
import { queryValue } from "./helpers/db";

test("compras: crea, edita y elimina una compra", async ({
  authenticatedPage,
}) => {
  const page = authenticatedPage;
  const suffix = uniqueSuffix();
  const reference = `E2E-COMPRA-${suffix}`;
  const pedido = formatDateInput(new Date());
  const estimada = formatDateInput(
    new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
  );
  const real = formatDateInput(new Date(Date.now() + 4 * 24 * 60 * 60 * 1000));

  await openSidebarSection(page, "Compras");
  await expect(
    page.getByRole("heading", { name: "Compras", exact: true, level: 2 })
  ).toBeVisible();

  await page.getByRole("button", { name: "Nueva Compra" }).click();

  await page.getByLabel("Proveedor").selectOption({ label: "REHAU S.A." });
  await page.getByLabel("Referencia").fill(reference);
  await page.getByLabel("Fecha de Pedido").fill(pedido);
  await page.getByLabel("Recepcion Estimada").fill(estimada);
  await page.getByLabel("Total").fill("125000.5");
  await page.getByRole("button", { name: "Crear" }).click();

  const searchInput = page.getByPlaceholder("Buscar compras...");
  await searchInput.fill(reference);

  const purchaseRow = page.locator("tr", { hasText: reference });
  await expect(purchaseRow).toBeVisible();

  await expect
    .poll(async () =>
      Number(
        await queryValue(
          "SELECT compra_id::int FROM Compras WHERE cotizacion_ref = $1",
          [reference]
        )
      )
    )
    .toBeGreaterThan(0);

  await purchaseRow.getByRole("button", { name: "Editar" }).click();
  await page.getByLabel("Recepcion Real").fill(real);
  await page.getByLabel("Estado").selectOption("recibida");
  await page.getByLabel("Total").fill("150000");
  await page.getByRole("button", { name: "Actualizar" }).click();

  await searchInput.fill(reference);
  await expect(page.locator("tr", { hasText: reference })).toContainText(
    "Recibida"
  );

  await expect
    .poll(async () =>
      Number(
        await queryValue(
          "SELECT total_compra::numeric::float8 FROM Compras WHERE cotizacion_ref = $1",
          [reference]
        )
      )
    )
    .toBe(150000);

  await expect
    .poll(async () =>
      String(
        await queryValue(
          "SELECT estado FROM Compras WHERE cotizacion_ref = $1",
          [reference]
        )
      )
    )
    .toBe("recibida");

  await page
    .locator("tr", { hasText: reference })
    .getByRole("button", { name: "Eliminar" })
    .click();

  await expect(page.locator("tr", { hasText: reference })).toHaveCount(0);

  await expect
    .poll(async () =>
      Number(
        await queryValue(
          "SELECT COUNT(*)::int FROM Compras WHERE cotizacion_ref = $1",
          [reference]
        )
      )
    )
    .toBe(0);
});
