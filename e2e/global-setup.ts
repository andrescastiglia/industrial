import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";

import { EMAIL_CAPTURE_DIR, TEST_DATABASE_URL } from "./test-config";

export default async function globalSetup() {
  process.env.TEST_DATABASE_URL = TEST_DATABASE_URL;
  process.env.EMAIL_CAPTURE_DIR = EMAIL_CAPTURE_DIR;

  await fs.rm(EMAIL_CAPTURE_DIR, { recursive: true, force: true });
  await fs.mkdir(EMAIL_CAPTURE_DIR, { recursive: true });

  execFileSync("node", ["scripts/e2e-db.js", "reset"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      TEST_DATABASE_URL,
    },
    stdio: "inherit",
  });
}
