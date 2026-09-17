import { defineConfig } from "drizzle-kit";

// Миграции генерируются в файлы (drizzle/) и коммитятся, а применяются при сборке —
// не создаются на лету при старте приложения (шаг 08 ТЗ, ADR 0003).
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    // Единственный источник подключения — и локально, и на проде (ADR 0006).
    url: process.env.DATABASE_URL ?? "",
  },
});
