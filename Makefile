# Локальные команды эталона. Контракт проекта — не они, а образ из Dockerfile (ADR 0006):
# и проверка Хекслета, и Render запускают решение только через него. Цели ниже нужны для
# работы без контейнера — быстрее и с HMR.

install:
	npm install

# Базы данных на сборке нет ни в образе, ни на Render, поэтому build — только зависимости,
# компиляция бэкенда и бандл фронтенда. Схему готовит старт.
build: install
	npm run build

# То же, что делает CMD образа: сначала миграции и сид, потом процесс. Требует собранного
# dist — сначала make build.
start:
	npm run db:prepare
	npm start

# Генерация артефактов из контракта: TypeSpec → openapi.yaml → TypeBox-схемы в schema.js.
# Результат коммитится и руками не правится.
types:
	npm run types

# Ключи переводов вынимаются из кода, объявления ресурсов генерируются из json:
# руками ни src/client/locales/ru/translation.json, ни src/client/@types не правятся.
i18n-extract:
	npx i18next-cli extract

i18n-types:
	npx i18next-cli types

# Что переведено, что осталось. Неиспользуемые ключи показывает `--unused`,
# но верить ему дословно нельзя: ключи ошибок собираются по problem.type.
i18n-status:
	npx i18next-cli status

db-generate:
	npm run db:generate

# Миграции и сид через tsx — по исходникам, без сборки: для работы в dev-режиме.
db-migrate:
	npm run db:migrate

db-seed:
	npm run db:seed

dev:
	npm run dev:client

# Браузерные тесты решения — болванка (см. __tests__/smoke.spec.ts). Гоняются против уже
# запущенного приложения и вручную: адрес берётся из APP_URL, по умолчанию localhost:8080.
# В проверку Хекслета они не входят — она гоняет свои скрытые тесты из корня репозитория кита.
test:
	npm test

typecheck:
	npm run typecheck

.PHONY: install build start types db-generate db-migrate db-seed dev test typecheck
