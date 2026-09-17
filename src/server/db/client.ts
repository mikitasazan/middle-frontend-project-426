import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import * as schema from "./schema.js";

export type Db = ReturnType<typeof createDb>;

const connectionString = (): string => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    // Единственный источник подключения — окружение (ADR 0006). Никаких «если локально».
    throw new Error("DATABASE_URL environment variable is required");
  }
  return url;
};

export const createPool = (): pg.Pool => new pg.Pool({ connectionString: connectionString() });

export const createDb = (pool: pg.Pool) => drizzle(pool, { schema });

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// Контейнер базы может ещё подниматься, когда приложение уже стартовало: compose ждёт
// healthcheck, но миграции и сид запускаются отдельными процессами из make build.
export const waitForDb = async (pool: pg.Pool, retries = 30, delayMs = 1000): Promise<void> => {
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await pool.query("select 1");
      return;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(delayMs);
      }
    }
  }
  throw lastError;
};
