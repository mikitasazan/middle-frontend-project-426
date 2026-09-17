# Образ приложения — контракт проекта (ADR 0006). Его собирает и запускает и проверка
# Хекслета, и Render: другого способа запустить решение нет.
#
# Слои разделены так, чтобы правка кода не заставляла переустанавливать зависимости:
# сначала package.json + package-lock.json и npm ci, потом исходники.
#
# Миграции и сид в образ не входят: базы данных на сборке нет ни здесь, ни на Render.
# Их применяет CMD при старте контейнера.

FROM node:26-bookworm-slim AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build

# Адрес сборщика ошибок для фронтенда — аргумент сборки, а не переменная рантайма: Vite
# подставляет VITE_-переменные в бандл, когда собирает его. Пустой по умолчанию — тогда
# мониторинг во фронтенде просто не включается (docs/monitoring.md).
ARG VITE_MONITORING_DSN=""
ENV VITE_MONITORING_DSN=$VITE_MONITORING_DSN

COPY tsconfig.server.json tsconfig.client.json vite.config.ts postcss.config.js index.html ./
COPY src ./src
COPY public ./public
RUN npm run build

# Отдельная установка без devDependencies: в рантайм не должны попадать vite, tsc и tsx.
FROM node:26-bookworm-slim AS prod-deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:26-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY package.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# Миграции — файловый артефакт, drizzle читает их из каталога на диске при старте.
COPY drizzle ./drizzle

EXPOSE 8080

# Сначала база, потом порт: приложение не должно отвечать раньше, чем схема применена.
# Последняя команда идёт через exec — тогда SIGTERM от докера доходит до Fastify,
# и остановка контейнера остаётся аккуратной (main.ts закрывает соединения сам).
CMD ["sh", "-c", "npm run db:prepare && exec node dist/server/main.js"]
