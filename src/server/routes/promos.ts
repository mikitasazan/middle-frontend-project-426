import { asc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";

import { products, promos } from "../db/schema.js";
import { promoView } from "../lib/presenters.js";

export const promoRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const { db } = fastify;

  // Промо-блоки главной страницы. Товар подтягивается join'ом: без него блоку нечего
  // показать, а запрос на товар для каждого промо отдельно превратил бы главную в N+1.
  // Порядок — по идентификатору: без него порядок блоков плавал бы между запросами.
  fastify.get("/api/promos", async () => {
    const rows = await db
      .select({ promo: promos, product: products })
      .from(promos)
      .innerJoin(products, eq(promos.productId, products.id))
      .orderBy(asc(promos.id));

    return rows.map(({ promo, product }) => promoView(promo, product));
  });
};
