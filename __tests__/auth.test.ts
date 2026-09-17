import { expect, type Page, test } from "@playwright/test";

// Уникальный email на каждый прогон: база между прогонами живёт,
// повторная регистрация занятого адреса законно падает.
const uniqueEmail = (prefix: string): string =>
  `${prefix}+${Date.now()}${Math.floor(Math.random() * 1000)}@example.com`;

const PASSWORD = "secret123";

const register = async (page: Page, email: string): Promise<void> => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByTestId("nav-signup").click();
  await page.getByTestId("auth-email").fill(email);
  await page.getByTestId("auth-password").fill(PASSWORD);
  await page.getByTestId("auth-submit").click();
};

const signIn = async (page: Page, email: string): Promise<void> => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByTestId("nav-signin").click();
  await page.getByTestId("auth-email").fill(email);
  await page.getByTestId("auth-password").fill(PASSWORD);
  await page.getByTestId("auth-submit").click();
};

test("new user signs up and ends up authenticated", async ({ page }) => {
  await register(page, uniqueEmail("signup"));

  await expect(page.getByTestId("nav-account")).toBeVisible();
  await expect(page.getByTestId("nav-signout")).toBeVisible();
});

test("session survives a reload and signout ends it", async ({ page }) => {
  const email = uniqueEmail("reload");
  await register(page, email);
  await expect(page.getByTestId("nav-account")).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("nav-account")).toBeVisible();

  await page.getByTestId("nav-signout").click();
  await expect(page.getByTestId("nav-signin")).toBeVisible();

  await signIn(page, email);
  await expect(page.getByTestId("nav-account")).toBeVisible();
});

test("wrong password is rejected with a message", async ({ page }) => {
  const email = uniqueEmail("wrongpass");
  await register(page, email);
  await page.getByTestId("nav-signout").click();
  await expect(page.getByTestId("nav-signin")).toBeVisible();

  await page.getByTestId("nav-signin").click();
  await page.getByTestId("auth-email").fill(email);
  await page.getByTestId("auth-password").fill("not-the-password");
  await page.getByTestId("auth-submit").click();

  await expect(page.getByTestId("auth-error")).toBeVisible();
});
