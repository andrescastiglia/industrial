#!/usr/bin/env node

const path = require("node:path");
const fs = require("node:fs");
const { spawnSync } = require("node:child_process");
const { Client } = require("pg");

const POSTGRES_PORT = process.env.E2E_POSTGRES_PORT || "55432";
const POSTGRES_CONTAINER_NAME =
  process.env.E2E_POSTGRES_CONTAINER_NAME || "industrial-e2e-postgres";
const POSTGRES_IMAGE = process.env.E2E_POSTGRES_IMAGE || "postgres:16-alpine";
const DEFAULT_TEST_DATABASE_URL = `postgresql://industrial:industrial@127.0.0.1:${POSTGRES_PORT}/industrial_e2e`;
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || DEFAULT_TEST_DATABASE_URL;
const SHOULD_MANAGE_CONTAINER =
  !process.env.TEST_DATABASE_URL ||
  process.env.TEST_DATABASE_URL === DEFAULT_TEST_DATABASE_URL;

function runDocker(args) {
  const result = spawnSync("docker", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim());
  }

  return result.stdout.trim();
}

function getContainerName(filter) {
  return runDocker([
    "ps",
    "-a",
    "--filter",
    `name=^/${filter}$`,
    "--format",
    "{{.Names}}",
  ]);
}

function containerExists() {
  return getContainerName(POSTGRES_CONTAINER_NAME) === POSTGRES_CONTAINER_NAME;
}

function containerIsRunning() {
  return (
    runDocker([
      "ps",
      "--filter",
      `name=^/${POSTGRES_CONTAINER_NAME}$`,
      "--format",
      "{{.Names}}",
    ]) === POSTGRES_CONTAINER_NAME
  );
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDatabase() {
  const deadline = Date.now() + 90_000;

  while (Date.now() < deadline) {
    const client = new Client({ connectionString: TEST_DATABASE_URL });

    try {
      await client.connect();
      await client.query("SELECT 1");
      return;
    } catch {
      await sleep(1_000);
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  throw new Error(
    `PostgreSQL no quedó disponible a tiempo en ${TEST_DATABASE_URL}`
  );
}

async function startManagedDatabase() {
  if (!SHOULD_MANAGE_CONTAINER) {
    return;
  }

  if (!containerExists()) {
    runDocker([
      "run",
      "-d",
      "--name",
      POSTGRES_CONTAINER_NAME,
      "-e",
      "POSTGRES_DB=industrial_e2e",
      "-e",
      "POSTGRES_USER=industrial",
      "-e",
      "POSTGRES_PASSWORD=industrial",
      "-p",
      `${POSTGRES_PORT}:5432`,
      POSTGRES_IMAGE,
    ]);
  } else if (!containerIsRunning()) {
    runDocker(["start", POSTGRES_CONTAINER_NAME]);
  }

  await waitForDatabase();
}

async function stopManagedDatabase() {
  if (!SHOULD_MANAGE_CONTAINER || !containerIsRunning()) {
    return;
  }

  runDocker(["stop", POSTGRES_CONTAINER_NAME]);
}

async function resetDatabase() {
  await startManagedDatabase();

  const schemaPath = path.join(__dirname, "database-schema.sql");
  const devAdminPath = path.join(__dirname, "create-dev-admin.sql");
  const seedPath = path.join(__dirname, "seed-e2e-base.sql");

  const resetSql = [
    "DROP SCHEMA IF EXISTS public CASCADE;",
    "CREATE SCHEMA public;",
    "GRANT ALL ON SCHEMA public TO CURRENT_USER;",
    "GRANT ALL ON SCHEMA public TO public;",
  ].join("\n");

  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  const createDevAdminSql = fs.readFileSync(devAdminPath, "utf8");
  const seedSql = fs.readFileSync(seedPath, "utf8");

  const client = new Client({ connectionString: TEST_DATABASE_URL });

  try {
    await client.connect();
    await client.query(resetSql);
    await client.query(schemaSql);
    await client.query(createDevAdminSql);
    await client.query(seedSql);
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function main() {
  const command = process.argv[2] || "reset";

  try {
    switch (command) {
      case "start":
        await startManagedDatabase();
        console.log(TEST_DATABASE_URL);
        break;
      case "reset":
        await resetDatabase();
        console.log(TEST_DATABASE_URL);
        break;
      case "stop":
        await stopManagedDatabase();
        break;
      case "url":
        console.log(TEST_DATABASE_URL);
        break;
      default:
        console.error(`Comando no soportado: ${command}`);
        process.exitCode = 1;
    }
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Fallo al preparar la base e2e"
    );
    process.exitCode = 1;
  }
}

void main();
