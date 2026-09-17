# Интернет-магазин комплектующих для ПК

[![hexlet-check](https://github.com/mikitasazan/middle-frontend-project-426/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/mikitasazan/middle-frontend-project-426/actions)

Разработайте интернет-магазин комплектующих для ПК целиком на TypeScript.
Фронтенд пишете на любом TS-фреймворке (React, Vue, Svelte, Angular, Solid и др.).
Готового API здесь нет, поэтому сервер под свой интерфейс вы поднимаете сами,
а фреймворк для него и работу с базой выбираете на свой вкус. Спроектируйте API
через TypeSpec → OpenAPI, реализуйте регистрацию и авторизацию, главную
с промо-блоками, каталог с фильтрами и пагинацией, корзину, оформление заказа
и личный кабинет с историей заказов. Приложение деплоится в прод с третьего шага
и развивается под собственными браузерными тестами.

Учебный проект Хекслета: https://ru.hexlet.io/programs/middle-frontend
Как это должно работать: https://files.hexlet.app/a/qf7bsq

## Стек

- TypeScript, React 19 + Mantine (клиент), Fastify + Drizzle ORM + PostgreSQL (сервер)
- Vite — сборка клиента, tsc — сервера; один процесс отдаёт статику и `/api/*`
- TypeSpec → OpenAPI → TypeBox — контракт API и генерация схем
- Playwright — браузерные тесты; Docker — образ приложения

## Установка

```bash
git clone https://github.com/mikitasazan/middle-frontend-project-426.git
cd middle-frontend-project-426
make install
```

## Использование

Приложение читает `PORT`, `DATABASE_URL` и `SESSION_SECRET` из окружения.
Миграции и наполнение каталога выполняются при старте.

```bash
make build   # сборка клиента и сервера
make start   # миграции + сид + запуск на :8080
make test    # браузерные тесты против запущенного приложения (APP_URL)
```

Контракт приложения — образ из `Dockerfile`: он собирается одной командой
и запускается так же, как прод:

```bash
docker build -t online-store .
docker run --rm -p 8080:8080 -e PORT=8080 \
  -e DATABASE_URL=postgres://... -e SESSION_SECRET=... online-store
```

Деплой — из этого же образа (`render.yaml`), мониторинг ошибок подключается
переменной `VITE_MONITORING_DSN` при сборке.

---

<details>
<summary>Автоматические тесты Хекслета</summary>

Тесты запускаются на каждый коммит. За запуск отвечает файл `.github/workflows/hexlet-check.yml` — не удаляйте и не переименовывайте ни его, ни репозиторий.

</details>

## О Хекслете

[Хекслет](https://ru.hexlet.io/) — школа программирования: авторские программы обучения с практикой, поддержкой наставников и реальными проектами, которые остаются в резюме. Этот репозиторий — один из таких проектов.
