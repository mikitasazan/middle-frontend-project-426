import { expect, test } from "@playwright/test";

// Болванка, а не полный набор — и это осознанно.
//
// По заданию браузерные тесты на каждый пользовательский сценарий пишет студент, и проверяются
// они наставником на ревью, а не автоматикой: скрытые тесты Хекслета проверяют поведение
// приложения, а не наличие и качество студенческих тестов. Автоматически сравнивать чужой
// тестовый набор с эталонным бессмысленно — сценарий можно выразить десятком разных способов.
//
// Эталон того, каким должен получиться набор, лежит в исходниках проекта: `__tests__/` в корне
// репозитория кита — браузерные тесты на авторизацию, главную с промо, каталог с фильтрами и
// пагинацией, корзину, оформление заказа и личный кабинет. Оттуда же видно приёмы, которые стоит
// повторить: селекторы по `data-testid`, чтение состояния атрибутами вместо текста, независимость
// от конкретного состава каталога.
//
// Здесь остаётся минимум, который доказывает, что обвязка тестов рабочая: приложение
// поднимается, главная отдаёт промо, каталог открывается из шапки.

test("home page opens and shows promos", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.getByTestId("home-promo")).toBeVisible();
  await expect(page.getByTestId("home-promo-item").first()).toBeVisible();
});

test("catalog opens from the header", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByTestId("nav-catalog").click();

  await expect(page.getByTestId("catalog-list")).toBeVisible();
  await expect(page.getByTestId("catalog-item").first()).toBeVisible();
});

test("health check answers", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.ok()).toBe(true);
});
