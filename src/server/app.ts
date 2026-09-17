import { existsSync } from "node:fs";
import { resolve } from "node:path";

import fastifyCookie from "@fastify/cookie";
import fastifySession from "@fastify/session";
import fastifyStatic from "@fastify/static";
import { TypeBoxValidatorCompiler } from "@fastify/type-provider-typebox";
import type { FastifyError, FastifyInstance } from "fastify";

import type { Db } from "./db/client.js";
import { registerFormats } from "./lib/formats.js";
import { captureError } from "./lib/monitoring.js";
import { internalError, notFound, ProblemError, validationError } from "./lib/problem.js";
import { registerRoutes } from "./routes/index.js";

declare module "fastify" {
  interface FastifyInstance {
    db: Db;
  }
}

declare module "@fastify/session" {
  interface FastifySessionObject {
    userId?: number;
  }
}

export type AppOptions = {
  db: Db;
  sessionSecret: string;
  staticDir?: string;
};

export const buildApp = async (fastify: FastifyInstance, options: AppOptions): Promise<void> => {
  // Схемы валидации приходят из контракта: TypeSpec → OpenAPI → TypeBox (src/schema.js).
  // Форматы из схемы нужно зарегистрировать до первой валидации.
  registerFormats();
  fastify.setValidatorCompiler(TypeBoxValidatorCompiler);

  fastify.decorate("db", options.db);

  // Порядок обязателен: @fastify/session требует уже зарегистрированный @fastify/cookie.
  await fastify.register(fastifyCookie);
  await fastify.register(fastifySession, {
    secret: options.sessionSecret,
    // Сессия серверная, идентификатор — в httpOnly-cookie. Выход уничтожает её на сервере
    // (ADR 0002). Приложение живёт на одном origin, поэтому SameSite=Lax достаточно и CORS не нужен.
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      // secure: true требует HTTPS. Локально и в тестах приложение работает по http,
      // на проде за HTTPS-прокси cookie останется рабочей.
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
    saveUninitialized: false,
  });

  // Единая точка превращения ошибок в Problem Details: ни один роут не собирает тело ошибки сам.
  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof ProblemError) {
      return reply.status(error.problem.status).send(error.problem);
    }
    // Ошибки валидации приходят от AJV через Fastify: превращаем их в тот же Problem Details,
    // чтобы у клиента был один формат ошибок независимо от их источника.
    const validation = (error as FastifyError).validation;
    if (validation) {
      const detail = validation
        .map((issue) => {
          const path = issue.instancePath || "request";
          return `${path}: ${issue.message ?? "invalid value"}`;
        })
        .join("; ");
      const problem = validationError(detail).problem;
      return reply.status(problem.status).send(problem);
    }
    // Сюда попадает только непредвиденное: ProblemError и ошибки схемы обработаны выше.
    fastify.log.error(error);
    captureError(error);
    const problem = internalError().problem;
    return reply.status(problem.status).send(problem);
  });

  await registerRoutes(fastify);

  // Один процесс отдаёт и API, и собранный фронтенд (single-origin, ADR 0005).
  const staticDir = options.staticDir ?? "dist/client";
  const root = resolve(process.cwd(), staticDir);
  if (existsSync(root)) {
    await fastify.register(fastifyStatic, { root, prefix: "/" });
  }

  // Клиентский роутинг: неизвестный путь отдаёт index.html, чтобы перезагрузка страницы
  // на /cart или /account не ломалась. Под /api — честный JSON-404, а не HTML.
  fastify.setNotFoundHandler((request, reply) => {
    if (request.raw.url?.startsWith("/api")) {
      const problem = notFound(`Endpoint ${request.raw.url} does not exist`).problem;
      return reply.status(problem.status).send(problem);
    }
    if (!existsSync(root)) {
      return reply.status(404).send("Frontend bundle is missing: run make build");
    }
    return reply.sendFile("index.html");
  });
};
