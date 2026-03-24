import { test as base, expect, type Page } from "@playwright/test";

import { loginAsAdmin } from "../helpers/auth";

export const test = base.extend<{
  authenticatedPage: Page;
}>({
  authenticatedPage: async ({ page }, use) => {
    await loginAsAdmin(page);
    await use(page);
  },
});

export { expect };
