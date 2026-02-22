import { test, expect } from "@playwright/test";

test.describe("Inventory Management", () => {
  test("unauthenticated users are redirected to login for items", async ({ page }) => {
    await page.goto("/teams/1/items");
    await expect(page).toHaveURL(/\/|\/login/);
  });

  test("unauthenticated users are redirected to login for locations", async ({ page }) => {
    await page.goto("/teams/1/locations");
    await expect(page).toHaveURL(/\/|\/login/);
  });

  test("unauthenticated users are redirected to login for transactions", async ({ page }) => {
    await page.goto("/teams/1/transactions");
    await expect(page).toHaveURL(/\/|\/login/);
  });

  test("unauthenticated users are redirected to login for stock-in", async ({ page }) => {
    await page.goto("/teams/1/stock-in");
    await expect(page).toHaveURL(/\/|\/login/);
  });

  test("unauthenticated users are redirected to login for stock-out", async ({ page }) => {
    await page.goto("/teams/1/stock-out");
    await expect(page).toHaveURL(/\/|\/login/);
  });

  test("unauthenticated users are redirected to login for reports", async ({ page }) => {
    await page.goto("/teams/1/reports");
    await expect(page).toHaveURL(/\/|\/login/);
  });

  test("unauthenticated users are redirected to login for settings", async ({ page }) => {
    await page.goto("/teams/1/settings");
    await expect(page).toHaveURL(/\/|\/login/);
  });

  test("unauthenticated users are redirected to login for labels", async ({ page }) => {
    await page.goto("/teams/1/labels");
    await expect(page).toHaveURL(/\/|\/login/);
  });
});

test.describe("Public Pages", () => {
  test("homepage loads correctly", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/PURPLE STOCK/i);
  });

  test("signup page loads and has required fields", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.locator('input[type="text"]').first()).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#confirmPassword')).toBeVisible();
  });

  test("signup validates email format", async ({ page }) => {
    await page.goto("/signup");
    await page.locator('input[type="text"]').first().fill("Test User");
    await page.locator('input[type="email"]').fill("invalid-email");
    await page.locator('#password').fill("Password123!");
    await page.locator('#confirmPassword').fill("Password123!");
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText(/valid email|email inválido/i)).toBeVisible();
  });

  test("signup validates password match", async ({ page }) => {
    await page.goto("/signup");
    await page.locator('input[type="text"]').first().fill("Test User");
    await page.locator('input[type="email"]').fill("test@example.com");
    await page.locator('#password').fill("Password123!");
    await page.locator('#confirmPassword').fill("DifferentPassword123!");
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText(/match|match|não coincidem/i)).toBeVisible();
  });

  test("signup validates password strength", async ({ page }) => {
    await page.goto("/signup");
    await page.locator('input[type="text"]').first().fill("Test User");
    await page.locator('input[type="email"]').fill("test@example.com");
    await page.locator('#password').fill("123");
    await page.locator('#confirmPassword').fill("123");
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText(/password|senha|caracteres/i)).toBeVisible();
  });

  test("login validates empty fields", async ({ page }) => {
    await page.goto("/");
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText(/required|obrigatório|email é obrigatório/i)).toBeVisible();
  });

  test("login validates email format", async ({ page }) => {
    await page.goto("/");
    await page.locator('input[type="email"]').fill("not-an-email");
    await page.locator('input[type="password"]').fill("somepassword");
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText(/valid email|email inválido/i)).toBeVisible();
  });
});

test.describe("Language Selector", () => {
  test("language selector is present on login page", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#language")).toBeVisible();
  });

  test("can switch to Portuguese", async ({ page }) => {
    await page.goto("/");
    await page.locator("#language").click();
    await page.getByRole("option", { name: /português/i }).click();
    await expect(page.getByText(/digite suas credenciais|faça login/i)).toBeVisible();
  });

  test("can switch to English", async ({ page }) => {
    await page.goto("/signup");
    await page.locator("#language").click();
    await page.getByRole("option", { name: /english/i }).click();
    await expect(page.getByText(/sign up|create account/i)).toBeVisible();
  });

  test("can switch to French", async ({ page }) => {
    await page.goto("/");
    await page.locator("#language").click();
    await page.getByRole("option", { name: /français/i }).click();
    await expect(page.getByText(/connectez|votre/i)).toBeVisible();
  });
});

test.describe("Responsive Design", () => {
  test("login page is usable on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("signup page is usable on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/signup");
    await expect(page.locator('input[type="text"]').first()).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});
