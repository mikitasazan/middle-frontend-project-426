import { desc, eq, inArray } from "drizzle-orm";
import type { FastifyInstance } from "fastify";

import { schema } from "../../schema.js";
import { orderItems, orders, products } from "../db/schema.js";
import { orderView } from "../lib/presenters.js";
import { addressRequired, notFound, unavailableItems, validationError } from "../lib/problem.js";
import { requireUserId } from "./auth.js";

type CreateOrderBody = {
  items: { productId: string; quantity: number }[];
  shipping: {
    method: "delivery" | "pickup";
    recipientName: string;
    phone: string;
    address?: string;
  };
};

export const orderRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const { db } = fastify;

  const loadOrders = async (userId: number, orderId?: number) => {
    const rows = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.id));

    // Заказы фильтруются по userId в самом запросе: «отдать все и отсеять в коде» —
    // самый простой способ однажды показать чужие покупки.
    const selected = orderId === undefined ? rows : rows.filter((row) => row.id === orderId);
    if (selected.length === 0) {
      return [];
    }

    const items = await db
      .select()
      .from(orderItems)
      .where(
        inArray(
          orderItems.orderId,
          selected.map((row) => row.id),
        ),
      );

    return selected.map((order) =>
      orderView(
        order,
        items.filter((item) => item.orderId === order.id),
      ),
    );
  };

  fastify.post(
    "/api/orders",
    { schema: { body: schema["/api/orders"].POST.args.properties.body } },
    async (request, reply) => {
      const userId = requireUserId(request);
      const body = request.body as CreateOrderBody;

      if (body.shipping.method === "delivery" && !body.shipping.address?.trim()) {
        throw addressRequired();
      }

      // Клиент присылает только идентификаторы и количества — цен в запросе нет.
      // Итог считает сервер, иначе сумму заказа можно было бы подделать из браузера.
      const requestedIds = body.items.map((item) => Number(item.productId));
      if (requestedIds.some((id) => !Number.isInteger(id))) {
        throw validationError("items[].productId must be an integer");
      }

      const found = await db.select().from(products).where(inArray(products.id, requestedIds));
      const productById = new Map(found.map((product) => [product.id, product]));

      // Отказ атомарный: собираем ВСЕ проблемные товары и отклоняем заказ целиком,
      // чтобы пользователь одним сообщением узнал, что убрать из корзины.
      const unavailable = requestedIds.filter((id) => {
        const product = productById.get(id);
        return !product?.available;
      });
      if (unavailable.length > 0) {
        throw unavailableItems(unavailable);
      }

      const lines = body.items.map((item) => {
        const product = productById.get(Number(item.productId));
        if (!product) {
          throw unavailableItems([Number(item.productId)]);
        }
        return {
          productId: product.id,
          productName: product.name,
          // Снимок цены на момент покупки: заказ не меняется вслед за каталогом.
          priceAtPurchase: product.price,
          quantity: item.quantity,
        };
      });

      const total = lines.reduce((sum, line) => sum + line.priceAtPurchase * line.quantity, 0);

      // Заказ и его позиции пишутся одной транзакцией: заказ без позиций — мусор в истории.
      const created = await db.transaction(async (tx) => {
        const [order] = await tx
          .insert(orders)
          .values({
            userId,
            status: "paid",
            shippingMethod: body.shipping.method,
            recipientName: body.shipping.recipientName.trim(),
            phone: body.shipping.phone.trim(),
            address:
              body.shipping.method === "delivery" ? (body.shipping.address?.trim() ?? null) : null,
            total,
          })
          .returning();

        await tx.insert(orderItems).values(lines.map((line) => ({ ...line, orderId: order.id })));
        return order;
      });

      return reply.status(201).send(orderView(created, lines));
    },
  );

  fastify.get("/api/orders", async (request) => {
    const userId = requireUserId(request);
    return loadOrders(userId);
  });

  fastify.get(
    "/api/orders/:id",
    {
      schema: { params: schema["/api/orders/{id}"].GET.args.properties.params },
    },
    async (request) => {
      const userId = requireUserId(request);
      const { id } = request.params as { id: string };
      const orderId = Number(id);

      // Чужой заказ отдаёт 404, а не 403: существование чужих заказов не раскрывается.
      if (!Number.isInteger(orderId)) {
        throw notFound(`Order ${id} not found`);
      }
      const [order] = await loadOrders(userId, orderId);
      if (!order) {
        throw notFound(`Order ${id} not found`);
      }
      return order;
    },
  );
};
