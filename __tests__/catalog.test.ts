import { expect, type Page, test } from "@playwright/test";

const openCatalog = async (page: Page): Promise<void> => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByTestId("nav-catalog").click();
  await expect(page.getByTestId("catalog-list")).toBeVisible();
  // Контейнер появляется раньше товаров — ждём первую карточку.
  await expect(page.getByTestId("catalog-item").first()).toBeVisible();
};

const visibleNames = async (page: Page): Promise<string[]> => {
  const names = await page.getByTestId("catalog-item-name").allTextContents();
  return names.map((name) => name.trim());
};

test("category filter narrows the list and reset returns it", async ({ page }) => {
  await openCatalog(page);

  const before = await visibleNames(page);
  expect(before.length).toBeGreaterThan(1);

  const firstCategory = await page
    .getByTestId("filter-category")
    .locator("option")
    .nth(1)
    .textContent();
  await page.getByTestId("filter-category").selectOption({ label: firstCategory!.trim() });
  await expect(page.getByTestId("catalog-item").first()).toBeVisible();

  // Выдача пагинирована, а ответ приходит асинхронно: сравниваем состав (не количество)
  // и ждём устоявшегося состояния опросом.
  await expect
    .poll(
      async () => new Set(await visibleNames(page)),
      { timeout: 10_000 },
    )
    .not.toEqual(new Set(before));

  await page.getByTestId("filter-reset").click();
  await expect(page.getByTestId("catalog-item").first()).toBeVisible();
  await expect
    .poll(
      async () => new Set(await visibleNames(page)),
      { timeout: 10_000 },
    )
    .toEqual(new Set(before));
});

test("search by name narrows the list", async ({ page }) => {
  await openCatalog(page);

  const names = await visibleNames(page);
  const [sample] = names;
  const fragment = sample!.slice(0, 4);

  await page.getByTestId("filter-search").fill(fragment);
  // Ждём, пока выдача перестанет совпадать с исходной.
  await expect
    .poll(async () => (await visibleNames(page)).length, { timeout: 10_000 })
    .toBeLessThan(names.length);
  const narrowed = await visibleNames(page);
  expect(narrowed.length).toBeGreaterThan(0);
  expect(narrowed.every((name) => name.toLowerCase().includes(fragment.toLowerCase()))).toBe(true);
});
