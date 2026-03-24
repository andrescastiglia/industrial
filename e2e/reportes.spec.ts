import { promises as fs } from "node:fs";

import { test, expect } from "./fixtures/auth.fixture";
import { openSidebarSection } from "./helpers/auth";
import { clearCapturedEmails, listCapturedEmails } from "./helpers/email";

const currentPeriod = new Date().toISOString().slice(0, 7);

test("reportes: descarga PDF y Excel para los tipos operativos", async ({
  authenticatedPage,
}) => {
  const page = authenticatedPage;

  await openSidebarSection(page, "Reportes");
  await expect(
    page.getByRole("heading", { name: "Reportes", exact: true, level: 2 })
  ).toBeVisible();

  const scenarios = [
    {
      reportType: "production",
      label: "Producción",
      buttonName: "Descargar PDF",
      endpoint: "/api/reports/pdf?type=production",
      filename: `Reporte_production_${currentPeriod}.pdf`,
      contentType: "application/pdf",
    },
    {
      reportType: "sales",
      label: "Ventas",
      buttonName: "Descargar Excel",
      endpoint: "/api/reports/excel?type=sales",
      filename: `Reporte_sales_${currentPeriod}.xlsx`,
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
    {
      reportType: "inventory",
      label: "Inventario",
      buttonName: "Descargar PDF",
      endpoint: "/api/reports/pdf?type=inventory",
      filename: `Reporte_inventory_${currentPeriod}.pdf`,
      contentType: "application/pdf",
    },
    {
      reportType: "costs",
      label: "Costos",
      buttonName: "Descargar Excel",
      endpoint: "/api/reports/excel?type=costs",
      filename: `Reporte_costs_${currentPeriod}.xlsx`,
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  ];

  for (const scenario of scenarios) {
    await page.getByTestId(`report-type-${scenario.reportType}`).click();

    const downloadPromise = page.waitForEvent("download");
    const responsePromise = page.waitForResponse((response) =>
      response.url().includes(scenario.endpoint)
    );

    await page.getByRole("button", { name: scenario.buttonName }).click();

    const [download, response] = await Promise.all([
      downloadPromise,
      responsePromise,
    ]);

    expect(response.ok()).toBeTruthy();
    expect(response.headers()["content-type"]).toContain(scenario.contentType);
    expect(download.suggestedFilename()).toBe(scenario.filename);

    const downloadedPath = await download.path();
    if (downloadedPath) {
      const stats = await fs.stat(downloadedPath);
      expect(stats.size).toBeGreaterThan(0);
    }
  }
});

test("reportes: envia inventario por email usando captura local", async ({
  authenticatedPage,
}) => {
  const page = authenticatedPage;

  await clearCapturedEmails();
  await openSidebarSection(page, "Reportes");
  await page.getByTestId("report-type-inventory").click();
  await page
    .getByLabel("Destinatarios (separados por coma)")
    .fill("qa-inventory@maese.test");

  await page.getByRole("button", { name: "Enviar Reporte" }).click();

  await expect.poll(async () => (await listCapturedEmails()).length).toBe(1);

  const [capturedEmail] = await listCapturedEmails();

  expect(capturedEmail.subject).toContain("Reporte de Inventario");
  expect(capturedEmail.to).toEqual(["qa-inventory@maese.test"]);
  expect(capturedEmail.attachments.map((item) => item.filename).sort()).toEqual(
    ["Reporte_Inventario.pdf", "Reporte_Inventario.xlsx"].sort()
  );
  expect(capturedEmail.attachments.every((item) => item.size > 0)).toBeTruthy();
});
