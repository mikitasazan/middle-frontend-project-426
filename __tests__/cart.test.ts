import { expect, type Page, test } from "@playwright/test";

const parseAmount = (text: string): number => Number(text.replace(/[^\d]/g, ""));

const openProduct = async (page: Page): Promise<void> => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByTestId("nav-catalog").click();
  await expect(page.getByTestId("catalog-item").first()).toBeVisible();
  await page.getByTestId("catalog-item-name").first().click();
  await expect(page.getByTestId("product-add-to-cart")).toBeVisible();
};

const openCart = async (page: Page): Promise<void> => {
  await page.getByTestId("nav-cart").click();
  await expect(page.getByTestId("cart-item").first()).toBeVisible();
};

test("product lands in the cart and quantity changes the total", async ({ page }) => {
  await openProduct(page);
  const price = parseAmount(
    (await page.getByTestId("product-price").textContent()) ?? "",
  );

  await page.getByTestId("product-add-to-cart").click();
  await openCart(page);

  await expect(page.getByTestId("cart-item").first()).toBeVisible();
  await expect(page.getByTestId("cart-total")).toBeVisible();
  expect(parseAmount((await page.getByTestId("cart-total").textContent()) ?? "")).toBe(price);

  await page.getByTestId("cart-item-qty").first().fill("3");
  await expect
    .poll(
      async () => parseAmount((await page.getByTestId("cart-total").textContent()) ?? ""),
      { timeout: 10_000 },
    )
    .toBe(price * 3);
});

test("removing the last item empties the cart", async ({ page }) => {
  await openProduct(page);
  await page.getByTestId("product-add-to-cart").click();
  await openCart(page);

  await page.getByTestId("cart-item-remove").first().click();
  await expect(page.getByTestId("cart-empty")).toBeVisible();
});
