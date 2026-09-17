import { expect, type Page, test } from "@playwright/test";

const uniqueEmail = (prefix: string): string =>
  `${prefix}+${Date.now()}${Math.floor(Math.random() * 1000)}@example.com`;

const PASSWORD = "secret123";

const register = async (page: Page, email: string): Promise<void> => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByTestId("nav-signup").click();
  await page.getByTestId("auth-email").fill(email);
  await page.getByTestId("auth-password").fill(PASSWORD);
  await page.getByTestId("auth-submit").click();
  await expect(page.getByTestId("nav-account")).toBeVisible();
};

const addToCartAndOpenCheckout = async (page: Page): Promise<void> => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByTestId("nav-catalog").click();
  await expect(page.getByTestId("catalog-item").first()).toBeVisible();
  await page.getByTestId("catalog-item-name").first().click();
  await expect(page.getByTestId("product-add-to-cart")).toBeVisible();
  await page.getByTestId("product-add-to-cart").click();
  await page.getByTestId("nav-cart").click();
  await expect(page.getByTestId("cart-item").first()).toBeVisible();
  await page.getByTestId("cart-checkout").click();
};

test("guest cannot place an order", async ({ page }) => {
  await addToCartAndOpenCheckout(page);

  // Гость уводится на вход, оформления не происходит.
  await expect(page.getByTestId("auth-email")).toBeVisible();
  await expect(page.getByTestId("order-success")).toBeHidden();
});

test("signed in user places a pickup order", async ({ page }) => {
  await register(page, uniqueEmail("order"));

  await page.getByTestId("nav-catalog").click();
  await expect(page.getByTestId("catalog-item").first()).toBeVisible();
  await page.getByTestId("catalog-item-name").first().click();
  await page.getByTestId("product-add-to-cart").click();
  await page.getByTestId("nav-cart").click();
  await expect(page.getByTestId("cart-item").first()).toBeVisible();
  await page.getByTestId("cart-checkout").click();
  await expect(page.getByTestId("checkout-form")).toBeVisible();

  await page.getByTestId("checkout-method").selectOption("pickup");
  await page.getByTestId("checkout-name").fill("Иван Петров");
  await page.getByTestId("checkout-phone").fill("+79990001122");
  await page.getByTestId("checkout-submit").click();

  await expect(page.getByTestId("order-success")).toBeVisible();
  await expect(page.getByTestId("cart-empty").or(page.getByTestId("nav-cart"))).toBeVisible();
});
