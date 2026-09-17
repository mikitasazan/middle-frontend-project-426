import Fastify from "fastify";

import { buildApp } from "./app.js";
import { createDb, createPool, waitForDb } from "./db/client.js";
import { initMonitoring } from "./lib/monitoring.js";

// Точка входа: образ запускает node dist/server/main.js (ADR 0006). Обязательных переменных
// две — PORT и DATABASE_URL; MONITORING_DSN необязателен, без него мониторинг не включается.
const port = Number(process.env.PORT ?? 8080);
const sessionSecret = process.env.SESSION_SECRET ?? "a-secret-with-minimum-length-of-32-characters";

const start = async (): Promise<void> => {
  // До создания приложения: дальше ошибки уже нужно ловить.
  initMonitoring();

  const pool = createPool();
  await waitForDb(pool);

  const fastify = Fastify({ logger: true });
  await buildApp(fastify, { db: createDb(pool), sessionSecret });

  const shutdown = async (): Promise<void> => {
    await fastify.close();
    await pool.end();
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown());
  process.on("SIGINT", () => void shutdown());

  // 0.0.0.0, а не localhost: иначе приложение недостижимо из других контейнеров и с хоста.
  await fastify.listen({ host: "0.0.0.0", port });
};

start().catch((error) => {
  console.error("Не удалось запустить приложение:", error);
  process.exit(1);
});
