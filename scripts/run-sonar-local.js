#!/usr/bin/env node

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const coverageFile = path.join(projectRoot, "coverage", "lcov.info");
const defaultScannerImage = "sonarsource/sonar-scanner-cli:5.0.1";
const defaultScannerHostUrl = "http://host.docker.internal:9000";
const defaultApiUrl = "http://127.0.0.1:9000";
const trackedRoots = ["app", "components", "hooks", "lib"];
const trackedFiles = [
  "coverage-scope.js",
  "proxy.ts",
  "playwright.config.ts",
  "jest.config.js",
  "eslint.config.ts",
  "next.config.mjs",
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: "inherit",
    env: process.env,
    ...options,
  });

  if (result.status !== 0) {
    fail(`Command failed: ${command} ${args.join(" ")}`);
  }
}

function capture(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
    ...options,
  });

  if (result.status !== 0) {
    return null;
  }

  return result.stdout.trim();
}

function walkFiles(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return [];
  }

  const stats = fs.statSync(targetPath);
  if (stats.isFile()) {
    return [targetPath];
  }

  return fs
    .readdirSync(targetPath, { withFileTypes: true })
    .flatMap((entry) => {
      const nextPath = path.join(targetPath, entry.name);
      if (entry.isDirectory()) {
        return walkFiles(nextPath);
      }

      return [nextPath];
    });
}

function coverageNeedsRefresh() {
  if (!fs.existsSync(coverageFile)) {
    return true;
  }

  const coverageTime = fs.statSync(coverageFile).mtimeMs;
  const candidateFiles = [
    ...trackedRoots.flatMap((root) => walkFiles(path.join(projectRoot, root))),
    ...trackedFiles
      .map((file) => path.join(projectRoot, file))
      .filter((file) => fs.existsSync(file)),
  ];

  return candidateFiles.some(
    (file) => fs.statSync(file).mtimeMs > coverageTime
  );
}

function isDirtyWorktree() {
  const status = capture("git", [
    "status",
    "--porcelain",
    "--untracked-files=normal",
  ]);
  return status === null ? true : status.length > 0;
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }

  return text ? JSON.parse(text) : {};
}

async function withGeneratedToken(callback) {
  const explicitToken = process.env.SONAR_TOKEN;
  if (explicitToken) {
    return callback(explicitToken);
  }

  const apiUrl = process.env.SONAR_API_URL || defaultApiUrl;
  const login = process.env.SONAR_LOGIN || "admin";
  const password = process.env.SONAR_PASSWORD || "admin";
  const tokenName = process.env.SONAR_TOKEN_NAME || "industrial-local-scanner";
  const authHeader = `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`;
  const headers = { Authorization: authHeader };

  try {
    await fetch(
      `${apiUrl}/api/user_tokens/revoke?name=${encodeURIComponent(tokenName)}`,
      {
        method: "POST",
        headers,
      }
    );
  } catch {
    // Ignore revoke failures and try to generate a fresh token anyway.
  }

  const generated = await requestJson(
    `${apiUrl}/api/user_tokens/generate?name=${encodeURIComponent(tokenName)}`,
    {
      method: "POST",
      headers,
    }
  );

  if (!generated.token) {
    throw new Error("SonarQube did not return a token.");
  }

  try {
    return await callback(generated.token);
  } finally {
    try {
      await fetch(
        `${apiUrl}/api/user_tokens/revoke?name=${encodeURIComponent(tokenName)}`,
        {
          method: "POST",
          headers,
        }
      );
    } catch {
      // Best effort cleanup only.
    }
  }
}

async function main() {
  if (coverageNeedsRefresh() && process.env.SONAR_SKIP_COVERAGE !== "1") {
    console.log("Refreshing Jest coverage before Sonar scan...");
    run("npx", [
      "jest",
      "--coverage",
      "--runInBand",
      "--coverageReporters=lcov",
      "--coverageReporters=text-summary",
      "--coverageThreshold={}",
    ]);
  }

  const scmMode = process.env.SONAR_SCM_MODE || "auto";
  const disableScm =
    scmMode === "disabled" || (scmMode === "auto" && isDirtyWorktree());
  const scannerHostUrl = process.env.SONAR_HOST_URL || defaultScannerHostUrl;
  const scannerImage = process.env.SONAR_SCANNER_IMAGE || defaultScannerImage;

  if (disableScm) {
    console.log("SCM disabled for local scan because the worktree is dirty.");
  }

  await withGeneratedToken(async (token) => {
    const scannerArgs = [
      "run",
      "--rm",
      "--add-host=host.docker.internal:host-gateway",
      "-e",
      `SONAR_HOST_URL=${scannerHostUrl}`,
      "-e",
      `SONAR_TOKEN=${token}`,
      "-v",
      `${projectRoot}:/usr/src`,
      "-w",
      "/usr/src",
      scannerImage,
      "sonar-scanner",
    ];

    if (disableScm) {
      scannerArgs.push("-Dsonar.scm.disabled=true");
    }

    run("docker", scannerArgs);
  });
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
