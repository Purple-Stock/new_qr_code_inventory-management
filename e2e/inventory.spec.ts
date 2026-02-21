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
});
