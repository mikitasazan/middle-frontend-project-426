import type { FastifyInstance } from "fastify";

import { authRoutes } from "./auth.js";
import { catalogRoutes } from "./catalog.js";
import { orderRoutes } from "./orders.js";
import { promoRoutes } from "./promos.js";

export const registerRoutes = async (fastify: FastifyInstance): Promise<void> => {
  // Живость приложения. Этот эндпоинт тейлят healthcheck контейнера и CI, поэтому он не должен
  // зависеть ни от сессии, ни от наличия данных в каталоге.
  fastify.get("/api/health", async () => ({ status: "ok" }));

  await fastify.register(authRoutes);
  await fastify.register(catalogRoutes);
  await fastify.register(promoRoutes);
  await fastify.register(orderRoutes);
};
