import { test, expect } from "./fixtures/auth.fixture";
import { openSidebarSection } from "./helpers/auth";
import { uniqueSuffix } from "./helpers/data";
import { queryValue } from "./helpers/db";

test("clientes: crea, edita y elimina un cliente", async ({
  authenticatedPage,
}) => {
  const page = authenticatedPage;
  const suffix = uniqueSuffix();
  const companyName = `Cliente E2E ${suffix}`;
  const updatedContact = `Contacto Actualizado ${suffix}`;
  const email = `cliente-${suffix}@e2e.test`;

  await openSidebarSection(page, "Clientes");
  await expect(
    page.getByRole("heading", {
      name: "Clientes",
      exact: true,
      level: 2,
    })
  ).toBeVisible();

  await page.getByRole("button", { name: "Nuevo Cliente" }).click();

  await page.getByLabel("Nombre de la Empresa *").fill(companyName);
  await page.getByLabel("Persona de Contacto *").fill(`Contacto ${suffix}`);
  await page
    .getByLabel("Dirección Completa *")
    .fill(`Avenida E2E ${suffix}, San Salvador de Jujuy`);
  await page.getByLabel("Teléfono *").fill("3884000000");
  await page.getByLabel("Email *").fill(email);
  await page.getByRole("button", { name: "Crear" }).click();

  const searchInput = page.getByPlaceholder(
    "Buscar por empresa, contacto, email o teléfono..."
  );
  await searchInput.fill(companyName);

  const clientRow = page.locator("tr", { hasText: companyName });
  await expect(clientRow).toBeVisible();

  await expect
    .poll(async () =>
      Number(
        await queryValue(
          "SELECT COUNT(*)::int FROM Clientes WHERE nombre = $1 AND email = $2",
          [companyName, email]
        )
      )
    )
    .toBe(1);

  await clientRow.getByRole("button", { name: "Editar" }).click();
  await page.getByLabel("Persona de Contacto *").fill(updatedContact);
  await page.getByRole("button", { name: "Actualizar" }).click();

  await searchInput.fill(companyName);
  await expect(page.locator("tr", { hasText: updatedContact })).toBeVisible();

  await expect
    .poll(async () =>
      String(
        await queryValue(
          "SELECT contacto FROM Clientes WHERE nombre = $1 LIMIT 1",
          [companyName]
        )
      )
    )
    .toBe(updatedContact);

  await page
    .locator("tr", { hasText: companyName })
    .getByRole("button", { name: "Eliminar" })
    .click();

  await expect(page.locator("tr", { hasText: companyName })).toHaveCount(0);

  await expect
    .poll(async () =>
      Number(
        await queryValue(
          "SELECT COUNT(*)::int FROM Clientes WHERE nombre = $1",
          [companyName]
        )
      )
    )
    .toBe(0);
});
