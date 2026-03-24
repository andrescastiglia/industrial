import { execFileSync } from "node:child_process";

import { TEST_DATABASE_URL } from "./test-config";

export default async function globalTeardown() {
  if (!process.env.CI && process.env.PLAYWRIGHT_STOP_E2E_DB !== "true") {
    return;
  }

  execFileSync("node", ["scripts/e2e-db.js", "stop"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      TEST_DATABASE_URL,
    },
    stdio: "inherit",
  });
}
