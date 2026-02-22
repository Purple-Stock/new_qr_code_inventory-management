import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("login page loads correctly", async ({ page }) => {
    await page.goto("/");
    
    await expect(page).toHaveTitle(/PURPLE STOCK/i);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/");
    
    await page.locator('input[type="email"]').fill("invalid@test.com");
    await page.locator('input[type="password"]').fill("wrongpassword");
    await page.locator('button[type="submit"]').click();
    
    await page.waitForTimeout(2000);
    await expect(page.getByRole("alert").filter({ hasText: /inválidos|invalid/i })).toBeVisible();
  });

  test("signup page loads correctly", async ({ page }) => {
    await page.goto("/signup");
    
    await expect(page.locator('input[type="text"]').first()).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("language selector changes language", async ({ page }) => {
    await page.goto("/");
    
    await page.locator("#language").click();
    await page.getByRole("option", { name: /português/i }).click();
    
    await expect(page.getByText(/digite suas credenciais/i)).toBeVisible();
  });
});
