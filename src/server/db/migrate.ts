import { migrate } from "drizzle-orm/node-postgres/migrator";

import { createDb, createPool, waitForDb } from "./client.js";

// Миграции применяются на этапе сборки (make build), а не при старте приложения:
// схема — файловый артефакт, а не побочный эффект первого запроса.
const run = async (): Promise<void> => {
  const pool = createPool();
  try {
    await waitForDb(pool);
    await migrate(createDb(pool), { migrationsFolder: "drizzle" });
    console.log("Миграции применены.");
  } finally {
    await pool.end();
  }
};

run().catch((error) => {
  console.error("Не удалось применить миграции:", error);
  process.exit(1);
});
