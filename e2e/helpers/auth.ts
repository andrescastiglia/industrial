import { expect, type Page } from "@playwright/test";

const sectionRoutes: Record<string, string> = {
  Clientes: "/dashboard/clientes",
  Compras: "/dashboard/compras",
  Ventas: "/dashboard/ventas",
  "Órdenes de Producción": "/dashboard/ordenes-produccion",
  Reportes: "/dashboard/reportes",
};

export async function loginAsAdmin(page: Page) {
  await page.goto("/login");

  await page.getByLabel("Email").fill("admin@ejemplo.com");
  await page.getByLabel("Contraseña").fill("admin123");

  await Promise.all([
    page.waitForURL(/\/dashboard$/),
    page.getByRole("button", { name: "Iniciar Sesión" }).click(),
  ]);

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: "Sistema de Gestión Industrial" })
  ).toBeVisible();
}

export async function openSidebarSection(page: Page, sectionName: string) {
  const targetRoute = sectionRoutes[sectionName];

  if (targetRoute) {
    await page.goto(targetRoute);
    return;
  }

  await page.getByRole("link", { name: sectionName, exact: true }).click();
}
