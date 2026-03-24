import { Client } from "pg";

import { TEST_DATABASE_URL } from "../test-config";

async function withClient<T>(callback: (client: Client) => Promise<T>) {
  const client = new Client({ connectionString: TEST_DATABASE_URL });

  await client.connect();

  try {
    return await callback(client);
  } finally {
    await client.end();
  }
}

export async function queryRows<T extends Record<string, unknown>>(
  text: string,
  values: unknown[] = []
) {
  return withClient<T[]>(async (client) => {
    const result = await client.query<T>(text, values);
    return result.rows;
  });
}

export async function queryOne<T extends Record<string, unknown>>(
  text: string,
  values: unknown[] = []
) {
  const rows = await queryRows<T>(text, values);
  return rows[0] ?? null;
}

export async function queryValue<T>(text: string, values: unknown[] = []) {
  const row = await queryOne<Record<string, T>>(text, values);
  if (!row) {
    return null;
  }

  return Object.values(row)[0] ?? null;
}
