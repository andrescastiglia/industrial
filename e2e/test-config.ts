import path from "node:path";

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://industrial:industrial@127.0.0.1:55432/industrial_e2e";

export const EMAIL_CAPTURE_DIR =
  process.env.EMAIL_CAPTURE_DIR ||
  path.join(process.cwd(), ".e2e-artifacts", "emails");
