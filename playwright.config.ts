import { defineConfig, devices } from "@playwright/test";

// Конфигурация браузерных тестов эталона. Это тесты решения — то, что по заданию пишет студент,
// а не проверка Хекслета: она лежит в `__tests__/` в корне репозитория кита и запускается своим
// конфигом.
//
// Адрес приложения всегда из окружения: тесты гоняют против уже запущенного приложения
// (`docker run` образа или `make start`), поднимать его сами они не должны.
const APP_URL = process.env.APP_URL ?? "http://localhost:8080";

export default defineConfig({
  testDir: "__tests__",
  outputDir: "tmp/artifacts/traces",
  preserveOutput: "failures-only",
  fullyParallel: false,
  workers: 1,
  timeout: 20_000,
  expect: { timeout: 5_000 },
  reporter: [["list"]],
  use: {
    baseURL: APP_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
