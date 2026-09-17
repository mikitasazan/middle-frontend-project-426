import { and, asc, count, eq, gte, ilike, lte, type SQL } from "drizzle-orm";
import type { FastifyInstance } from "fastify";

import { schema } from "../../schema.js";
import { categories, products } from "../db/schema.js";
import { categoryView, productView } from "../lib/presenters.js";
import { notFound } from "../lib/problem.js";

type CatalogQuery = {
  category?: string;
  q?: string;
  priceMin?: number;
  priceMax?: number;
  available?: boolean;
  page?: number;
  perPage?: number;
};

// В LIKE-шаблоне % и _ — метасимволы. Без экранирования поиск по «100%» вернёт весь каталог.
const escapeLike = (value: string): string => value.replace(/[\\%_]/g, (char) => `\\${char}`);

export const catalogRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const { db } = fastify;

  fastify.get("/api/categories", async () => {
    const rows = await db.select().from(categories).orderBy(asc(categories.name));
    return rows.map(categoryView);
  });

  fastify.get(
    "/api/products",
    {
      schema: {
        querystring: schema["/api/products"].GET.args.properties.query,
      },
    },
    async (request) => {
      const query = (request.query ?? {}) as CatalogQuery;
      const page = query.page ?? 1;
      const perPage = query.perPage ?? 6;

      // Фильтры комбинируются и применяются на сервере: отдавать весь каталог и фильтровать
      // в браузере — решение, которое ломается ровно тогда, когда товаров становится много.
      const conditions: SQL[] = [];

      if (query.category) {
        const [category] = await db
          .select()
          .from(categories)
          .where(eq(categories.slug, query.category));
        if (!category) {
          // Неизвестная категория — не ошибка, а пустая выдача: так фронтенду не нужно
          // различать «нет такой категории» и «в категории нет товаров».
          return {
            items: [],
            meta: { page, perPage, total: 0, totalPages: 0 },
          };
        }
        conditions.push(eq(products.categoryId, category.id));
      }
      if (query.q) {
        conditions.push(ilike(products.name, `%${escapeLike(query.q)}%`));
      }
      if (query.priceMin !== undefined) {
        conditions.push(gte(products.price, query.priceMin));
      }
      if (query.priceMax !== undefined) {
        conditions.push(lte(products.price, query.priceMax));
      }
      if (query.available !== undefined) {
        conditions.push(eq(products.available, query.available));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [{ value: total }] = await db.select({ value: count() }).from(products).where(where);

      const rows = await db
        .select()
        .from(products)
        .where(where)
        .orderBy(asc(products.id))
        .limit(perPage)
        .offset((page - 1) * perPage);

      return {
        items: rows.map(productView),
        meta: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
      };
    },
  );

  fastify.get(
    "/api/products/:id",
    {
      schema: {
        params: schema["/api/products/{id}"].GET.args.properties.params,
      },
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const productId = Number(id);
      if (!Number.isInteger(productId)) {
        throw notFound(`Product ${id} not found`);
      }
      const [product] = await db.select().from(products).where(eq(products.id, productId));
      if (!product) {
        throw notFound(`Product ${id} not found`);
      }
      return productView(product);
    },
  );
};
