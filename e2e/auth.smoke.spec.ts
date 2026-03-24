import { test, expect } from "@playwright/test";

test("login page renders basic form", async ({ page }) => {
  await page.goto("/login");

  await expect(
    page.getByRole("heading", { name: "Sistema Industrial" })
  ).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Contraseña")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Iniciar Sesión" })
  ).toBeVisible();
});

test("dashboard redirects unauthenticated users to login", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("button", { name: "Iniciar Sesión" })
  ).toBeVisible();
});
