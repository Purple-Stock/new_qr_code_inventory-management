import { test as base } from "@playwright/test";

export const test = base.extend<{
  authenticatedPage: { userId: number; teamId: number };
}>({
  authenticatedPage: async ({ page }, use) => {
    const testUser = {
      email: `test-${Date.now()}@example.com`,
      name: "Test User",
      password: "TestPassword123!",
    };

    await page.goto("/signup");
    await page.locator('input[type="text"]').first().fill(testUser.name);
    await page.locator('input[type="email"]').fill(testUser.email);
    await page.locator('#password').fill(testUser.password);
    await page.locator('#confirmPassword').fill(testUser.password);
    await page.locator('button[type="submit"]').click();
    
    await page.waitForURL(/\/team_selection|\/teams\/new/, { timeout: 15000 });
    
    if (page.url().includes("team_selection") || page.url() === "http://localhost:3002/") {
      const createBtn = page.getByRole("button", { name: /create new team/i });
      if (await createBtn.isVisible()) {
        await createBtn.click();
        await page.getByLabel(/team name/i).fill("Test Team");
        await page.getByRole("button", { name: /create/i }).click();
        await page.waitForURL(/\/teams\/\d+\/items/, { timeout: 15000 });
      }
    }
    
    const url = page.url();
    const teamIdMatch = url.match(/\/teams\/(\d+)/);
    const teamId = teamIdMatch ? parseInt(teamIdMatch[1]) : 1;
    
    await use({ userId: 1, teamId });
  },
});
