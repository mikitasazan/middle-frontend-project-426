import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyRequest } from "fastify";

import { schema } from "../../schema.js";
import { users } from "../db/schema.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { userView } from "../lib/presenters.js";
import { emailTaken, invalidCredentials, unauthorized } from "../lib/problem.js";

type Credentials = { email: string; password: string };

// Текущий пользователь — тот, чья сессия активна. Хелпер переиспользуют роуты заказов.
export const requireUserId = (request: FastifyRequest): number => {
  const userId = request.session.userId;
  if (!userId) {
    throw unauthorized();
  }
  return userId;
};

export const authRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const { db } = fastify;

  fastify.post(
    "/api/users",
    { schema: { body: schema["/api/users"].POST.args.properties.body } },
    async (request, reply) => {
      const { email, password } = request.body as Credentials;
      const normalizedEmail = email.trim().toLowerCase();

      // «Email занят» — бизнес-правило, а не форма данных: схема из контракта о нём не знает,
      // поэтому проверка отдельная (урок 370 курса «JS: REST API»).
      const existing = await db.select().from(users).where(eq(users.email, normalizedEmail));
      if (existing.length > 0) {
        throw emailTaken();
      }

      const [created] = await db
        .insert(users)
        .values({
          email: normalizedEmail,
          passwordHash: await hashPassword(password),
        })
        .returning();

      // Регистрация сразу открывает сессию: иначе пользователь обязан войти повторно
      // тем же паролем, что ничего не проверяет и только раздражает.
      request.session.userId = created.id;

      return reply.status(201).send(userView(created));
    },
  );

  fastify.post(
    "/api/session",
    { schema: { body: schema["/api/session"].POST.args.properties.body } },
    async (request) => {
      const { email, password } = request.body as Credentials;
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.trim().toLowerCase()));

      if (!user || !(await verifyPassword(password, user.passwordHash))) {
        throw invalidCredentials();
      }

      request.session.userId = user.id;
      return userView(user);
    },
  );

  fastify.delete("/api/session", async (request, reply) => {
    // Выход уничтожает сессию на сервере, а не только очищает состояние в браузере (ADR 0002).
    await request.session.destroy();
    return reply.status(204).send();
  });

  fastify.get("/api/me", async (request) => {
    const userId = requireUserId(request);
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      // Сессия ссылается на удалённого пользователя — считаем её недействительной.
      throw unauthorized();
    }
    return userView(user);
  });
};
