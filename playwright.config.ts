import { defineConfig, devices } from "@playwright/test";

import { EMAIL_CAPTURE_DIR, TEST_DATABASE_URL } from "./e2e/test-config";

const webServerEnv = Object.fromEntries(
  Object.entries({
    ...process.env,
    DATABASE_URL: TEST_DATABASE_URL,
    TEST_DATABASE_URL,
    EMAIL_CAPTURE_DIR,
    NEXT_TELEMETRY_DISABLED: "1",
  }).filter((entry): entry is [string, string] => typeof entry[1] === "string")
);

delete webServerEnv.NO_COLOR;

const typedWebServerEnv: Record<string, string> = {
  ...webServerEnv,
  DATABASE_URL: TEST_DATABASE_URL,
  TEST_DATABASE_URL,
  EMAIL_CAPTURE_DIR,
  NEXT_TELEMETRY_DISABLED: "1",
};

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["html"], ["github"]] : [["list"], ["html"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command:
          "env -u NO_COLOR ./node_modules/.bin/next build && env -u NO_COLOR ./node_modules/.bin/next start --hostname 127.0.0.1 --port 3000",
        env: typedWebServerEnv,
        url: "http://127.0.0.1:3000",
        reuseExistingServer: false,
        timeout: 180_000,
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
